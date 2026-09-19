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
  title: { fontSize: 22, fontWeight: 700, marginTop: 6, lineHeight: 1.5 },
  meta: { fontSize: 9, color: SOFT, marginTop: 8 },
  rule: { borderTopWidth: 2, borderTopColor: INK, marginTop: 14 },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 12 },
  score: { fontSize: 40, fontWeight: 700, color: SIGNAL, lineHeight: 1.25 },
  scoreOf: { fontSize: 12, color: SOFT, marginLeft: 4, marginBottom: 4 },
  label: { fontSize: 9, color: SOFT, marginTop: 6 },
  section: { marginTop: 14 },
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
            <Text style={s.h2} minPresenceAhead={40}>요약</Text>
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
