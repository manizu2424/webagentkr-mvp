import type { Metadata } from "next";
import {
  LegalShell,
  LegalSection,
  Placeholder,
} from "@/components/marketing/legal/shell";
import { pageMetadata } from "@/lib/siteMeta";

export const metadata: Metadata = pageMetadata({
  title: "이용약관",
  description:
    "WEBAGENT.KR 웹사이트 및 자동화 진단·상담 서비스의 이용약관입니다.",
  path: "/terms",
});

// 이용약관 초안 — 기획서 §16.2 / CLAUDE.md 결함 #14(약관 부재) 해소.
// 기획서 §0 원칙 4: AI 결과는 추정치이며 보장이 아님을 약관에 명시한다. 전문가 검토 전 초안(묶음 C).
export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="LEGAL / TERMS"
      title="이용약관"
      effectiveDate={<Placeholder>시행일 확정 필요</Placeholder>}
    >
      <LegalSection heading="제1조 (목적)">
        <p>
          본 약관은 WEBAGENT.KR(이하 &ldquo;회사&rdquo;)이 제공하는 웹사이트 및
          자동화 진단·상담 관련 서비스(이하 &ldquo;서비스&rdquo;)의 이용 조건과
          절차, 회사와 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
        </p>
      </LegalSection>

      <LegalSection heading="제2조 (정의)">
        <ol className="list-decimal pl-5">
          <li>
            &ldquo;서비스&rdquo;란 회사가 웹사이트를 통해 제공하는 무료 자동화
            진단, AI 분석 결과 제공, 상담 신청 접수 등 일체의 서비스를 말합니다.
          </li>
          <li>
            &ldquo;이용자&rdquo;란 본 약관에 따라 회사가 제공하는 서비스를
            이용하는 자를 말합니다.
          </li>
          <li>
            &ldquo;AI 분석 결과&rdquo;란 이용자가 입력한 정보를 바탕으로 AI가
            생성한 자동화 준비도, 우선 개선 업무, 예상 절감 시간 등의 추정 정보를
            말합니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="제3조 (약관의 효력 및 변경)">
        <ol className="list-decimal pl-5">
          <li>본 약관은 웹사이트에 게시함으로써 효력이 발생합니다.</li>
          <li>
            회사는 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며,
            변경 시 시행일 및 사유를 명시하여 시행일 최소 7일 전(이용자에게 불리한
            변경은 30일 전)부터 웹사이트에 공지합니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="제4조 (서비스의 제공)">
        <ol className="list-decimal pl-5">
          <li>
            회사는 무료 자동화 진단, AI 분석 결과 제공, 전문가 상담 신청 접수 및
            제안 서비스를 제공합니다.
          </li>
          <li>무료 진단 및 AI 분석 결과는 무료로 제공됩니다.</li>
          <li>
            <strong>
              AI 분석 결과에 포함된 수치(자동화 준비도, 예상 절감 시간 등)는
              이용자가 입력한 정보에 기반한 추정치이며, 특정한 성과나 효과를
              보장하지 않습니다.
            </strong>
          </li>
          <li>
            회사가 데모로 제공하는 사례는 &ldquo;자동화 데모&rdquo; 또는
            &ldquo;샘플 구축 사례&rdquo;로 표시하며, 이는 실제 고객 사례가 아닐 수
            있습니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="제5조 (이용자의 의무)">
        <ol className="list-decimal pl-5">
          <li>이용자는 신청 시 정확한 정보를 제공해야 합니다.</li>
          <li>
            이용자는 타인의 개인정보를 무단으로 입력하거나, 자동화된 대량 요청·허위
            제출 등 서비스의 정상적인 운영을 방해하는 행위를 해서는 안 됩니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="제6조 (서비스 이용의 제한)">
        <p>
          회사는 이용자가 본 약관을 위반하거나 서비스의 정상적인 운영을 방해한
          경우, 사전 통지 없이 서비스 이용을 제한하거나 관련 데이터를 삭제할 수
          있습니다.
        </p>
      </LegalSection>

      <LegalSection heading="제7조 (면책)">
        <ol className="list-decimal pl-5">
          <li>
            회사는 AI 분석 결과의 정확성·완전성·특정 목적에의 적합성을 보장하지
            않습니다. AI 분석 결과는 참고 자료이며, 이를 바탕으로 한 의사결정 및 그
            결과에 대한 책임은 이용자에게 있습니다.
          </li>
          <li>
            회사는 무료로 제공되는 서비스와 관련하여 관련 법령이 허용하는 최대
            범위에서 손해배상 책임을 부담하지 않습니다.
          </li>
          <li>
            회사는 천재지변, 제3자 서비스(호스팅·AI·메신저 등)의 장애, 이용자의
            귀책 사유로 인한 서비스 중단·오류에 대해 책임을 지지 않습니다.
          </li>
          <li>
            회사는 이용자가 서비스를 통해 얻은 정보로 인해 발생한 손해에 대해
            책임을 지지 않습니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="제8조 (지식재산권)">
        <ol className="list-decimal pl-5">
          <li>
            웹사이트 및 서비스에 포함된 콘텐츠·디자인·상표에 대한 권리는 회사에
            귀속됩니다.
          </li>
          <li>
            이용자는 자신의 AI 분석 결과를 자유롭게 이용할 수 있으나, 회사의
            명시적 동의 없이 서비스 자체를 복제·재판매할 수 없습니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="제9조 (준거법 및 관할)">
        <ol className="list-decimal pl-5">
          <li>본 약관은 대한민국 법령에 따라 해석됩니다.</li>
          <li>
            서비스 이용과 관련하여 회사와 이용자 사이에 분쟁이 발생한 경우, 관할
            법원은 <Placeholder>확정 필요</Placeholder> 로 합니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="제10조 (문의처)">
        <p>
          서비스 및 본 약관에 관한 문의: <Placeholder>확정 필요</Placeholder>{" "}
          (이메일)
        </p>
      </LegalSection>

      <LegalSection heading="부칙">
        <p>
          본 약관은 <Placeholder>시행일 확정 필요</Placeholder> 부터 시행합니다.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
