# 마케팅 페이지 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩을 포함한 모든 마케팅 페이지에 섹션 밴드 시스템 · 라인 아이콘 · 커스텀 SVG 일러스트를 넣어 "밋밋하고 한눈에 안 들어온다"는 문제를 해결한다.

**Architecture:** 기존 타이포 중심 정체성(Pretendard + IBM Plex Mono, 라이트 전용, RSC 전용, 클라이언트 JS 0)은 유지한다. 왼쪽 커넥터 스파인은 걷어내고, 대신 (1) 섹션마다 번갈아 배경 밴드(paper ↔ panel ↔ 신규 tint) + 에뮤 라벨 + 액센트 룰, (2) `lucide-react` 라인 아이콘, (3) 정적 SVG 일러스트(히어로 흐름·Before/After 대비·구축 타임라인·데모 스트립·배경 그리드)로 계층과 스캔성을 만든다. 카피는 `content/marketing.ts` 단일 소스로 옮기고 플레이스홀더를 실제 문구로 채운다.

**Tech Stack:** Next.js 16 (App Router, RSC) · Tailwind v4 (CSS 토큰) · `lucide-react@^1.40` (이미 설치됨, RSC 호환) · 인라인 정적 SVG (라이브러리 없음) · CSS 애니메이션(1회, `prefers-reduced-motion` 가드)

**Spec:** 이 계획이 스펙을 겸한다(별도 디자인 문서 없음). 아래 "디자인 방향"이 스펙 본문이다. 근거: `기획서 §5`(랜딩 구조), `CLAUDE.md` 절대원칙 §0, `task.md` Phase 1 이탈·메모.

## Global Constraints

절대원칙(`CLAUDE.md` §0) — 모든 태스크에 암묵 포함:
1. "홈페이지 제작"을 서비스로 전면에 내세우지 **않는다**. Smart Website 서비스의 하위 결과물로만.
2. 서비스는 항상 정확히 5종: `AI Automation / n8n Automation / Smart Website / AI Agent / AI Consulting`. 재분류·통합·번호 매기기 금지(집합).
3. 실제 고객 없는 데모는 반드시 **`자동화 데모`** 배지로 표시.
4. AI 추정 효과(절감 시간 등)는 항상 **추정치**로 표시, 보장처럼 쓰지 않는다.
5. UI 스택 고정: Tailwind + 라이트 전용 · **RSC 전용, 클라이언트 JS 0** · Pretendard(본문) + IBM Plex Mono(`font-flow` — 라벨·영문 모듈명·숫자에만).

추가 제약:
- **다크 모드 추가 금지.** 기존 `FinalCta` 의 `bg-ink` 반전 블록은 유지하되 새 다크 블록은 만들지 않는다.
- **사진·스크린샷 애셋 없음.** 시각 요소는 lucide 아이콘 + 인라인 SVG 뿐. `public/` 에 이미지 추가 금지.
- **애니메이션은 1회성 + `motion-reduce:*` 가드.** 무한 반복·스크롤 트리거 금지(썸네일/첫 프레임에 정지 상태가 보여야 함).
- 색 토큰은 `app/globals.css` 의 `--wak-*` 만 쓴다. 새 토큰은 이 계획에 정의된 2개(`--wak-tint`, `--wak-shadow-card`)만 추가하고 `:root` bare 블록에 선언.
- 모든 SVG 일러스트: `role="img"` + 한국어 `aria-label`. 모든 상호작용 요소: `focus-visible` 링(`outline-2 outline-offset-2 outline-signal`).
- 카피 중 사업자 정보·시행일·전문가 검토 대상 등 진짜 미확정 항목만 `[확정 필요]`(`components/marketing/legal/shell.tsx` 의 `Placeholder` 재사용). 나머지는 지금 확정 문구로 채운다.

---

## 디자인 방향 (스펙 본문)

### 1. 서피스 & 밴드

| 토큰 | 값 | 용도 |
|---|---|---|
| `--wak-paper` | `#f5f6f2` (기존) | 기본 밴드 |
| `--wak-panel` | `#ffffff` (기존) | 교대 밴드 · 카드 |
| `--wak-tint` | `#eef1f7` (**신규**) | 액센트 밴드(문제·구축 절차 2곳) — paper 대비 미묘한 청회색 |
| `--wak-shadow-card` | `0 1px 2px rgb(22 41 43 / 0.04), 0 12px 28px -20px rgb(22 41 43 / 0.22)` (**신규**) | "독립 객체" 카드에만(서비스·데모). 리스트 항목엔 쓰지 않음 |

- 밴드는 **풀블리드**(`w-screen` 좌우 = 뷰포트 폭). 내부 콘텐츠는 `mx-auto max-w-[1120px] px-5 sm:px-8`.
- 랜딩 섹션 순서/배경: Hero `paper` → 문제 `tint` → Before/After `panel` → 서비스 `paper` → 데모 `panel` → 중간 CTA `tint` → 구축 절차 `paper` → 신뢰 `panel` → FAQ `paper` → 최종 CTA `ink`(기존 유지).
- **왼쪽 스파인 제거**: `app/(marketing)/page.tsx` 의 `absolute ... w-px bg-line` `<span>` 삭제, `lg:pl-16` → `lg:px-8` 로 정리. `Section` 의 다이아몬드 마커도 제거.

### 2. 섹션 헤더 (스파인 대체)

각 섹션 상단:
```
[아이콘 22px] 01 · 문제            ← font-flow, text-signal, 0.75rem, letter-spacing .04em
─────────                          ← 2px, w-10, bg-signal (액센트 룰)
아직도 이런 업무를 사람이 반복하고 있나요?   ← h2, 기존 크기(1.6~1.9rem) 유지
(선택) 한 줄 리드                    ← text-ink-soft, 0.95rem, max-w-[34rem]
```
번호는 **랜딩에서 섹션이 논리적 시퀀스**(문제→해법→서비스→증거→행동)이므로 사용. 서비스·신뢰처럼 "집합"인 섹션은 번호 없이 라벨만(`· 서비스`).

### 3. 아이콘 (`components/marketing/icons.tsx`, 신규)

`lucide-react` 래퍼. 사용처별 매핑(전부 `size={22} strokeWidth={1.75}`, 기본 `text-signal`):

