# 결과 PDF 저장 구현 계획 (갈래 Y)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진단 결과 화면의 "결과 PDF로 저장" 버튼을 누르면 서버가 한글 PDF를 생성해 즉시 다운로드된다.

**Architecture:** `GET /api/diagnoses/[id]/pdf` 라우트가 기존 `toApiResult`로 결과를 만들고, `@react-pdf/renderer`로 PDF 버퍼를 렌더링해 `Content-Disposition: attachment`로 응답한다. 한글 폰트(Noto Sans KR)는 저장소에 포함하고 `outputFileTracingIncludes`로 Docker standalone 이미지에 싣는다. 결과 카드 화면에는 일반 `<a href>` 링크만 추가한다(클라이언트 JS 로직 없음).

**Tech Stack:** Next.js 16.3.4 (App Router, Route Handler, Node 런타임), React 19.2.8, TypeScript 5, `@react-pdf/renderer` 4.9.x, zod 4.5, lucide-react. 테스트 러너 없음 — 검증은 `tsc`/`eslint`/`build` + 일회성 `node --experimental-strip-types` 스크립트 + curl + `pdftotext`/이미지 육안 + Playwright.

**Spec:** `docs/superpowers/specs/2026-09-20-marketing-renewal-and-result-pdf-design.md` §"Y. 결과 PDF 저장" (executor는 스펙과 이 계획을 함께 읽는다)

## Global Constraints

