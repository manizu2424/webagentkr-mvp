import { ImageResponse } from "next/og";

// 파비콘 — signal 블루 배경에 "W" 모노그램. Next 가 이 라우트로 favicon 을 생성한다.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f3ce6",
          color: "#ffffff",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "Geist, sans-serif",
        }}
      >
        W
      </div>
    ),
    { ...size },
  );
}
