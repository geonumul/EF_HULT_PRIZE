# FastAPI 앱. Vercel에서는 api/index.py 가 이 앱을 노출한다.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import env
from app.routers import demolition, listings, products, quotes, render_jobs

app = FastAPI(title="Shopportunity API")

# 프론트 주소만 허용한다. CORS_ORIGINS에 쉼표로 여러 개를 적는다.
origins = [o.strip() for o in (env("CORS_ORIGINS") or "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

for router in (listings.router, products.router, render_jobs.router, quotes.router, demolition.router):
    app.include_router(router)


@app.get("/")
def root():
    """루트 주소로 열었을 때 빈 화면 대신 안내를 보여 준다."""
    return {"service": "Shopportunity API", "docs": "/docs", "health": "/health", "listings": "/listings"}


@app.get("/health")
def health():
    return {"status": "ok"}
