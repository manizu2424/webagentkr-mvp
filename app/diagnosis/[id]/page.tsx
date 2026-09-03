// [스텁] 진단 결과 페이지 — Phase 2.2 / 기술 스펙 §4.2, 기획서 §10
// 3초 폴링, SUBMITTED→PROCESSING 취급, COMPLETED/FAILED 시 중단 (결함 #12)
export default async function Page({ params }: PageProps<"/diagnosis/[id]">) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">진단 결과</h1>
      <p className="text-sm text-neutral-500">스텁 · diagnosisId = {id}</p>
    </main>
  );
}
