import type { Metadata } from "next";
import {
  LegalShell,
  LegalSection,
  LegalTable,
  Placeholder,
} from "@/components/marketing/legal/shell";
import { pageMetadata } from "@/lib/siteMeta";

export const metadata: Metadata = pageMetadata({
  title: "개인정보처리방침",
  description:
    "WEBAGENT.KR이 무료 자동화 진단·상담 과정에서 수집하는 개인정보의 처리 방침입니다.",
  path: "/privacy",
});

// 개인정보처리방침 초안 — 기획서 §16.1 / CLAUDE.md 결함 #15(국외 이전 고지) 해소.
// 실제 인프라 기준으로 위탁·국외이전을 명시한다. 전문가 검토 전 초안(묶음 C).
export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="LEGAL / PRIVACY"
      title="개인정보처리방침"
      effectiveDate={<Placeholder>시행일 확정 필요</Placeholder>}
    >
      <LegalSection heading="1. 총칙">
        <p>
          WEBAGENT.KR(이하 &ldquo;회사&rdquo;)은 「개인정보 보호법」 등 관련 법령을
          준수하며, 이용자의 개인정보를 보호하기 위해 본 개인정보처리방침을
          수립·공개합니다. 회사는 무료 자동화 진단 및 상담 신청 과정에서 목적에
          필요한 최소한의 개인정보만을 수집합니다.
        </p>
      </LegalSection>

      <LegalSection heading="2. 수집하는 개인정보 항목 및 수집 방법">
        <LegalTable
          head={["구분", "항목", "수집 시점"]}
          rows={[
            ["필수", "이름, 휴대폰 번호, 이메일 주소", "무료 진단 신청, 상담 신청 시"],
            [
              "자동 생성",
              "접속 IP 주소, 접속 일시, 요청 헤더 (중복·악용 방지 목적)",
              "서비스 이용 시",
            ],
            [
              "선택",
              "회사명, 업종, 직원 수, 사용 도구, 반복 업무, 업무량, 도입 목적, 예산 범위 등 진단 입력값",
              "무료 진단·상담 신청 시",
            ],
          ]}
        />
        <p>
          수집 방법: 이용자가 웹사이트의 진단 폼·상담 폼에 직접 입력합니다.
        </p>
        <p>
          &ldquo;문제·불편 사항&rdquo; 등 자유 입력란에 이용자가 개인정보를
          입력하는 경우 해당 정보도 함께 저장될 수 있으므로, 자유 입력란에는 개인
          식별정보를 입력하지 않도록 안내합니다.
        </p>
      </LegalSection>

      <LegalSection heading="3. 개인정보의 처리 목적">
        <ul className="list-disc pl-5">
          <li>무료 자동화 진단 결과 생성 및 안내</li>
          <li>상담 신청 접수, 상담 진행 및 제안서 발송</li>
          <li>서비스 부정 이용(스팸·중복 제출 등) 방지</li>
          <li>문의 응대 및 분쟁 처리</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. 개인정보의 보유 및 이용 기간">
        <ul className="list-disc pl-5">
          <li>
            진단·상담 관련 개인정보: 수집일로부터{" "}
            <Placeholder>보유기간 확정 필요</Placeholder> 또는 이용자의 삭제 요청
            시까지
          </li>
          <li>자동 생성 정보(IP 등): <Placeholder>보유기간 확정 필요</Placeholder></li>
          <li>
            관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
            <ul className="mt-1 list-disc pl-5">
              <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
              <li>소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
            </ul>
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. 개인정보의 제3자 제공">
        <p>
          회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에
          근거가 있거나 수사기관의 적법한 요청이 있는 경우는 예외로 합니다.
        </p>
      </LegalSection>

      <LegalSection heading="6. 개인정보 처리의 위탁">
        <p>
          회사는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고
          있으며, 위탁계약 시 개인정보가 안전하게 관리되도록 관련 사항을 규정하고
          감독합니다.
        </p>
        <LegalTable
          head={["수탁자", "위탁 업무 내용"]}
          rows={[
            ["Supabase, Inc.", "데이터베이스 호스팅 및 데이터 저장"],
            ["Contabo GmbH", "애플리케이션 서버 및 자동화(n8n) 서버 호스팅"],
            ["OpenAI, L.L.C.", "진단 입력값에 대한 AI 분석 처리"],
            ["Telegram FZ-LLC", "진단·상담 접수 관리자 알림 발송"],
            ["Google LLC", "웹사이트 이용 통계 분석 (이용자가 분석 쿠키에 동의한 경우)"],
            [
              "Microsoft Corporation",
              "웹사이트 사용성 분석 — 세션 리플레이·히트맵 (이용자가 분석 쿠키에 동의한 경우)",
            ],
          ]}
        />
      </LegalSection>

      <LegalSection heading="7. 개인정보의 국외 이전">
        <p>
          회사가 이용하는 인프라는 국외에 위치하며, 서비스 제공을 위해 아래와 같이
          개인정보가 국외로 이전됩니다.
        </p>
        <LegalTable
          head={[
            "이전받는 자",
            "이전 국가",
            "이전 일시 및 방법",
            "이전 항목",
            "이용 목적",
            "보유·이용 기간",
          ]}
          rows={[
            [
              "Supabase, Inc.",
              <>
                미국 · <Placeholder>리전 확정 필요</Placeholder>
              </>,
              "서비스 이용 시 정보통신망을 통해 수시 이전",
              "이름, 휴대폰 번호, 이메일, 진단·상담 입력값",
              "데이터 저장·조회",
              "위 제4조에 따름",
            ],
            [
              "Contabo GmbH",
              "독일",
              "서비스 이용 시 정보통신망을 통해 수시 이전",
              "접속 정보, 자유 입력란에 포함된 정보(있는 경우)",
              "애플리케이션·자동화 서버 운영",
              "위 제4조에 따름",
            ],
            [
              "OpenAI, L.L.C.",
              "미국",
              "진단 신청 시 정보통신망을 통해 이전",
              <>
                업종, 직원 수, 사용 도구, 반복 업무, 업무량, 도입 목적, 예산 등
                업무 데이터
                <br />
                <strong>
                  (이름·휴대폰·이메일 등 식별정보는 이전하지 않습니다)
                </strong>
              </>,
              "AI 분석 결과 생성",
              "요청 처리 시에만 사용하며 별도 저장하지 않음 (OpenAI API 정책에 따라 최대 30일 이내 파기)",
            ],
            [
              "Telegram FZ-LLC",
              "서버 소재지 미공개 (본사: 아랍에미리트)",
              "진단·상담 접수 시 정보통신망을 통해 이전",
              <>
                회사명, 진단 번호, 상담 요약
                <br />
                <strong>(이름·휴대폰·이메일은 포함하지 않습니다)</strong>
              </>,
              "관리자 실시간 알림",
              "알림 확인 후 회사 정책에 따라 삭제",
            ],
            [
              "Google LLC",
              "미국",
              "이용자가 분석 쿠키 사용에 동의한 경우 이전",
              "쿠키 식별자, 페이지 조회 등 비식별 이용 기록",
              "웹사이트 이용 통계 분석",
              "Google 정책에 따름",
            ],
            [
              "Microsoft Corporation",
              "미국",
              "이용자가 분석 쿠키 사용에 동의한 경우 이전",
              "쿠키 식별자, 페이지 상호작용(클릭·스크롤·마우스 이동 등) 기록",
              "웹사이트 사용성 분석 (세션 리플레이·히트맵)",
              "Microsoft 정책에 따름",
            ],
          ]}
        />
        <p>
          이용자는 개인정보의 국외 이전을 거부할 수 있습니다. 다만 필수 항목의
          국외 이전을 거부하는 경우 무료 진단·상담 등 서비스 이용이 제한될 수
          있습니다. (분석 쿠키는 거부하여도 서비스 이용에 제한이 없습니다.)
        </p>
      </LegalSection>

      <LegalSection heading="8. 정보주체의 권리·의무 및 행사 방법">
        <p>
          이용자는 언제든지 개인정보의 열람·정정·삭제·처리정지를 요청할 수
          있습니다. 요청은 아래 개인정보 보호책임자에게 이메일로 접수하며, 회사는
          지체 없이 필요한 조치를 취합니다.
        </p>
      </LegalSection>

      <LegalSection heading="9. 개인정보의 파기">
        <p>
          보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이
          파기합니다. 전자적 파일 형태의 정보는 복구할 수 없는 방법으로 삭제하며,
          출력물은 분쇄 또는 소각합니다.
        </p>
      </LegalSection>

      <LegalSection heading="10. 개인정보의 안전성 확보 조치">
        <ul className="list-disc pl-5">
          <li>
            데이터베이스 행 수준 보안(RLS) 적용, 일반 접근 권한에는 조회·수정
            권한을 부여하지 않음
          </li>
          <li>
            상위 권한 키(service-role)는 서버 환경에만 보관하고 클라이언트에
            노출하지 않음
          </li>
          <li>전 구간 전송 암호화(HTTPS/TLS)</li>
          <li>접근 권한 최소화 및 관리자 계정 2단계 인증</li>
          <li>데이터베이스 정기 백업 및 복구 절차 유지</li>
          <li>
            AI 분석 시 이름·휴대폰·이메일 등 식별정보를 제외하고 업무 데이터만
            전송
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="11. 쿠키 등 자동 수집 장치의 운영">
        <ul className="list-disc pl-5">
          <li>회사는 서비스 운영에 필수적인 쿠키를 사용하지 않습니다.</li>
          <li>
            웹사이트 이용 통계 및 사용성 분석을 위해 Google Analytics 4와
            Microsoft Clarity를 사용하며, 이는 이용자가 분석 쿠키 사용에 동의한
            경우에만 로드됩니다. 동의를 거부하면 분석 스크립트가 실행되지 않으며,
            이용자는 페이지 하단 “쿠키 설정”에서 언제든 동의를 철회할 수 있습니다.
          </li>
          <li>이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="12. 개인정보 보호책임자">
        <ul className="list-disc pl-5">
          <li>성명: <Placeholder>확정 필요</Placeholder></li>
          <li>직책: <Placeholder>확정 필요</Placeholder></li>
          <li>이메일: <Placeholder>확정 필요</Placeholder></li>
        </ul>
        <p>
          이용자는 서비스 이용 중 발생하는 개인정보 관련 문의를 보호책임자에게 할
          수 있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="13. 고지의 의무">
        <p>
          본 개인정보처리방침의 내용에 추가·삭제·수정이 있을 경우, 시행 최소 7일
          전부터 웹사이트 공지를 통해 고지합니다.
        </p>
        <ul className="list-disc pl-5">
          <li>공고일자: <Placeholder>확정 필요</Placeholder></li>
          <li>시행일자: <Placeholder>확정 필요</Placeholder></li>
        </ul>
      </LegalSection>
    </LegalShell>
  );
}
