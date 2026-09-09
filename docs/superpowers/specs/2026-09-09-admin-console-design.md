# 관리자 콘솔 설계 (Phase 3 · 묶음 B)

- 날짜: 2026-09-09
- 범위: `task.md` Phase 3 묶음 B (B2~B7) — 관리자 인증 게이트, 로그인, 상담 목록(홈), 상담 상세(상태 변경 + 메모), 진단 상세, 검증. B1(Supabase Auth 잠금 + 관리자 계정)은 사용자 작업으로 **완료·검증됨**(2026-09-09).
- 근거: `docs/개발_착수_기술_스펙.md` §1.1 · §3.1 · §4.4, `docs/개발자용_통합_MVP_기획서.md` §8.1 · §9.5 · §11, `CLAUDE.md` "인증 & 접근 제어 모델" · "알려진 스펙 결함" #5, `docs/decisions.md` D2(옵션 라벨), `supabase/migrations/0001_init.sql`(RLS 정책 `admin_*`)
- 선행: Phase 1·2·묶음 A·C 머지됨. `leads`·`diagnoses`·`diagnosis_results`·`consultations` 스키마 + RLS 정책, `lib/supabase/{server,client}.ts`, `lib/options.ts`, `--wak-*` 토큰, `lib/utils.ts`(`cn`) 준비됨. `app/admin/{layout,login/page,page,diagnoses/[id]/page,consultations/[id]/page}.tsx`는 5개 다 스텁. `middleware.ts`·`lib/supabase/session-client.ts`·`components/admin/*`는 없음. 실 Supabase 연결됨(리전 서울), `.env`에 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`·`SUPABASE_SERVICE_ROLE_KEY` 채워짐.
- 설치 버전: Next.js 16.3.4 (Turbopack), React 19.2.8, `@supabase/ssr` ^0.12.5, `@supabase/supabase-js` ^2.114.0. Next 16 유의: `cookies()`/`headers()`는 async, `PageProps<'/route'>`/`LayoutProps<'/'>`는 전역 생성 타입.
- **정오표 (Task 1 실행 중 확정):** Next 16은 `middleware.ts`를 폐기하고 **`proxy.ts`**(리포 루트, `export async function proxy`, 빌드 로그 `ƒ Proxy`)로 개명. 아래 §3.2 등의 `middleware.ts`/`middleware` 표기는 전부 `proxy.ts`/`proxy`로 읽는다. `config.matcher`·동작 동일.

## 1. 목표와 비목표

### 목표

관리자(`authenticated` 롤, 가입 비활성화로 사실상 1계정)가 로그인해서 전환 퍼널의 마지막 구간을 관리한다:

1. **로그인 게이트** — `/admin/*`는 세션 없이 접근 불가. 미인증 시 `/admin/login`으로.
2. **상담 목록(`/admin`)** — 신규·진행 중 상담을 최근순으로 보고, 상태로 필터.
3. **상담 상세(`/admin/consultations/[id]`)** — 연락처·회사·상담 정보·연결된 진단을 읽고, `status`를 전이시키고, `memo`를 저장.
4. **진단 상세(`/admin/diagnoses/[id]`)** — 상담에 연결된 진단의 입력값과 AI 결과를 읽기 전용으로 확인.

전용 API 레이어를 두지 않는다(`CLAUDE.md` 규약). 읽기는 RSC가 세션 클라이언트로 직접 조회, 쓰기는 server action이 세션 클라이언트로 직접 update. 둘 다 anon 키 + 로그인 세션 → RLS `authenticated` 정책(`admin_select_*`, `admin_update_consultations`)이 접근을 통제한다.

### 비목표 (범위 밖 / post-MVP)

- 독립 진단 목록 페이지(`/admin/diagnoses`) — 진단은 상담 상세에서 링크로 진입. (사용자 확정 2026-09-09)
- 대시보드 숫자 카드 세트 — `/admin` 상단 요약 줄 2개(오늘 진단 수, 미착수 상담 수)로 축소. (사용자 확정)
- 상담 메모 이력 — `memo` 단일 텍스트 필드 덮어쓰기.
- 상태 전이 제약·자동 타임스탬프(연락일·미팅일 등) — `status`는 7값 자유 전이.
- 페이지네이션·전문 검색·CSV 내보내기.
- 리드 정보 편집 — RLS에 `leads` update 정책 없음. 읽기 전용.
- 관리자 다계정·역할 분리, 2FA 강제, 이메일 알림.
- `diagnoses.status` 수동 변경 — 진단 상세는 읽기 전용(RLS엔 `admin_update_diagnoses`가 있으나 이 묶음에서 UI 안 만듦).
- 마이그레이션·새 env — 없음.

## 2. 결정 요약

| # | 결정 | 이유 |
|---|---|---|
| B-a | 인증 = **SSR 게이트**: `middleware.ts`가 세션 쿠키 갱신 + `/admin/*` 리다이렉트, `lib/supabase/session-client.ts`가 RSC/server action용 쿠키 인식 클라이언트 | 사용자 확정(2026-09-09). CLAUDE.md는 "브라우저 클라이언트 직접 조회"라 적었으나, 서버 게이트가 미인증 요청을 서버에서 차단하고 admin 셸 깜빡임이 없으며 RSC 조회가 단순함. service-role은 여전히 서버 전용이고 세션 클라이언트는 anon+세션이라 RLS 모델 불변 |
| B-b | 미들웨어(proxy.ts)가 리다이렉트 주체. 레이아웃 `getUser()` 는 **셸 분기용; 실 방어는 RLS + action 가드** | 미들웨어는 요청 경로를 알아 게이트/역게이트(`/admin/login` → `/admin`)가 자연스러움. `app/admin/layout.tsx`는 `getUser()` 후 세션 없으면 `{children}`(로그인), 있으면 `<AdminShell>` — 데이터 보호가 아니라 헤더/로그아웃 셸을 씌울지 정하는 용도. 라우트 그룹 불필요(로그인이 유일한 비게이트 페이지) |
| B-c | `/admin` = 상담 목록 홈. 별도 `/admin/dashboard` 없음 | 비목표. MVP 관리자 작업은 상담 파이프라인이 전부. 진단은 종속 참고자료 |
| B-d | 상태 필터 = `?filter=` 쿼리 파라미터(RSC 재조회), 값 `all`(기본)·`new`·`active`·`closed` | 클라이언트 상태 불필요. `active` = `CONTACT_PENDING·SCHEDULED·PROPOSAL_SENT`, `closed` = `CONTRACTED·ON_HOLD·CLOSED` |
| B-e | 상태 변경·메모 저장 = **server action** (`app/admin/consultations/[id]/actions.ts`, `"use server"`) | API 라우트 안 만듦(규약). 세션 클라이언트로 update + `revalidatePath`. 클라이언트 번들에서 제외 |
| B-f | 상태 전이 = `<select>` 7값 전부, **자유 전이** | 사용자 확정(2026-09-09). 관리자 1명이 판단. 전이 규칙·가드는 post-MVP |
| B-g | 상태 변경은 **즉시 저장**(onChange), 메모는 **명시적 "메모 저장" 버튼** | 상태는 단일 선택이라 즉시가 자연스럽고, 메모는 편집 중 자동저장이 성가심 |
| B-h | 낙관적 갱신 안 함. server action 반환(`{ ok }` / `{ error }`) 후 `revalidatePath`로 서버 값 반영 | 볼륨 낮고 단순성 우선. 실패 시 인라인 한글 메시지 |
| B-i | 시각 = `--wak-*` 토큰 재사용, 실용적 레이아웃(표·폼·뱃지), frontend-design 패스 없음, 다크모드 없음 | 사용자 확정(2026-09-09). 내부 전용 도구 |
| B-j | 진단 상세는 상담에서만 진입(역참조 링크 없음). 없는 id → `notFound()` | 보통 상담 상세 → 진단 상세 단방향. 역방향 UI는 YAGNI |
| B-k | 로그인은 클라이언트 컴포넌트 + `createBrowserSupabaseClient().auth.signInWithPassword`. 성공 시 `router.push('/admin'); router.refresh()` | `@supabase/ssr` `createBrowserClient`가 세션 쿠키를 기록 → 미들웨어/레이아웃이 읽음. `router.refresh()`로 RSC 레이아웃 재평가 |
| B-l | PII(이름·전화·이메일)를 상담/진단 상세에 **표시함** | 관리자가 고객에게 연락하는 게 목적. RLS `admin_select_leads`가 허용. 공개 경계(기획서 §16.1)는 브라우저·n8n·AI 대상이지 로그인한 관리자 대상이 아님 |

## 3. 인증 레이어

### 3.1 `lib/supabase/session-client.ts` (신규)

```ts
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * anon 키 + 로그인 세션 쿠키를 쓰는 서버 Supabase 클라이언트. RSC·server action 전용.
 * RLS 를 우회하지 않는다 — `authenticated` 롤 정책(admin_*)의 적용을 받는다.
 * service-role 클라이언트(lib/supabase/server.ts)와 혼동 금지.
 */
