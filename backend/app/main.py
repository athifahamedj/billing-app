import os
from typing import Annotated
from urllib.parse import urlsplit

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.routes.auth import router as auth_router
from app.routes.contacts import router as contacts_router
from app.db.database import get_db
from app.routes.products import router as products_router
from app.routes.purchases import router as purchases_router
from app.routes.reports import router as reports_router
from app.routes.sales import router as sales_router
from app.routes.settings import router as settings_router

app = FastAPI()
app.include_router(auth_router)
app.include_router(contacts_router)
app.include_router(products_router)
app.include_router(purchases_router)
app.include_router(reports_router)
app.include_router(sales_router)
app.include_router(settings_router)


def _origin_value(origin: str | None) -> str | None:
    if not origin:
        return None
    try:
        parsed = urlsplit(origin)
        if (
            parsed.scheme.lower() not in {"http", "https"}
            or not parsed.netloc
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path
            or parsed.query
            or parsed.fragment
        ):
            return None
        return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"
    except ValueError:
        return None


def _trusted_origins() -> set[str]:
    configured_origins = os.getenv("CSRF_TRUSTED_ORIGINS", "")
    return {
        normalized
        for value in configured_origins.split(",")
        if (normalized := _origin_value(value.strip()))
    }


@app.middleware("http")
async def protect_api_writes(request: Request, call_next):
    if (
        request.url.path.startswith("/api/")
        and request.method not in {"GET", "HEAD", "OPTIONS"}
    ):
        origin = request.headers.get("origin")
        host = request.headers.get("host", "").lower()
        forwarded_proto = request.headers.get("x-forwarded-proto")
        scheme = (
            forwarded_proto.split(",", 1)[0].strip().lower()
            if forwarded_proto
            else request.url.scheme.lower()
        )
        normalized_origin = _origin_value(origin)
        same_host_origin = (
            normalized_origin == f"{scheme}://{host}"
        )
        if (
            normalized_origin is None
            or not (
                same_host_origin
                or normalized_origin in _trusted_origins()
            )
            or request.headers.get("x-csrf-protection") != "1"
        ):
            return JSONResponse(
                status_code=403,
                content={"detail": "Cross-site request validation failed."},
            )
    return await call_next(request)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Billing App API is running"}


@app.get("/health")
def health(session: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    session.execute(text("SELECT 1"))
    return {"status": "ok"}