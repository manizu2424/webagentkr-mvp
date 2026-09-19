import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지 경량화: .next/standalone 에 필요한 것만 번들 (Dockerfile 참조)
  output: "standalone",
  // 결과 PDF 라우트가 런타임에 읽는 한글 폰트 — import 그래프에 없어 명시 필요
  outputFileTracingIncludes: {
    "/api/diagnoses/[id]/pdf": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