| 위치 | 항목 → lucide 이름 |
|---|---|
| 섹션 헤더 | 문제 `TriangleAlert` · Before/After `ArrowLeftRight` · 서비스 `LayoutGrid` · 데모 `Play` · 구축 절차 `Route` · 신뢰 `ShieldCheck` · FAQ `MessagesSquare` |
| 문제 6항목 | 문의 수동확인 `Inbox` · 엑셀 재입력 `Sheet` · 견적서 재작성 `FileText` · 상담 수기정리 `ClipboardList` · 블로그·SNS 제작 `PenLine` · 보고서 복사·작성 `BarChart3` |
| 서비스 5종 | AI Automation `Workflow` · n8n Automation `Waypoints` · Smart Website `Globe` · AI Agent `Bot` · AI Consulting `GraduationCap` |
| 구축 절차 5단계 | 진단 `ScanSearch` · 설계·제안 `PencilRuler` · 구축·연동 `Wrench` · 검수·이관 `ClipboardCheck` · 운영 지원 `LifeBuoy` |
| 신뢰 3항목 | 스택 공개 `Layers` · 과정 투명 `Eye` · 데모 재현 `RefreshCw` |

구현: `name` 유니온 타입 + `Record<Name, LucideIcon>` 맵. `export function Icon({ name, className }: { name: IconName; className?: string })`.

### 4. 커스텀 SVG 일러스트 (`components/marketing/illustrations/`, 신규)

전부 RSC · 인라인 `<svg>` · `viewBox` 안에 라벨 여백 확보 · 모든 도형 `fill`/`stroke` 명시 · `role="img"` + `aria-label`.

| 파일 | 무엇 | 배치 |
|---|---|---|
| `hero-flow.tsx` | 분기 흐름: `문의` → `AI 처리` 노드 → 3갈래 병렬 출력(`담당자 알림` / `CRM 저장` / `자동 회신`). 커넥터 라인 + 로드 시 신호 1회(`wak-signal` 재사용, `motion-reduce:animation-none`). 폭 ~340, 노드는 `--wak-panel` + `--wak-line`, 출력 노드는 `--wak-resolved` 계열. | 히어로 우측(기존 `FlowDiagram` 대체) |
| `before-after-split.tsx` | 2열: 좌 "사람이 반복"(회색 카드 3개 스택) → 가운데 `ArrowRight` → 우 "자동화 후"(teal 카드 3개). 아래에 기존 표(재스타일)로 상세. | Before/After 섹션 상단 |
| `process-timeline.tsx` | 가로 타임라인: 커넥터 라인 위 5개 번호 노드 + 단계별 아이콘. `lg` 미만은 세로 스택으로 폴백(CSS만). | 구축 절차 섹션 |
| `demo-strip.tsx` | props `steps: string[]`. 노드—커넥터(chevron)—노드 가로 스트립. wrap 가능. `overflow-x-auto` 컨테이너. | 데모 3개 각각(기존 인라인 `<ol>` 대체) |
| `grid-texture.tsx` | 아주 옅은 점 그리드 패턴(`<pattern>`), `opacity-[0.04]`, `aria-hidden`, `pointer-events-none`, `absolute inset-0`. | 히어로 밴드 + 최종 CTA 밴드 배경 |

### 5. 히어로

- 헤드라인 유지(`AI가 직원처럼 / 일하는 회사`).
- 서브카피 아래 **팩트 칩 3개**(`font-flow`, 테두리 `--wak-line`, 작게): `서비스 5종` · `무료 진단 3분` · `n8n + gpt-4o`. (추정 효과 아님 — 절대원칙 4 안전.)
- CTA 2개 유지. `자동화 사례 보기` 는 `/cases` 가 "준비 중"이므로 `자동화 데모 보기`(`/#demos` 앵커)로 변경.
- 우측 `hero-flow` 일러스트 + `grid-texture` 배경.

### 6. 카피 단일 소스 (`content/marketing.ts`, 신규)

`lib/options.ts` 패턴. 모든 섹션 카피를 여기서 export. 채울 플레이스홀더:
- **구축 절차 5단계 설명**(현재 `단계 설명이 들어갑니다`):
  1. 자동화 진단 — "회사·업무 정보를 입력하면 AI가 자동화 여지와 예상 절감 시간을 추정해 드립니다. 무료, 3분."
  2. 설계·제안 — "진단 결과를 바탕으로 어떤 업무를 어떤 순서로 자동화할지, 예상 비용과 기간을 제안서로 정리합니다."
  3. 구축·연동 — "n8n 워크플로우와 AI 호출을 만들고, 기존에 쓰던 도구(메일·시트·메신저·CRM)에 연결합니다."
  4. 검수·이관 — "실제 데이터로 테스트하고, 예외 처리와 실패 알림을 붙인 뒤 운영 환경으로 옮깁니다."
  5. 운영 지원 — "가동 후 오류 모니터링과 개선을 지원합니다. 워크플로우는 문서와 함께 인계됩니다."
- **신뢰 3항목 본문**(현재 `설명 문구가 들어갑니다`):
  - 고정 기술 스택 공개 — "Next.js · Supabase · n8n · OpenAI · Telegram 으로 고정합니다. 어떤 도구로 무엇을 하는지 처음부터 공개합니다."
  - 구축 과정 투명 공유 — "진단부터 이관까지 각 단계의 산출물(제안서·워크플로우·문서)을 그대로 전달합니다. 블랙박스가 없습니다."
  - 데모 재현 가능 — "홈페이지의 자동화 데모는 실제 동작하는 흐름입니다. 상담 시 같은 구성을 직접 시연합니다."
- **FAQ 6문항**(현재 `질문 N` / `답변 문구`):
  1. Q 비용은 얼마인가요? — A "업무 범위에 따라 150만~800만원 수준입니다. 무료 진단 후 제안서에 정확한 견적을 담습니다. (기획서 §12.2 가격대)"
  2. Q 기간은 얼마나 걸리나요? — A "간단한 자동화는 1~2주, 여러 업무를 묶으면 3~5주가 일반적입니다. 진단·설계 단계에서 확정합니다."
  3. Q 유지보수는 어떻게 하나요? — A "가동 후 오류 알림과 개선을 지원합니다. 워크플로우 JSON 과 문서를 함께 인계하므로 다른 담당자도 이어받을 수 있습니다."
  4. Q 우리 데이터는 안전한가요? — A "이름·연락처는 데이터베이스에만 저장하고 AI 에는 보내지 않습니다. 자세한 내용은 개인정보처리방침의 국외 이전·위탁 표를 확인해 주세요."
  5. Q 지금 쓰는 도구와 연동되나요? — A "이메일·구글시트·카카오톡·Slack·Telegram·WordPress·일반 CRM/ERP 등 API 나 웹훅이 있으면 대부분 연결됩니다. 안 되는 경우는 진단에서 알려드립니다."
  6. Q AI 진단 결과는 얼마나 정확한가요? — A "입력값 기반 **추정치**입니다. 자동화 가능성의 방향을 잡는 용도이며, 실제 효과는 업무 표준화 정도에 따라 달라집니다. 상담에서 구체화합니다."
