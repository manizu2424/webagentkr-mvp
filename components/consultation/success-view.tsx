import Link from "next/link";

export function ConsultationSuccessView() {
  return (
    <div className="mx-auto w-full max-w-[36rem] px-5 py-10 sm:py-14">
      <div className="border-t-2 border-ink pt-3">
        <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          상담 신청이 접수되었습니다
        </h1>
      </div>
      <p className="mt-6 max-w-[34rem] text-[0.95rem] leading-[1.75] text-ink-soft">
        {/* TODO 문구 확정 (묶음 C) */}
        담당자가 확인 후 영업일 기준 1~2일 내에 입력하신 연락처로 연락드립니다.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-5 py-3 text-[0.95rem] leading-none font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
      >
        홈으로
      </Link>
    </div>
  );
}
