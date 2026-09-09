# 관리자 콘솔 구현 계획 (Phase 3 · 묶음 B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 `/admin/login`으로 로그인해 상담 목록을 보고, 상담 상세에서 상태를 전이시키고 메모를 저장하며, 연결된 진단을 읽기 전용으로 확인한다.

**Architecture:** SSR 인증 게이트 — `middleware.ts`가 `@supabase/ssr`로 세션 쿠키를 갱신하고 `/admin/*` 접근을 통제한다. RSC 페이지는 `lib/supabase/session-client.ts`(anon 키 + 세션 쿠키, RLS `authenticated` 존중)로 직접 조회하고, 상태·메모 변경은 같은 클라이언트를 쓰는 server action이 처리한다. 전용 API 라우트 없음. `service_role` 클라이언트(`lib/supabase/server.ts`)는 이 묶음에서 건드리지 않는다.

**Tech Stack:** Next.js 16.3.4 (App Router, RSC, middleware), React 19.2.8, TypeScript 5, `@supabase/ssr` ^0.12.5, `@supabase/supabase-js` ^2.114.0, Tailwind v4(CSS 설정), zod 4.5. 테스트 러너 없음 — 검증은 `tsc`/`eslint`/`build` + Playwright + Supabase REST(service-role) 단언.

**Spec:** `docs/superpowers/specs/2026-09-09-admin-console-design.md` (executor는 이 스펙과 계획을 함께 읽는다)

