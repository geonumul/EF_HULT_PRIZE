# 모든 테스트는 환경변수 없이 인메모리 데이터로 시작한다.
import pytest
from fastapi.testclient import TestClient

from app import data
from app.main import app

ENV_NAMES = [
    "SUPABASE_DB_URL", "SUPABASE_JWT_SECRET", "KAKAO_REST_KEY", "VWORLD_KEY", "DATA_GO_KR_KEY",
    "NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET", "COUPANG_ACCESS_KEY", "COUPANG_SECRET_KEY",
    "TOSS_SECRET_KEY", "FIREBASE_SERVICE_ACCOUNT",
]


@pytest.fixture
def client(monkeypatch):
    for name in ENV_NAMES:
        monkeypatch.delenv(name, raising=False)
    data.reset_store()
    return TestClient(app, follow_redirects=False)
