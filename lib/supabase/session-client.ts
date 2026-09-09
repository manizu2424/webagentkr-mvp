import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * anon 키 + 로그인 세션 쿠키를 쓰는 서버 Supabase 클라이언트. RSC·server action 전용.
 * RLS 를 우회하지 않는다 — `authenticated` 롤 정책(admin_*)의 적용을 받는다.
 * service-role 클라이언트(lib/supabase/server.ts)와 혼동 금지.
 */
export async function createSessionClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // RSC 렌더 중 set 호출은 throw 한다 — 미들웨어가 갱신을 담당하므로 무시.
        }
      },
    },
  });
}
