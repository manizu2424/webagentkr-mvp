# 마케팅 개편 구현 계획 (갈래 X)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩을 딥 잉크 히어로 + 밝은 본문의 **7개 섹션**으로 개편하고, 카피를 쉬운 말로 다시 쓰며, 자동화 사례 메뉴를 플래그 하나로 숨긴다.

**Architecture:** 기존 `feat/marketing-redesign`(Task 1~5 완료: `SectionBand`·아이콘·히어로 SVG·서비스 카드)을 main에 rebase한 위에서 이어간다. 어두운 표면은 `.wak-on-deep` **토큰 재정의 스코프**로 구현한다 — 이 클래스 안에서 `--wak-ink`/`--wak-line`/`--wak-signal` 등을 다시 정의하므로, 기존 컴포넌트(`text-ink`, `border-line` …)가 코드 변경 없이 어두운 배경용 색이 된다. 모든 문구는 `content/marketing.ts` 한 곳에서 관리한다. 사례 메뉴는 `lib/features.ts`의 `CASES_ENABLED` 상수 하나로 네비·라우트·사이트맵을 게이트한다.

**Tech Stack:** Next.js 16.3.4 (App Router, RSC 전용), React 19.2.8, Tailwind v4(CSS 설정 — `app/globals.css`의 `@theme inline`), lucide-react, TypeScript 5. 테스트 러너 없음 — 검증은 `tsc`/`eslint`/`next build` + 일회성 `node --experimental-strip-types` 스크립트 + Playwright 스크린샷 육안.

**Spec:** `docs/superpowers/specs/2026-09-20-marketing-renewal-and-result-pdf-design.md` §"X. 마케팅 개편" (executor는 스펙과 이 계획을 함께 읽는다). 이 계획은 `docs/superpowers/plans/2026-09-09-marketing-redesign.md`(라이트 전용·10섹션 전제)를 **대체**한다.

## Global Constraints

절대원칙(`CLAUDE.md` §0) — 모든 태스크에 암묵 포함:
1. "홈페이지 제작"을 서비스로 전면에 내세우지 **않는다**. Smart Website 서비스의 하위 결과물로만.
2. 서비스는 항상 정확히 5종: `AI Automation / n8n Automation / Smart Website / AI Agent / AI Consulting`. 재분류·통합 금지. 이름·순서는 `lib/options.ts`의 `SERVICE_TYPES`와 동일.
3. 실제 고객 없는 데모는 반드시 **`자동화 데모`** 배지로 표시.
4. AI 추정 효과(절감 시간 등)는 항상 **추정치**로 표시, 보장처럼 쓰지 않는다.
5. 스택 고정 — Tailwind. **RSC 전용, 클라이언트 JS 0**(랜딩 섹션에 `"use client"` 금지). Pretendard(본문) + IBM Plex Mono(`font-flow` — 라벨·영문 모듈명·숫자에만).

스펙 확정 사항:
- **라이트 전용 제약 없음.** 어두운 표면 허용(히어로·마지막 CTA). 별도 다크모드 토글·`prefers-color-scheme` 대응은 **만들지 않는다**.
- 어두운 표면은 `wak-on-deep`(스코프 클래스) + `bg-deep`으로만 만든다. 어두운 표면 위 텍스트·버튼 대비는 WCAG AA(본문 4.5:1).
- 카피 원칙: 짧은 문장, 전문용어(n8n·워크플로우·API·웹훅·gpt 등) 풀어 쓰기. 서비스 **이름**은 유지하되 설명은 쉬운 말. 문구는 전부 `content/marketing.ts`에서만 가져온다(컴포넌트에 하드코딩 금지).
- 사례 메뉴: `lib/features.ts`의 `CASES_ENABLED = false`(환경변수 아님 — `NEXT_PUBLIC_*`는 빌드 시점 고정이라 Docker build args 누락 함정이 있다). `false`면 네비·히어로 버튼·사이트맵에서 제외, `/cases` 직접 접근은 `notFound()`. `/cases`의 `noindex`는 유지.
- 구조: 히어로 / 이런 고민 있으시죠? / 이런 걸 해드려요 / 이렇게 진행돼요 / 자동화 데모 / FAQ / 마지막 CTA — **정확히 7개**. 중간 진단 CTA·신뢰 요소 섹션·페이지 스파인은 없앤다.

추가 제약:
- **사진·스크린샷 애셋 없음.** 시각 요소는 lucide 아이콘 + 인라인 SVG 뿐. `public/`에 이미지 추가 금지.
- **애니메이션은 1회성 + `motion-reduce:*` 가드.** 무한 반복·스크롤 트리거 금지.
- 색은 `app/globals.css`의 `--wak-*` 토큰만 쓴다. 이 계획이 정의하는 새 토큰: `--wak-deep`, `--wak-cta`, `--wak-cta-hover`, `--wak-on-cta`(+ `.wak-on-deep` 스코프 재정의).
- 모든 SVG 일러스트: `role="img"` + 한국어 `aria-label`. 모든 상호작용 요소: `focus-visible` 링(`outline-2 outline-offset-2 outline-signal`).
- **Next 16**: `params`는 Promise, 린트는 `npx eslint <경로>`. 코드 작성 전 필요하면 `node_modules/next/dist/docs/` 확인(AGENTS.md). zsh에서 `git show "$B:path"` 는 `$B:p` 변형으로 오해되므로 `"${B}:path"`로 쓴다.
- 브랜치 `feat/marketing-redesign`(main에 rebase 완료)에 로컬 커밋, **push 금지**. 매 커밋 끝에 다음 줄:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```
- 커밋은 **명시한 경로만** `git add` 한다(`git add -A` 금지 — 작업 트리에 무관한 미추적 파일 `이어할일.txt`, `.superpowers/`가 있다).
- 일회성 테스트 스크립트(`_wak_*.mts`)는 리포 루트에서 `node --experimental-strip-types`로 실행하고 **커밋 전에 삭제**한다. 산출물(스크린샷 등)은 세션 scratchpad(`$SCRATCH`)에 둔다.
- dev 서버: `nohup npm run dev > "$SCRATCH/dev.log" 2>&1 &` 로 띄우고 `pkill -f "next dev"` 로 끈다(`kill %1` 불가 — 도구 호출 사이에 job control이 유지되지 않는다).
- Playwright 검증은 Playwright MCP 도구(ToolSearch로 로드)를 쓰고, 스크린샷은 `Read`로 열어 실제로 본다. 데스크톱 1280px·모바일 400px 두 폭을 모두 확인한다.

## File Structure

| 파일 | 변경 | 책임 |
|---|---|---|
| `lib/features.ts` | 신규 | `CASES_ENABLED`, `withCasesGate()` (순수) |
| `components/marketing/nav.ts` | 수정 | 네비를 `withCasesGate`로 게이트 |
| `app/(marketing)/cases/page.tsx` | 수정 | 플래그 off면 `notFound()` |
| `app/sitemap.ts` | 수정 | `/cases`(플래그), `/about` 항목 |
| `content/marketing.ts` | 수정 | 새 카피(`SECTIONS`·`PAIN`·`DEMOS`·`FINAL_CTA` 추가, `HERO`·`SERVICES`·`PROCESS`·`FAQ` 재작성). `PROBLEMS`·`BEFORE_AFTER`는 Task 4, `TRUST`는 Task 6에서 삭제 |
| `app/globals.css` | 수정 | `--wak-deep`·`--wak-cta*` 토큰, `.wak-on-deep` 스코프 |
| `components/marketing/section-band.tsx` | 수정 | `surface="deep"` 추가 |
| `components/marketing/cta-link.tsx` | 수정 | primary 색을 `cta` 토큰으로 |
| `components/marketing/illustrations/hero-flow.tsx` | 수정 | 하드코딩 fill → 토큰 |
| `components/marketing/hero.tsx` | 수정 | 딥 잉크 히어로 |
| `components/marketing/pain.tsx` | 신규 | 고민 → 해결 통합 섹션 |
| `components/marketing/services.tsx` | 수정 | 쉬운 설명, `SECTIONS` 사용 |
| `components/marketing/process.tsx` | 수정 | 3단계 |
| `components/marketing/demos.tsx` | 수정 | `DEMOS` 사용, `SectionBand` |
| `components/marketing/faq.tsx` | 수정 | 실제 FAQ 5개 |
| `components/marketing/cta-band.tsx` | 수정 | `FinalCta`(딥 잉크)만 남김 |
| `app/(marketing)/page.tsx` | 수정 | 7섹션 조립, 스파인 제거 |
| `app/(marketing)/about/page.tsx` | 수정 | 회사소개 페이지 구현 |
| 삭제 | | `problems.tsx`, `before-after.tsx`, `illustrations/before-after-split.tsx`(Task 4) / `trust.tsx`, `section.tsx`(Task 6) |

---

### Task 1: 사례 메뉴 플래그

**Files:**
- Create: `lib/features.ts`
- Modify: `components/marketing/nav.ts`, `app/(marketing)/cases/page.tsx`, `app/sitemap.ts`
- Test(일회성, 커밋 전 삭제): `_wak_features.mts`

**Interfaces:**
- Produces: `CASES_ENABLED: boolean`, `withCasesGate<T extends { href: string }>(links: readonly T[], enabled?: boolean): T[]` (`enabled` 기본값 = `CASES_ENABLED`). `NAV_LINKS`(같은 이름·같은 항목 형태 `{ href, label }`)를 계속 export.

- [ ] **Step 1: 실패하는 테스트 작성**

`_wak_features.mts` (리포 루트):
```ts
import assert from "node:assert/strict";
import { CASES_ENABLED, withCasesGate } from "./lib/features.ts";

