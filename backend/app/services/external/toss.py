# 토스페이먼츠 결제 승인. POST /v1/payments/confirm. 키: TOSS_SECRET_KEY
# 키가 없으면 요청 값을 그대로 승인한 것처럼 돌려주는 데모 승인이다.
import base64

import httpx

from app.config import env

CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm"


class PaymentError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def confirm_payment(payment_key: str, order_id: str, amount: int) -> dict:
    secret_key = env("TOSS_SECRET_KEY")
    if not secret_key:
        return {
            "status": "DONE",
            "paymentKey": payment_key,
            "orderId": order_id,
            "totalAmount": amount,
            "receiptUrl": None,
            "demo": True,
        }

    # 시크릿 키 뒤에 콜론을 붙여 Basic 인증으로 보낸다.
    token = base64.b64encode(f"{secret_key}:".encode()).decode()
    body = {"paymentKey": payment_key, "orderId": order_id, "amount": amount}
    response = httpx.post(CONFIRM_URL, json=body, headers={"Authorization": f"Basic {token}"}, timeout=15)
    data = response.json()
    if response.status_code != 200:
        raise PaymentError(data.get("message", "결제 승인에 실패했습니다."))
    return {
        "status": data.get("status"),
        "paymentKey": data.get("paymentKey"),
        "orderId": data.get("orderId"),
        "totalAmount": data.get("totalAmount"),
        "receiptUrl": (data.get("receipt") or {}).get("url"),
        "demo": False,
    }
