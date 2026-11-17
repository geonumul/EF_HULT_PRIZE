// 모든 페이지를 감싸는 기본 틀. 헤더는 여기서 한 번만 그린다.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import "@/styles/tokens.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Shopportunity",
  description: "빈 상가의 업종 적합성 진단, 실제 상품 기반 렌더링, 확정 견적을 한 번에 보여주는 서비스",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 글꼴. 불러오지 못하면 tokens.css의 다음 글꼴로 대체된다. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
