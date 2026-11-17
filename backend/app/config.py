# 환경변수 읽기. 값은 호출할 때마다 읽는다. 테스트에서 바꿔 끼우기 쉽다.
import os


def env(name: str) -> str:
    return os.environ.get(name, "").strip()