const links = [
  { href: "/diagnosis", label: "a" },
  { href: "/cases", label: "b" },
  { href: "/about", label: "c" },
];

assert.equal(CASES_ENABLED, false, "지금은 사례가 없으므로 기본 off");
assert.deepEqual(withCasesGate(links, false).map((l) => l.href), ["/diagnosis", "/about"]);
assert.deepEqual(withCasesGate(links, true).map((l) => l.href), ["/diagnosis", "/cases", "/about"]);
assert.deepEqual(withCasesGate(links).map((l) => l.href), ["/diagnosis", "/about"], "기본값은 CASES_ENABLED");
assert.deepEqual(withCasesGate([], false), []);

console.log("features: OK");
```

- [ ] **Step 2: 실패 확인**

Run: `node --experimental-strip-types _wak_features.mts`
Expected: FAIL — `Cannot find module './lib/features.ts'`

- [ ] **Step 3: 구현**

`lib/features.ts`:
```ts
// 기능 플래그. 환경변수가 아니라 상수 — NEXT_PUBLIC_* 는 빌드 시점에 고정되어
// Docker build args 를 빼먹으면 조용히 무효화된다(PR #19 사례). 사례를 채우려면 어차피 코드 배포가 필요하다.

/** 자동화 사례 메뉴·페이지. 실제 고객 사례가 생기면 true 로 바꾸고 재배포한다. */
export const CASES_ENABLED = false;

/** 플래그가 꺼져 있으면 /cases 링크를 걸러낸다. */
export function withCasesGate<T extends { href: string }>(
  links: readonly T[],
  enabled: boolean = CASES_ENABLED,
): T[] {
  return links.filter((l) => l.href !== "/cases" || enabled);
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --experimental-strip-types _wak_features.mts`
Expected: `features: OK`

- [ ] **Step 5: 네비·라우트·사이트맵 배선**

`components/marketing/nav.ts` 전체를 다음으로 교체:
```ts
import { withCasesGate } from "@/lib/features";

// 마케팅 네비게이션 링크. 블로그는 콘텐츠가 없어 제외(Phase 4).
// 자동화 사례는 CASES_ENABLED 가 켜졌을 때만 노출된다(lib/features.ts).
export const NAV_LINKS = withCasesGate([
  { href: "/diagnosis", label: "무료 진단" },
  { href: "/cases", label: "자동화 사례" },
  { href: "/about", label: "회사소개" },
  { href: "/consultation", label: "상담 신청" },
]);

export const PRIMARY_CTA = { href: "/diagnosis", label: "무료 자동화 진단" } as const;
```

`app/(marketing)/cases/page.tsx` 전체를 다음으로 교체:
```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CASES_ENABLED } from "@/lib/features";

// [스텁] 자동화 사례 — Phase 4.2 / 기획서 §5 에서 구현 예정 (task.md). CASES_ENABLED 가 꺼져 있으면 404.
// 켜는 시점에 실제 사례 콘텐츠와 함께 noindex 를 해제한다.
export const metadata: Metadata = {
  title: "자동화 사례",
  robots: { index: false, follow: false },
};