> **정오표 (2026-09-09, Task 1 실행 중 확정):** Next 16은 `middleware.ts` 파일 규약을 폐기하고 `proxy.ts`로 개명했다(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`). 아래 본문의 `middleware.ts` / `export async function middleware` / 빌드 로그 `ƒ Middleware`는 전부 **`proxy.ts` / `export async function proxy` / `ƒ Proxy`**로 읽는다. `config.matcher`·동작은 동일. SDD 원장 참조.

## Global Constraints

- **브랜치 `feat/admin-console`에 로컬 커밋. push 금지.** 매 커밋 끝에:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XSxAwWvBpWrc12GWytcG5s
  ```
- **Next 16**: `params`·`searchParams`·`cookies()`·`headers()`는 전부 **Promise/async**. `PageProps<'/route'>`·`LayoutProps<'/route'>`는 `next dev`/`next build`가 생성하는 전역 타입 — **import 하지 않는다**. 린트는 `npx eslint <경로>`(`next lint` 없음). `middleware.ts`는 **리포 루트**.
- **`@supabase/ssr` 연동 코드는 구현 전 현행 문서 확인**: `node_modules/@supabase/ssr/dist/main/` 의 `createServerClient`/`createBrowserClient` 시그니처(0.12.x는 `cookies: { getAll, setAll }` 방식)와 `node_modules/next/dist/docs/` 의 middleware 가이드. 아래 코드 블록은 0.12 + Next 16 기준이나, 버전이 다르면 문서 우선.
- **테스트 러너 없음**: 순수 로직 유닛 테스트 대상이 없다(이 묶음은 auth/UI/데이터 접근 glue). 검증 = `npm run build` + `npx eslint <경로>` + `npx tsc --noEmit` + Playwright + Supabase REST 스크립트(`scratchpad/`에 두고 리포에 커밋하지 않음).
- **인증 클라이언트 3종 구분**:
  - `lib/supabase/server.ts` `createServiceClient()` — service_role, RLS 우회, **공개 API 라우트 전용**. 이 묶음에서 **import 하지 않는다.**
  - `lib/supabase/client.ts` `createBrowserSupabaseClient()` — anon, 브라우저. 로그인/로그아웃(`signInWithPassword`/`signOut`)에만.
  - `lib/supabase/session-client.ts` `createSessionClient()` — anon + 세션 쿠키, **서버(RSC·server action) 전용**, `import "server-only"`. 목록·상세 조회, 상태·메모 update.
- **`SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 컴포넌트/`NEXT_PUBLIC_*`/미들웨어에 넣지 않는다.** 미들웨어·세션 클라이언트는 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`만.
- **PII 표시 정책**: 로그인한 관리자에게는 `leads`의 이름·전화·이메일을 **표시한다**(연락 목적, RLS `admin_select_leads` 허용). 공개 경계(기획서 §16.1)는 브라우저·n8n·AI 대상이지 관리자 대상이 아니다. 단 로그·에러 메시지에는 PII를 넣지 않는다(Supabase 오류는 `error.code` + `error.message`만 로그).
- **마이그레이션 없음. 새 env 없음. 스키마·RLS 변경 없음.**
- **상태 값·라벨** (`consultations.status` CHECK 와 1:1):
  `NEW`=신규 / `CONTACT_PENDING`=연락 예정 / `SCHEDULED`=일정 확정 / `PROPOSAL_SENT`=제안 발송 / `CONTRACTED`=계약 / `ON_HOLD`=보류 / `CLOSED`=종료.
  진단(`diagnoses.status`): `SUBMITTED`=접수 / `PROCESSING`=분석 중 / `COMPLETED`=완료 / `FAILED`=실패.
- **필터 그룹** (`/admin?filter=`): `all`(기본) / `new`=`[NEW]` / `active`=`[CONTACT_PENDING,SCHEDULED,PROPOSAL_SENT]` / `closed`=`[CONTRACTED,ON_HOLD,CLOSED]`. 미지정·이상값 → `all`.
- **사용자 문구는 한국어.** 라이트 전용, 다크모드 없음. `--wak-*` 토큰만: `text-ink` / `text-ink-soft` / `border-line` / `bg-panel` / `bg-paper` / `text-signal` / `bg-signal` / `text-danger` / `border-danger` / `font-flow`(mono) / `font-display`. `cn` 헬퍼는 `@/lib/utils`. frontend-design 패스 없음.
- **옵션 라벨은 `lib/options.ts`에서만** 참조(`OPTIONS.industry` 등). 하드코딩 금지.
- **server action 반환 규약**: `{ ok: true } | { error: string }` (error 는 한글 사용자 문구).

---

## 파일 구조

**신규**

| 경로 | 책임 |
|---|---|
| `lib/supabase/session-client.ts` | `createSessionClient()` — `await cookies()` + `createServerClient`(anon). `import "server-only"`. RSC·server action이 RLS `authenticated`로 조회/갱신 |
| `middleware.ts` (리포 루트) | 세션 쿠키 갱신(`getUser()`) + `/admin/*` 게이트: 세션 없음→`/admin/login`, 세션 있고 `/admin/login`→`/admin`. `matcher: ["/admin/:path*"]` |
| `components/admin/admin-shell.tsx` | `"use client"` — 헤더(워드마크 + 관리자 이메일 + 로그아웃) + `<main>` 래퍼. `userEmail` prop |
| `components/admin/status-badge.tsx` | server 컴포넌트 — `{ kind: "consultation" \| "diagnosis"; value: string }` → 한글 라벨 + 토큰 색 `<span>` |
| `components/admin/status-select.tsx` | `"use client"` — 상담 상태 `<select>` 7값. onChange→`updateConsultationStatus`, `useTransition` pending, 실패 시 원복 + 인라인 오류 |
| `components/admin/memo-editor.tsx` | `"use client"` — `<textarea>` + "메모 저장" 버튼(dirty일 때만 활성). `updateConsultationMemo` 호출, pending/성공/실패 표시 |
| `app/admin/consultations/[id]/actions.ts` | `"use server"` — `updateConsultationStatus(id, next)`, `updateConsultationMemo(id, memo)`. zod 검증 + `createSessionClient` update + `revalidatePath` |

**교체 (스텁 → 구현)**

| 경로 | 변경 |
|---|---|
| `app/admin/layout.tsx` | RSC. `createSessionClient().auth.getUser()` → 없으면 `{children}`, 있으면 `<AdminShell userEmail>` |
| `app/admin/login/page.tsx` | `"use client"` 로그인 폼 (`signInWithPassword` → `router.push('/admin'); router.refresh()`) |
| `app/admin/page.tsx` | RSC. 상담 목록 + 요약 줄 + `?filter=` (URL = `/admin`) |
| `app/admin/consultations/[id]/page.tsx` | RSC. 읽기 블록 + `<StatusSelect>` + `<MemoEditor>` |
| `app/admin/diagnoses/[id]/page.tsx` | RSC. 진단 입력값 + AI 결과 읽기 전용 |

**재사용 (변경 없음, import만)**: `lib/supabase/client.ts`(`createBrowserSupabaseClient`), `lib/options.ts`(`OPTIONS`), `lib/utils.ts`(`cn`).

**임시 (검증용, 리포 밖 — `scratchpad/`)**: `admin-seed.mjs`(검증 데이터 생성), `admin-verify.mjs`(DB 단언), `admin-teardown.mjs`(삭제). 커밋하지 않음.

---

## Task 1: 세션 클라이언트 + 미들웨어 (인증 배관)

**Files:**
- Create: `lib/supabase/session-client.ts`
- Create: `middleware.ts` (리포 루트)

**Interfaces:**
- Consumes: `@supabase/ssr` `createServerClient`, `next/headers` `cookies`, `next/server` `NextRequest`/`NextResponse`. env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Produces:
  - `createSessionClient(): Promise<SupabaseClient>` — `import "server-only"`. RSC·server action에서 `const supabase = await createSessionClient()`.
  - `middleware.ts` 기본 export + `config.matcher`.

- [ ] **Step 1: `@supabase/ssr` + Next 16 미들웨어 현행 확인**

Run:
```bash
sed -n '1,60p' node_modules/@supabase/ssr/dist/main/createServerClient.d.ts 2>/dev/null || cat node_modules/@supabase/ssr/dist/main/index.d.ts
ls node_modules/next/dist/docs/ 2>/dev/null | head
```
Expected: `cookies` 옵션이 `{ getAll(): {name,value}[]; setAll(cookies): void }` 형태임을 확인. 다르면 아래 코드를 그 시그니처에 맞춘다.

- [ ] **Step 2: `lib/supabase/session-client.ts`**

```ts
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
```

- [ ] **Step 3: `middleware.ts`**

```ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  // getUser() = 서버 검증. getSession() 은 쿠키만 보므로 게이트에 부적합.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const onLogin = req.nextUrl.pathname === "/admin/login";

  if (!user && !onLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  if (user && onLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = { matcher: ["/admin/:path*"] };
```

- [ ] **Step 4: 빌드 + 린트 + 타입**

Run: `npm run build && npx eslint lib/supabase/session-client.ts middleware.ts && npx tsc --noEmit`
Expected: exit 0. `middleware.ts` non-null assertion(`!`) 경고 없이 통과(eslint 설정상 허용). 빌드 로그에 `ƒ Middleware` 표기.

- [ ] **Step 5: 미인증 리다이렉트 확인**

Run:
```bash
(npm run dev > /tmp/dev.log 2>&1 &) ; sleep 6
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/admin
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/login
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/admin/consultations/abc
pkill -f "next dev"
```
Expected:
- `/admin` → `307` 이고 `redirect_url` 이 `.../admin/login`
- `/admin/login` → `200`
- `/admin/consultations/abc` → `307` → `.../admin/login`

- [ ] **Step 6: 커밋**

```bash
git add lib/supabase/session-client.ts middleware.ts
git commit -m "$(cat <<'EOF'
feat(admin): SSR 인증 배관 — 세션 클라이언트 + 미들웨어 게이트 (B2)

lib/supabase/session-client.ts: anon+세션 쿠키 서버 클라이언트(RLS authenticated).
middleware.ts: getUser() 세션 갱신 + /admin/* 게이트(미인증→/admin/login,
인증+/admin/login→/admin). matcher ["/admin/:path*"]. 마이그레이션·env 없음.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XSxAwWvBpWrc12GWytcG5s
EOF
)"
```

---

## Task 2: 로그인 페이지 + 레이아웃 게이트 + AdminShell

**Files:**
- Modify: `app/admin/layout.tsx` (스텁 → 게이트)
- Modify: `app/admin/login/page.tsx` (스텁 → 폼)
- Create: `components/admin/admin-shell.tsx`

**Interfaces:**
- Consumes: `createSessionClient` (Task 1), `createBrowserSupabaseClient` (`@/lib/supabase/client`), `next/navigation` `useRouter`.
- Produces: `<AdminShell userEmail={string}>` (named export). 인증된 `/admin/*` 페이지는 이 셸 안에서 렌더된다.

- [ ] **Step 1: `components/admin/admin-shell.tsx`**

```tsx
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
    await createBrowserSupabaseClient().auth.signOut();
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
```

- [ ] **Step 2: `app/admin/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import { createSessionClient } from "@/lib/supabase/session-client";
import { AdminShell } from "@/components/admin/admin-shell";

// 미들웨어가 이미 미인증 접근을 막지만, 레이아웃에서도 세션을 재확인한다(방어).
// 세션 없음 = /admin/login 만 여기 도달 → 셸 없이 폼만 렌더.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div className="min-h-full bg-paper text-ink">{children}</div>;
  return <AdminShell userEmail={user.email}>{children}</AdminShell>;
}
```

> `LayoutProps<"/admin">` 타입은 import 하지 않는다(Global Constraints). `{ children: ReactNode }` 직접 명시.

- [ ] **Step 3: `app/admin/login/page.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: authError } = await createBrowserSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (authError) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5">
      <form onSubmit={onSubmit} className="w-full max-w-[22rem] rounded-lg border border-line bg-panel p-6">
        <h1 className="text-[1.1rem] font-extrabold tracking-tight text-ink">관리자 로그인</h1>
        <label className="mt-5 block text-[0.85rem] text-ink-soft">
          이메일
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-[0.95rem] text-ink outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          />
        </label>
        <label className="mt-4 block text-[0.85rem] text-ink-soft">
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-[0.95rem] text-ink outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          />
        </label>
        {error && (
          <p className="mt-4 border-l-2 border-danger bg-danger/[0.05] px-3 py-2 text-[0.85rem] text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-5 min-h-11 w-full rounded-md bg-signal px-4 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-60 motion-reduce:transition-none"
        >
          {submitting ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: 빌드 + 린트 + 타입**

Run: `npm run build && npx eslint app/admin components/admin && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: 검증 — 로그인 실패 + 성공 + 역게이트**

`scratchpad/admin-seed.mjs`로 검증용 관리자를 만든다(가입은 비활성이지만 service-role `admin.createUser`는 됨):

```js
// scratchpad/admin-seed.mjs — 검증 데이터 시드. 리포에 커밋하지 않음.
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

// 1. 검증용 관리자
const email = "verify-admin@webagent.test";
const password = "Vrfy!admin-9271";
const u = await fetch(`${SB}/auth/v1/admin/users`, {
  method: "POST", headers: H,
  body: JSON.stringify({ email, password, email_confirm: true }),
});
console.log("admin create:", u.status, (await u.json()).id ?? "");
console.log("LOGIN:", email, "/", password);
```

Run: `node scratchpad/admin-seed.mjs`

그다음 Playwright(`mcp__plugin_playwright_playwright__*`):
1. `/admin/login` → `verify-admin@webagent.test` + **틀린 비번** 제출 → 인라인 "이메일 또는 비밀번호가 올바르지 않습니다." + URL 그대로.
2. 같은 이메일 + **맞는 비번** 제출 → `/admin` 로 이동, 헤더에 이메일 + "로그아웃" 버튼(현재 `/admin` 은 아직 스텁이라 본문은 스텁 문구여도 OK — 셸이 감싸는지만 확인).
3. 로그인 상태로 `/admin/login` 직접 열기 → 미들웨어가 `/admin` 으로 리다이렉트.
4. "로그아웃" 클릭 → `/admin/login` 으로, 이후 `/admin` 접근 시 다시 로그인으로.

Expected: 4개 통과. (실패 시 미들웨어 쿠키 전달 패턴부터 재확인.)

- [ ] **Step 6: 커밋**

```bash
git add app/admin/layout.tsx app/admin/login/page.tsx components/admin/admin-shell.tsx
git commit -m "$(cat <<'EOF'
feat(admin): 로그인 폼 + 레이아웃 세션 게이트 + AdminShell (B3)

layout: getUser() 분기 — 미인증이면 폼만, 인증이면 AdminShell(헤더+로그아웃).
login: signInWithPassword → /admin push+refresh, 실패 시 인라인 한글 오류.
AdminShell: 워드마크 + 이메일 + signOut.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XSxAwWvBpWrc12GWytcG5s
EOF
)"
```

---

## Task 3: `status-badge` + `/admin` 상담 목록

**Files:**
- Create: `components/admin/status-badge.tsx`
- Modify: `app/admin/page.tsx` (스텁 → 목록)

**Interfaces:**
- Consumes: `createSessionClient` (Task 1). `OPTIONS` 는 이 태스크에선 안 씀(라벨은 DB 저장값 그대로 표시).
- Produces:
  - `<StatusBadge kind={"consultation" | "diagnosis"} value={string} />` (named export) — Task 5·6이 재사용.
  - `/admin` 이 `?filter=all|new|active|closed` 를 읽어 목록을 거른다.

- [ ] **Step 1: `components/admin/status-badge.tsx`**

```tsx
import { cn } from "@/lib/utils";

const CONSULTATION: Record<string, { label: string; cls: string }> = {
  NEW: { label: "신규", cls: "bg-signal/10 text-signal" },
  CONTACT_PENDING: { label: "연락 예정", cls: "bg-panel text-ink border border-line" },
  SCHEDULED: { label: "일정 확정", cls: "bg-panel text-ink border border-line" },
  PROPOSAL_SENT: { label: "제안 발송", cls: "bg-panel text-ink border border-line" },
  CONTRACTED: { label: "계약", cls: "bg-signal text-white" },
  ON_HOLD: { label: "보류", cls: "bg-panel text-ink-soft border border-line" },
  CLOSED: { label: "종료", cls: "bg-panel text-ink-soft border border-line" },
};

const DIAGNOSIS: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: "접수", cls: "bg-panel text-ink border border-line" },
  PROCESSING: { label: "분석 중", cls: "bg-panel text-ink border border-line" },
  COMPLETED: { label: "완료", cls: "bg-signal/10 text-signal" },
  FAILED: { label: "실패", cls: "bg-danger/[0.08] text-danger" },
};

export function StatusBadge({
  kind,
  value,
}: {
  kind: "consultation" | "diagnosis";
  value: string;
}) {
  const map = kind === "consultation" ? CONSULTATION : DIAGNOSIS;
  const hit = map[value] ?? { label: value, cls: "bg-panel text-ink-soft border border-line" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.72rem] font-medium whitespace-nowrap",
        hit.cls,
      )}
    >
      {hit.label}
    </span>
  );
}
```

- [ ] **Step 2: `app/admin/page.tsx`**

```tsx
import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/session-client";
import { StatusBadge } from "@/components/admin/status-badge";
import { cn } from "@/lib/utils";

const FILTERS = {
  all: { label: "전체", statuses: null as string[] | null },
  new: { label: "신규", statuses: ["NEW"] },
  active: { label: "진행중", statuses: ["CONTACT_PENDING", "SCHEDULED", "PROPOSAL_SENT"] },
  closed: { label: "종결", statuses: ["CONTRACTED", "ON_HOLD", "CLOSED"] },
} as const;
type FilterKey = keyof typeof FILTERS;

type Row = {
  id: string;
  status: string;
  consultation_type: string | null;
  preferred_date: string | null;
  suggested_service_type: string | null;
  created_at: string;
  leads: { company_name: string } | null;
};

function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter: FilterKey = sp.filter && sp.filter in FILTERS ? (sp.filter as FilterKey) : "all";

  const supabase = await createSessionClient();

  let query = supabase
    .from("consultations")
    .select("id,status,consultation_type,preferred_date,suggested_service_type,created_at,leads(company_name)")
    .order("created_at", { ascending: false });
  const statuses = FILTERS[filter].statuses;
  if (statuses) query = query.in("status", statuses);

  const [{ data: rows, error }, todayDiag, newCount] = await Promise.all([
    query,
    supabase.from("diagnoses").select("id", { count: "exact", head: true }).gte("created_at", todayStartIso()),
    supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "NEW"),
  ]);

  if (error) {
    return <p className="text-[0.9rem] text-danger">데이터를 불러오지 못했습니다.</p>;
  }

  const list = (rows ?? []) as Row[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[1.3rem] font-extrabold tracking-tight text-ink">상담</h1>
        <p className="mt-1 text-[0.8rem] text-ink-soft">
          오늘 접수된 진단 {todayDiag.count ?? 0}건 · 미착수 상담 {newCount.count ?? 0}건
        </p>
      </div>

      <nav className="flex gap-1 text-[0.8rem]">
        {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
          <Link
            key={k}
            href={k === "all" ? "/admin" : `/admin?filter=${k}`}
            className={cn(
              "min-h-9 rounded-md px-3 py-1.5 transition-colors motion-reduce:transition-none",
              k === filter ? "bg-signal text-white" : "text-ink-soft hover:bg-panel hover:text-ink",
            )}
          >
            {FILTERS[k].label}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <p className="text-[0.9rem] text-ink-soft">해당하는 상담이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-[0.85rem]">
            <thead>
              <tr className="border-b border-line text-left text-[0.75rem] text-ink-soft">
                <th className="py-2 pr-3 font-medium">상태</th>
                <th className="py-2 pr-3 font-medium">회사</th>
                <th className="py-2 pr-3 font-medium">상담 방식 / 희망 시기</th>
                <th className="py-2 pr-3 font-medium">추정 서비스</th>
                <th className="py-2 font-medium">접수일</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-line hover:bg-panel">
                  <td className="py-2.5 pr-3">
                    <Link href={`/admin/consultations/${r.id}`} className="block">
                      <StatusBadge kind="consultation" value={r.status} />
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/admin/consultations/${r.id}`} className="block text-ink hover:text-signal">
                      {r.leads?.company_name ?? "—"}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-ink-soft">
                    {(r.consultation_type ?? "—") + " / " + (r.preferred_date ?? "—")}
                  </td>
                  <td className="py-2.5 pr-3 text-ink-soft">{r.suggested_service_type ?? "—"}</td>
                  <td className="py-2.5 text-ink-soft">{r.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

> `leads(company_name)` 조인 형태: PostgREST가 1:1을 객체로 반환하므로 `leads: { company_name } | null`. `@supabase/supabase-js` 타입이 배열로 추론하면 `Row` 타입에서 `leads: { company_name: string } | { company_name: string }[] | null` 로 받고 `Array.isArray` 분기 — 구현 시 `tsc` 결과에 맞춘다.

- [ ] **Step 3: 빌드 + 린트 + 타입**

Run: `npm run build && npx eslint app/admin/page.tsx components/admin/status-badge.tsx && npx tsc --noEmit`
Expected: exit 0. `/admin` 은 `ƒ`(동적, searchParams).

- [ ] **Step 4: 검증 — 시드 + 목록/필터/요약**

`scratchpad/admin-seed.mjs` 에 상담·진단 시드를 추가(관리자 생성 코드 아래에 이어붙임):

```js
// --- 검증용 lead + 진단 + 상담 ---
const mkLead = async (suffix) => {
  const r = await fetch(`${SB}/rest/v1/leads`, {
    method: "POST", headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({
      company_name: `검증상담_${suffix}`, industry: "IT·소프트웨어", employee_count: "5-10명",
      contact_name: "관리자검증", email: `admin-verify-${suffix}@webagent.test`, phone: "010-0000-0000",
    }),
  });
  return (await r.json())[0].id;
};
const post = (t, body) => fetch(`${SB}/rest/v1/${t}`, {
  method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body),
}).then((r) => r.json());

const leadA = await mkLead("A");
const diagA = (await post("diagnoses", { lead_id: leadA, status: "COMPLETED", industry: undefined,
  website_status: "없음", current_tools: ["Excel"], repetitive_tasks: ["문의"], daily_hours: "2~4시간",
  staff_count: "2~3명", monthly_volume: "50~200건", purpose: "업무 시간 절감", budget_range: "300~500만원",
  pain_point: "문의 응대 반복" }))[0].id;
await post("diagnosis_results", { diagnosis_id: diagA, automation_score: 68,
  recommended_tasks: [{ name: "견적 자동화", reason: "정형화됨", difficulty: "낮음", estimatedMonthlySavedHours: 12 }],
  estimated_saved_hours: { min: 40, max: 60 }, recommended_stack: ["n8n", "Supabase"],
  implementation_steps: ["1주차: 견적"], ai_summary: "반복 입력 자동화 여지 큼" });
await post("consultations", { lead_id: leadA, diagnosis_id: diagA, suggested_service_type: "Smart Website",
  preferred_date: "가능한 빨리", consultation_type: "온라인 미팅", status: "NEW" });

const leadB = await mkLead("B");
await post("consultations", { lead_id: leadB, preferred_date: "1주일 이내",
  consultation_type: "전화", status: "PROPOSAL_SENT" });
console.log("seed done: consultations 2 (NEW, PROPOSAL_SENT), diagnosis 1 (COMPLETED)");
```

Run: `node scratchpad/admin-seed.mjs` 후 `npm run dev`, Playwright:
1. `verify-admin` 로그인 → `/admin` → 표에 2행. NEW / PROPOSAL_SENT 뱃지.
2. 요약 줄: "오늘 접수된 진단 1건 · 미착수 상담 1건" (시드가 오늘 생성).
3. `?filter=new` → 1행(검증상담_A). `?filter=active` → 1행(검증상담_B). `?filter=closed` → "해당하는 상담이 없습니다."
4. 행 클릭 → `/admin/consultations/<id>` 로 이동(현재 스텁이어도 URL 확인).

Expected: 4개 통과.

- [ ] **Step 5: 커밋**

```bash
git add app/admin/page.tsx components/admin/status-badge.tsx
git commit -m "$(cat <<'EOF'
feat(admin): 상담 목록 홈 + 상태 뱃지 (B4)

/admin: RSC 상담 목록(최근순) + 요약 줄(오늘 진단·미착수 상담) +
?filter=all|new|active|closed. StatusBadge(consultation|diagnosis 겸용).
세션 클라이언트 직접 조회, RLS authenticated.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XSxAwWvBpWrc12GWytcG5s
EOF
)"
```

---

## Task 4: `/admin/consultations/[id]` — 읽기 뷰

**Files:**
- Modify: `app/admin/consultations/[id]/page.tsx` (스텁 → 읽기 뷰)

**Interfaces:**
- Consumes: `createSessionClient` (Task 1), `<StatusBadge>` (Task 3), `next/navigation` `notFound`.
- Produces: `/admin/consultations/[id]` 읽기 블록. Task 5가 이 파일에 `<StatusSelect>`·`<MemoEditor>` 를 끼운다.

- [ ] **Step 1: `app/admin/consultations/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session-client";
import { StatusBadge } from "@/components/admin/status-badge";

type Consultation = {
  id: string;
  status: string;
  consultation_type: string | null;
  preferred_date: string | null;
  suggested_service_type: string | null;
  memo: string | null;
  created_at: string;
  diagnosis_id: string | null;
  leads: {
    company_name: string;
    industry: string;
    employee_count: string;
    contact_name: string;
    email: string;
    phone: string;
  } | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 text-[0.88rem]">
      <span className="w-24 shrink-0 text-ink-soft">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-4">
      <h2 className="text-[0.8rem] font-semibold tracking-tight text-ink-soft">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default async function ConsultationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSessionClient();

  const { data, error } = await supabase
    .from("consultations")
    .select(
      "id,status,consultation_type,preferred_date,suggested_service_type,memo,created_at,diagnosis_id," +
        "leads(company_name,industry,employee_count,contact_name,email,phone)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <p className="text-[0.9rem] text-danger">데이터를 불러오지 못했습니다.</p>;
  }
  if (!data) notFound();
  const c = data as unknown as Consultation;

  let diagSummary: { score: number | null; summary: string | null } | null = null;
  if (c.diagnosis_id) {
    const { data: dr } = await supabase
      .from("diagnosis_results")
      .select("automation_score,ai_summary")
      .eq("diagnosis_id", c.diagnosis_id)
      .maybeSingle();
    diagSummary = dr
      ? { score: dr.automation_score as number | null, summary: dr.ai_summary as string | null }
      : { score: null, summary: null };
  }

  const lead = c.leads;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[1.2rem] font-extrabold tracking-tight text-ink">
          {lead?.company_name ?? "상담"}
        </h1>
        <StatusBadge kind="consultation" value={c.status} />
      </div>

      <Section title="연락처">
        <Field label="이름" value={lead?.contact_name ?? "—"} />
        <Field label="전화" value={lead?.phone ?? "—"} />
        <Field label="이메일" value={lead?.email ?? "—"} />
      </Section>

      <Section title="회사">
        <Field label="회사명" value={lead?.company_name ?? "—"} />
        <Field label="업종" value={lead?.industry ?? "—"} />
        <Field label="직원 수" value={lead?.employee_count ?? "—"} />
      </Section>

      <Section title="상담">
        <Field label="방식" value={c.consultation_type ?? "—"} />
        <Field label="희망 시기" value={c.preferred_date ?? "—"} />
        <Field label="추정 서비스" value={c.suggested_service_type ?? "—"} />
        <Field label="접수일" value={c.created_at.slice(0, 10)} />
      </Section>

      <Section title="연결 진단">
        {c.diagnosis_id ? (
          <div className="text-[0.88rem]">
            <p className="text-ink">
              자동화 준비도 {diagSummary?.score ?? "—"}
              {diagSummary?.summary ? ` · ${diagSummary.summary.slice(0, 80)}` : ""}
            </p>
            <Link
              href={`/admin/diagnoses/${c.diagnosis_id}`}
              className="mt-1 inline-block text-signal underline underline-offset-2"
            >
              진단 상세 보기
            </Link>
          </div>
        ) : (
          <p className="text-[0.88rem] text-ink-soft">연결된 진단 없음</p>
        )}
      </Section>

      <Link href="/admin" className="mt-2 text-[0.82rem] text-ink-soft hover:text-ink">
        ← 목록으로
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 + 린트 + 타입**

Run: `npm run build && npx eslint app/admin/consultations && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: 검증 — 읽기 뷰 두 경로 + 404**

`npm run dev`, `verify-admin` 로그인, Task 3 시드 데이터로:
1. `검증상담_A` 상세 → 연락처·회사·상담 블록 채워짐, "연결 진단" = 준비도 68 + 요약 발췌 + "진단 상세 보기" 링크(`/admin/diagnoses/<diagA>`).
2. `검증상담_B` 상세 → "연결된 진단 없음".
3. `/admin/consultations/00000000-0000-4000-8000-000000000000` → Next 404 페이지.
4. 미인증(로그아웃 후) `/admin/consultations/<id>` → `/admin/login` 리다이렉트.

Expected: 4개 통과.

- [ ] **Step 4: 커밋**

```bash
git add app/admin/consultations/[id]/page.tsx
git commit -m "$(cat <<'EOF'
feat(admin): 상담 상세 읽기 뷰 (B5-1)

연락처·회사·상담·연결 진단(준비도+요약 발췌+진단 상세 링크) 표시.
없는 id → notFound(). diagnosis_id 없으면 "연결된 진단 없음".
세션 클라이언트 조회, PII 는 로그인 관리자에게만.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XSxAwWvBpWrc12GWytcG5s
EOF
)"
```

---

## Task 5: 상태 변경 + 메모 저장 (server action + 아일랜드)

**Files:**
- Create: `app/admin/consultations/[id]/actions.ts`
- Create: `components/admin/status-select.tsx`
- Create: `components/admin/memo-editor.tsx`
- Modify: `app/admin/consultations/[id]/page.tsx` (아일랜드 2개 삽입)

**Interfaces:**
- Consumes: `createSessionClient` (Task 1). 페이지가 넘기는 props: `id: string`, `current: string`(상태), `initial: string`(메모).
- Produces:
  - `updateConsultationStatus(id: string, next: string): Promise<{ ok: true } | { error: string }>`
  - `updateConsultationMemo(id: string, memo: string): Promise<{ ok: true } | { error: string }>`
  - `<StatusSelect consultationId={string} current={string} />`, `<MemoEditor consultationId={string} initial={string} />` (named exports)

- [ ] **Step 1: `app/admin/consultations/[id]/actions.ts`**

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSessionClient } from "@/lib/supabase/session-client";

