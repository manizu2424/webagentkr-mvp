// [스텁] 관리자 레이아웃 — Phase 3.4 에서 Supabase Auth 세션 체크 추가
// (기술 스펙 §1.1, §4.4 · 미인증 시 /admin/login 리다이렉트)
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-full">{children}</div>;
}
