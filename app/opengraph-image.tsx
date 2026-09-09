import { ImageResponse } from "next/og";

// 공유 미리보기 이미지. @vercel/og 번들 폰트(Geist)는 라틴 전용이라 워드마크·라틴
// 문구만 쓴다(한글 태그라인은 tofu 위험). twitter 이미지로도 재사용된다.
export const alt = "WEBAGENT.KR — AI automation diagnosis for small teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "88px 96px",
          background: "#f5f6f2",
          color: "#16292b",
          fontFamily: "Geist, sans-serif",
        }}
      >
        <div style={{ width: 64, height: 6, background: "#1f3ce6" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>
            WEBAGENT.KR
          </div>
          <div style={{ fontSize: 40, color: "#566b6d", lineHeight: 1.35 }}>
            AI automation diagnosis for small teams
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#566b6d" }}>webagent.kr</div>
      </div>
    ),
    { ...size },
  );
}
