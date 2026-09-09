import type { ReactNode } from "react";
import { createSessionClient } from "@/lib/supabase/session-client";
import { AdminShell } from "@/components/admin/admin-shell";

// 미들웨어(proxy.ts)가 이미 미인증 접근을 막지만, 레이아웃에서도 세션을 재확인한다(방어).
// 세션 없음 = /admin/login 만 여기 도달 → 셸 없이 폼만 렌더.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div className="min-h-full bg-paper text-ink">{children}</div>;
  return <AdminShell userEmail={user.email}>{children}</AdminShell>;
}