export async function createSessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // RSC 렌더 중 set 호출 — 미들웨어가 갱신을 담당하므로 무시.
        }
      },
    },
  });
}
```

- 정확한 `cookies` 인터페이스는 구현 시 `node_modules/@supabase/ssr` 타입 + Next 16 문서로 재확인(0.12.x는 `getAll`/`setAll` 방식).
- RSC에서 `setAll`이 throw하는 건 정상(응답 헤더 확정 후) — try/catch로 삼키고 미들웨어에 위임.

### 3.2 `middleware.ts` (신규, 리포 루트)

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
          for (const { name, value, options } of toSet) res.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const onLogin = path === "/admin/login";

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

- `getUser()`(서버 검증)를 쓴다. `getSession()`은 쿠키만 보므로 게이트에 부적합.
- 마케팅/폼/공개 API는 matcher에서 제외되어 영향 없음.
- 정확한 쿠키 전달 패턴(`res` 재생성)은 `@supabase/ssr` 미들웨어 예제 현행본으로 확인.

### 3.3 `app/admin/layout.tsx` (스텁 교체)

RSC. `createSessionClient()` → `getUser()`.
- `user` 없음 → `<div className="min-h-full">{children}</div>` (로그인 페이지만 여기 도달). 이 분기는 셸 분기용; 실 방어는 RLS + action 가드.
- `user` 있음 → `<AdminShell userEmail={user.email}>{children}</AdminShell>`.

`AdminShell`(`components/admin/admin-shell.tsx`) — 헤더: 좌측 "WEBAGENT.KR 관리자"(→ `/admin` 링크), 우측 `userEmail` + 로그아웃 버튼. 로그아웃은 클라이언트: `createBrowserSupabaseClient().auth.signOut()` → `router.replace('/admin/login'); router.refresh()`. 본문 `<main className="mx-auto max-w-[960px] px-5 py-8">{children}</main>`.

## 4. 페이지

### 4.1 `app/admin/login/page.tsx` (스텁 교체)

`"use client"`. 중앙 카드(`max-w-[22rem]`). 필드: 이메일(`type=email`), 비밀번호(`type=password`). 버튼 "로그인"(제출 중 비활성 + "로그인 중…").

```
const supabase = createBrowserSupabaseClient();
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) setError("이메일 또는 비밀번호가 올바르지 않습니다.");
else { router.push("/admin"); router.refresh(); }
```

- 오류는 카드 안 인라인(`--wak-danger`). 구체 사유 노출 안 함(계정 존재 여부 등).
- 이미 로그인 상태로 `/admin/login` 직접 진입 → 미들웨어가 `/admin`으로.

### 4.2 `app/admin/page.tsx` (스텁 교체) — 상담 목록 (홈)

RSC. `searchParams`(Promise) → `filter` 파싱(`all|new|active|closed`, 미지정/이상값 → `all`).

조회:
- `const supabase = await createSessionClient()`
- 목록: `supabase.from("consultations").select("id,status,consultation_type,preferred_date,suggested_service_type,created_at,leads(company_name)").order("created_at",{ascending:false})` + filter에 따라 `.in("status", [...])`
- 요약: `supabase.from("diagnoses").select("id",{count:"exact",head:true}).gte("created_at", <오늘 0시 ISO>)` / `supabase.from("consultations").select("id",{count:"exact",head:true}).eq("status","NEW")`

렌더:
- 상단: `오늘 접수된 진단 N건 · 미착수 상담 N건`
- 필터: 4개 링크(`?filter=all|new|active|closed`), 현재값 강조
- 표: 행 = `<Link href="/admin/consultations/{id}">`. 열 = `[<StatusBadge>] 회사명 · {consultation_type}/{preferred_date} · {suggested_service_type ?? "—"} · {YYYY-MM-DD}`
- 빈 상태: "해당하는 상담이 없습니다."
- `<table>`는 `overflow-x-auto` 래퍼.

### 4.3 `app/admin/consultations/[id]/page.tsx` (스텁 교체) — 상담 상세

RSC. `params`(Promise) → `id`.

조회(세션 클라이언트):
- `consultations` 1행 + `leads(*)` 조인. 없으면 `notFound()`.
- `consultation.diagnosis_id` 있으면 `diagnoses` + `diagnosis_results` 조회(없을 수 있음).

렌더(읽기):
- **연락처**: 이름 · 전화 · 이메일
- **회사**: 회사명 · 업종 · 직원 수
- **상담**: 방식 · 희망 시기 · 추정 서비스 유형 · 접수일 · 현재 상태(`<StatusBadge>`)
- **연결 진단**: 있으면 `자동화 준비도 {score} · {ai_summary 발췌}` + `진단 상세 보기` 링크(`/admin/diagnoses/{diagnosis_id}`); 없으면 "연결된 진단 없음"

쓰기(클라이언트 섬):
- `<StatusSelect consultationId={id} current={status} />`
- `<MemoEditor consultationId={id} initial={memo ?? ""} />`

하단: `← 목록으로` 링크(현재 filter 유지하려면 그냥 `/admin`).

### 4.4 `app/admin/consultations/[id]/actions.ts` (신규)

```ts
"use server";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session-client";
import { revalidatePath } from "next/cache";

