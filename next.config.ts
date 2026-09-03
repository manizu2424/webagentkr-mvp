import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지 경량화: .next/standalone 에 필요한 것만 번들 (Dockerfile 참조)
  output: "standalone",
};

export default nextConfig;
