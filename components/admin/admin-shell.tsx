"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string | undefined;
  children: ReactNode;
}) {
  const router = useRouter();

  const onLogout = async () => {
    try {
      await createBrowserSupabaseClient().auth.signOut();
    } catch {
      // 세션 소멸 실패해도 로그인 화면으로 보낸다.
    }
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-full bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[960px] items-center justify-between px-5 py-3">
          <Link href="/admin" className="text-[0.95rem] font-extrabold tracking-tight text-ink">
            WEBAGENT<span className="text-ink-soft">.KR</span>
            <span className="ml-2 font-flow text-[0.7rem] font-normal text-signal">관리자</span>
          </Link>
          <div className="flex items-center gap-3 text-[0.8rem] text-ink-soft">
            <span className="hidden sm:inline">{userEmail}</span>
            <button
              type="button"
              onClick={onLogout}
              className="min-h-9 rounded-md border border-line px-3 transition-colors hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[960px] px-5 py-8">{children}</main>
    </div>
  );
}