- **회사소개**(`about`): 미션 1문단 + "무엇을 안 하나"(절대원칙 1·3 요약) + 고정 스택 + "1인 체제 투명성"(기획서 §16.5 — 에러 알림 채널) 각 짧게. 사업자 정보는 `[확정 필요]`.

### 7. 나머지 페이지

- **`/about`** — 위 카피로 실제 페이지. `robots` noindex 제거(색인 허용), sitemap 추가는 이 계획 밖(별도).
- **`/cases`** — "준비 중" 유지하되 스타일: SectionBand + `자동화 사례는 곧 공개됩니다. 지금은 홈페이지의 자동화 데모로 확인하세요.` + `/#demos` 링크. `robots` noindex 유지.
- **`/privacy`, `/terms`** (`LegalShell`) — 헤더를 SectionBand 와 같은 에뮤+룰 스타일로 통일(본문·배너는 그대로). 밴드 배경은 `paper` 단일.
- **`/diagnosis`, `/consultation`** — 폼 위에 인트로 헤더 블록: 에뮤(`무료 진단` / `상담 신청`) + 제목 + 한 줄 + 신뢰 큐(`무료 · 3분 · 카드·계약 없음`). `wizard-progress.tsx` 와 `consultation-form.tsx` 는 라인 아이콘 정도만 가볍게(구조 변경 없음).
- **`site-header.tsx`** — 간격·CTA 정돈. 활성 메뉴 표시는 클라이언트 JS 필요하므로 **하지 않음**(hover 밑줄만). **`site-footer.tsx`** — 3열(브랜드 / 바로가기 / 법적·설정)로 구조화, 사업자 정보 라인 유지.

---

## File Structure

**신규:**
- `content/marketing.ts` — 모든 마케팅 카피 단일 소스 (services / problems / process / trust / faq / hero / about). 순수 상수 export.
- `components/marketing/icons.tsx` — `lucide-react` 래퍼. `IconName` 유니온 + `Icon` 컴포넌트.
- `components/marketing/section-band.tsx` — `SectionBand` (풀블리드 배경 + 내부 컨테이너 + 에뮤/룰/제목/리드).
- `components/marketing/illustrations/hero-flow.tsx`
- `components/marketing/illustrations/before-after-split.tsx`
- `components/marketing/illustrations/process-timeline.tsx`
- `components/marketing/illustrations/demo-strip.tsx`
- `components/marketing/illustrations/grid-texture.tsx`

**수정:**
- `app/globals.css` — `--wak-tint`, `--wak-shadow-card` 추가(`:root` bare). `--color-tint` Tailwind 브릿지 추가.
- `app/(marketing)/page.tsx` — 스파인 제거, 섹션을 `SectionBand` 로 감싸 교대 배경.
- `components/marketing/section.tsx` — `Section` 유지하되 다이아몬드 마커 제거하고 내부를 `SectionBand` 헤더 규격에 맞춤. (또는 `SectionBand` 로 대체하고 삭제 — Task 1 에서 결정.)
- `components/marketing/hero.tsx` — 팩트 칩 + `HeroFlow` + `GridTexture`.
- `components/marketing/problems.tsx` · `services.tsx` · `before-after.tsx` · `demos.tsx` · `process.tsx` · `trust.tsx` · `faq.tsx` · `cta-band.tsx` — 밴드/아이콘/일러스트/실카피 적용.
- `components/marketing/flow-diagram.tsx` — 삭제(→ `illustrations/hero-flow.tsx`).
- `components/marketing/site-header.tsx` · `site-footer.tsx` — 정돈.
- `components/marketing/legal/shell.tsx` — 헤더 스타일 통일.
- `app/(marketing)/about/page.tsx` · `cases/page.tsx` — 실제/스타일 페이지.
- `app/(marketing)/diagnosis/page.tsx` · `consultation/page.tsx` — 인트로 헤더.
- `components/diagnosis/wizard-progress.tsx` · `components/consultation/consultation-form.tsx` — 아이콘 가벼운 적용.
- `task.md` — Phase 4 에 "마케팅 UI 리디자인" 항목 추가 / 변경 이력.

**검증 방식(프로젝트 관례):** 테스트 러너 없음. 태스크마다 `npx tsc --noEmit && npm run lint && npm run build` 0 + `npm run dev` 로 Playwright DOM 단언/스크린샷 + 커밋. (묶음 A~D 방식과 동일.)

---

## Task 1: 토큰 · SectionBand · 아이콘 래퍼

**Files:**
- Modify: `app/globals.css` (마케팅 토큰 블록 + `:root` bare)
- Create: `components/marketing/section-band.tsx`
- Create: `components/marketing/icons.tsx`

**Interfaces:**
- Produces:
  - `SectionBand({ id?, surface, eyebrow, index?, heading, lead?, wide?, children }): JSX` — `surface: "paper" | "panel" | "tint"`, `eyebrow: string`(예 `"문제"`), `index?: number`(있으면 `01 · ` 접두), `wide?: boolean`(내부 max-w 해제).
  - `Icon({ name, className? }): JSX` — `name: IconName`.
  - `type IconName` — 아래 STEP 3 의 키 유니온.

- [ ] **Step 1: globals.css 토큰 추가**

`:root` bare 블록(현재 `--wak-danger` 아래)에:
```css
  --wak-tint: #eef1f7;
  --wak-shadow-card: 0 1px 2px rgb(22 41 43 / 0.04), 0 12px 28px -20px rgb(22 41 43 / 0.22);
```
마케팅 토큰 브릿지 블록(`--color-paper` 근처)에:
```css
  --color-tint: var(--wak-tint);
```

- [ ] **Step 2: `components/marketing/section-band.tsx` 작성**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const SURFACE: Record<"paper" | "panel" | "tint", string> = {
  paper: "bg-paper",
  panel: "bg-panel",
  tint: "bg-tint",
};

