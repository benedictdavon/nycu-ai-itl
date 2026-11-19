"""GET /api/health: the app is up, and which LLM backend it uses."""

from fastapi import APIRouter

from app.api.deps import SettingsDep
from app.models import Health

router = APIRouter()


@router.get("/health", response_model=Health)
def health(settings: SettingsDep) -> Health:
    return Health(status="ok", llm_backend=settings.llm_backend, llm_model=settings.llm_model)
