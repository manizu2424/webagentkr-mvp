// [스텁] 관리자 상담 상세 — Phase 3.4 / 기획서 §11
export default async function Page({ params }: PageProps<"/admin/consultations/[id]">) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">상담 상세</h1>
      <p className="text-sm text-neutral-500">스텁 · id = {id}</p>
    </main>
  );
}
