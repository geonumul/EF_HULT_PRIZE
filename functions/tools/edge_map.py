"""공간 사진에서 건축 요소(벽, 창, 기둥, 보, 천장 구조)의 선을 뽑아 선화 이미지로 만든다.

이미지 생성 모델에 이 선화를 구조 가이드로 함께 주면, 업종이 달라도 창과 기둥과 천장 구조가 같은 자리에 그려진다.
OpenCV 없이 Pillow와 numpy만 쓴다.

사용: python tools/edge_map.py 사진.jpg 선화.png
"""
import sys

import numpy as np
from PIL import Image, ImageFilter, ImageOps

BLUR_RADIUS = 1.6  # 표면 질감 같은 잔선을 줄인다.
EDGE_PERCENTILE = 91  # 기울기가 강한 위쪽 9%만 선으로 남긴다.


def edge_map(source_path: str, out_path: str) -> None:
    image = Image.open(source_path).convert("L")
    image = ImageOps.autocontrast(image)
    blurred = image.filter(ImageFilter.GaussianBlur(BLUR_RADIUS))
    pixels = np.asarray(blurred, dtype=np.float32)
    # Sobel 기울기 크기
    gx = np.zeros_like(pixels)
    gy = np.zeros_like(pixels)
    gx[:, 1:-1] = pixels[:, 2:] - pixels[:, :-2]
    gy[1:-1, :] = pixels[2:, :] - pixels[:-2, :]
    magnitude = np.hypot(gx, gy)
    lines = magnitude >= np.percentile(magnitude, EDGE_PERCENTILE)
    result = np.where(lines, 0, 255).astype(np.uint8)  # 흰 바탕에 검은 선
    output = Image.fromarray(result).filter(ImageFilter.MinFilter(3))  # 선을 조금 굵게
    output.save(out_path)
    print(f"저장: {out_path}")


if __name__ == "__main__":
    edge_map(sys.argv[1], sys.argv[2])
