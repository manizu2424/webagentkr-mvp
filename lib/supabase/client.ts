import { createBrowserClient } from "@supabase/ssr";

/**
 * anon 키를 쓰는 브라우저 Supabase 클라이언트 — 관리자 화면 전용 (기술 스펙 §4.4).
 *
 * 관리자 로그인 세션이 실려 `authenticated` 롤 RLS 정책(admin_select_* 등)을 통과한다.
 * anon 롤에는 정책이 하나도 없으므로, 로그인 전에는 아무것도 조회되지 않는다.
 * 공개 폼 제출에는 절대 쓰지 않는다 — 그건 서버의 createServiceClient() 몫이다.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createBrowserClient(url, anonKey);
}
