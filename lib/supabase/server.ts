import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * service_role 키를 쓰는 서버 전용 Supabase 클라이언트 (기술 스펙 §3.1, §4).
 *
 * ⚠️ 이 클라이언트는 RLS 를 우회한다. 절대 클라이언트 컴포넌트에서 import 하지 말 것
 *    (`import "server-only"` 가 빌드 시점에 차단한다). SUPABASE_SERVICE_ROLE_KEY 는
 *    NEXT_PUBLIC_* 이 아니므로 클라이언트 번들에 포함되지 않는다.
 *
 * 공개 진단/상담 제출(API Route)의 모든 insert/update 가 이 클라이언트를 통한다.
 */
let cached: SupabaseClient | null = null;

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env 확인)",
    );
  }

  cached ??= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
