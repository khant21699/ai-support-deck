import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logs import setup_logging
from app.routers import auth, dashboard, drafts, kb, tickets

setup_logging()
log = logging.getLogger("app.api")

app = FastAPI(title="Support Desk API")


# Log every request: "POST /tickets -> 201 (35 ms)".
# This is added before the CORS middleware so that CORS wraps it, which means even our 500 error
# responses still carry the CORS headers (otherwise the browser would show a confusing CORS error).
@app.middleware("http")
async def log_requests(request: Request, call_next):
    started = time.time()
    try:
        response = await call_next(request)
    except Exception:
        log.exception("%s %s -> unhandled error", request.method, request.url.path)
        return JSONResponse({"detail": "Internal server error"}, status_code=500)

    status = response.status_code
    if request.url.path == "/health":
        level = logging.DEBUG  # health checks run every few seconds, so keep them quiet
    elif status >= 500:
        level = logging.ERROR
    elif status >= 400 and status != 401:  # 401 is normal for visitors who are not logged in
        level = logging.WARNING
    else:
        level = logging.INFO
    log.log(level, "%s %s -> %s (%d ms)", request.method, request.url.path, status, (time.time() - started) * 1000)
    return response


# The frontend runs on another address, so the API has to allow it (and its login cookie).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(drafts.router)
app.include_router(kb.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
