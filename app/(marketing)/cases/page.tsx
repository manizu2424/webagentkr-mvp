import type { Metadata } from "next";

// [스텁] 자동화 사례 — Phase 4.2 / 기획서 §5 에서 구현 예정 (task.md). 구현 전까지 색인 금지·sitemap 제외.
export const metadata: Metadata = {
  title: "자동화 사례",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">자동화 사례</h1>
      <p className="text-sm text-neutral-500">스텁 페이지 · Phase 4.2 / 기획서 §5</p>
    </main>
  );
}
