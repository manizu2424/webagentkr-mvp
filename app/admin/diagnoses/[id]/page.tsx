// [스텁] 관리자 진단 상세 — Phase 3.4 / 기획서 §11
export default async function Page({ params }: PageProps<"/admin/diagnoses/[id]">) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">진단 상세</h1>
      <p className="text-sm text-neutral-500">스텁 · id = {id}</p>
    </main>
  );
}
