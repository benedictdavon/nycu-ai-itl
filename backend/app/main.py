"""FastAPI app factory. Owner: scaffold. Routers live in app/api/."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app import db, llm
from app.api import ask, discussions, health, infos, members, records, suggest
from app.config import REPO_ROOT, Settings, get_settings

FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"


def _serve_frontend(app: FastAPI, dist: Path) -> None:
    """Serve the built frontend: real files as they are, index.html for other paths (Part D)."""
    root = dist.resolve()

    # Registered last, so /api/*, /docs and /openapi.json are matched before this catch-all.
    @app.get("/{path:path}", include_in_schema=False)
    def _frontend(path: str) -> FileResponse:
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        if path:
            candidate = (root / path).resolve()
            if candidate.is_file() and candidate.is_relative_to(root):
                return FileResponse(candidate)
        return FileResponse(root / "index.html")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the app. Tests pass their own Settings; it is kept on `app.state.settings`."""
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        conn = db.connect(app.state.settings.db_path)
        try:
            db.init_db(conn)
        finally:
            conn.close()
        yield

    app = FastAPI(title="LabKnow CP2 prototype", lifespan=lifespan)
    app.state.settings = settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(llm.LLMError)
    def _llm_error(request: Request, exc: llm.LLMError) -> JSONResponse:
        """The LLM is unreachable or unusable. The client may retry."""
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    for module in (health, infos, records, ask, suggest, members, discussions):
        app.include_router(module.router, prefix="/api")
    if FRONTEND_DIST.is_dir():
        _serve_frontend(app, FRONTEND_DIST)
    return app


app = create_app()
