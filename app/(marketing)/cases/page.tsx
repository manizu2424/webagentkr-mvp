import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CASES_ENABLED } from "@/lib/features";

// [스텁] 자동화 사례 — Phase 4.2 / 기획서 §5 에서 구현 예정 (task.md). CASES_ENABLED 가 꺼져 있으면 404.
// 켜는 시점에 실제 사례 콘텐츠와 함께 noindex 를 해제한다.
export const metadata: Metadata = {
  title: "자동화 사례",
  robots: { index: false, follow: false },
};

export default function Page() {
  if (!CASES_ENABLED) notFound();
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">자동화 사례</h1>
      <p className="text-sm text-neutral-500">스텁 페이지 · Phase 4.2 / 기획서 §5</p>
    </main>
  );
}
