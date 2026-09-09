import type { Metadata } from "next";

// [스텁] 회사소개 — Phase 1 / 기획서 §5 에서 구현 예정 (task.md). 구현 전까지 색인 금지.
export const metadata: Metadata = {
  title: "회사소개",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">회사소개</h1>
      <p className="text-sm text-neutral-500">스텁 페이지 · Phase 1 / 기획서 §5</p>
    </main>
  );
}