- **브랜치 `feat/result-pdf`** (스펙·계획 커밋이 있는 `docs/renewal-pdf-spec`에서 분기). 로컬 커밋만, **push 금지**. 커밋 메시지 끝에 다음 줄을 붙인다:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```
- **Next 16**: `params`는 Promise. 라우트 컨텍스트 타입은 `next dev`/`next build`/`npx next typegen`이 생성하는 전역 `RouteContext<"/route">` — import 하지 않는다. 린트는 `npx eslint <경로>`(`next lint` 없음). 코드 작성 전 필요하면 `node_modules/next/dist/docs/`를 확인한다(AGENTS.md).
- **PII 경계**: PDF에는 이름·전화·이메일·회사명을 넣지 않는다. `leads` 테이블을 조회하지 않는다. 조회는 `diagnoses(status, created_at)`와 `diagnosis_results`만.
- **절대 원칙 4**: 절감 시간 등 AI 수치는 항상 "추정치"로 표기하고 보장 표현을 쓰지 않는다. 고지 문구(정확히): `본 결과는 입력하신 내용을 바탕으로 한 AI 추정치이며 실제 효과를 보장하지 않습니다.`
- **Rate limit**: `lib/rateLimit.ts`의 `checkRateLimit(key, limit, windowMs)` 재사용. 키 `pdf:${ip}`, IP당 시간당 **20건**(20 = limit, 3_600_000 = windowMs). IP는 반드시 `lib/clientIp.ts`의 `getClientIp(req)`(결함 #2).
- **날짜**: KST 표시는 `lib/kst.ts`의 `kstDate(iso)`("YYYY-MM-DD"). `Date.slice` 금지.
- **서버 전용 모듈**은 첫 줄에 `import "server-only";`.
- **테스트 러너 없음**: 순수 로직만 일회성 `_wak_*.mts` 스크립트(`node --experimental-strip-types`)로 검증하고 사용 후 삭제한다. 일회성 산출물(PDF·PNG)은 세션 scratchpad 디렉터리(`$SCRATCH`)에 둔다.
- **폰트 라이선스**: Noto Sans KR은 SIL OFL 1.1. 폰트 옆에 라이선스 고지를 함께 커밋한다.

## File Structure

| 파일 | 책임 |
|---|---|
| `assets/fonts/NotoSansKR-Regular.otf`, `NotoSansKR-Bold.otf`, `OFL.txt` | 한글 폰트 + 라이선스 (신규) |
| `next.config.ts` | `outputFileTracingIncludes`로 폰트를 standalone에 포함 (수정) |
| `lib/pdf/filename.ts` | 파일명·`Content-Disposition` 헤더 생성 — 순수 함수 (신규) |
| `lib/pdf/fonts.ts` | 폰트 등록(멱등) (신규) |
| `lib/pdf/diagnosis-pdf.tsx` | PDF 문서 컴포넌트 `DiagnosisPdf` (신규) |
| `app/api/diagnoses/[id]/pdf/route.tsx` | 조회 → `toApiResult` → 렌더 → 응답 (신규, JSX 때문에 `.tsx`) |
| `components/diagnosis/result/result-cards.tsx` | "결과 PDF로 저장" 링크 + GA4 (수정) |
| `task.md` | 항목 기록 (수정) |

---

### Task 1: 의존성·폰트·설정 + 호환성 스파이크

**목적:** `@react-pdf/renderer`가 Next 16.3 / React 19.2 Route Handler에서 한글 PDF를 만드는지 먼저 증명한다. 실패하면 이 계획을 멈추고 `pdfkit` 대체안(스펙 §리스크)을 사용자와 논의한다.

**Files:**
- Modify: `package.json`, `package-lock.json`, `next.config.ts`
- Create: `assets/fonts/NotoSansKR-Regular.otf`, `assets/fonts/NotoSansKR-Bold.otf`, `assets/fonts/OFL.txt`
- Create(임시, 태스크 끝에 삭제): `app/api/spike-pdf/route.tsx`

**Interfaces:**
- Produces: 폰트 파일 경로 `assets/fonts/NotoSansKR-{Regular,Bold}.otf` (Task 3의 `lib/pdf/fonts.ts`가 참조), `next.config.ts`의 트레이싱 키 `"/api/diagnoses/[id]/pdf"`.

- [ ] **Step 1: 브랜치 생성**

```bash
cd /Users/joymacmini/projects/webagentkr-mvp-claude
git checkout docs/renewal-pdf-spec
git checkout -b feat/result-pdf
```

- [ ] **Step 2: 라이브러리 설치**

```bash
npm install @react-pdf/renderer
npm ls @react-pdf/renderer react
```
Expected: `@react-pdf/renderer@4.9.x`, `react@19.2.8` 단일 버전(중복 react 없음).

- [ ] **Step 3: 폰트 + 라이선스 내려받기**

```bash
mkdir -p assets/fonts
curl -fL -o assets/fonts/NotoSansKR-Regular.otf https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/KR/NotoSansKR-Regular.otf
curl -fL -o assets/fonts/NotoSansKR-Bold.otf https://github.com/notofonts/noto-cjk/raw/main/Sans/SubsetOTF/KR/NotoSansKR-Bold.otf
curl -fL -o assets/fonts/OFL.txt https://raw.githubusercontent.com/notofonts/noto-cjk/main/LICENSE
file assets/fonts/*.otf
head -3 assets/fonts/OFL.txt
```
Expected: 두 `.otf`가 `OpenType font data`(각 약 4.6MB·4.8MB), `OFL.txt` 첫 줄에 `SIL OPEN FONT LICENSE`가 보인다. `OFL.txt` 다운로드가 실패하거나 내용이 다르면, 파일에 다음 두 줄을 직접 작성한다:
```
Noto Sans KR — Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'.
Licensed under the SIL Open Font License, Version 1.1 — https://scripts.sil.org/OFL
```

- [ ] **Step 4: 임시 스파이크 라우트 작성**

`app/api/spike-pdf/route.tsx`:
```tsx
import path from "node:path";
import { Document, Font, Page, Text, renderToBuffer } from "@react-pdf/renderer";

export const runtime = "nodejs";

const dir = path.join(process.cwd(), "assets", "fonts");
Font.register({
  family: "NotoSansKR",
  fonts: [
    { src: path.join(dir, "NotoSansKR-Regular.otf"), fontWeight: 400 },
    { src: path.join(dir, "NotoSansKR-Bold.otf"), fontWeight: 700 },
  ],
});

export async function GET() {
  const buf = await renderToBuffer(
    <Document>
      <Page size="A4" style={{ fontFamily: "NotoSansKR", padding: 40 }}>
        <Text>자동화 진단 결과 — 추정치 45 / 100 ABC abc</Text>
        <Text style={{ fontWeight: 700 }}>굵은 글씨 테스트: 우선 업무 · 실행 단계</Text>
      </Page>
    </Document>,
  );
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "application/pdf" },
  });
}
```

- [ ] **Step 5: dev 서버 실행 후 PDF 생성**

```bash
npm run dev > $SCRATCH/dev.log 2>&1 &
sleep 8
curl -s -o $SCRATCH/spike.pdf -w "%{http_code} %{content_type}\n" http://localhost:3000/api/spike-pdf
file $SCRATCH/spike.pdf
```
Expected: `200 application/pdf`, `PDF document`. 500이면 `$SCRATCH/dev.log`를 읽는다:
- react-reconciler / "Cannot read properties of undefined" 계열 오류 → `next.config.ts`에 `serverExternalPackages: ["@react-pdf/renderer"]`를 추가하고 dev 서버를 재시작해 재시도.
- 그래도 실패하면 **여기서 중단**하고 사용자에게 보고한다(`pdfkit` 대체 결정 필요).

- [ ] **Step 6: 한글 렌더링 검증 (텍스트 + 육안)**

```bash
which pdftotext pdftoppm || brew install poppler
pdftotext $SCRATCH/spike.pdf - | head
pdftoppm -png -r 80 -f 1 -l 1 $SCRATCH/spike.pdf $SCRATCH/spike
```
Expected: `pdftotext`가 한글 문구를 그대로 출력. 그리고 `Read` 도구로 `$SCRATCH/spike-1.png`를 열어 **글자가 두부(□)가 아니라 실제 한글로 그려졌고 굵은 글씨가 굵게 나오는지** 육안 확인한다(텍스트 추출만으로는 글리프 누락을 잡지 못한다).

- [ ] **Step 7: standalone 트레이싱 설정**

`next.config.ts`를 다음으로 수정(Step 5에서 `serverExternalPackages`를 추가했다면 그 항목은 유지):
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지 경량화: .next/standalone 에 필요한 것만 번들 (Dockerfile 참조)
  output: "standalone",
  // 결과 PDF 라우트가 런타임에 읽는 한글 폰트 — import 그래프에 없어 명시 필요
  outputFileTracingIncludes: {
    "/api/diagnoses/[id]/pdf": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
```

- [ ] **Step 8: 스파이크 삭제 + dev 서버 종료 + 커밋**

```bash
kill %1 2>/dev/null; pkill -f "next dev" 2>/dev/null
rm -r app/api/spike-pdf
grep -n "assets" .dockerignore || echo ".dockerignore 에 assets 제외 없음 (OK)"
git add package.json package-lock.json next.config.ts assets/fonts
git commit -m "chore(pdf): @react-pdf/renderer + Noto Sans KR 폰트 + standalone 트레이싱

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
`.dockerignore`가 `assets`를 제외하고 있으면 그 줄을 제거하고 같은 커밋에 포함한다.

---

### Task 2: 파일명·헤더 헬퍼

**Files:**
- Create: `lib/pdf/filename.ts`
- Test(일회성, 사용 후 삭제): `_wak_pdf_filename.mts`

**Interfaces:**
- Produces:
  - `pdfFileName(diagnosisId: string): string` → `webagent-진단결과-<앞 8자>.pdf`
  - `attachmentDisposition(diagnosisId: string): string` → `attachment; filename="webagent-diagnosis-<앞 8자>.pdf"; filename*=UTF-8''<percent-encoded 한글 파일명>`
  (Task 3의 라우트가 `attachmentDisposition`을 사용)

- [ ] **Step 1: 실패하는 테스트 작성**

`_wak_pdf_filename.mts` (리포 루트):
```ts
import assert from "node:assert/strict";
import { attachmentDisposition, pdfFileName } from "./lib/pdf/filename.ts";

const id = "de02204a-14f6-4df6-b6ab-73f3f8a72e17";

assert.equal(pdfFileName(id), "webagent-진단결과-de02204a.pdf");

const h = attachmentDisposition(id);
assert.ok(h.startsWith("attachment;"));
assert.ok(h.includes('filename="webagent-diagnosis-de02204a.pdf"'));
assert.ok(
  h.includes(`filename*=UTF-8''${encodeURIComponent("webagent-진단결과-de02204a.pdf")}`),
);
// 헤더 값은 ASCII 여야 한다 (한글 원문이 그대로 들어가면 Response 생성이 실패한다)
assert.ok(/^[\x20-\x7e]+$/.test(h), "헤더에 비ASCII 문자 포함");

console.log("pdf filename: OK");
```

- [ ] **Step 2: 실패 확인**

Run: `node --experimental-strip-types _wak_pdf_filename.mts`
Expected: FAIL — `Cannot find module './lib/pdf/filename.ts'`

- [ ] **Step 3: 구현**

`lib/pdf/filename.ts`:
```ts
// 결과 PDF 파일명·다운로드 헤더. 순수 함수 — 시크릿 없음.

/** 사용자에게 보이는 파일명 (한글) */
export function pdfFileName(diagnosisId: string): string {
  return `webagent-진단결과-${diagnosisId.slice(0, 8)}.pdf`;
}

