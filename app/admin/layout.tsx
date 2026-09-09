import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createSessionClient } from "@/lib/supabase/session-client";
import { AdminShell } from "@/components/admin/admin-shell";

// 관리자 영역 — 색인 금지 (robots.ts 의 Disallow 와 이중).
export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

// proxy.ts 가 /admin/* 미인증 접근을 /admin/login 으로 돌린다 → 세션 없이 여기 도달하는 건
// 로그인 페이지뿐이다. 그때는 셸(헤더/로그아웃) 없이 폼만 렌더한다.
// 실제 데이터 보호는 이 레이아웃이 아니라 RLS(anon 롤 정책 0개) + server action 의 getUser() 가드다.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div className="min-h-full bg-paper text-ink">{children}</div>;
  return <AdminShell userEmail={user.email}>{children}</AdminShell>;
}
