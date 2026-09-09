import type { ReactNode } from "react";

/**
 * 법적 고지 페이지(개인정보처리방침 · 이용약관) 공용 셸.
 * 상단에 "전문가 검토 전 초안" 배너를 고정으로 노출한다(묶음 C 결정 1).
 * 전부 RSC — 클라이언트 JS 없음.
 */
export function LegalShell({
  eyebrow,
  title,
  effectiveDate,
  children,
}: {
  eyebrow: string;
  title: string;
  effectiveDate: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[46rem] px-5 py-12 sm:px-8 sm:py-16">
      <div className="border-t-2 border-ink pt-3">
        <p className="font-flow text-[0.7rem] text-signal">{eyebrow}</p>
        <h1 className="mt-1.5 text-[1.6rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.9rem]">
          {title}
        </h1>
        <p className="mt-2 text-[0.85rem] text-ink-soft">시행일: {effectiveDate}</p>
      </div>

      <div className="mt-6 border-l-2 border-danger bg-danger/[0.05] px-4 py-3 text-[0.88rem] leading-[1.7] text-ink-soft">
        본 문서는{" "}
        <strong className="font-semibold text-ink">
          변호사·노무사 등 전문가의 검토를 거치기 전 초안
        </strong>
        입니다. 실제 서비스 적용 전 법률 검토가 필요하며,{" "}
        <Placeholder>확정 필요</Placeholder> 로 표시된 항목은 사업자 정보 확정 후
        채워집니다.
      </div>

      <div className="mt-10 flex flex-col gap-9">{children}</div>
    </div>
  );
}

/** 번호가 매겨진 조/항 블록. `heading` 은 "제1조 (목적)" 또는 "1. 수집 항목" 처럼 완성형으로 넘긴다. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[1.05rem] font-bold tracking-tight text-ink">
        {heading}
      </h2>
      <div className="flex flex-col gap-3 text-[0.92rem] leading-[1.85] text-ink-soft [&_a]:text-signal [&_a]:underline [&_a]:underline-offset-[3px] [&_li]:leading-[1.8] [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

/** 가로 스크롤 가능한 고지용 표. */
export function LegalTable({
  head,
  rows,
}: {
  head: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="mx-1 w-full min-w-[34rem] border-collapse text-[0.82rem] leading-[1.6]">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="border border-line bg-panel px-3 py-2 text-left font-semibold text-ink"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border border-line px-3 py-2 align-top text-ink-soft"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 사업자 정보·리전·시행일 등 아직 확정되지 않은 값을 눈에 띄게 표시한다. */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-[3px] bg-danger/[0.12] px-1 py-0.5 text-[0.9em] font-medium text-danger">
      [{children}]
    </mark>
  );
}