const STATUS = ["NEW","CONTACT_PENDING","SCHEDULED","PROPOSAL_SENT","CONTRACTED","ON_HOLD","CLOSED"] as const;

export async function updateConsultationStatus(id: string, next: string):
  Promise<{ ok: true } | { error: string }> {
  const parsed = z.object({ id: z.uuid(), next: z.enum(STATUS) }).safeParse({ id, next });
  if (!parsed.success) return { error: "잘못된 요청입니다." };
  const supabase = await createSessionClient();
  const { error } = await supabase.from("consultations").update({ status: parsed.data.next }).eq("id", parsed.data.id);
  if (error) return { error: "상태 변경에 실패했습니다." };
  revalidatePath(`/admin/consultations/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateConsultationMemo(id: string, memo: string):
  Promise<{ ok: true } | { error: string }> {
  const parsed = z.object({ id: z.uuid(), memo: z.string().max(5000) }).safeParse({ id, memo });
  if (!parsed.success) return { error: "메모가 너무 깁니다." };
  const supabase = await createSessionClient();
  const { error } = await supabase.from("consultations").update({ memo: parsed.data.memo }).eq("id", parsed.data.id);
  if (error) return { error: "메모 저장에 실패했습니다." };
  revalidatePath(`/admin/consultations/${id}`);
  return { ok: true };
}
```

- 세션 없는 상태에서 action 호출 시: zod 검증 후 `supabase.auth.getUser()` 로 세션을 자체 확인하고, 없으면 `{ error }` 반환(Next 16 `proxy.md` 가 server action 자체 인증을 요구). 세션이 있어도 대상 행이 없으면(다른 ID·RLS 0행) `.select("id").maybeSingle()` 결과가 `null` → `{ error: "저장 대상을 찾지 못했습니다." }`. 0행을 성공으로 보고하지 않는다.
- `updated_at`은 0001의 트리거가 자동 갱신.

### 4.5 `app/admin/diagnoses/[id]/page.tsx` (스텁 교체) — 진단 상세 (읽기 전용)

RSC. `params` → `id`. 세션 클라이언트로 `diagnoses` + `diagnosis_results` + `leads` 조회. 없으면 `notFound()`.

렌더:
- **상태**: `<StatusBadge>`(SUBMITTED/PROCESSING/COMPLETED/FAILED — 진단용 라벨 별도)
- **연락처**: 이름 · 전화 · 이메일
- **진단 입력값**: 업종 · 직원 수 · 홈페이지 상태 · 사용 도구(배열) · 반복 업무(배열) · 하루 시간 · 담당 인원 · 월 건수 · 도입 목적 · 예산 · 불편한 업무(자유 텍스트)
- **AI 결과**(있으면): 준비도 · 추천 업무(jsonb 배열: name/reason/difficulty/estimatedMonthlySavedHours) · 예상 절감 시간(min~max) · 추천 스택 · 실행 단계 · 요약. 없으면 "결과 없음(진단 상태: {status})"

## 5. 컴포넌트 (`components/admin/`)

| 파일 | 종류 | 내용 |
|---|---|---|
| `admin-shell.tsx` | client(로그아웃 버튼 때문) | 헤더 + `<main>` 래퍼. `userEmail` prop |
| `status-badge.tsx` | server ok | `{ kind: "consultation" \| "diagnosis"; value: string }` → 한글 라벨 + `--wak-*` 배경/글자색. 매핑 테이블 로컬 상수 |
| `status-select.tsx` | client | `<select>` 7개(상담). onChange → `updateConsultationStatus` 호출, `useTransition` pending, 성공 "저장됨" 잠깐 표시 / 실패 인라인 오류. 실패 시 `<select>` 값 원복 |
| `memo-editor.tsx` | client | `<textarea>` + "메모 저장" 버튼. `initial` 대비 dirty일 때만 버튼 활성. 저장 → `updateConsultationMemo`, pending/성공/실패 표시 |

상태 한글 라벨(상담): `NEW`=신규, `CONTACT_PENDING`=연락 예정, `SCHEDULED`=일정 확정, `PROPOSAL_SENT`=제안 발송, `CONTRACTED`=계약, `ON_HOLD`=보류, `CLOSED`=종료. (진단): `SUBMITTED`=접수, `PROCESSING`=분석 중, `COMPLETED`=완료, `FAILED`=실패.

## 6. 에러 처리

| 상황 | 처리 |
|---|---|
| 세션 없이 `/admin/*` | 미들웨어 → `/admin/login` 리다이렉트 (레이아웃도 재확인) |
| 로그인 실패 | 인라인 "이메일 또는 비밀번호가 올바르지 않습니다." — 사유 미노출 |
| 없는 상담/진단 id | `notFound()` → Next 기본 404 |
| server action update 에러 | `{ error }` 반환 → 섬 컴포넌트 인라인, 값 원복, 낙관적 갱신 없음 |
| RSC 조회 에러(비정상) | "데이터를 불러오지 못했습니다." 안내 블록 |
| `NEXT_PUBLIC_SUPABASE_*` 누락 | `createSessionClient`/미들웨어 throw (기존 클라이언트와 동일 정책) |
| 로그인 rate limit | Supabase Auth 자체 처리에 위임 |

## 7. 검증 (B7 — 수동 체크리스트, 러너 없음. 기획서 §17.2)

- [ ] `build` / `eslint .` / `tsc --noEmit` = 0
- [ ] 미인증으로 `/admin`, `/admin/consultations/<id>`, `/admin/diagnoses/<id>` → `/admin/login` 리다이렉트 (Playwright + 서버 응답)
- [ ] 틀린 비밀번호 → 인라인 한글 오류, 리다이렉트 없음
- [ ] 올바른 계정(`manizu2424@gmail.com`) → `/admin` 목록 렌더, 헤더에 이메일 + 로그아웃
- [ ] anon 키 직접 REST 조회 여전히 차단 (RLS 회귀 방지 — 묶음 A 검증 재확인)
- [ ] 상담 목록: 필터 4종(`all/new/active/closed`) 각각 올바른 `status` 집합, 최근순, 빈 상태 문구
- [ ] 요약 줄: 오늘 진단 수 / `NEW` 상담 수 정확
- [ ] 상담 상세: 연락처·회사·상담·연결 진단 표시. `diagnosis_id` 없는 상담(직접 상담·FAILED) → "연결된 진단 없음"
- [ ] 상태 변경 → `consultations.status` DB 반영 + `updated_at` 갱신 + 목록 뱃지/필터 반영
- [ ] 메모 저장 → `consultations.memo` DB 반영, 재방문 시 프리필, dirty 아닐 때 버튼 비활성
- [ ] server action 실패 시(예: 잘못된 status) 인라인 오류 + 값 원복
- [ ] 진단 상세 링크 이동, 없는 진단 id → 404, AI 결과 없는 진단 → "결과 없음"
- [ ] 로그아웃 → 세션 소멸 → `/admin` 접근 시 로그인으로
- DB 단언은 Supabase REST(service-role, 묶음 A 스크립트 방식). 검증용 상담/진단 행은 스크립트로 생성 후 삭제.

## 8. 파일 요약

**신규**: `middleware.ts`, `lib/supabase/session-client.ts`, `app/admin/consultations/[id]/actions.ts`, `components/admin/{admin-shell,status-badge,status-select,memo-editor}.tsx`
**교체(스텁→구현)**: `app/admin/{layout,login/page,page,consultations/[id]/page,diagnoses/[id]/page}.tsx`
**변경 없음**: 스키마·RLS·env·`lib/supabase/{server,client}.ts`·마케팅·공개 API

## 9. 인터페이스 계약 (묶음 D·Phase 4가 의존)

- `createSessionClient()` — 다른 로그인 필요 서버 코드가 재사용.
- server action 반환 형태 `{ ok: true } | { error: string }` — 향후 admin 액션의 규약.
- `/admin` 라우트가 상담 목록이라는 사실 — 묶음 D의 GA4는 admin 라우트를 추적 대상에서 제외.
