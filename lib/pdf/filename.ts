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