export function SectionBand({
  id,
  surface = "paper",
  eyebrow,
  index,
  heading,
  lead,
  wide,
  children,
}: {
  id?: string;
  surface?: "paper" | "panel" | "tint";
  eyebrow: string;
  index?: number;
  heading: string;
  lead?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("w-full", SURFACE[surface])}>
      <div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 lg:py-20">
        <p className="flex items-center gap-2 font-flow text-[0.75rem] tracking-[0.04em] text-signal">
          {typeof index === "number" && (
            <span>{String(index).padStart(2, "0")} ·</span>
          )}
          {eyebrow}
        </p>
        <span aria-hidden className="mt-3 block h-0.5 w-10 bg-signal" />
        <h2 className="mt-4 text-[1.6rem] leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-[1.9rem]">
          {heading}
        </h2>
        {lead && (
          <p className="mt-3 max-w-[34rem] text-[0.95rem] leading-[1.7] text-ink-soft">
            {lead}
          </p>
        )}
        <div className={cn("mt-9", wide ? "" : "max-w-[46rem]")}>{children}</div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: `components/marketing/icons.tsx` 작성**

```tsx
import {
  ArrowLeftRight, BarChart3, Bot, ClipboardCheck, ClipboardList, Eye,
  FileText, Globe, GraduationCap, Inbox, Layers, LayoutGrid, LifeBuoy,
  MessagesSquare, PencilRuler, PenLine, Play, RefreshCw, Route, ScanSearch,
  Sheet, ShieldCheck, TriangleAlert, Waypoints, Workflow, Wrench,
  type LucideIcon,
} from "lucide-react";

const MAP = {
  "arrow-left-right": ArrowLeftRight, "bar-chart": BarChart3, bot: Bot,
  "clipboard-check": ClipboardCheck, "clipboard-list": ClipboardList, eye: Eye,
  "file-text": FileText, globe: Globe, "graduation-cap": GraduationCap,
  inbox: Inbox, layers: Layers, "layout-grid": LayoutGrid, "life-buoy": LifeBuoy,
  "messages-square": MessagesSquare, "pencil-ruler": PencilRuler, "pen-line": PenLine,
  play: Play, "refresh-cw": RefreshCw, route: Route, "scan-search": ScanSearch,
  sheet: Sheet, "shield-check": ShieldCheck, "triangle-alert": TriangleAlert,
  waypoints: Waypoints, workflow: Workflow, wrench: Wrench,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof MAP;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const C = MAP[name];
  return <C size={22} strokeWidth={1.75} className={className ?? "text-signal"} aria-hidden />;
}
```

- [ ] **Step 4: 빌드 검증**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 0. `lucide-react` import 가 RSC 에서 문제없이 번들됨(경고 없음).

- [ ] **Step 5: 커밋**

```bash
git add app/globals.css components/marketing/section-band.tsx components/marketing/icons.tsx
git commit -m "feat(marketing): SectionBand 프리미티브 + lucide 아이콘 래퍼 + tint/shadow 토큰"
```

---

## Task 2: 카피 단일 소스 `content/marketing.ts`

**Files:**
- Create: `content/marketing.ts`

**Interfaces:**
- Produces (전부 `as const`):
  - `HERO: { headline: string[]; sub: string; facts: string[] }`
  - `PROBLEMS: { label: string; icon: IconName }[]` (6)
  - `SERVICES: { name: string; desc: string; icon: IconName }[]` (5, `name` 은 절대원칙 2 정확 문자열)
  - `BEFORE_AFTER: { task: string; before: string; after: string }[]` (6)
  - `PROCESS: { step: string; desc: string; icon: IconName }[]` (5)
  - `TRUST: { point: string; body: string; icon: IconName }[]` (3)
  - `FAQ: { q: string; a: string }[]` (6)
  - `ABOUT: { mission: string; notDoing: string[]; stack: string; solo: string }`

- [ ] **Step 1: 파일 작성** — 위 "디자인 방향 §6" 의 확정 카피를 그대로 옮긴다. `SERVICES[*].name` 은 반드시 `"AI Automation" | "n8n Automation" | "Smart Website" | "AI Agent" | "AI Consulting"`. `import type { IconName } from "@/components/marketing/icons"`.

- [ ] **Step 2: 정합성 확인**

Run: `npx tsc --noEmit`
Expected: 0. 그리고 수동 확인: `SERVICES.map(s => s.name)` 가 `lib/options.ts` 의 `SERVICE_TYPES` 배열과 문자열·순서 동일(재분류 금지). `PROBLEMS`·`PROCESS`·`TRUST`·`SERVICES` 의 `icon` 값이 전부 `IconName` 에 존재.

- [ ] **Step 3: 커밋**

```bash
git add content/marketing.ts
git commit -m "feat(marketing): 마케팅 카피 단일 소스 — 플레이스홀더 실문구로 채움"
```

---

## Task 3: 히어로 재구축 + `hero-flow` / `grid-texture` 일러스트

**Files:**
- Create: `components/marketing/illustrations/hero-flow.tsx`
- Create: `components/marketing/illustrations/grid-texture.tsx`
- Modify: `components/marketing/hero.tsx`
- Delete: `components/marketing/flow-diagram.tsx`

**Interfaces:**
- Consumes: `HERO` (Task 2), `CtaLink`.
- Produces: `HeroFlow(): JSX` (`role="img"` aria-label `"자동화 흐름: 문의 접수 → AI 처리 → 담당자 알림·CRM 저장·자동 회신"`), `GridTexture({ className? }): JSX` (`aria-hidden`).

- [ ] **Step 1: `grid-texture.tsx`**

```tsx
export function GridTexture({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} width="100%" height="100%">
      <defs>
        <pattern id="wak-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wak-grid)" />
    </svg>
  );
}
```
사용 시 래퍼에 `absolute inset-0 -z-10 text-ink opacity-[0.04] pointer-events-none`.

- [ ] **Step 2: `hero-flow.tsx`** — 인라인 SVG. `viewBox="0 0 320 300"` 안에:
  - 상단 입력 노드 `문의 접수` (rect 120×40, `fill=var(--wak-panel)` `stroke=var(--wak-line)`), 라벨 텍스트 `fill=var(--wak-ink)`.
  - 중앙 처리 노드 `AI 처리` (강조: `stroke=var(--wak-signal)` 1.5, 배경 `var(--wak-signal)` 8% — `fill` 에 `rgb(31 60 230 / 0.06)`).
  - 하단 출력 노드 3개 가로 배치: `담당자 알림` / `CRM 저장` / `자동 회신` (`stroke=var(--wak-resolved)` , 배경 resolved 6%).
  - 커넥터: 입력→처리 직선, 처리→출력3 분기선. `stroke=var(--wak-line)` 1, 화살표 `marker`.
  - 신호 애니메이션: 입력→처리 라인 위에 짧은 그라디언트 스트로크 1회(`<animate>` 또는 CSS `wak-signal` 클래스 재사용). `@media (prefers-reduced-motion: reduce)` 에서 정지.
  - 모든 텍스트 `font-family` 는 `var(--font-flow)` (모노), `font-size 10~11`.
  - 뷰박스 여백: 가장 바깥 라벨이 잘리지 않도록 상하좌우 12 이상 패딩.

- [ ] **Step 3: `hero.tsx` 재작성**

```tsx
import { CtaLink } from "@/components/marketing/cta-link";
import { HeroFlow } from "@/components/marketing/illustrations/hero-flow";
import { GridTexture } from "@/components/marketing/illustrations/grid-texture";
import { HERO } from "@/content/marketing";

export function Hero() {
  return (
    <section className="relative w-full bg-paper">
      <GridTexture className="absolute inset-0 -z-10 text-ink opacity-[0.04]" />
      <div className="mx-auto grid max-w-[1120px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 lg:py-24">
        <div>
          <h1 className="text-[2.4rem] leading-[1.15] font-extrabold tracking-tight text-balance text-ink sm:text-[3rem]">
            {HERO.headline.map((l, i) => (
              <span key={i} className="block">{l}</span>
            ))}
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.05rem] leading-[1.75] text-ink-soft">
            {HERO.sub}
          </p>
          <ul className="mt-7 flex flex-wrap gap-2">
            {HERO.facts.map((f) => (
              <li key={f} className="rounded-full border border-line px-3 py-1 font-flow text-[0.72rem] tracking-tight text-ink-soft">
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <CtaLink href="/diagnosis">무료 자동화 진단</CtaLink>
            <CtaLink href="/#demos" variant="ghost">자동화 데모 보기</CtaLink>
          </div>
        </div>
        <HeroFlow />
      </div>
    </section>
  );
}
```
`HERO.headline = ["AI가 직원처럼", "일하는 회사"]`, `HERO.facts = ["서비스 5종", "무료 진단 3분", "n8n + gpt-4o"]`.

- [ ] **Step 4: 빌드 + 시각 검증**

Run: `npx tsc --noEmit && npm run lint && npm run build`, 이어서 `npm run dev` 후 Playwright:
```js
await page.goto('http://localhost:3000/');
// 데스크톱 1280, 모바일 375 스크린샷
// 단언: document.querySelectorAll('main').length===1,
//       document.documentElement.scrollWidth <= innerWidth+1,
//       !!document.querySelector('[role="img"][aria-label*="자동화 흐름"]')
```
Expected: 히어로에 SVG 흐름도 + 팩트 칩 3개 보임. 가로 스크롤 없음. reduced-motion 에뮬레이트 시 애니메이션 정지.

- [ ] **Step 5: 커밋**

```bash
git add components/marketing/hero.tsx components/marketing/illustrations/hero-flow.tsx components/marketing/illustrations/grid-texture.tsx
git rm components/marketing/flow-diagram.tsx
git commit -m "feat(marketing): 히어로 재구축 — 분기 흐름 SVG + 팩트 칩 + 배경 그리드"
```

---

## Task 4: 문제 + 서비스 섹션 (밴드 + 아이콘)

**Files:**
- Modify: `components/marketing/problems.tsx`, `components/marketing/services.tsx`

**Interfaces:**
- Consumes: `SectionBand`, `Icon` (Task 1), `PROBLEMS`·`SERVICES` (Task 2).

- [ ] **Step 1: `problems.tsx`** — `SectionBand surface="tint" index={1} eyebrow="문제" heading="아직도 이런 업무를 사람이 반복하고 있나요?"`. 내부: `PROBLEMS` 를 `sm:grid-cols-2` 그리드, 각 항목 `flex items-center gap-3`, 앞에 `<Icon name={p.icon} />`, 텍스트 `text-ink`. 헤어라인은 `border-t border-line py-3.5` 유지. `—` 글리프 제거(아이콘이 대체).

- [ ] **Step 2: `services.tsx`** — `SectionBand surface="paper" eyebrow="서비스" heading="다섯 가지 서비스" wide`(index 없음 — 집합). 내부: `sm:grid-cols-2 lg:grid-cols-3` 카드 그리드. 각 카드 `rounded-lg border border-line bg-panel p-5 shadow-[var(--wak-shadow-card)]`, 상단 `<Icon name={s.icon} className="text-signal" />`, 그 아래 `font-flow text-ink` 이름, `text-ink-soft` 설명. **번호·재분류 없음.** 5개 그대로.

- [ ] **Step 3: 빌드 + 검증**

Run: `npx tsc --noEmit && npm run lint && npm run build`, `npm run dev` + Playwright:
```js
// / 스크린샷. 단언: 서비스 이름 5개가 정확히
//  ["AI Automation","n8n Automation","Smart Website","AI Agent","AI Consulting"]
// 문제 섹션 배경이 tint(computed bg), 각 항목에 svg 아이콘 존재
```

- [ ] **Step 4: 커밋**

```bash
git add components/marketing/problems.tsx components/marketing/services.tsx
git commit -m "feat(marketing): 문제·서비스 섹션 — 밴드 + 라인 아이콘 + 서비스 카드"
```

---

## Task 5: Before/After — 대비 일러스트 + 표 재스타일

**Files:**
- Create: `components/marketing/illustrations/before-after-split.tsx`
- Modify: `components/marketing/before-after.tsx`

**Interfaces:**
- Consumes: `SectionBand`, `BEFORE_AFTER` (Task 2).
- Produces: `BeforeAfterSplit({ rows }: { rows: { task: string; before: string; after: string }[] }): JSX` — 상위 3행만 시각화, `role="img"` aria-label `"업무별 기존 방식 대 자동화 후 비교"`.

- [ ] **Step 1: `before-after-split.tsx`** — CSS grid 2열 + 가운데 화살표(순수 마크업, SVG `ArrowRight` 1개). 좌열 카드: `bg-panel border border-line`, 제목 `text-ink` + `before` `text-ink-soft`. 우열 카드: `border-resolved/30 bg-[rgb(12_139_119_/_0.06)]`, `after` `text-resolved font-medium`. 상위 3개 `rows`.

- [ ] **Step 2: `before-after.tsx`** — `SectionBand surface="panel" index={2} eyebrow="해법" heading="기존 방식과 자동화 후" wide`. 내부: `<BeforeAfterSplit rows={BEFORE_AFTER} />` 먼저, 그 아래 기존 표를 `mt-10` 로 유지하되 헤더/셀 패딩만 정리(현재 구조 OK). 표는 `overflow-x-auto` 컨테이너 유지(375 에서 가로 스크롤은 표 내부에서만).

- [ ] **Step 3: 빌드 + 검증** — `tsc/lint/build 0`. Playwright: `/` 375·1280 스크린샷. 단언: 페이지 `scrollWidth <= innerWidth+1`(표는 자체 컨테이너 스크롤), split 일러스트 `role="img"` 존재.

- [ ] **Step 4: 커밋**

```bash
git add components/marketing/before-after.tsx components/marketing/illustrations/before-after-split.tsx
git commit -m "feat(marketing): Before/After — 대비 일러스트 + 표 정리"
```

---

## Task 6: 데모 섹션 + `demo-strip` 일러스트

**Files:**
- Create: `components/marketing/illustrations/demo-strip.tsx`
- Modify: `components/marketing/demos.tsx`

**Interfaces:**
- Consumes: `SectionBand`.
- Produces: `DemoStrip({ steps }: { steps: string[] }): JSX` — `role="img"` aria-label `` `자동화 단계: ${steps.join(" → ")}` ``. 노드(rect 라벨) — chevron 커넥터 — 노드 가로 스트립. `overflow-x-auto` 래퍼. wrap 대신 스크롤(모바일).

- [ ] **Step 1: `demo-strip.tsx`** — 인라인 SVG 또는 flex 마크업(노드 `border border-line bg-panel px-3 py-1.5 text-[0.9rem]`, 사이에 `lucide ChevronRight` 14px `text-ink-soft`). `demos.tsx` 의 `steps` 문자열 배열 그대로 받음.

- [ ] **Step 2: `demos.tsx`** — `SectionBand id="demos" surface="panel" index={3} eyebrow="데모" heading="자동화 데모" wide`. 각 `article`: `자동화 데모` 배지 **유지**(절대원칙 3), 제목, `<DemoStrip steps={demo.steps} />`, `효과 · {demo.effect}` `text-resolved`, `demo.note` 있으면 `text-ink-soft` 로 유지(콘텐츠 자동화의 "반자동" 주석). 카드 사이 `divide` 대신 `gap-px bg-line` 유지 또는 카드화 — 카드화(`rounded-lg border border-line bg-paper p-6`) 권장.

- [ ] **Step 3: 빌드 + 검증** — `tsc/lint/build 0`. Playwright: 데모 3개 모두 `자동화 데모` 텍스트 존재, `#demos` 앵커로 스크롤됨(`/#demos`), 콘텐츠 데모에 "반자동" 주석 존재.

- [ ] **Step 4: 커밋**

```bash
git add components/marketing/demos.tsx components/marketing/illustrations/demo-strip.tsx
git commit -m "feat(marketing): 데모 섹션 — 단계 스트립 SVG + 카드화 (자동화 데모 배지 유지)"
```

---

## Task 7: 구축 절차 — 가로 타임라인 일러스트

**Files:**
- Create: `components/marketing/illustrations/process-timeline.tsx`
- Modify: `components/marketing/process.tsx`

**Interfaces:**
- Consumes: `SectionBand`, `Icon`, `PROCESS` (Task 2).
- Produces: `ProcessTimeline({ steps }: { steps: { step: string; desc: string; icon: IconName }[] }): JSX`.

- [ ] **Step 1: `process-timeline.tsx`** — `lg` 이상: 가로. 5개 노드가 수평 커넥터 라인(`border-t-2 border-line`) 위에 균등 배치, 각 노드 = 번호 원(`font-flow text-signal`) + `<Icon>` + `step` 굵게 + `desc` `text-ink-soft`. `lg` 미만: 세로 스택(`flex-col`, 왼쪽 번호). CSS 만으로 분기(`lg:flex-row`). 커넥터는 마지막 노드 뒤에서 끊김.

- [ ] **Step 2: `process.tsx`** — `SectionBand surface="paper" index={4} eyebrow="구축 절차" heading="어떻게 진행되나요" wide`. 내부: `<ProcessTimeline steps={PROCESS} />`. 기존 `단계 설명이 들어갑니다` 완전 제거(카피는 `PROCESS[*].desc`).

- [ ] **Step 3: 빌드 + 검증** — `tsc/lint/build 0`. Playwright 1280(가로 타임라인)·375(세로 스택) 스크린샷. 단언: 5단계 텍스트 전부 존재, placeholder 문구 없음.

- [ ] **Step 4: 커밋**

```bash
git add components/marketing/process.tsx components/marketing/illustrations/process-timeline.tsx
git commit -m "feat(marketing): 구축 절차 — 가로 타임라인 일러스트 + 실제 단계 카피"
```

---

## Task 8: 신뢰 · FAQ · CTA 밴드

**Files:**
- Modify: `components/marketing/trust.tsx`, `components/marketing/faq.tsx`, `components/marketing/cta-band.tsx`

**Interfaces:**
- Consumes: `SectionBand`, `Icon`, `TRUST`·`FAQ` (Task 2).

- [ ] **Step 1: `trust.tsx`** — `SectionBand surface="panel" eyebrow="신뢰" heading="왜 믿을 수 있나" wide`(index 없음). `TRUST` 3개를 `sm:grid-cols-3` 카드(`border border-line rounded-lg bg-paper p-5`), 상단 `<Icon>`, `point` 굵게, `body` 실카피. placeholder 제거.

- [ ] **Step 2: `faq.tsx`** — `SectionBand surface="paper" eyebrow="FAQ" heading="자주 묻는 질문"`. `FAQ` 배열로 `<details>` 렌더(네이티브, JS 없음 유지). `summary` 에 `q`, 본문에 `a`. `+` → `group-open:rotate-45` 유지. placeholder 제거.

- [ ] **Step 3: `cta-band.tsx`** — `MidCta`: `w-full bg-tint` 밴드로, 내부 `max-w-[1120px]`. `FinalCta`: 기존 `bg-ink` 유지 + `GridTexture` 를 `text-paper opacity-[0.05]` 로 배경에. 스파인 잔재(`absolute ... rotate-45`) 제거.

- [ ] **Step 4: 빌드 + 검증** — `tsc/lint/build 0`. Playwright: FAQ `<details>` 클릭으로 열림(JS 없이), 신뢰/FAQ placeholder 텍스트("설명 문구가 들어갑니다" 등) 0건. FinalCta 대비(글자/배경) 육안.

- [ ] **Step 5: 커밋**

```bash
git add components/marketing/trust.tsx components/marketing/faq.tsx components/marketing/cta-band.tsx
git commit -m "feat(marketing): 신뢰·FAQ·CTA 밴드 + 실제 카피"
```

---

## Task 9: 랜딩 페이지 조립 (스파인 제거 · 밴드 순서)

**Files:**
- Modify: `app/(marketing)/page.tsx`
- Modify/Delete: `components/marketing/section.tsx` (남은 사용처 없으면 삭제)

**Interfaces:**
- Consumes: 모든 섹션 컴포넌트(Task 3–8).

- [ ] **Step 1: `page.tsx`** — 래퍼를 `<>` 로. 스파인 `<span>` 삭제. JSON-LD `<script>` 는 유지(맨 위). 섹션 순서: `<Hero/> <Problems/> <BeforeAfter/> <Services/> <Demos/> <MidCta/> <Process/> <Trust/> <Faq/> <FinalCta/>`. 각 컴포넌트가 자기 밴드(풀블리드)를 그리므로 `page.tsx` 에 컨테이너 불필요.

- [ ] **Step 2: `section.tsx` 처리** — `grep -rl "marketing/section\"" components app` 로 잔여 import 확인. 없으면 `git rm`. 있으면 `SectionBand` 로 교체 후 삭제.

- [ ] **Step 3: 빌드 + 전체 검증**

Run: `npx tsc --noEmit && npm run lint && npm run build`
`npm run dev` + Playwright:
```js
await page.goto('http://localhost:3000/');
// 1280 · 768 · 375 각각 fullPage 스크린샷
// 단언: main 1개, 가로 스크롤 없음, 섹션 heading 10개 순서대로 존재,
//       "단계 설명이 들어갑니다" / "설명 문구가 들어갑니다" / "질문 1" 0건
```
Expected: 밴드가 번갈아 보이고(paper/tint/panel), 스파인 없음, 모든 섹션에 아이콘/일러스트.

- [ ] **Step 4: 커밋**

```bash
git add "app/(marketing)/page.tsx"
git rm components/marketing/section.tsx  # 사용처 없을 때만
git commit -m "feat(marketing): 랜딩 조립 — 스파인 제거, 교대 밴드"
```

---

## Task 10: 헤더 · 푸터 정돈

**Files:**
- Modify: `components/marketing/site-header.tsx`, `components/marketing/site-footer.tsx`

- [ ] **Step 1: `site-header.tsx`** — 구조 유지(RSC, `<details>` 모바일 메뉴). 조정만: 네비 링크 hover 밑줄(`underline-offset` 통일), CTA 를 `CtaLink` 로 교체해 스타일 일원화, `h-16` 유지. **활성 상태 표시는 안 함**(클라이언트 JS 필요 — 제약 위반).

- [ ] **Step 2: `site-footer.tsx`** — 상단 영역을 3열 그리드(`sm:grid-cols-3`): ① 브랜드(워드마크 + `AI로 일하는 회사를 만듭니다.`) ② 바로가기(무료 진단 / 자동화 데모 / 회사소개 / 상담 신청) ③ 법적·설정(개인정보처리방침 / 이용약관 / 쿠키 설정). 하단 사업자 정보 라인(`[확정 필요]`) 유지. `CookieSettingsLink` 유지.

- [ ] **Step 3: 빌드 + 검증** — `tsc/lint/build 0`. Playwright: 헤더 nav 링크 4개 + CTA, 푸터 3열 + 사업자 정보, `/` 와 `/diagnosis` 둘 다에서 동일 렌더.

- [ ] **Step 4: 커밋**

```bash
git add components/marketing/site-header.tsx components/marketing/site-footer.tsx
git commit -m "feat(marketing): 헤더·푸터 정돈 — CTA 일원화, 푸터 3열"
```

---

## Task 11: 회사소개 · 자동화 사례 페이지

**Files:**
- Modify: `app/(marketing)/about/page.tsx`, `app/(marketing)/cases/page.tsx`

**Interfaces:**
- Consumes: `SectionBand`, `ABOUT` (Task 2), `pageMetadata` (`lib/siteMeta`).

- [ ] **Step 1: `about/page.tsx`** — `robots` noindex 제거, `metadata = pageMetadata({ title: "회사소개", description: "...", path: "/about" })`. 본문: `SectionBand surface="paper" eyebrow="회사소개" heading="AI로 일하는 회사를 만듭니다"` + `ABOUT.mission` 문단, 그 아래 "무엇을 안 하나"(`ABOUT.notDoing` 리스트 — 절대원칙 1·3), 고정 스택(`ABOUT.stack`), 1인 체제 투명성(`ABOUT.solo`). 사업자 정보는 `Placeholder`.

- [ ] **Step 2: `cases/page.tsx`** — `robots` noindex 유지(콘텐츠는 Phase 4.2). 본문: `SectionBand surface="paper" eyebrow="자동화 사례" heading="사례는 곧 공개됩니다"` + `자동화 사례는 준비 중입니다. 지금은 홈페이지의 자동화 데모로 실제 흐름을 확인하실 수 있습니다.` + `/#demos` 링크(`CtaLink ghost`). 기존 `<main className="p-8">` 스텁 완전 교체.

- [ ] **Step 3: 빌드 + 검증** — `tsc/lint/build 0`. Playwright: `/about` 헤더/푸터 + 본문 문단, `robots` 메타 `index, follow`(about) / `noindex`(cases). `/cases` `/#demos` 링크 동작.

- [ ] **Step 4: 커밋**

```bash
git add "app/(marketing)/about/page.tsx" "app/(marketing)/cases/page.tsx"
git commit -m "feat(marketing): 회사소개 실제 페이지 + 자동화 사례 준비 중 화면"
```

---

## Task 12: LegalShell 헤더 통일 · 진단/상담 인트로

**Files:**
- Modify: `components/marketing/legal/shell.tsx`
- Modify: `app/(marketing)/diagnosis/page.tsx`, `app/(marketing)/consultation/page.tsx`
- Modify: `components/diagnosis/wizard-progress.tsx`, `components/consultation/consultation-form.tsx` (아이콘만)

- [ ] **Step 1: `legal/shell.tsx`** — `LegalShell` 헤더(`border-t-2 border-ink pt-3` 블록)를 `SectionBand` 규격(에뮤 `font-flow text-signal` + `h-0.5 w-10 bg-signal` 룰 + 제목)으로 맞춤. 배너·본문·`Placeholder`·`LegalSection`·`LegalTable` 는 그대로. 컨테이너 `max-w-[46rem]` 유지.

- [ ] **Step 2: `diagnosis/page.tsx`** — `<DiagnosisWizard/>` 위에 인트로:
```tsx
<div className="mx-auto w-full max-w-[36rem] px-5 pt-10">
  <p className="font-flow text-[0.75rem] tracking-[0.04em] text-signal">무료 진단</p>
  <span aria-hidden className="mt-3 block h-0.5 w-10 bg-signal" />
  <h1 className="mt-4 text-[1.5rem] font-extrabold tracking-tight text-ink sm:text-[1.75rem]">3분이면 우리 회사의 자동화 여지를 확인합니다</h1>
  <p className="mt-2 text-[0.9rem] text-ink-soft">무료 · 카드·계약 없음 · 결과는 추정치입니다.</p>
</div>
```
`consultation/page.tsx` — 동일 패턴, 에뮤 `상담 신청`, 제목 `자동화 도입, 상담으로 이어가세요`, 한 줄 `진단 결과가 있으면 함께 전달됩니다.`.

- [ ] **Step 3: 아이콘 가벼운 적용** — `wizard-progress.tsx`: 단계 라벨(`회사/도구/업무/업무량/상담`) 앞에 작은 아이콘 넣지 **않음**(레이아웃 리스크). 대신 완료 노드 색만 유지. `consultation-form.tsx`: 제출 버튼 라벨 옆 `lucide Send` 14px 정도만(선택). 구조 변경 없음. **이 스텝은 리스크 낮은 범위만; 애매하면 skip 하고 커밋 메시지에 명시.**

- [ ] **Step 4: 빌드 + 검증** — `tsc/lint/build 0`. Playwright: `/privacy` 헤더가 새 스타일, `/diagnosis`·`/consultation` 인트로 블록 존재 + 폼 정상, 세 페이지 `<main>` 1개.

- [ ] **Step 5: 커밋**

```bash
git add components/marketing/legal/shell.tsx "app/(marketing)/diagnosis/page.tsx" "app/(marketing)/consultation/page.tsx" components/diagnosis/wizard-progress.tsx components/consultation/consultation-form.tsx
git commit -m "feat(marketing): LegalShell 헤더 통일 + 진단·상담 인트로 헤더"
```

---

## Task 13: 반응형·접근성·문서 스윕

**Files:**
- Modify: `task.md` (Phase 4 항목 + 변경 이력), 필요 시 `CLAUDE.md`(토큰 목록에 `--wak-tint` 언급)

- [ ] **Step 1: 반응형 스윕** — `npm run dev` + Playwright, `/`·`/about`·`/cases`·`/diagnosis`·`/consultation`·`/privacy` 를 375·768·1280 에서:
  - `document.documentElement.scrollWidth <= innerWidth + 1` (가로 스크롤 없음; 표·타임라인·데모스트립은 자체 `overflow-x-auto` 안에서만)
  - `document.querySelectorAll('main').length === 1`
  - 각 SVG 일러스트가 컨테이너를 안 넘침
  발견 시 해당 컴포넌트 수정 후 재확인.

- [ ] **Step 2: 접근성 체크** —
  - 모든 `<a>`/`<button>`/`<summary>` 에 `focus-visible` 링 보임(키보드 Tab).
  - 모든 일러스트 `role="img"` + 한국어 `aria-label`, 장식 SVG(`grid-texture`, 커넥터) `aria-hidden`.
  - `prefers-reduced-motion: reduce` 에뮬레이트 → 히어로/CTA 신호 애니메이션 정지, 레이아웃 동일.
  - lucide 아이콘 전부 `aria-hidden`(의미는 옆 텍스트가 전달).
  - 대비: `text-ink-soft`(#566b6d) on `--wak-tint`(#eef1f7) ≥ 4.5:1 확인. 미달 시 tint 를 더 밝게(#f0f2f8) 또는 본문은 `text-ink`.

- [ ] **Step 3: 최종 빌드**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 0. 라우트 목록 변화 없음(`/about` 는 static, `/cases` static).

- [ ] **Step 4: `task.md` 갱신** — Phase 4 에 `- [x] 4.x 마케팅 UI 리디자인` 추가(섹션 밴드·라인 아이콘·SVG 일러스트·카피 확정·회사소개 페이지). 변경 이력에 1줄. `CLAUDE.md` 토큰 언급 있으면 `--wak-tint` 추가.

- [ ] **Step 5: 커밋 + 최종 스크린샷**

```bash
git add task.md CLAUDE.md
git commit -m "docs: 마케팅 리디자인 반영 + 반응형·a11y 스윕"
```
`/` 1280·375 fullPage 스크린샷을 리뷰에 첨부.

---

## Self-Review

**Spec coverage:**
- 섹션 밴드 시스템 → Task 1(프리미티브) + 4·5·6·7·8·9(적용) ✅
- 라인 아이콘 → Task 1(래퍼) + 2(매핑) + 4·7·8·11 ✅
- 커스텀 SVG 일러스트(히어로·Before/After·타임라인·데모·그리드) → Task 3·5·6·7 ✅
- 섹션 구분/스캔성 → 밴드 교대 배경 + 에뮤/룰 + 카드 그림자(Task 1 토큰, 9 조립) ✅
- 플레이스홀더 카피 → Task 2 + 각 섹션 태스크에서 제거 확인 ✅
- 마케팅 페이지 전부 → 랜딩(3–9) · 헤더/푸터(10) · about/cases(11) · legal/진단/상담(12) ✅
- 제약(라이트·RSC·JS 0·절대원칙·사진 없음·애니메이션 1회) → Global Constraints + 각 태스크 검증 스텝 ✅

**Placeholder scan:** 계획 내 "TBD/TODO/적절히" 없음. 카피는 §6 에 실문구 확정. 진짜 미확정(사업자 정보·시행일)만 `Placeholder`.

**Type consistency:** `SectionBand` props(`surface`·`eyebrow`·`index`·`heading`·`lead`·`wide`) Task 1 정의 → 4·5·6·7·8·9·11·12 사용 일치. `Icon`/`IconName` Task 1 정의 → 2·4·7·8 사용. 일러스트 prop: `DemoStrip({steps})`·`ProcessTimeline({steps})`·`BeforeAfterSplit({rows})`·`HeroFlow()`·`GridTexture({className})` — 정의 태스크와 소비 태스크 시그니처 동일.

**Scope:** 단일 구현 계획으로 적정(한 서브시스템 = 마케팅 표현 계층). 태스크 13개, 각 독립 빌드·커밋·리뷰 가능.