/** Content-Disposition 값. 헤더는 ASCII 여야 하므로 filename(ASCII 폴백) + filename*(RFC 5987, 한글) 병기 */
export function attachmentDisposition(diagnosisId: string): string {
  const short = diagnosisId.slice(0, 8);
  return `attachment; filename="webagent-diagnosis-${short}.pdf"; filename*=UTF-8''${encodeURIComponent(pdfFileName(diagnosisId))}`;
}
```

- [ ] **Step 4: 통과 확인 + 정리 + 커밋**

Run: `node --experimental-strip-types _wak_pdf_filename.mts`
Expected: `pdf filename: OK`

```bash
rm _wak_pdf_filename.mts
git add lib/pdf/filename.ts
git commit -m "feat(pdf): 파일명·Content-Disposition 헬퍼

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: PDF 문서 컴포넌트 + API 라우트

**Files:**
- Create: `lib/pdf/fonts.ts`, `lib/pdf/diagnosis-pdf.tsx`, `app/api/diagnoses/[id]/pdf/route.tsx`

**Interfaces:**
- Consumes: `toApiResult`, `DiagnosisResultRow`, `DiagnosisApiResult`, `PriorityTask`(`lib/diagnosisResult.ts`) / `attachmentDisposition`(Task 2) / `checkRateLimit`, `getClientIp`, `kstDate`, `createServiceClient`, `SITE_URL`(`lib/siteMeta.ts`)
- Produces:
  - `registerPdfFonts(): void` — 멱등
  - `DiagnosisPdf(props: { result: DiagnosisApiResult; diagnosedOn: string; resultUrl: string })` — `@react-pdf/renderer` `<Document>` 반환
  - HTTP: `GET /api/diagnoses/{id}/pdf` → 200 `application/pdf` | 404 `{error:"not_found"}` | 409 `{error:"not_ready", status:"PROCESSING"|"FAILED"}` | 429 `{error:"rate_limited"}` + `Retry-After` | 500 `{error:"internal"}`

