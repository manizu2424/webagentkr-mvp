import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/** Noto Sans KR 등록 (SIL OFL 1.1, assets/fonts/OFL.txt). 멱등. */
export function registerPdfFonts(): void {
  if (registered) return;
  const dir = path.join(process.cwd(), "assets", "fonts");
  Font.register({
    family: "NotoSansKR",
    fonts: [
      { src: path.join(dir, "NotoSansKR-Regular.otf"), fontWeight: 400 },
      { src: path.join(dir, "NotoSansKR-Bold.otf"), fontWeight: 700 },
    ],
  });
  // 한글 어절이 음절 단위로 끊겨 하이픈이 붙는 것을 방지
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