const STATUS = [
  "NEW",
  "CONTACT_PENDING",
  "SCHEDULED",
  "PROPOSAL_SENT",
  "CONTRACTED",
  "ON_HOLD",
  "CLOSED",
] as const;

type ActionResult = { ok: true } | { error: string };

export async function updateConsultationStatus(id: string, next: string): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), next: z.enum(STATUS) }).safeParse({ id, next });
  if (!parsed.success) return { error: "잘못된 요청입니다." };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("consultations")
    .update({ status: parsed.data.next })
    .eq("id", parsed.data.id);
  if (error) {
    console.error("[admin] status update 실패:", error.code, error.message);
    return { error: "상태 변경에 실패했습니다." };
  }
  revalidatePath(`/admin/consultations/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateConsultationMemo(id: string, memo: string): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), memo: z.string().max(5000) }).safeParse({ id, memo });
  if (!parsed.success) return { error: "메모가 너무 깁니다." };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("consultations")
    .update({ memo: parsed.data.memo })
    .eq("id", parsed.data.id);
  if (error) {
    console.error("[admin] memo update 실패:", error.code, error.message);
    return { error: "메모 저장에 실패했습니다." };
  }
  revalidatePath(`/admin/consultations/${id}`);
  return { ok: true };
}
```

- [ ] **Step 2: `components/admin/status-select.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { updateConsultationStatus } from "@/app/admin/consultations/[id]/actions";

const OPTIONS: { value: string; label: string }[] = [
  { value: "NEW", label: "신규" },
  { value: "CONTACT_PENDING", label: "연락 예정" },
  { value: "SCHEDULED", label: "일정 확정" },
  { value: "PROPOSAL_SENT", label: "제안 발송" },
  { value: "CONTRACTED", label: "계약" },
  { value: "ON_HOLD", label: "보류" },
  { value: "CLOSED", label: "종료" },
];

export function StatusSelect({
  consultationId,
  current,
}: {
  consultationId: string;
  current: string;
}) {
  const [value, setValue] = useState(current);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const onChange = (next: string) => {
    const prev = value;
    setValue(next);
    setMsg(null);
    startTransition(async () => {
      const r = await updateConsultationStatus(consultationId, next);
      if ("error" in r) {
        setValue(prev);
        setMsg({ kind: "err", text: r.error });
      } else {
        setMsg({ kind: "ok", text: "저장됨" });
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-9 rounded-md border border-line bg-paper px-2 text-[0.85rem] text-ink outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-60"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending && <span className="text-[0.75rem] text-ink-soft">저장 중…</span>}
      {msg && (
        <span className={msg.kind === "ok" ? "text-[0.75rem] text-signal" : "text-[0.75rem] text-danger"}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `components/admin/memo-editor.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { updateConsultationMemo } from "@/app/admin/consultations/[id]/actions";

export function MemoEditor({
  consultationId,
  initial,
}: {
  consultationId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = value !== saved;

  const onSave = () => {
    setMsg(null);
    startTransition(async () => {
      const r = await updateConsultationMemo(consultationId, value);
      if ("error" in r) {
        setMsg({ kind: "err", text: r.error });
      } else {
        setSaved(value);
        setMsg({ kind: "ok", text: "저장됨" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        maxLength={5000}
        className="w-full resize-y rounded-md border border-line bg-paper p-3 text-[0.88rem] text-ink outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={onSave}
          className="min-h-9 rounded-md bg-signal px-4 text-[0.85rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-50 motion-reduce:transition-none"
        >
          {pending ? "저장 중…" : "메모 저장"}
        </button>
        {msg && (
          <span className={msg.kind === "ok" ? "text-[0.75rem] text-signal" : "text-[0.75rem] text-danger"}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `page.tsx` 에 아일랜드 삽입**

`app/admin/consultations/[id]/page.tsx` 상단 import 에 추가:
```tsx
import { StatusSelect } from "@/components/admin/status-select";
import { MemoEditor } from "@/components/admin/memo-editor";
```

`<Section title="상담">` 의 `<Field label="추정 서비스" …/>` 아래에 상태 편집 줄 추가(읽기용 `<Field label="접수일">` 은 유지), 그리고 "연결 진단" 섹션 뒤에 메모 섹션 추가:

```tsx
      <Section title="상담">
        <Field label="방식" value={c.consultation_type ?? "—"} />
        <Field label="희망 시기" value={c.preferred_date ?? "—"} />
        <Field label="추정 서비스" value={c.suggested_service_type ?? "—"} />
        <Field label="접수일" value={c.created_at.slice(0, 10)} />
        <div className="flex gap-3 py-1.5 text-[0.88rem]">
          <span className="w-24 shrink-0 text-ink-soft">상태</span>
          <StatusSelect consultationId={c.id} current={c.status} />
        </div>
      </Section>

      {/* …연결 진단 Section… */}

      <Section title="메모">
        <MemoEditor consultationId={c.id} initial={c.memo ?? ""} />
      </Section>
```

- [ ] **Step 5: 빌드 + 린트 + 타입**

Run: `npm run build && npx eslint app/admin components/admin && npx tsc --noEmit`
Expected: exit 0. server action import 경로(`@/app/admin/consultations/[id]/actions`)가 `[id]` 대괄호 포함 — tsconfig `paths` `@/*` 로 해석되는지 확인(빌드 통과면 OK).

- [ ] **Step 6: 검증 — 상태 전이 + 메모 + 실패 경로**

`npm run dev`, `verify-admin` 로그인, `검증상담_A` 상세:
1. 상태 `<select>` 를 `연락 예정` 으로 변경 → "저장 중…" → "저장됨". `scratchpad/admin-verify.mjs` 로 DB 확인:
   ```js
   // consultations.status === 'CONTACT_PENDING' && updated_at > created_at
   ```
2. `/admin` 목록 재방문 → `검증상담_A` 뱃지가 "연락 예정", `?filter=new` 에서 사라지고 `?filter=active` 에 나타남.
3. 메모에 "1차 통화 완료, 다음 주 미팅" 입력 → "메모 저장" 클릭 → "저장됨". 페이지 새로고침 → `<textarea>` 에 프리필. DB `consultations.memo` 확인.
4. 메모를 바꾸지 않은 상태에서 버튼 `disabled` 인지 확인.
5. (실패 경로) 브라우저 콘솔에서 `updateConsultationStatus("not-a-uuid","NEW")` 직접 호출은 불가하므로, 대신 `status-select` 에 존재하지 않는 값이 갈 일이 없음을 코드로 확인 — zod `enum` 가드가 있으니 스킵. 대신 세션 만료 시나리오: 다른 탭에서 로그아웃 후 상태 변경 시도 → 미들웨어가 페이지 진입을 이미 막으므로 재현 어려움. **문서에 "action은 미들웨어 게이트 뒤에서만 도달, zod가 2차 방어"로 남기고 넘어간다.**

Expected: 1~4 통과.

- [ ] **Step 7: 커밋**

```bash
git add app/admin/consultations/[id]/actions.ts app/admin/consultations/[id]/page.tsx components/admin/status-select.tsx components/admin/memo-editor.tsx
git commit -m "$(cat <<'EOF'
feat(admin): 상담 상태 전이 + 메모 저장 (B5-2)

actions.ts: updateConsultationStatus / updateConsultationMemo — zod 검증 +
세션 클라이언트 update + revalidatePath. StatusSelect(7값, 즉시 저장, 실패
시 원복), MemoEditor(dirty일 때만 저장). RLS admin_update_consultations.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XSxAwWvBpWrc12GWytcG5s
EOF
)"
```

---

## Task 6: `/admin/diagnoses/[id]` — 진단 상세 (읽기 전용) + task.md

**Files:**
- Modify: `app/admin/diagnoses/[id]/page.tsx` (스텁 → 읽기 뷰)
- Modify: `task.md` (묶음 B B1~B7 체크 + 이탈·메모)

**Interfaces:**
- Consumes: `createSessionClient` (Task 1), `<StatusBadge>` (Task 3), `notFound`.
- Produces: 없음 (묶음 B 페이지 완성).

- [ ] **Step 1: `app/admin/diagnoses/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session-client";
import { StatusBadge } from "@/components/admin/status-badge";

type Diagnosis = {
  id: string;
  status: string;
  website_status: string | null;
  current_tools: string[];
  repetitive_tasks: string[];
  daily_hours: string | null;
  staff_count: string | null;
  monthly_volume: string | null;
  purpose: string | null;
  budget_range: string | null;
  pain_point: string | null;
  created_at: string;
  leads: { company_name: string; industry: string; employee_count: string; contact_name: string; email: string; phone: string } | null;
};
type Result = {
  automation_score: number | null;
  recommended_tasks: { name: string; reason: string; difficulty?: string; estimatedMonthlySavedHours?: number }[];
  estimated_saved_hours: { min: number; max: number } | null;
  recommended_stack: string[] | null;
  implementation_steps: string[] | null;
  ai_summary: string | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 text-[0.88rem]">
      <span className="w-28 shrink-0 text-ink-soft">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-4">
      <h2 className="text-[0.8rem] font-semibold tracking-tight text-ink-soft">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default async function DiagnosisDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSessionClient();

  const { data, error } = await supabase
    .from("diagnoses")
    .select(
      "id,status,website_status,current_tools,repetitive_tasks,daily_hours,staff_count,monthly_volume," +
        "purpose,budget_range,pain_point,created_at," +
        "leads(company_name,industry,employee_count,contact_name,email,phone)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return <p className="text-[0.9rem] text-danger">데이터를 불러오지 못했습니다.</p>;
  if (!data) notFound();
  const d = data as unknown as Diagnosis;

  const { data: rRow } = await supabase
    .from("diagnosis_results")
    .select("automation_score,recommended_tasks,estimated_saved_hours,recommended_stack,implementation_steps,ai_summary")
    .eq("diagnosis_id", id)
    .maybeSingle();
  const r = rRow as unknown as Result | null;
  const lead = d.leads;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[1.2rem] font-extrabold tracking-tight text-ink">{lead?.company_name ?? "진단"}</h1>
        <StatusBadge kind="diagnosis" value={d.status} />
      </div>

      <Section title="연락처">
        <Field label="이름" value={lead?.contact_name ?? "—"} />
        <Field label="전화" value={lead?.phone ?? "—"} />
        <Field label="이메일" value={lead?.email ?? "—"} />
      </Section>

      <Section title="진단 입력값">
        <Field label="업종" value={lead?.industry ?? "—"} />
        <Field label="직원 수" value={lead?.employee_count ?? "—"} />
        <Field label="홈페이지" value={d.website_status ?? "—"} />
        <Field label="사용 도구" value={d.current_tools.length ? d.current_tools.join(", ") : "—"} />
        <Field label="반복 업무" value={d.repetitive_tasks.length ? d.repetitive_tasks.join(", ") : "—"} />
        <Field label="하루 시간" value={d.daily_hours ?? "—"} />
        <Field label="담당 인원" value={d.staff_count ?? "—"} />
        <Field label="월 건수" value={d.monthly_volume ?? "—"} />
        <Field label="도입 목적" value={d.purpose ?? "—"} />
        <Field label="예산" value={d.budget_range ?? "—"} />
        <Field label="불편한 업무" value={d.pain_point ?? "—"} />
      </Section>

      <Section title="AI 결과">
        {r ? (
          <div className="flex flex-col gap-2 text-[0.88rem] text-ink">
            <p>자동화 준비도: {r.automation_score ?? "—"} / 100</p>
            <p>
              예상 절감 시간: {r.estimated_saved_hours ? `월 ${r.estimated_saved_hours.min}~${r.estimated_saved_hours.max}시간` : "—"}
            </p>
            <div>
              <p className="text-ink-soft">추천 업무</p>
              <ul className="mt-1 list-disc pl-5">
                {r.recommended_tasks.map((t, i) => (
                  <li key={i}>
                    {t.name}
                    {t.difficulty ? ` (난이도 ${t.difficulty}` : ""}
                    {t.estimatedMonthlySavedHours != null ? `${t.difficulty ? ", " : " ("}월 ${t.estimatedMonthlySavedHours}시간` : ""}
                    {t.difficulty || t.estimatedMonthlySavedHours != null ? ")" : ""}
                    {t.reason ? ` — ${t.reason}` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <p>추천 스택: {r.recommended_stack?.length ? r.recommended_stack.join(", ") : "—"}</p>
            <div>
              <p className="text-ink-soft">실행 단계</p>
              <ol className="mt-1 list-decimal pl-5">
                {(r.implementation_steps ?? []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
            <p className="text-ink-soft">요약</p>
            <p>{r.ai_summary ?? "—"}</p>
          </div>
        ) : (
          <p className="text-[0.88rem] text-ink-soft">결과 없음 (진단 상태: {d.status})</p>
        )}
      </Section>

      <Link href="/admin" className="mt-2 text-[0.82rem] text-ink-soft hover:text-ink">
        ← 상담 목록으로
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 + 린트 + 타입**

Run: `npm run build && npx eslint app/admin/diagnoses && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: 검증 — 진단 상세**

`npm run dev`, `verify-admin` 로그인:
1. `검증상담_A` 상세 → "진단 상세 보기" 링크 → `/admin/diagnoses/<diagA>` → 입력값 전체 + AI 결과(준비도 68·추천 업무 1개·스택·요약).
2. FAILED 진단 시드 추가(선택): `scratchpad` 로 `status:"FAILED"` 진단 1건 만들고 그 id 로 접근 → "결과 없음 (진단 상태: FAILED)".
3. `/admin/diagnoses/<없는 uuid>` → 404.
4. 미인증 → `/admin/login`.

Expected: 통과.

- [ ] **Step 4: `task.md` 갱신**

`task.md` 묶음 B 섹션: `B2`~`B7` 체크(B1은 이미 완료). 묶음 B 아래에 이탈·메모 블록:

```markdown
### 묶음 B 이탈·메모 (2026-09-09)

- 브랜치 `feat/admin-console`. spec `docs/superpowers/specs/2026-09-09-admin-console-design.md` + plan `docs/superpowers/plans/2026-09-09-admin-console.md` on `main` 예정.
- 인증 = **SSR 게이트** (사용자 확정). `middleware.ts`(신규) + `lib/supabase/session-client.ts`(신규, anon+세션). CLAUDE.md "브라우저 클라이언트 직접 조회" 서술보다 우선 — service_role은 여전히 서버 전용, 세션 클라이언트는 RLS `authenticated` 존중.
- `/admin` = 상담 목록 홈. 별도 대시보드·독립 진단 목록 없음(YAGNI, 사용자 확정). 진단은 상담 상세에서 링크로만.
- 상태 전이 = `<select>` 7값 자유 전이(가드 없음). 상태 변경 즉시 저장, 메모는 버튼 저장. server action 반환 `{ok:true}|{error}`.
- 마이그레이션·env 없음. `consultations.memo`·RLS 정책은 0001에 이미 존재.
- 검증: build/lint/tsc 0, Playwright(로그인·목록·필터·상세·상태·메모·404·리다이렉트), Supabase REST 단언(service-role). 검증용 관리자(`verify-admin@webagent.test`) + 시드 상담/진단은 `scratchpad/` 스크립트로 생성 후 **삭제**. (auth 유저 삭제가 권한상 막히면 사용자가 대시보드에서 제거)
- frontend-design 패스 없음(내부 도구, `--wak-*` 토큰만).
```

- [ ] **Step 5: 검증 데이터 정리**

`scratchpad/admin-teardown.mjs`:
```js
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env","utf8").split("\n").filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()];}));
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/,"").replace(/\/+$/,"");
const SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey:SRK, Authorization:`Bearer ${SRK}` };
const jj = (r)=>r.json();
// leads: email like *@webagent.test → cascade 로 diagnoses·consultations·results 삭제
const leads = await jj(await fetch(`${SB}/rest/v1/leads?email=like.*@webagent.test&select=id`, { headers:H }));
if (leads.length) {
  const ids = leads.map(l=>l.id).join(",");
  await fetch(`${SB}/rest/v1/consultations?lead_id=in.(${ids})`, { method:"DELETE", headers:H });
  const diags = await jj(await fetch(`${SB}/rest/v1/diagnoses?lead_id=in.(${ids})&select=id`, { headers:H }));
  if (diags.length) await fetch(`${SB}/rest/v1/diagnosis_results?diagnosis_id=in.(${diags.map(d=>d.id).join(",")})`, { method:"DELETE", headers:H });
  await fetch(`${SB}/rest/v1/diagnoses?lead_id=in.(${ids})`, { method:"DELETE", headers:H });
  await fetch(`${SB}/rest/v1/leads?id=in.(${ids})`, { method:"DELETE", headers:H });
}
console.log("seed rows deleted. verify-admin@webagent.test 유저는 대시보드 Authentication > Users 에서 수동 삭제 (권한상 스크립트 삭제 불가할 수 있음).");
for (const t of ["leads","diagnoses","diagnosis_results","consultations"]) {
  const n = (await jj(await fetch(`${SB}/rest/v1/${t}?select=id`, { headers:H }))).length;
  console.log(`  남은 ${t}: ${n}`);
}
```
Run: `node scratchpad/admin-teardown.mjs` → 5테이블 다시 0행(실사용 데이터 없다는 전제). `verify-admin` 유저는 사용자에게 대시보드 삭제 요청.

- [ ] **Step 6: 커밋**

```bash
git add app/admin/diagnoses/[id]/page.tsx task.md
git commit -m "$(cat <<'EOF'
feat(admin): 진단 상세 읽기 전용 + task.md 묶음 B (B6)

/admin/diagnoses/[id]: 진단 입력값 전체 + AI 결과 6필드(있으면), 없으면
"결과 없음". 없는 id → notFound(). 상담 상세에서 링크로 진입.
task.md 묶음 B 체크 + 이탈·메모.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XSxAwWvBpWrc12GWytcG5s
EOF
)"
```

---

## Task 7: 전체 검증 패스 (B7)

**Files:** 없음 (검증만). 문제 발견 시 해당 Task 파일 수정 + 재커밋.

**Interfaces:** Consumes: 전체. Produces: 없음.

- [ ] **Step 1: 정적 검사**

Run: `npm run build && npx eslint . && npx tsc --noEmit`
Expected: exit 0. 라우트 목록에 `ƒ /admin`, `ƒ /admin/login`, `ƒ /admin/consultations/[id]`, `ƒ /admin/diagnoses/[id]`, `ƒ Middleware`.

- [ ] **Step 2: 시드 재생성**

Run: `node scratchpad/admin-seed.mjs` (Task 2·3 누적본). `LOGIN:` 출력에서 `verify-admin` 자격증명 확인.

- [ ] **Step 3: 스펙 §7 체크리스트 Playwright 관통**

`npm run dev` 후 순서대로:
1. 미인증 `/admin`, `/admin/consultations/<A>`, `/admin/diagnoses/<diagA>` → 전부 `/admin/login` (curl `-w "%{http_code} %{redirect_url}"` = 307 + `.../admin/login`).
2. `/admin/login` 틀린 비번 → 인라인 오류, URL 유지.
3. 맞는 비번 → `/admin`, 헤더에 `verify-admin@webagent.test` + 로그아웃.
4. anon REST: `curl "$SB/rest/v1/consultations?select=id" -H "apikey: $ANON"` → `[]` (RLS 차단 유지).
5. 목록: `?filter=all/new/active/closed` 각각 올바른 행 집합. 요약 줄 숫자.
6. 상담 상세(A: 진단 연결, B: 미연결). 없는 id → 404.
7. 상태 `연락 예정` 변경 → DB 반영(`admin-verify.mjs`), 목록 뱃지·필터 이동, `updated_at` 갱신.
8. 메모 저장 → DB 반영, 새로고침 프리필, dirty 아닐 때 버튼 비활성.
9. 진단 상세: 입력값 + AI 결과. FAILED 진단 → "결과 없음". 없는 id → 404.
10. 로그아웃 → `/admin` 접근 시 로그인으로.

각 항목 결과를 리포트에 기록. 실패 항목은 원인 파악 후 해당 Task 수정.

- [ ] **Step 4: 정리**

Run: `node scratchpad/admin-teardown.mjs` → 5테이블 0행. `verify-admin` 유저 삭제는 사용자에게 요청(리포트에 명시). `scratchpad/*.mjs` 는 커밋 대상 아님(리포 밖 경로) — `git status` 클린 확인.

- [ ] **Step 5: 최종 커밋 (수정이 있었다면)**

Step 3에서 코드 수정이 있었으면 해당 파일 + 이유를 커밋. 없으면 이 Step 스킵.

```bash
git commit -am "$(cat <<'EOF'
fix(admin): B7 검증 반영 — <구체 내용>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XSxAwWvBpWrc12GWytcG5s
EOF
)"
```

---

## Self-Review

**1. Spec coverage**

| 스펙 절 | 태스크 |
|---|---|
| §3.1 `session-client.ts` | Task 1 Step 2 |
| §3.2 `middleware.ts` (쿠키 갱신 + 게이트 + 역게이트) | Task 1 Step 3 |
| §3.3 `layout.tsx` getUser 분기 + `AdminShell` | Task 2 Step 1·2 |
| §4.1 로그인 페이지 (`signInWithPassword`, 인라인 오류, 역게이트) | Task 2 Step 3 · Task 1 Step 3(역게이트) |
| §4.2 `/admin` 목록 (RSC, `?filter=`, 요약 줄, 표, 빈 상태) | Task 3 Step 2 |
| §4.3 상담 상세 읽기 (연락처·회사·상담·연결 진단, `notFound`) | Task 4 Step 1 |
| §4.4 `actions.ts` (zod + 세션 클라이언트 update + `revalidatePath`) | Task 5 Step 1 |
| §4.5 진단 상세 (읽기 전용, 입력값 + AI 결과, `notFound`) | Task 6 Step 1 |
| §5 컴포넌트 (`admin-shell`·`status-badge`·`status-select`·`memo-editor`) | Task 2 Step 1 / Task 3 Step 1 / Task 5 Step 2·3 |
| §5 상태 한글 라벨 (상담 7 / 진단 4) | Global Constraints + `status-badge`(Task 3) + `status-select`(Task 5) |
| §6 에러 처리 (미들웨어 리다이렉트, `notFound`, action `{error}`, RSC 조회 에러, env throw) | Task 1·2·4·5·6 각 해당 Step |
| §7 검증 체크리스트 | Task 7 (+ Task 1~6 각 검증 Step) |
| §8 파일 요약 | 파일 구조 표 |
| §9 인터페이스 계약 (`createSessionClient`, action 반환 형태, `/admin`=목록) | Task 1·5 Interfaces + Global Constraints |

빠진 스펙 요구 없음.

**2. Placeholder scan**: 모든 코드 스텝에 실제 코드. "적절한 에러 처리" 류 없음. Task 5 Step 6 항목 5(실패 경로)는 재현이 구조상 불가함을 명시하고 zod 2차 방어로 갈음 — 회피가 아니라 근거 있는 판단.

**3. Type consistency**:
- `createSessionClient(): Promise<SupabaseClient>` — Task 1 정의, Task 2·3·4·5·6·actions 전부 `await createSessionClient()`. 일치.
- `<StatusBadge kind={"consultation"|"diagnosis"} value={string} />` — Task 3 정의, Task 3(목록)·Task 4(상담 상세)·Task 6(진단 상세) 사용. `kind` 값 일치.
- server action: `updateConsultationStatus(id: string, next: string): Promise<{ok:true}|{error:string}>`, `updateConsultationMemo(id: string, memo: string): Promise<...>` — Task 5 Step 1 정의, Step 2·3 컴포넌트가 `"error" in r` 로 판별. 일치. `ActionResult` 대신 인라인 유니온을 컴포넌트에서 안 쓰고 `"error" in r` 로만 판별하므로 export 불필요.
- `<StatusSelect consultationId={string} current={string} />`, `<MemoEditor consultationId={string} initial={string} />` — Task 5 정의, Task 5 Step 4에서 `page.tsx` 가 `c.id`·`c.status`·`c.memo ?? ""` 전달. 일치.
- 필터 키 `all|new|active|closed` — Global Constraints + Task 3 `FILTERS` 객체 + Task 7 검증. 일치.
- `leads` 조인 반환 형태(객체 vs 배열) — Task 3·4·6 모두 "구현 시 `tsc` 결과에 맞춰 `Array.isArray` 분기 또는 `as unknown as` 캐스트" 명시. PostgREST embed 는 FK 방향상 to-one 이라 객체가 맞지만 supabase-js 타입 추론이 불안정할 수 있어 캐스트 허용.

이슈 없음.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-09-admin-console.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 태스크마다 새 서브에이전트 디스패치, 태스크 간 2단계 리뷰, 빠른 반복

**2. Inline Execution** — 이 세션에서 `executing-plans`로 체크포인트마다 배치 실행

**Which approach?**
