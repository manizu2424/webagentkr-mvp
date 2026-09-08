import Link from "next/link";

// 폼(diagnosis-wizard)의 제출 오류 블록과 같은 시각 언어 — 좌측 danger 규칙 + 옅은 틴트.
// 버튼은 랜딩 CtaLink primary 와 동일한 형태.
// variant:
//   transient — 폴링 중 네트워크/서버 오류(연속 5회). "다시 시도" 가 의미 있다.
//   notfound  — GET 이 404(존재하지 않는 진단 번호). 재시도해도 계속 404 이므로
//               새 진단으로 안내한다.
const H1 =
  "text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]";
const BODY =
  "mt-6 max-w-[34rem] border-l-2 border-danger bg-danger/[0.05] px-4 py-3.5 text-[0.92rem] leading-[1.75] text-danger";
const ACTION =
  "mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-5 py-3 text-[0.95rem] leading-none font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none";

export function ErrorView({
  variant = "transient",
  onRetry,
}: {
  variant?: "transient" | "notfound";
  onRetry?: () => void;
}) {
  if (variant === "notfound") {
    return (
      <div className="mt-8">
        <div className="border-t-2 border-ink pt-3">
          <h1 className={H1}>진단을 찾을 수 없습니다</h1>
        </div>
        <p className={BODY}>
          존재하지 않는 진단 번호입니다. 주소를 다시 확인하시거나 진단을 새로 시작해 주세요.
        </p>
        <Link href="/diagnosis" className={ACTION}>
          진단 새로 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="border-t-2 border-ink pt-3">
        <h1 className={H1}>결과를 불러오지 못했습니다</h1>
      </div>
      <p className={BODY}>일시적인 문제일 수 있습니다. 잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={onRetry} className={ACTION}>
        다시 시도
      </button>
    </div>
  );
}
