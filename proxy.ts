import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of toSet) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() = 서버 검증. getSession() 은 쿠키만 보므로 게이트에 부적합.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const onLogin = req.nextUrl.pathname === "/admin/login";

  if (!user && !onLogin) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    const redirect = NextResponse.redirect(loginUrl);
    // 토큰 갱신 중 setAll 이 res 에 실어둔 쿠키를 리다이렉트 응답에도 복사한다 —
    // 안 하면 refresh-token 로테이션 상황에서 무작위 로그아웃.
    res.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  if (user && onLogin) {
    const adminUrl = req.nextUrl.clone();
    adminUrl.pathname = "/admin";
    const redirect = NextResponse.redirect(adminUrl);
    res.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return res;
}

export const config = { matcher: ["/admin/:path*"] };