- [ ] **Step 1: 폰트 등록 모듈**

`lib/pdf/fonts.ts`:
```ts
import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/** Noto Sans KR 등록 (SIL OFL 1.1, assets/fonts/OFL.txt). 멱등. */
export function registerPdfFonts(): void {
  if (registered) return;
  const dir = path.join(process.cwd(), "assets", "fonts");
  Font.register({
    family: "NotoSansKR",
    fonts: [
      { src: path.join(dir, "NotoSansKR-Regular.otf"), fontWeight: 400 },
      { src: path.join(dir, "NotoSansKR-Bold.otf"), fontWeight: 700 },
    ],
  });
  // 한글 어절이 음절 단위로 끊겨 하이픈이 붙는 것을 방지
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
```

- [ ] **Step 2: PDF 문서 컴포넌트**

`lib/pdf/diagnosis-pdf.tsx`:
```tsx
import "server-only";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DiagnosisApiResult } from "@/lib/diagnosisResult";
import { registerPdfFonts } from "./fonts";

registerPdfFonts();

const INK = "#16292b";
const SOFT = "#566b6d";
const LINE = "#cdd5ce";
const SIGNAL = "#1f3ce6";

const s = StyleSheet.create({
  page: { fontFamily: "NotoSansKR", fontSize: 10, color: INK, padding: 48, paddingBottom: 64, lineHeight: 1.6 },
  brand: { fontSize: 9, fontWeight: 700, color: SIGNAL, letterSpacing: 1.5 },
  title: { fontSize: 22, fontWeight: 700, marginTop: 6 },
  meta: { fontSize: 9, color: SOFT, marginTop: 4 },
  rule: { borderTopWidth: 2, borderTopColor: INK, marginTop: 14 },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 16 },
  score: { fontSize: 40, fontWeight: 700, color: SIGNAL, lineHeight: 1 },
  scoreOf: { fontSize: 12, color: SOFT, marginLeft: 4, marginBottom: 4 },
  label: { fontSize: 9, color: SOFT, marginTop: 2 },
  section: { marginTop: 18 },
  h2: { fontSize: 12, fontWeight: 700, borderBottomWidth: 0.75, borderBottomColor: LINE, paddingBottom: 4, marginBottom: 8 },
  task: { marginBottom: 8 },
  taskName: { fontWeight: 700 },
  taskMeta: { fontSize: 9, color: SOFT },
  item: { flexDirection: "row", marginBottom: 3 },
  itemNo: { width: 16, color: SIGNAL, fontWeight: 700 },
  itemText: { flex: 1 },
  disclaimer: { position: "absolute", left: 48, right: 48, bottom: 28, borderTopWidth: 0.75, borderTopColor: LINE, paddingTop: 6, fontSize: 8, color: SOFT },
});

export interface DiagnosisPdfProps {
  result: DiagnosisApiResult;
  /** KST "YYYY-MM-DD" */
  diagnosedOn: string;
  resultUrl: string;
}

export function DiagnosisPdf({ result, diagnosedOn, resultUrl }: DiagnosisPdfProps) {
  const { min, max } = result.totalEstimatedSavedHours;
  return (
    <Document title="WEBAGENT.KR 자동화 진단 결과" author="WEBAGENT.KR">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>WEBAGENT.KR</Text>
        <Text style={s.title}>자동화 진단 결과</Text>
        <Text style={s.meta}>진단일 {diagnosedOn} · 아래 수치는 모두 AI 추정치입니다</Text>
        <View style={s.rule} />

        <View style={s.scoreRow}>
          <Text style={s.score}>{result.automationScore}</Text>
          <Text style={s.scoreOf}>/ 100</Text>
        </View>
        <Text style={s.label}>자동화 준비도 (추정)</Text>

        <View style={s.section}>
          <Text style={s.h2}>예상 절감 시간 (추정치)</Text>
          <Text>
            월 약 {min}~{max}시간 — 입력하신 정보로 계산한 추정치이며 보장 값이 아닙니다.
          </Text>
        </View>

        {result.priorityTasks.length > 0 && (
          <View style={s.section}>
            <Text style={s.h2}>우선 자동화 업무</Text>
            {result.priorityTasks.map((t, i) => (
              <View key={i} style={s.task} wrap={false}>
                <Text style={s.taskName}>
                  {i + 1}. {t.name}
                </Text>
                <Text style={s.taskMeta}>
                  난이도 {t.difficulty} · 월 약 {t.estimatedMonthlySavedHours}시간 절감 (추정)
                </Text>
                <Text>{t.reason}</Text>
              </View>
            ))}
          </View>
        )}

        {result.recommendedStack.length > 0 && (
          <View style={s.section}>
            <Text style={s.h2}>추천 구성</Text>
            <Text>{result.recommendedStack.join("  ·  ")}</Text>
          </View>
        )}

        {result.implementationSteps.length > 0 && (
          <View style={s.section}>
            <Text style={s.h2}>실행 단계</Text>
            {result.implementationSteps.map((step, i) => (
              <View key={i} style={s.item} wrap={false}>
                <Text style={s.itemNo}>{i + 1}</Text>
                <Text style={s.itemText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {result.summary.length > 0 && (
          <View style={s.section}>
            <Text style={s.h2}>요약</Text>
            <Text>{result.summary}</Text>
          </View>
        )}

        <View style={s.disclaimer} fixed>
          <Text>본 결과는 입력하신 내용을 바탕으로 한 AI 추정치이며 실제 효과를 보장하지 않습니다.</Text>
          <Text>결과 페이지: {resultUrl}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 3: API 라우트**

`app/api/diagnoses/[id]/pdf/route.tsx`:
```tsx
// GET /api/diagnoses/[id]/pdf — 결과 PDF 다운로드 (공개, 진단 UUID 를 아는 사람만).
// lead 정보(이름·연락처·이메일·회사명)는 조회하지도 넣지도 않는다 (PII 경계).
import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { toApiResult, type DiagnosisResultRow } from "@/lib/diagnosisResult";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/clientIp";
import { kstDate } from "@/lib/kst";
import { SITE_URL } from "@/lib/siteMeta";
import { attachmentDisposition } from "@/lib/pdf/filename";
import { DiagnosisPdf } from "@/lib/pdf/diagnosis-pdf";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const PDF_LIMIT = 20; // IP당 시간당
const HOUR_MS = 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/diagnoses/[id]/pdf">,
) {
  const { id } = await ctx.params;

  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const rl = checkRateLimit(`pdf:${getClientIp(req)}`, PDF_LIMIT, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error("[diagnoses/[id]/pdf] 클라이언트 생성 실패:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "internal" }, { status: 500, headers: NO_STORE });
  }

  const diag = await supabase
    .from("diagnoses")
    .select("status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (diag.error) {
    console.error("[diagnoses/[id]/pdf] 조회 실패:", diag.error.code, diag.error.message);
    return NextResponse.json({ error: "internal" }, { status: 500, headers: NO_STORE });
  }
  if (!diag.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const status = diag.data.status as string;
  if (status !== "COMPLETED") {
    return NextResponse.json(
      { error: "not_ready", status: status === "FAILED" ? "FAILED" : "PROCESSING" },
      { status: 409, headers: NO_STORE },
    );
  }

  const res = await supabase
    .from("diagnosis_results")
    .select(
      "automation_score, recommended_tasks, estimated_saved_hours, recommended_stack, implementation_steps, ai_summary",
    )
    .eq("diagnosis_id", id)
    .maybeSingle();

  if (res.error || !res.data) {
    console.error("[diagnoses/[id]/pdf] COMPLETED 인데 결과 행 없음:", id, res.error?.code, res.error?.message);
    return NextResponse.json({ error: "not_ready", status: "PROCESSING" }, { status: 409, headers: NO_STORE });
  }

  try {
    const buf = await renderToBuffer(
      <DiagnosisPdf
        result={toApiResult(res.data as DiagnosisResultRow)}
        diagnosedOn={kstDate(diag.data.created_at as string)}
        resultUrl={`${SITE_URL}/diagnosis/${id}`}
      />,
    );
    return new Response(new Uint8Array(buf), {
      headers: {
        ...NO_STORE,
        "Content-Type": "application/pdf",
        "Content-Disposition": attachmentDisposition(id),
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    console.error("[diagnoses/[id]/pdf] 렌더 실패:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "internal" }, { status: 500, headers: NO_STORE });
  }
}
```

- [ ] **Step 4: 타입·린트**

```bash
npx next typegen 2>/dev/null || true   # RouteContext 전역 타입 생성 (Next 16)
npx tsc --noEmit
npx eslint lib/pdf "app/api/diagnoses/[id]/pdf"
```
Expected: 둘 다 출력 없이 종료(0). `RouteContext` 타입을 못 찾으면 `npm run dev`를 잠시 띄워 타입을 생성한 뒤 재실행.

- [ ] **Step 5: 실 DB의 COMPLETED 진단으로 다운로드**

`.env`가 Supabase(서울)를 가리킨다. 기존 테스트 진단(보존 결정된 데이터)에서 COMPLETED 1건의 id를 읽기 전용으로 가져온다:
```bash
ID=$(node --env-file=.env -e '
const { createClient } = require("@supabase/supabase-js");
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
c.from("diagnoses").select("id").eq("status","COMPLETED").limit(1).then(r => console.log(r.data?.[0]?.id ?? ""));
')
echo "$ID"
npm run dev > $SCRATCH/dev.log 2>&1 &
sleep 8
curl -s -D $SCRATCH/h.txt -o $SCRATCH/result.pdf "http://localhost:3000/api/diagnoses/$ID/pdf"
cat $SCRATCH/h.txt | head -12
file $SCRATCH/result.pdf
pdftotext -layout $SCRATCH/result.pdf -
pdftoppm -png -r 80 $SCRATCH/result.pdf $SCRATCH/result
```
Expected: `HTTP/1.1 200`, `content-type: application/pdf`, `content-disposition: attachment; filename="webagent-diagnosis-XXXXXXXX.pdf"; filename*=UTF-8''webagent-%EC%A7%84...`, `PDF document`. `pdftotext` 출력에 점수·우선 업무·요약·고지 문구(`본 결과는 입력하신 내용을 바탕으로 한 AI 추정치이며 실제 효과를 보장하지 않습니다.`)가 있고, **이름·전화·이메일·회사명이 없다**. `Read`로 `$SCRATCH/result-1.png`를 열어 한글이 정상 렌더링됐는지, 레이아웃이 깨지지 않았는지, 페이지 하단 고지가 보이는지 육안 확인한다. 진단 ID가 비어 있으면(COMPLETED가 없으면) 사용자에게 보고한다.

- [ ] **Step 6: 오류 경로 확인**

```bash
curl -s -o /dev/null -w "non-uuid: %{http_code}\n" http://localhost:3000/api/diagnoses/abc/pdf
curl -s -o /dev/null -w "no-such:  %{http_code}\n" http://localhost:3000/api/diagnoses/00000000-0000-4000-8000-000000000000/pdf
for i in $(seq 1 21); do curl -s -o /dev/null -w "%{http_code} " "http://localhost:3000/api/diagnoses/00000000-0000-4000-8000-000000000000/pdf"; done; echo
```
Expected: `non-uuid: 404`, `no-such: 404`, 마지막 줄은 앞의 요청들을 합쳐 20건째까지 `404`, 이후 `429`가 나온다(앞선 호출들도 같은 IP 버킷을 소모하므로 정확한 전환 지점은 20번째 이후여야 하며, 최종 출력에 `429`가 하나 이상 포함되면 통과). PROCESSING 상태 409는 Task 4의 UI 검증에서 확인한다.

- [ ] **Step 7: 커밋**

```bash
kill %1 2>/dev/null; pkill -f "next dev" 2>/dev/null
git add lib/pdf app/api/diagnoses
git commit -m "feat(pdf): 결과 PDF 문서 컴포넌트 + GET /api/diagnoses/[id]/pdf

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: 결과 화면 저장 버튼 + GA4

**Files:**
- Modify: `components/diagnosis/result/result-cards.tsx`

**Interfaces:**
- Consumes: `track(event, params)`(`lib/analytics.ts`), `GET /api/diagnoses/{id}/pdf`(Task 3)
- Produces: 결과 카드 화면에 `결과 PDF로 저장` 링크, GA4 이벤트 `result_pdf_download`(`{ from: "result" }`)

- [ ] **Step 1: 링크 추가**

`components/diagnosis/result/result-cards.tsx`에서 import에 lucide `Download`를 추가한다:
```tsx
import Link from "next/link";
import { Download } from "lucide-react";
import { track } from "@/lib/analytics";
```
상단 매스트헤드(`border-t-2 border-ink pt-3` div) 안, "추정치" 안내 `<p>` 바로 뒤에 다음을 추가한다:
```tsx
        <a
          href={`/api/diagnoses/${diagnosisId}/pdf`}
          download
          onClick={() => track("result_pdf_download", { from: "result" })}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-panel px-4 py-2.5 text-[0.9rem] leading-none font-medium text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
        >
          <Download aria-hidden className="size-4" />
          결과 PDF로 저장
        </a>
```
(`FailedNotice`·timeout 화면에는 넣지 않는다 — 스펙.)

- [ ] **Step 2: 타입·린트**

```bash
npx tsc --noEmit
npx eslint components/diagnosis/result
```
Expected: 0.

- [ ] **Step 3: 브라우저 확인 (Playwright)**

`npm run dev`를 띄우고 Task 3 Step 5에서 얻은 `$ID`로 `http://localhost:3000/diagnosis/$ID`를 연다.
- 결과 카드 화면 상단에 "결과 PDF로 저장" 버튼이 보인다(데스크톱·모바일 폭 ≈400px 모두, 스크린샷 확인).
- 버튼 클릭 시 다운로드가 시작되고 파일명이 `webagent-진단결과-XXXXXXXX.pdf`이다(Playwright `page.waitForEvent("download")`로 `download.suggestedFilename()` 확인).
- PROCESSING 상태 진단(예: 방금 새로 제출한 진단 또는 `?_test_` 쿼리로 유도)에서 `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/diagnoses/<processing-id>/pdf` 가 `409`인지 확인한다. 적당한 PROCESSING 진단이 없으면 이 항목은 건너뛰고 최종 보고에 "409 미검증"이라고 적는다.

- [ ] **Step 4: 커밋**

```bash
pkill -f "next dev" 2>/dev/null
git add components/diagnosis/result/result-cards.tsx
git commit -m "feat(pdf): 결과 화면 'PDF로 저장' 버튼 + GA4 result_pdf_download

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: 프로덕션 빌드·Docker 검증 + 문서

**Files:**
- Modify: `task.md`

- [ ] **Step 1: 빌드 + standalone에 폰트가 실렸는지 확인**

```bash
npm run build
ls -la .next/standalone/assets/fonts
```
Expected: 빌드 에러 0, `.next/standalone/assets/fonts/`에 `NotoSansKR-Regular.otf`·`NotoSansKR-Bold.otf`·`OFL.txt`가 있다. 없으면 `next.config.ts`의 트레이싱 키(`"/api/diagnoses/[id]/pdf"`)가 빌드 로그의 라우트 이름과 일치하는지 확인해 수정한다.

- [ ] **Step 2: standalone 서버에서 PDF 생성**

```bash
cd .next/standalone
PORT=3100 HOSTNAME=127.0.0.1 node --env-file=../../.env server.js > $SCRATCH/standalone.log 2>&1 &
sleep 4
curl -s -o $SCRATCH/standalone.pdf -w "%{http_code} %{content_type}\n" "http://127.0.0.1:3100/api/diagnoses/$ID/pdf"
cd ../.. ; pkill -f "server.js" 2>/dev/null
pdftotext $SCRATCH/standalone.pdf - | head -5
```
Expected: `200 application/pdf`, 한글 텍스트 추출 성공. (`$ID`는 Task 3 Step 5의 값. 새 셸이면 다시 조회한다.)

- [ ] **Step 3: Docker 이미지 안에서 확인**

```bash
docker info >/dev/null 2>&1 && echo "docker up" || echo "docker down"
docker build -t webagentkr-web:pdf-check .
docker run --rm -d --name wak-pdf-check -p 3100:3000 --env-file .env webagentkr-web:pdf-check
sleep 4
curl -s -o $SCRATCH/docker.pdf -w "%{http_code} %{content_type}\n" "http://127.0.0.1:3100/api/diagnoses/$ID/pdf"
docker logs wak-pdf-check 2>&1 | tail -5
docker rm -f wak-pdf-check
```
Expected: `200 application/pdf`, 컨테이너 로그에 폰트 ENOENT 오류 없음. Docker 데몬이 꺼져 있으면 이 스텝은 건너뛰고 최종 보고에 "Docker 이미지 검증 미실시 — VPS 배포 후 확인 필요"라고 명시한다.

- [ ] **Step 4: 전체 검증**

```bash
npx tsc --noEmit
npx eslint .
```
Expected: 둘 다 0.

- [ ] **Step 5: task.md 기록 + 커밋**

`task.md`의 Phase 4 목록에서 4.7 항목 앞에 다음을 추가하고, 변경 이력 맨 아래(2026-09-18 항목들 뒤)에 한 줄을 추가한다:
```markdown
- [x] **4.8 결과 PDF 저장** — 브랜치 `feat/result-pdf` (2026-09-20). `GET /api/diagnoses/[id]/pdf`(서버 생성, `@react-pdf/renderer` + Noto Sans KR, standalone 트레이싱) + 결과 화면 "결과 PDF로 저장" 버튼 + GA4 `result_pdf_download`. PII 없음·추정치 고지·IP당 시간당 20건. 스펙 `docs/superpowers/specs/2026-09-20-marketing-renewal-and-result-pdf-design.md`, 계획 `docs/superpowers/plans/2026-09-20-result-pdf.md`.
```
```markdown
- 2026-09-20: **결과 PDF 저장 구현** (`feat/result-pdf`). 서버 생성 PDF(한글 폰트 포함) + 결과 화면 저장 버튼. 검증 결과는 PR 본문 참조.
```
```bash
git add task.md
git commit -m "docs(task): 4.8 결과 PDF 저장 기록

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review

**스펙 커버리지 (§Y)**
- 서버 PDF + attachment 응답 → Task 3 / 상태별 200·409·404 → Task 3 라우트(409 검증은 Task 4 Step 3) / 버튼 위치·FAILED 제외 → Task 4 / 파일명(`filename*` 인코딩) → Task 2
- 데이터 = `toApiResult` 재사용·PII 없음 → Task 3(리드 미조회) / PDF 내용 7항목(빈 배열 섹션 생략 포함) → Task 3 `DiagnosisPdf`
- 라이브러리·폰트·OFL·`outputFileTracingIncludes`·Node 런타임 → Task 1·3 / 스파이크와 `pdfkit` 대체 → Task 1 Step 5
- rate limit 20/h·`getClientIp` → Task 3 / GA4 `result_pdf_download` → Task 4
- 검증: `pdftotext`·PII 부재·409/404/429·docker → Task 3·4·5

**플레이스홀더 스캔**: TBD/TODO 없음. 조건 분기(스파이크 실패, Docker 꺼짐, 진단 ID 없음)는 각 스텝에 구체 대응을 적었다.

**타입 일관성**: `attachmentDisposition(diagnosisId)`(Task 2 정의 = Task 3 사용 일치), `DiagnosisPdfProps`(`result`·`diagnosedOn`·`resultUrl`) 정의와 라우트 사용 일치, 폰트 경로 `assets/fonts/NotoSansKR-*.otf` Task 1·3 일치, 트레이싱 키 `"/api/diagnoses/[id]/pdf"`와 라우트 경로 일치, 이벤트명 `result_pdf_download` Task 4·5 일치.

**알려진 한계 (의도)**: 폰트 서브셋 없음(저장소 +약 9.5MB), 동일 버킷 rate limit은 프로세스 인메모리(재시작 시 초기화 — 기존 규약).