export default function Page() {
  if (!CASES_ENABLED) notFound();
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">자동화 사례</h1>
      <p className="text-sm text-neutral-500">스텁 페이지 · Phase 4.2 / 기획서 §5</p>
    </main>
  );
}
```

`app/sitemap.ts`: 상단 import 에 `import { CASES_ENABLED } from "@/lib/features";` 를 추가하고, 주석을 `색인 대상 공개 라우트만. 제외: per-user 결과(/diagnosis/[id]), 관리자(/admin/*), API. /cases 는 CASES_ENABLED 가 켜졌을 때만 포함된다.` 로 바꾸고, 반환 배열의 `/consultation` 항목 뒤에 다음을 추가한다:
```ts
    ...(CASES_ENABLED
      ? [
          {
            url: `${SITE_URL}/cases`,
            lastModified: now,
            changeFrequency: "monthly" as const,
            priority: 0.7,
          },
        ]
      : []),
```

- [ ] **Step 6: 남은 `/cases` 참조 점검**

Run: `grep -rn "/cases" app components lib --include=*.ts --include=*.tsx | grep -v "^lib/features.ts"`
Expected: `nav.ts`(게이트된 항목), `cases/page.tsx`, `sitemap.ts`(게이트) 뿐. 이 밖에 `/cases` 로 가는 링크가 있으면(예: 푸터·히어로) 같은 플래그로 게이트하거나 제거한다.

- [ ] **Step 7: 타입·린트·빌드**

```bash
npx tsc --noEmit
npx eslint lib components/marketing "app/(marketing)/cases" app/sitemap.ts
npm run build
```
Expected: 모두 0. 빌드 라우트 표에서 `/cases`가 오류 없이 나온다.

- [ ] **Step 8: 실동작 확인 (플래그 off / on)**

```bash
export SCRATCH=<세션 scratchpad>
nohup npm run dev > "$SCRATCH/dev.log" 2>&1 &
sleep 8
curl -s -o /dev/null -w "cases(off): %{http_code}\n" http://localhost:3000/cases
curl -s http://localhost:3000/ | grep -c "자동화 사례" || true
curl -s http://localhost:3000/sitemap.xml | grep -c "/cases" || true
```
Expected: `cases(off): 404`, 홈 HTML에 "자동화 사례" 0회(네비에 없음), 사이트맵에 `/cases` 0회.

이어서 플래그를 잠시 켜서 확인한 뒤 **반드시 되돌린다**:
```bash
sed -i '' 's/export const CASES_ENABLED = false;/export const CASES_ENABLED = true;/' lib/features.ts
sleep 3
curl -s -o /dev/null -w "cases(on): %{http_code}\n" http://localhost:3000/cases
curl -s http://localhost:3000/ | grep -c "자동화 사례" || true
sed -i '' 's/export const CASES_ENABLED = true;/export const CASES_ENABLED = false;/' lib/features.ts
grep -n "CASES_ENABLED =" lib/features.ts
pkill -f "next dev"
```
Expected: `cases(on): 200`, 네비에 "자동화 사례" 1회 이상, 되돌린 뒤 `export const CASES_ENABLED = false;`.

- [ ] **Step 9: 정리 + 커밋**

```bash
rm _wak_features.mts
git add lib/features.ts components/marketing/nav.ts "app/(marketing)/cases/page.tsx" app/sitemap.ts
git commit -m "feat(marketing): 자동화 사례 메뉴 플래그 (CASES_ENABLED)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: 카피 단일 소스 재작성

**Files:**
- Modify: `content/marketing.ts`
- Test(일회성, 커밋 전 삭제): `_wak_marketing_content.mts`

**Interfaces:**
- Produces(이후 태스크가 소비):
  - `HERO: { headline: readonly [string, string]; sub: string; facts: readonly string[] }` (기존 모양 유지)
  - `SECTIONS: Record<"pain" | "services" | "process" | "demos" | "faq", { eyebrow: string; heading: string; lead?: string }>`
  - `PAIN: readonly { task: string; before: string; after: string; icon: IconName }[]` (6행)
  - `SERVICES: readonly { name: string; desc: string; icon: IconName }[]` (5행, `name`은 `SERVICE_TYPES`와 동일 순서·값)
  - `PROCESS: readonly { step: string; icon: IconName; desc: string }[]` (3행)
  - `DEMOS: readonly { title: string; steps: readonly string[]; effect: string; note?: string }[]` (3행)
  - `FAQ: readonly { q: string; a: string }[]` (5행)
  - `FINAL_CTA: { heading: string; body: string; button: string; note: string }`
  - `ABOUT`(변경 없음)
- 이 태스크는 `PROBLEMS`·`BEFORE_AFTER`·`TRUST`를 **건드리지 않는다**(Task 4·6에서 소비 컴포넌트와 함께 삭제) — 그래서 중간 커밋에서도 빌드가 깨지지 않는다.

- [ ] **Step 1: 실패하는 불변식 테스트 작성**

`_wak_marketing_content.mts` (리포 루트):
```ts
import assert from "node:assert/strict";
import { SERVICE_TYPES } from "./lib/options.ts";
import { ABOUT, DEMOS, FAQ, FINAL_CTA, HERO, PAIN, PROCESS, SECTIONS, SERVICES } from "./content/marketing.ts";

// 절대원칙 2 — 서비스는 정확히 5종, 이름·순서 동일
assert.deepEqual(SERVICES.map((s) => s.name), [...SERVICE_TYPES]);

// 구조 (스펙 §X)
assert.equal(PAIN.length, 6);
assert.equal(PROCESS.length, 3);
assert.equal(FAQ.length, 5);
assert.equal(DEMOS.length, 3);
for (const d of DEMOS) assert.ok(d.steps.length >= 4, `${d.title}: 단계 수`);
assert.deepEqual(Object.keys(SECTIONS).sort(), ["demos", "faq", "pain", "process", "services"]);

// 모든 문자열 수집
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}
const copy = strings([HERO, SECTIONS, PAIN, PROCESS, DEMOS, FAQ, FINAL_CTA]);
assert.ok(copy.every((s) => s.trim().length > 0), "빈 문구 없음");
assert.ok(!copy.some((s) => /TODO|확정 전|들어갑니다/.test(s)), "플레이스홀더 없음");

// 절대원칙 1 — 홈페이지 제작을 서비스로 내세우지 않는다
assert.ok(!strings([HERO, SECTIONS, PAIN, PROCESS, DEMOS, FAQ, FINAL_CTA]).some((s) => s.includes("홈페이지 제작")));
// 절대원칙 4 — 보장 표현 금지 ("보장하지 않아요" 같은 부정형은 허용)
assert.ok(!copy.some((s) => /보장(합니다|해 ?드|해요|됩니다)/.test(s)), "보장 표현");
// 쉬운 말 — 전문용어 금지 (서비스 이름의 n8n 은 SERVICES 에만 있으므로 검사 대상 아님)
const JARGON = /n8n|gpt|워크플로우|웹훅|\bAPI\b|\bRSC\b|프롬프트/i;
assert.ok(!copy.some((s) => JARGON.test(s)), `전문용어: ${copy.find((s) => JARGON.test(s))}`);

// 절대원칙 3 — 데모는 "실제 고객 사례가 아님"을 밝힌다
assert.ok(/실제 고객 사례가 아니/.test(SECTIONS.demos.lead ?? ""), "데모 안내 문구");

// About 은 그대로 유지
assert.equal(ABOUT.notDoing.length, 3);

console.log("marketing content: OK");
```

- [ ] **Step 2: 실패 확인**

Run: `node --experimental-strip-types _wak_marketing_content.mts`
Expected: FAIL — `SECTIONS`/`PAIN`/`DEMOS`/`FINAL_CTA` 가 export 되지 않았다는 오류(`does not provide an export named`).

- [ ] **Step 3: `content/marketing.ts` 재작성**

파일 전체를 다음으로 교체(주의: `PROBLEMS`·`BEFORE_AFTER`·`TRUST`·`ABOUT` 은 **현재 값 그대로** 아래에 옮겨 둔다):
```ts
/**
 * 마케팅 카피 단일 소스 (절대원칙 §2, docs/decisions.md D2)
 *
 * SERVICES.name 은 반드시 lib/options.ts SERVICE_TYPES 와 정확히 같은 순서·값
 * 모든 icon 값은 components/marketing/icons.tsx IconName 에 존재
 * 문구는 쉬운 말로: 짧은 문장, 전문용어(n8n·워크플로우·API 등)는 풀어 쓴다. 서비스 "이름"만 예외.
 */

import type { IconName } from "@/components/marketing/icons";

export const HERO = {
  headline: ["반복 업무,", "AI가 대신합니다"],
  sub: "3분 무료 진단으로, 우리 회사에서 자동화할 수 있는 일을 찾아드려요.",
  facts: ["무료", "약 3분", "가입 없음"],
} as const;

export const SECTIONS: Record<
  "pain" | "services" | "process" | "demos" | "faq",
  { eyebrow: string; heading: string; lead?: string }
> = {
  pain: {
    eyebrow: "고민",
    heading: "이런 일, 아직 손으로 하고 계신가요?",
    lead: "자동화하면 이렇게 달라져요.",
  },
  services: {
    eyebrow: "서비스",
    heading: "이런 걸 해드려요",
    lead: "서비스는 다섯 가지예요.",
  },
  process: {
    eyebrow: "진행 방식",
    heading: "이렇게 진행돼요",
    lead: "진단부터 구축까지, 세 단계예요.",
  },
  demos: {
    eyebrow: "데모",
    heading: "이렇게 움직여요",
    lead: "실제 고객 사례가 아니라, 동작 방식을 보여 드리는 예시예요.",
  },
  faq: {
    eyebrow: "질문",
    heading: "자주 묻는 질문",
  },
};

export const PAIN = [
  {
    task: "고객 문의",
    before: "메일을 하나씩 열어서 확인",
    after: "접수되면 바로 저장하고 알림",
    icon: "inbox" as IconName,
  },
  {
    task: "고객 관리",
    before: "엑셀에 직접 입력",
    after: "고객 목록에 자동 등록",
    icon: "sheet" as IconName,
  },
  {
    task: "견적서",
    before: "매번 양식을 복사해서 수정",
    after: "AI가 초안을 만들어 줌",
    icon: "file-text" as IconName,
  },
  {
    task: "상담 기록",
    before: "직원이 직접 정리",
    after: "AI가 자동으로 요약",
    icon: "clipboard-list" as IconName,
  },
  {
    task: "블로그·SNS",
    before: "조사부터 글쓰기까지 직접",
    after: "자료와 초안을 자동 준비",
    icon: "pen-line" as IconName,
  },
  {
    task: "보고서",
    before: "자료를 복사해서 작성",
    after: "정해진 양식으로 자동 작성",
    icon: "bar-chart" as IconName,
  },
] as const;

export const SERVICES = [
  {
    name: "AI Automation",
    desc: "매일 반복하는 사무·영업 업무를 AI가 대신 처리해요.",
    icon: "workflow" as IconName,
  },
  {
    name: "n8n Automation",
    desc: "메일·엑셀·메신저·AI를 서로 연결해서 자동으로 흘러가게 해요.",
    icon: "waypoints" as IconName,
  },
  {
    name: "Smart Website",
    desc: "문의 접수와 고객 관리가 자동으로 이어지는 홈페이지예요.",
    icon: "globe" as IconName,
  },
  {
    name: "AI Agent",
    desc: "회사 문서를 읽고 고객 질문에 답하는 AI 직원이에요.",
    icon: "bot" as IconName,
  },
  {
    name: "AI Consulting",
    desc: "우리 회사에 AI를 어떻게 쓸지 진단하고 교육해 드려요.",
    icon: "graduation-cap" as IconName,
  },
] as const;

export const PROCESS = [
  {
    step: "무료 진단",
    icon: "scan-search" as IconName,
    desc: "회사와 업무 정보를 입력하면 AI가 자동화할 수 있는 일을 추정해서 알려드려요. 3분이면 끝나요.",
  },
  {
    step: "제안",
    icon: "pencil-ruler" as IconName,
    desc: "진단 결과를 보고 무엇부터 자동화할지, 예상 비용과 기간을 제안서로 정리해 드려요.",
  },
  {
    step: "구축",
    icon: "wrench" as IconName,
    desc: "제안이 맞으면 지금 쓰는 도구에 연결해서 만들고, 실제 데이터로 테스트한 뒤 넘겨 드려요. 이후 오류도 함께 살펴봐요.",
  },
] as const;

export const DEMOS = [
  {
    title: "문의 자동화",
    steps: [
      "문의 접수",
      "AI가 유형 분류",
      "고객 목록에 저장",
      "담당자에게 알림",
      "접수 확인 메일",
      "답변 초안 작성",
    ],
    effect: "문의를 놓치지 않고, 답변이 빨라져요.",
  },
  {
    title: "견적 자동화",
    steps: ["견적 요청", "요구사항 파악", "추가 질문", "견적 초안", "담당자 확인"],
    effect: "견적 작성 시간이 줄고, 기준이 일정해져요.",
  },
  {
    title: "콘텐츠 자동화",
    steps: [
      "키워드 입력",
      "자료 수집",
      "AI 초안",
      "이미지 준비",
      "블로그에 임시 저장",
      "사람이 검수",
    ],
    effect: "품질은 지키고, 준비 시간은 줄어요.",
    note: "완전 자동 발행이 아니라, 사람이 검수한 뒤 게시해요.",
  },
] as const;

export const FAQ = [
  {
    q: "비용은 얼마인가요?",
    a: "일의 범위에 따라 다르지만 보통 150만~800만원 사이예요. 무료 진단 뒤에 받으시는 제안서에 정확한 견적이 들어 있어요.",
  },
  {
    q: "얼마나 걸리나요?",
    a: "간단한 자동화는 1~2주, 여러 업무를 함께 하면 3~5주쯤 걸려요. 오픈한 뒤에는 오류 알림과 개선도 함께 살펴봐요.",
  },
  {
    q: "지금 쓰는 도구와 연결되나요?",
    a: "메일, 구글시트, 카카오톡, Slack, Telegram 같은 도구는 대부분 연결돼요. 어려운 경우는 진단에서 미리 알려드려요.",
  },
  {
    q: "우리 정보는 안전한가요?",
    a: "이름과 연락처는 저희 데이터베이스에만 저장하고, AI에게는 보내지 않아요. 자세한 내용은 개인정보처리방침에서 확인하실 수 있어요.",
  },
  {
    q: "진단 결과는 얼마나 정확한가요?",
    a: "입력하신 내용을 바탕으로 AI가 계산한 추정치예요. 방향을 잡는 용도이고, 실제 효과는 업무 방식에 따라 달라져요. 상담에서 구체적으로 정리해 드려요.",
  },
] as const;

export const FINAL_CTA = {
  heading: "우리 회사는 무엇을 자동화할 수 있을까요?",
  body: "3분이면 알 수 있어요. 결과는 AI가 추정한 값이라, 자세한 내용은 상담에서 함께 정해요.",
  button: "무료 진단 시작",
  note: "무료 · 가입 없음",
} as const;

// ── 아래 3개는 소비 컴포넌트와 함께 후속 태스크에서 삭제된다 (PROBLEMS·BEFORE_AFTER: Task 4, TRUST: Task 6) ──

export const PROBLEMS = [
  { label: "문의 수동 확인", icon: "inbox" as IconName },
  { label: "엑셀 재입력", icon: "sheet" as IconName },
  { label: "견적서 매번 재작성", icon: "file-text" as IconName },
  { label: "상담 수기 정리", icon: "clipboard-list" as IconName },
  { label: "블로그·SNS 직접 제작", icon: "pen-line" as IconName },
  { label: "보고서 복사·작성", icon: "bar-chart" as IconName },
] as const;

export const BEFORE_AFTER = [
  { task: "고객 문의", before: "이메일 수동 확인", after: "접수 즉시 저장·알림" },
  { task: "고객 관리", before: "엑셀 수기 입력", after: "CRM 자동 등록" },
  { task: "견적 작성", before: "양식 복사·수정", after: "AI 초안 생성" },
  { task: "상담 정리", before: "직원 수기 작성", after: "AI 자동 요약" },
  { task: "블로그", before: "조사부터 직접 수행", after: "자료·초안 자동 생성" },
  { task: "보고서", before: "자료 복사 후 작성", after: "지정 양식 자동 생성" },
] as const;

export const TRUST = [
  {
    point: "고정 기술 스택 공개",
    icon: "layers" as IconName,
    body: "Next.js · Supabase · n8n · OpenAI · Telegram 으로 고정합니다. 어떤 도구로 무엇을 하는지 처음부터 공개합니다.",
  },
  {
    point: "구축 과정 투명 공유",
    icon: "eye" as IconName,
    body: "진단부터 이관까지 각 단계의 산출물(제안서·워크플로우·문서)을 그대로 전달합니다. 블랙박스가 없습니다.",
  },
  {
    point: "데모 재현 가능",
    icon: "refresh-cw" as IconName,
    body: "홈페이지의 자동화 데모는 실제 동작하는 흐름입니다. 상담 시 같은 구성을 직접 시연합니다.",
  },
] as const;

export const ABOUT = {
  mission:
    "WEBAGENT.KR 은 중소기업이 반복 업무를 사람 대신 AI와 자동화에 맡기도록 돕습니다. 고객 문의·견적·보고서·콘텐츠 제작처럼 매일 반복되는 일을 n8n 워크플로우와 AI 호출로 연결해, 직원이 판단이 필요한 일에 집중할 수 있게 만듭니다.",
  notDoing: [
    "홈페이지 제작을 단독 상품으로 팔지 않습니다. 홈페이지는 Smart Website 서비스의 결과물 중 하나일 뿐입니다.",
    "실제 고객 사례가 없는 화면을 사례처럼 포장하지 않습니다. 홈페이지의 예시는 모두 \"자동화 데모\"로 표시합니다.",
    "AI가 추정한 절감 효과를 보장처럼 말하지 않습니다. 결과는 언제나 추정치입니다.",
  ],
  stack:
    "기술 스택은 Next.js · Supabase · n8n · OpenAI · Telegram 으로 고정합니다. 새 도구를 매번 갈아끼우지 않고, 검증된 조합을 깊게 다룹니다.",
  solo: "현재 소수 인원 체제로 운영합니다. 모든 자동화에는 실패 시 담당자에게 즉시 알리는 오류 알림 채널을 기본으로 붙여, 사람이 적어도 누락이 생기지 않게 합니다.",
} as const;
```

- [ ] **Step 4: 통과 확인**

Run: `node --experimental-strip-types _wak_marketing_content.mts`
Expected: `marketing content: OK`. 실패 시 메시지에 나온 문구를 고친다(테스트를 완화하지 말 것).

- [ ] **Step 5: 타입·린트·빌드**

```bash
npx tsc --noEmit
npx eslint content components/marketing
npm run build
```
Expected: 0. (`PROCESS` 가 5→3개가 되어도 `process.tsx`는 자체 상수를 쓰므로 영향 없음. `HERO`·`FAQ`·`SERVICES` 를 쓰는 기존 컴포넌트는 같은 모양이라 컴파일된다.)

- [ ] **Step 6: 정리 + 커밋**

```bash
rm _wak_marketing_content.mts
git add content/marketing.ts
git commit -m "feat(marketing): 카피를 쉬운 말로 재작성 (7섹션 구조 + SECTIONS/PAIN/DEMOS/FINAL_CTA)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: 딥 잉크 토큰 + 히어로

**Files:**
- Modify: `app/globals.css`, `components/marketing/section-band.tsx`, `components/marketing/cta-link.tsx`, `components/marketing/illustrations/hero-flow.tsx`, `components/marketing/hero.tsx`
- Test(일회성, 커밋 전 삭제): `_wak_contrast.mts`

**Interfaces:**
- Consumes: `HERO`(Task 2, 모양 동일)
- Produces: CSS 클래스 `.wak-on-deep`(스코프 — 안쪽에서 `--wak-ink/-ink-soft/-line/-panel/-signal/-resolved/-cta/-cta-hover/-on-cta` 재정의), Tailwind 색 `bg-deep`·`bg-cta`·`text-on-cta`·`hover:bg-cta-hover`, `SectionBand`의 `surface: "paper" | "panel" | "tint" | "deep"`

- [ ] **Step 1: 실패하는 대비 테스트 작성**

이 스크립트는 `app/globals.css`에서 **실제 토큰 값을 읽어** WCAG 대비를 검사한다.

`_wak_contrast.mts` (리포 루트):
```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");

function block(selector: string): string {
  const i = css.indexOf(`${selector} {`);
  assert.ok(i >= 0, `${selector} 블록이 globals.css 에 없다`);
  return css.slice(i, css.indexOf("}", i));
}
function token(b: string, name: string): string {
  const m = b.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `${name} (hex) 를 찾지 못했다`);
  return m[1];
}
function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const root = block(":root");
const deepScope = block(".wak-on-deep");
const deepBg = token(root, "--wak-deep");

const checks: [string, string, string][] = [
  ["ink on deep", token(deepScope, "--wak-ink"), deepBg],
  ["ink-soft on deep", token(deepScope, "--wak-ink-soft"), deepBg],
  ["signal on deep", token(deepScope, "--wak-signal"), deepBg],
  ["resolved on deep", token(deepScope, "--wak-resolved"), deepBg],
  ["on-cta on cta (deep)", token(deepScope, "--wak-on-cta"), token(deepScope, "--wak-cta")],
  ["on-cta on cta-hover (deep)", token(deepScope, "--wak-on-cta"), token(deepScope, "--wak-cta-hover")],
  ["on-cta on cta (light)", token(root, "--wak-on-cta"), token(root, "--wak-cta")],
  ["on-cta on cta-hover (light)", token(root, "--wak-on-cta"), token(root, "--wak-cta-hover")],
];

for (const [name, fg, bg] of checks) {
  const r = ratio(fg, bg);
  console.log(`${name}: ${fg} on ${bg} = ${r.toFixed(2)}`);
  assert.ok(r >= 4.5, `${name}: 대비 ${r.toFixed(2)} < 4.5`);
}
console.log("contrast: OK");
```

- [ ] **Step 2: 실패 확인**

Run: `node --experimental-strip-types _wak_contrast.mts`
Expected: FAIL — `.wak-on-deep 블록이 globals.css 에 없다`

- [ ] **Step 3: 토큰·스코프 추가 (`app/globals.css`)**

(a) `@theme inline { ... }` 안의 마케팅 토큰 묶음(`--color-danger: var(--wak-danger);` 다음 줄)에 추가:
```css
  --color-deep: var(--wak-deep);
  --color-cta: var(--wak-cta);
  --color-cta-hover: var(--wak-cta-hover);
  --color-on-cta: var(--wak-on-cta);
```
그리고 그 위 주석 `라이트 전용`을 `라이트 기본 + .wak-on-deep 스코프에서 어두운 표면용으로 재정의`로 바꾼다.

(b) 첫 번째 `:root { --wak-paper: ... }` 블록(마케팅 토큰 블록)의 `--wak-shadow-card` 다음 줄에 추가:
```css
  --wak-deep: #0f1f21;
  --wak-cta: #1f3ce6;
  --wak-cta-hover: #182fc0;
  --wak-on-cta: #ffffff;
```

(c) 같은 `:root` 블록이 끝난 바로 뒤에 새 블록을 추가:
```css
/*
 * 어두운 표면 스코프. 이 클래스 안에서는 text-ink / text-ink-soft / border-line / text-signal /
 * bg-panel / text-resolved / bg-cta 가 전부 어두운 배경용 값으로 다시 풀린다
 * (@theme inline 이 유틸리티를 var(--wak-*) 참조로 남기기 때문). 배경은 bg-deep 으로 따로 준다.
 * 대비는 _wak 검증 스크립트 기준 본문 4.5:1 이상.
 */
.wak-on-deep {
  --wak-ink: #f5f6f2;
  --wak-ink-soft: #b8c9c8;
  --wak-line: rgb(255 255 255 / 0.2);
  --wak-panel: rgb(255 255 255 / 0.06);
  --wak-signal: #8ea0ff;
  --wak-resolved: #7fe0cf;
  --wak-cta: #3b5bff;
  --wak-cta-hover: #2f4ef0;
  --wak-on-cta: #ffffff;
  --wak-shadow-card: none;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --experimental-strip-types _wak_contrast.mts`
Expected: 8줄의 `name: fg on bg = N.NN` 출력 후 `contrast: OK` (모두 4.5 이상).

- [ ] **Step 5: `SectionBand` 에 `deep` 표면 추가**

`components/marketing/section-band.tsx`: `SURFACE` 맵과 `surface` prop 타입을 다음처럼 바꾼다.
```tsx
const SURFACE: Record<"paper" | "panel" | "tint" | "deep", string> = {
  paper: "bg-paper",
  panel: "bg-panel",
  tint: "bg-tint",
  deep: "wak-on-deep bg-deep",
};
```
```tsx
  surface?: "paper" | "panel" | "tint" | "deep";
```
(나머지는 그대로.)

- [ ] **Step 6: `CtaLink` primary 를 토큰으로**

`components/marketing/cta-link.tsx` 의 `variants.primary` 를 다음으로 교체:
```tsx
  primary: "bg-cta text-on-cta hover:bg-cta-hover",
```

- [ ] **Step 7: `HeroFlow` 의 하드코딩 fill 을 토큰으로**

`components/marketing/illustrations/hero-flow.tsx` 에서 두 fill 을 교체(어두운 배경에서도 신호·해결 색을 따라가도록):
- `fill="rgb(31 60 230 / 0.06)"` → `fill="color-mix(in srgb, var(--wak-signal) 14%, transparent)"`
- `fill="rgb(12 139 119 / 0.06)"` → `fill="color-mix(in srgb, var(--wak-resolved) 14%, transparent)"`

- [ ] **Step 8: 히어로를 딥 잉크로 재작성**

`components/marketing/hero.tsx` 전체를 다음으로 교체:
```tsx
import { CtaLink } from "@/components/marketing/cta-link";
import { HeroFlow } from "@/components/marketing/illustrations/hero-flow";
import { GridTexture } from "@/components/marketing/illustrations/grid-texture";
import { HERO } from "@/content/marketing";

// 딥 잉크 히어로 — .wak-on-deep 스코프라 내부의 text-ink / border-line / text-signal 이 자동으로 어두운 배경용 값이 된다.
export function Hero() {
  return (
    <section className="wak-on-deep relative w-full overflow-hidden bg-deep">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_300px_at_78%_35%,rgb(59_91_255/0.30),transparent_70%)]"
      />
      <GridTexture className="pointer-events-none absolute inset-0 text-ink opacity-[0.07]" />
      <div className="relative mx-auto grid max-w-[1120px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 lg:py-24">
        <div>
          <p className="font-flow text-[0.75rem] tracking-[0.14em] text-resolved">
            WEBAGENT.KR
          </p>
          <h1 className="mt-4 text-[2.4rem] leading-[1.15] font-extrabold tracking-tight text-balance text-ink sm:text-[3.1rem]">
            {HERO.headline.map((l, i) => (
              <span key={i} className="block">
                {l}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.05rem] leading-[1.75] text-ink-soft">
            {HERO.sub}
          </p>
          <ul className="mt-7 flex flex-wrap gap-2">
            {HERO.facts.map((f) => (
              <li
                key={f}
                className="rounded-full border border-line px-3 py-1 text-[0.78rem] text-ink-soft"
              >
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <CtaLink href="/diagnosis">무료 진단 시작</CtaLink>
            <CtaLink href="/#demos" variant="ghost">
              자동화 데모 보기
            </CtaLink>
          </div>
        </div>
        <HeroFlow />
      </div>
    </section>
  );
}
```

- [ ] **Step 9: 타입·린트·빌드**

```bash
npx tsc --noEmit
npx eslint components/marketing app
npm run build
```
Expected: 0.

- [ ] **Step 10: 육안 확인 (Playwright)**

dev 서버를 띄우고 `http://localhost:3000/` 을 1280px·400px 로 연다. 확인 항목:
- 히어로가 어두운 청록 바탕이고, 헤드라인("반복 업무, / AI가 대신합니다")·부제·칩 3개("무료", "약 3분", "가입 없음")가 또렷이 읽힌다.
- "무료 진단 시작" 버튼이 밝은 파랑 바탕에 흰 글씨, "자동화 데모 보기"는 밝은 글씨 밑줄 링크.
- 오른쪽 흐름 그림(문의 접수 → AI 처리 → 3개 출력)이 어두운 바탕에서 선·글자가 보이고, 노드 fill 이 은은하게 색을 띤다.
- 모바일에서 가로 스크롤이 없다 (`document.documentElement.scrollWidth <= window.innerWidth` 를 evaluate 로 확인).
- 히어로 아래 기존 섹션(아직 옛 구성)이 깨지지 않고 이어진다.
- 상단 헤더는 밝은 바탕 그대로이며 히어로와 자연스럽게 이어진다.

- [ ] **Step 11: 정리 + 커밋**

```bash
pkill -f "next dev"
rm _wak_contrast.mts
git add app/globals.css components/marketing/section-band.tsx components/marketing/cta-link.tsx components/marketing/illustrations/hero-flow.tsx components/marketing/hero.tsx
git commit -m "feat(marketing): 딥 잉크 표면 토큰(.wak-on-deep) + 히어로 재구성

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: 고민 → 해결 통합 섹션 + 서비스 쉬운 설명

**Files:**
- Create: `components/marketing/pain.tsx`
- Modify: `components/marketing/services.tsx`, `app/(marketing)/page.tsx`, `content/marketing.ts`(옛 `PROBLEMS`·`BEFORE_AFTER` 삭제)
- Delete: `components/marketing/problems.tsx`, `components/marketing/before-after.tsx`, `components/marketing/illustrations/before-after-split.tsx`

**Interfaces:**
- Consumes: `SECTIONS`, `PAIN`, `SERVICES`(Task 2), `SectionBand`, `Icon`(`components/marketing/icons.tsx`)
- Produces: `Pain()` (props 없음), `Services()` (props 없음 — 기존과 동일)

- [ ] **Step 1: `Pain` 섹션 작성**

`components/marketing/pain.tsx`:
```tsx
import { ArrowRight } from "lucide-react";
import { SectionBand } from "@/components/marketing/section-band";
import { Icon } from "@/components/marketing/icons";
import { PAIN, SECTIONS } from "@/content/marketing";

// 고민(지금) → 자동화 후 를 한 카드에 묶는다 (옛 Problems + Before/After 통합).
export function Pain() {
  const s = SECTIONS.pain;
  return (
    <SectionBand surface="tint" eyebrow={s.eyebrow} heading={s.heading} lead={s.lead} wide>
      <ul className="grid gap-4 md:grid-cols-2">
        {PAIN.map((row) => (
          <li
            key={row.task}
            className="rounded-lg border border-line bg-panel p-5 shadow-[var(--wak-shadow-card)]"
          >
            <div className="flex items-center gap-2.5">
              <Icon name={row.icon} />
              <p className="text-[1.02rem] font-semibold text-ink">{row.task}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start sm:gap-3">
              <div>
                <p className="font-flow text-[0.68rem] tracking-[0.04em] text-ink-soft">지금</p>
                <p className="mt-1 text-[0.92rem] text-ink-soft">{row.before}</p>
              </div>
              <ArrowRight
                aria-hidden
                size={18}
                strokeWidth={1.75}
                className="mt-1 rotate-90 self-center text-ink-soft sm:mt-5 sm:rotate-0"
              />
              <div>
                <p className="font-flow text-[0.68rem] tracking-[0.04em] text-resolved">자동화 후</p>
                <p className="mt-1 text-[0.92rem] font-medium text-resolved">{row.after}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionBand>
  );
}
```

- [ ] **Step 2: `Services` 를 카피 소스로 통일**

`components/marketing/services.tsx` 전체를 다음으로 교체:
```tsx
import { SectionBand } from "@/components/marketing/section-band";
import { Icon } from "@/components/marketing/icons";
import { SECTIONS, SERVICES } from "@/content/marketing";

// 서비스는 항상 정확히 5종 (절대원칙 §2). 재분류·통합·번호 금지. SERVICES 배열 순서 그대로.
export function Services() {
  const s = SECTIONS.services;
  return (
    <SectionBand surface="paper" eyebrow={s.eyebrow} heading={s.heading} lead={s.lead} wide>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((svc) => (
          <article
            key={svc.name}
            className="rounded-lg border border-line bg-panel p-5 shadow-[var(--wak-shadow-card)]"
          >
            <Icon name={svc.icon} />
            <p className="mt-3 font-flow text-[0.95rem] tracking-tight text-ink">{svc.name}</p>
            <p className="mt-2 text-[0.95rem] leading-[1.7] text-ink-soft">{svc.desc}</p>
          </article>
        ))}
      </div>
    </SectionBand>
  );
}
```

- [ ] **Step 3: 페이지에서 옛 두 섹션을 `Pain` 으로 교체**

`app/(marketing)/page.tsx`: import 두 줄(`Problems`, `BeforeAfter`)을 `import { Pain } from "@/components/marketing/pain";` 한 줄로 바꾸고, JSX 의 `<Problems />` `<BeforeAfter />` 두 줄을 `<Pain />` 한 줄로 바꾼다. (다른 섹션·스파인은 Task 6 에서 정리하므로 그대로 둔다.)

- [ ] **Step 4: 옛 파일·카피 삭제**

```bash
git rm components/marketing/problems.tsx components/marketing/before-after.tsx components/marketing/illustrations/before-after-split.tsx
```
`content/marketing.ts` 에서 `PROBLEMS`·`BEFORE_AFTER` 두 export 블록과 그 위의 구분 주석 중 `(PROBLEMS·BEFORE_AFTER: Task 4, …)` 부분을 정리한다(주석은 `// ── 아래 TRUST 는 소비 컴포넌트와 함께 Task 6 에서 삭제된다 ──` 로 축약). `PROBLEMS`·`BEFORE_AFTER` 를 참조하는 곳이 더 없는지 확인:
```bash
grep -rn "PROBLEMS\|BEFORE_AFTER\|BeforeAfterSplit\|Problems\b" app components content lib
```
Expected: 출력 없음.

- [ ] **Step 5: 타입·린트·빌드**

```bash
npx tsc --noEmit
npx eslint components/marketing content app
npm run build
```
Expected: 0.

- [ ] **Step 6: 육안 확인 (Playwright)**

`/` 를 1280px·400px 로 연다. 확인 항목:
- 히어로 아래 연한 청회색(tint) 밴드에 "고민" 라벨과 제목 "이런 일, 아직 손으로 하고 계신가요?", 그 아래 "자동화하면 이렇게 달라져요." 가 보인다.
- 6개 카드(고객 문의/고객 관리/견적서/상담 기록/블로그·SNS/보고서)가 데스크톱 2열·모바일 1열이고, 각 카드에 "지금 … → 자동화 후 …"(모바일에서는 화살표가 아래 방향으로 회전)이 보인다.
- 그 아래 서비스 섹션 제목이 "이런 걸 해드려요", 카드 5개, 각 설명이 쉬운 문장이다. 카드 5개의 영문 이름이 `AI Automation / n8n Automation / Smart Website / AI Agent / AI Consulting` 순서로 정확하다.
- 모바일 가로 스크롤 없음.

- [ ] **Step 7: 커밋**

```bash
pkill -f "next dev"
git add components/marketing/pain.tsx components/marketing/services.tsx "app/(marketing)/page.tsx" content/marketing.ts
git commit -m "feat(marketing): 고민→해결 통합 섹션(Pain) + 서비스 쉬운 설명, 옛 문제/비포애프터 제거

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
(`git rm` 한 파일 3개는 이미 스테이징되어 같은 커밋에 포함된다.)

---

### Task 5: 진행 방식(3단계) + 데모 + FAQ

**Files:**
- Modify: `components/marketing/process.tsx`, `components/marketing/demos.tsx`, `components/marketing/faq.tsx`

**Interfaces:**
- Consumes: `SECTIONS`, `PROCESS`, `DEMOS`, `FAQ`(Task 2), `SectionBand`(`id` prop 포함), `Icon`
- Produces: `Process()`, `Demos()`(섹션 `id="demos"` — 히어로의 `/#demos` 앵커 대상), `Faq()` (모두 props 없음, 기존 export 이름 유지)

- [ ] **Step 1: `Process` 재작성**

`components/marketing/process.tsx` 전체를 다음으로 교체:
```tsx
import { ArrowRight } from "lucide-react";
import { SectionBand } from "@/components/marketing/section-band";
import { Icon } from "@/components/marketing/icons";
import { PROCESS, SECTIONS } from "@/content/marketing";

// 진행 방식 — 진짜 순서라 번호 사용. 3단계 (진단 → 제안 → 구축).
export function Process() {
  const s = SECTIONS.process;
  return (
    <SectionBand surface="panel" eyebrow={s.eyebrow} heading={s.heading} lead={s.lead} wide>
      <ol className="grid gap-6 md:grid-cols-3">
        {PROCESS.map((p, i) => (
          <li
            key={p.step}
            className="relative rounded-lg border border-line bg-paper p-6"
          >
            <div className="flex items-center justify-between">
              <span className="font-flow text-[0.8rem] text-signal">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Icon name={p.icon} />
            </div>
            <p className="mt-4 text-[1.1rem] font-bold text-ink">{p.step}</p>
            <p className="mt-2 text-[0.95rem] leading-[1.75] text-ink-soft">{p.desc}</p>
            {i < PROCESS.length - 1 && (
              <ArrowRight
                aria-hidden
                size={18}
                strokeWidth={1.75}
                className="absolute top-1/2 -right-[1.2rem] hidden -translate-y-1/2 text-ink-soft md:block"
              />
            )}
          </li>
        ))}
      </ol>
    </SectionBand>
  );
}
```

- [ ] **Step 2: `Demos` 재작성**

`components/marketing/demos.tsx` 전체를 다음으로 교체:
```tsx
import { SectionBand } from "@/components/marketing/section-band";
import { DEMOS, SECTIONS } from "@/content/marketing";

// 실제 고객이 없는 데모는 반드시 "자동화 데모"로 표시 (절대원칙 §3).
export function Demos() {
  const s = SECTIONS.demos;
  return (
    <SectionBand id="demos" surface="paper" eyebrow={s.eyebrow} heading={s.heading} lead={s.lead} wide>
      <div className="grid gap-6 lg:grid-cols-3">
        {DEMOS.map((demo) => (
          <article
            key={demo.title}
            className="flex flex-col rounded-lg border border-line bg-panel p-6 shadow-[var(--wak-shadow-card)]"
          >
            <span className="self-start rounded-sm border border-signal px-2 py-0.5 text-[0.7rem] font-medium tracking-wide text-signal">
              자동화 데모
            </span>
            <h3 className="mt-3 text-[1.15rem] font-bold text-ink">{demo.title}</h3>

            <ol className="mt-5 flex flex-col gap-2.5">
              {demo.steps.map((step, i) => (
                <li key={step} className="flex items-baseline gap-2.5">
                  <span className="font-flow text-[0.68rem] text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.95rem] text-ink">{step}</span>
                </li>
              ))}
            </ol>

            <p className="mt-6 border-t border-line pt-4 text-[0.92rem] font-medium text-resolved">
              기대 효과 · {demo.effect}
            </p>
            {"note" in demo && demo.note && (
              <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-soft">{demo.note}</p>
            )}
          </article>
        ))}
      </div>
    </SectionBand>
  );
}
```

- [ ] **Step 3: `Faq` 재작성**

`components/marketing/faq.tsx` 전체를 다음으로 교체:
```tsx
import { SectionBand } from "@/components/marketing/section-band";
import { FAQ, SECTIONS } from "@/content/marketing";

// 네이티브 <details> — 클라이언트 JS 없음.
export function Faq() {
  const s = SECTIONS.faq;
  return (
    <SectionBand surface="panel" eyebrow={s.eyebrow} heading={s.heading}>
      <div className="border-t border-line">
        {FAQ.map((item) => (
          <details key={item.q} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[1rem] font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                aria-hidden
                className="ml-4 text-ink-soft transition-transform group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <p className="pb-5 text-[0.95rem] leading-[1.75] text-ink-soft">{item.a}</p>
          </details>
        ))}
      </div>
    </SectionBand>
  );
}
```

- [ ] **Step 4: 타입·린트·빌드**

```bash
npx tsc --noEmit
npx eslint components/marketing
npm run build
```
Expected: 0. (`"note" in demo` 는 `DEMOS` 가 `as const` 튜플이라 항목별 유니온 타입이므로 필요한 좁히기다. tsc 가 다른 오류를 내면 그 오류에 맞게 최소 수정하고 보고서에 적는다.)

- [ ] **Step 5: 육안 확인 (Playwright)**

`/` 를 1280px·400px 로 연다. 확인 항목:
- "이렇게 진행돼요" 섹션: 3개 카드(무료 진단/제안/구축), 데스크톱에서 카드 사이 화살표, 모바일 1열.
- "이렇게 움직여요" 섹션: 제목 아래 "실제 고객 사례가 아니라, 동작 방식을 보여 드리는 예시예요." 문구, 3개 카드 각각에 **`자동화 데모` 배지**, 단계 번호 목록, "기대 효과 · …". 콘텐츠 자동화 카드에 "완전 자동 발행이 아니라, 사람이 검수한 뒤 게시해요." 노트.
- 히어로의 "자동화 데모 보기" 링크를 누르면 데모 섹션으로 스크롤된다(`/#demos`).
- FAQ 5개가 열리고 닫힌다(`+` 회전), 키보드 Tab 으로 summary 에 포커스 링이 보인다.
- 모바일 가로 스크롤 없음.

- [ ] **Step 6: 커밋**

```bash
pkill -f "next dev"
git add components/marketing/process.tsx components/marketing/demos.tsx components/marketing/faq.tsx
git commit -m "feat(marketing): 진행 방식 3단계·자동화 데모·FAQ를 새 카피로 재구성

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: 마지막 CTA + 랜딩 7섹션 조립 + 잔재 정리

**Files:**
- Modify: `components/marketing/cta-band.tsx`, `app/(marketing)/page.tsx`, `content/marketing.ts`(옛 `TRUST` 삭제)
- Delete: `components/marketing/trust.tsx`, `components/marketing/section.tsx`

**Interfaces:**
- Consumes: `FINAL_CTA`(Task 2), `CtaLink`, `Hero`·`Pain`·`Services`·`Process`·`Demos`·`Faq`
- Produces: `FinalCta()` (props 없음). `MidCta` 는 삭제된다.

- [ ] **Step 1: `cta-band.tsx` 를 딥 잉크 `FinalCta` 하나로**

`components/marketing/cta-band.tsx` 전체를 다음으로 교체:
```tsx
import { CtaLink } from "@/components/marketing/cta-link";
import { FINAL_CTA } from "@/content/marketing";

// 마지막 CTA — 히어로와 짝을 이루는 딥 잉크 밴드. (중간 CTA 는 없앴다.)
export function FinalCta() {
  return (
    <section className="wak-on-deep relative w-full overflow-hidden bg-deep">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(560px_260px_at_18%_100%,rgb(12_139_119/0.30),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-[1120px] px-5 py-20 sm:px-8 lg:py-24">
        <h2 className="max-w-[30rem] text-[1.8rem] leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-[2.2rem]">
          {FINAL_CTA.heading}
        </h2>
        <p className="mt-4 max-w-[32rem] text-[1rem] leading-[1.75] text-ink-soft">
          {FINAL_CTA.body}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <CtaLink href="/diagnosis">{FINAL_CTA.button}</CtaLink>
          <span className="text-[0.85rem] text-ink-soft">{FINAL_CTA.note}</span>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 페이지를 7섹션으로 조립 (스파인 제거)**

`app/(marketing)/page.tsx` 에서 import 를 다음으로 정리한다(`Problems`/`BeforeAfter` 는 Task 4 에서 이미 없음, `Demos`·`MidCta`·`Trust` 등 정리):
```tsx
import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { Pain } from "@/components/marketing/pain";
import { Services } from "@/components/marketing/services";
import { Process } from "@/components/marketing/process";
import { Demos } from "@/components/marketing/demos";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/cta-band";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  pageMetadata,
} from "@/lib/siteMeta";
```
(`metadata`·`jsonLd` 상수는 그대로.) `Home` 컴포넌트를 다음으로 교체:
```tsx
// 7섹션: 히어로 / 고민 / 서비스 / 진행 방식 / 데모 / FAQ / 마지막 CTA.
// 각 섹션이 전폭 밴드(SectionBand)라 페이지 래퍼·스파인이 없다.
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // 정적 상수 직렬화 — 사용자 입력 없음.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Pain />
      <Services />
      <Process />
      <Demos />
      <Faq />
      <FinalCta />
    </>
  );
}
```

- [ ] **Step 3: 잔재 삭제**

```bash
git rm components/marketing/trust.tsx components/marketing/section.tsx
grep -rn "TRUST\|components/marketing/section\"\|MidCta\|Trust\b" app components content lib
```
`content/marketing.ts` 에서 `TRUST` export 와 그 위의 `// ── 아래 TRUST 는 …` 구분 주석을 삭제한다. 위 grep 은 출력이 없어야 한다(`Section` 은 `SectionBand` 와 다른 파일이므로 `components/marketing/section"` 경로 import 만 검사한다). 다른 곳(예: `legal/shell.tsx`)이 `section.tsx` 를 import 하고 있으면 그 파일이 필요한 것이므로 삭제를 취소하고 보고한다.

- [ ] **Step 4: 타입·린트·빌드**

```bash
npx tsc --noEmit
npx eslint app components content
npm run build
```
Expected: 0.

- [ ] **Step 5: 구조 확인 + 육안 (Playwright)**

dev 서버에서 `/` 를 1280px·400px 로 연다. 확인 항목:
- `document.querySelectorAll("main > section")`(또는 `main` 아래 최상위 section 수)가 **정확히 7**이다 — evaluate 로 세어 확인한다.
- 위에서 아래 순서: 히어로(어두움) → 고민(연한 청회색) → 서비스(밝음) → 진행 방식(흰색) → 데모(밝음) → FAQ(흰색) → 마지막 CTA(어두움). 인접 섹션 배경이 서로 구분된다.
- 마지막 CTA: "우리 회사는 무엇을 자동화할 수 있을까요?" + 본문 + "무료 진단 시작" 버튼 + "무료 · 가입 없음". 버튼 클릭 시 `/diagnosis` 로 이동.
- 페이지 어디에도 세로 스파인 선·다이아몬드 마커가 없다. 페이지 `h1` 은 히어로에 정확히 1개(evaluate: `document.querySelectorAll("h1").length === 1`).
- 모바일 가로 스크롤 없음.

- [ ] **Step 6: 커밋**

```bash
pkill -f "next dev"
git add components/marketing/cta-band.tsx "app/(marketing)/page.tsx" content/marketing.ts
git commit -m "feat(marketing): 랜딩 7섹션 조립 + 딥 잉크 마지막 CTA, 스파인·중간CTA·신뢰 섹션 제거

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
(`git rm` 한 두 파일은 스테이징되어 같은 커밋에 들어간다.)

---

### Task 7: 회사소개 페이지 + 전체 스윕 + 문서

**Files:**
- Modify: `app/(marketing)/about/page.tsx`, `app/sitemap.ts`, `task.md`, `docs/superpowers/plans/2026-09-09-marketing-redesign.md`

**Interfaces:**
- Consumes: `ABOUT`(변경 없음), `SectionBand`(`headingAs="h1"`), `pageMetadata`(`lib/siteMeta.ts` — `{ title, description, path }`), `CtaLink`

- [ ] **Step 1: 회사소개 페이지 구현**

`app/(marketing)/about/page.tsx` 전체를 다음으로 교체:
```tsx
import type { Metadata } from "next";
import { CtaLink } from "@/components/marketing/cta-link";
import { SectionBand } from "@/components/marketing/section-band";
import { ABOUT } from "@/content/marketing";
import { pageMetadata } from "@/lib/siteMeta";

export const metadata: Metadata = pageMetadata({
  title: "회사소개",
  description:
    "WEBAGENT.KR 은 중소기업의 반복 업무를 AI와 자동화로 대신하도록 돕습니다.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <SectionBand surface="paper" eyebrow="회사소개" heading="반복 업무는 AI에게, 판단은 사람에게" headingAs="h1">
        <p className="text-[1.02rem] leading-[1.85] text-ink">{ABOUT.mission}</p>
      </SectionBand>

      <SectionBand surface="tint" eyebrow="원칙" heading="이렇게 하지 않아요">
        <ul className="flex flex-col gap-3">
          {ABOUT.notDoing.map((line) => (
            <li
              key={line}
              className="rounded-lg border border-line bg-panel p-4 text-[0.98rem] leading-[1.75] text-ink"
            >
              {line}
            </li>
          ))}
        </ul>
      </SectionBand>

      <SectionBand surface="paper" eyebrow="운영" heading="기술과 운영 방식">
        <p className="text-[1rem] leading-[1.85] text-ink">{ABOUT.stack}</p>
        <p className="mt-4 text-[1rem] leading-[1.85] text-ink-soft">{ABOUT.solo}</p>
        <div className="mt-8">
          <CtaLink href="/diagnosis">무료 진단 시작</CtaLink>
        </div>
      </SectionBand>
    </>
  );
}
```
`pageMetadata` 의 인자 이름이 다르면(`lib/siteMeta.ts` 를 열어 확인) 그 시그니처에 맞춘다.

`app/sitemap.ts` 의 `/consultation` 항목 앞에 추가:
```ts
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
```

- [ ] **Step 2: 타입·린트·빌드**

```bash
npx tsc --noEmit
npx eslint app components content lib
npm run build
```
Expected: 0. 빌드 라우트 표에 `/about` 이 정적(`○`)으로 나온다.

- [ ] **Step 3: 전체 스윕 — 자동 점검**

dev 서버를 띄우고:
```bash
export SCRATCH=<세션 scratchpad>
curl -s http://localhost:3000/ > "$SCRATCH/home.html"
grep -c "홈페이지 제작" "$SCRATCH/home.html" || true
grep -o "자동화 데모" "$SCRATCH/home.html" | wc -l
grep -c "자동화 사례" "$SCRATCH/home.html" || true
curl -s -o /dev/null -w "cases: %{http_code}\n" http://localhost:3000/cases
curl -s http://localhost:3000/sitemap.xml | grep -o "<loc>[^<]*</loc>"
```
Expected:
- `홈페이지 제작` 0회(절대원칙 1).
- `자동화 데모` 4회 이상(배지 3개 + 히어로 링크 + 데모 안내 등 — 배지 3개가 최소).
- `자동화 사례` 0회(플래그 off), `cases: 404`.
- 사이트맵에 `/`, `/diagnosis`, `/about`, `/consultation`, `/privacy`, `/terms` 가 있고 `/cases` 는 없다.

- [ ] **Step 4: 전체 스윕 — Playwright 육안 (1280px·400px)**

`/`, `/about`, `/diagnosis`, `/consultation`, `/privacy` 를 각각 연다. 확인 항목:
- `/` 와 `/about` 의 모든 섹션이 두 폭에서 겹침·잘림 없이 보인다. 가로 스크롤 없음(`scrollWidth <= innerWidth`).
- 어두운 표면(히어로·마지막 CTA) 위의 모든 텍스트·링크·버튼이 읽힌다.
- 키보드 Tab 순서로 헤더 링크 → 히어로 CTA → FAQ summary 에 포커스 링이 보인다.
- `/diagnosis`·`/consultation`·`/privacy` 는 이번 개편의 영향 없이 이전과 같다(공용 헤더·푸터만 공유) — 깨진 곳이 없는지만 본다.
- 헤더 네비에 "자동화 사례"가 없고 "무료 진단 · 회사소개 · 상담 신청" 이 보인다.
- 결과 스크린샷 3장 이상(`/` 데스크톱 전체, `/` 모바일 전체, `/about` 데스크톱)을 `$SCRATCH` 에 저장하고 `Read` 로 확인한다.

- [ ] **Step 5: 문서 갱신**

`task.md` Phase 4 목록에 4.9 항목을 4.8 항목(있다면) 다음에, 없으면 4.7 앞에 추가하고 변경 이력 맨 아래 한 줄을 추가한다:
```markdown
- [x] **4.9 마케팅 개편** — 브랜치 `feat/marketing-redesign` (2026-09-20). 딥 잉크 히어로 + 밝은 본문(어두운 표면은 `.wak-on-deep` 토큰 스코프), 랜딩 **7섹션**(히어로/고민/서비스/진행 방식/데모/FAQ/마지막 CTA), 카피를 쉬운 말로 재작성(`content/marketing.ts` 단일 소스), 자동화 사례 메뉴를 `CASES_ENABLED`(`lib/features.ts`) 플래그로 숨김(네비·사이트맵·`/cases` 404), 회사소개 페이지 구현. 스펙 `docs/superpowers/specs/2026-09-20-marketing-renewal-and-result-pdf-design.md` §X, 계획 `docs/superpowers/plans/2026-09-20-marketing-renewal.md`.
```
```markdown
- 2026-09-20: **마케팅 개편 구현** (`feat/marketing-redesign`). 딥 잉크 히어로·7섹션·쉬운 카피·사례 메뉴 플래그·회사소개. 실제 사례가 생기면 `lib/features.ts` 의 `CASES_ENABLED` 를 true 로.
```
`docs/superpowers/plans/2026-09-09-marketing-redesign.md` 맨 위 제목 아래에 한 줄을 추가:
```markdown
> **대체됨 (2026-09-20):** 이 계획은 `2026-09-20-marketing-renewal.md` 로 대체되었다(라이트 전용·10섹션 전제 폐기 → 딥 잉크 히어로·7섹션).
```

- [ ] **Step 6: 최종 검증 + 커밋**

```bash
pkill -f "next dev"
npx tsc --noEmit
npx eslint .
git add "app/(marketing)/about/page.tsx" app/sitemap.ts task.md docs/superpowers/plans/2026-09-09-marketing-redesign.md
git commit -m "feat(marketing): 회사소개 페이지 + 사이트맵 + 문서(4.9) 갱신

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Expected: `tsc`·`eslint .` 0.

---

## Self-Review

**스펙 커버리지 (§X)**
- 방향 A(딥 잉크 히어로 + 밝은 본문), 마지막 CTA 딥 잉크, `SectionBand.surface` 로 어두움/밝음 선택 → Task 3·6
- 라이트 전용 제약 제거, 토글 없음, 어두운 표면 대비 AA, 어두운 표면용 토큰 추가 → Task 3(대비 테스트가 CSS 값을 직접 검사)
- 기존 Task 1~5 결과물 조정(SectionBand·히어로 SVG·서비스·Before/After) → Task 3(SectionBand·HeroFlow·CtaLink), Task 4(서비스, Before/After 통합)
- 7섹션 구성표 전 행 → Task 3(히어로)·4(고민+서비스)·5(진행·데모·FAQ)·6(마지막 CTA·조립). 신뢰 요소는 FAQ/히어로 칩으로 흡수, 중간 CTA 삭제 → Task 6
- 카피 원칙(짧은 문장·전문용어 풀기·서비스 이름 유지·단일 소스·플레이스홀더 제거·절대원칙) → Task 2 불변식 테스트
- 사례 플래그(상수, 네비/히어로 버튼/사이트맵/`/cases` 404/noindex 유지, 푸터 등 다른 진입점 grep) → Task 1
- 검증(Playwright 폭 2개, 플래그 on/off, 카피 검수) → Task 1 Step 8, Task 7 Step 3–4
- 범위 밖 항목(다크모드 토글, 4.2, 블로그 등)은 계획에 없음 ✅. 회사소개 페이지는 스펙 본문에는 없지만 네비에 남는 스텁을 없애기 위한 기존 계획(Task 11)의 이월 항목이며 Task 7 로 명시했다.

**플레이스홀더 스캔:** TBD/TODO 없음. `<세션 scratchpad>` 는 실행 환경 값 자리표시이며 각 에이전트 프롬프트에 실제 경로를 넘긴다.

**타입 일관성:** `SECTIONS`(Record<5 keys, {eyebrow, heading, lead?}>)·`PAIN`·`SERVICES`·`PROCESS`·`DEMOS`·`FAQ`·`FINAL_CTA` 이름과 모양이 Task 2 정의 = Task 4·5·6 사용 일치. `SectionBand` props(`id`·`surface`·`eyebrow`·`heading`·`lead`·`wide`·`headingAs`)는 기존 정의 + Task 3 의 `deep` 추가와 일치. `withCasesGate`·`CASES_ENABLED` 시그니처 Task 1 정의 = 사용 일치. 태스크 사이 빌드가 깨지지 않도록 옛 export(`PROBLEMS`·`BEFORE_AFTER` → Task 4, `TRUST` → Task 6)는 소비 컴포넌트를 지우는 태스크에서 함께 삭제한다.

**알려진 한계·확인 필요(의도):**
- FAQ 의 "150만~800만원" 가격대와 "1~2주/3~5주" 기간은 기존 브랜치 카피를 그대로 옮긴 것이다 — 사용자가 사실 여부를 확인해야 한다(구현 단계에서 바꾸지 않음).
- `color-mix()` 를 SVG presentation attribute 에 쓴다(Chrome 111+/Safari 16.2+). 구형 브라우저에서는 노드 fill 이 사라지지만 선·글자는 유지된다.
- 헤더는 밝은 바탕 유지(어두운 히어로 위로 투명 헤더는 범위 밖).
