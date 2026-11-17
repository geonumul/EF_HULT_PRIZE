# Supabase JWT 검증. SUPABASE_JWT_SECRET이 없으면 데모 사용자로 통과시킨다.
from dataclasses import dataclass

import jwt
from fastapi import Depends, Header, HTTPException

from app.config import env


@dataclass
class User:
    id: str
    role: str  # user | partner | admin
    email: str = ""


# 데모 모드 기본 사용자. 파트너 API까지 모두 쓸 수 있게 partner로 둔다.
DEMO_USER = User(id="demo-user", role="partner", email="demo@example.com")


def _decode_token(token: str, secret: str) -> User:
    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    role = (claims.get("app_metadata") or {}).get("role", "user")
    return User(id=claims["sub"], role=role, email=claims.get("email", ""))


def current_user(
    authorization: str = Header(default=""),
    x_demo_user: str = Header(default=""),
) -> User:
    secret = env("SUPABASE_JWT_SECRET")
    if not secret:
        # 데모 모드에서는 X-Demo-User 헤더로 사용자를 바꿔 볼 수 있다. (철거 업체 시연용)
        return User(id=x_demo_user, role="partner") if x_demo_user else DEMO_USER
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return _decode_token(authorization[7:], secret)


def partner_user(user: User = Depends(current_user)) -> User:
    if user.role not in ("partner", "admin"):
        raise HTTPException(status_code=403, detail="파트너 계정만 쓸 수 있습니다.")
    return user
