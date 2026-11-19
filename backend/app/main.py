"""FastAPI app factory. Owner: scaffold. Routers live in app/api/."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import db, llm
from app.api import ask, health, infos, records
from app.config import Settings, get_settings


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

    for module in (health, infos, records, ask):
        app.include_router(module.router, prefix="/api")
    return app


app = create_app()
