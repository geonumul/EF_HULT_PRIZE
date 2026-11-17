import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 여러 작업이 동시에 빌드해도 결과 폴더가 겹치지 않도록 환경변수로 폴더를 바꿀 수 있다.
  // 평소에는 값이 없으므로 기본 .next를 쓴다.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
