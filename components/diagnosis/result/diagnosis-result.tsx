"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { ResultView, type ResultViewState } from "./result-view";
import type { DiagnosisApiResult } from "@/lib/diagnosisResult";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 60; // 3분
const MAX_CONSECUTIVE_ERRORS = 5;

type PollResponse =
  | { status: "PROCESSING" }
  | { status: "FAILED" }
  | { status: "COMPLETED"; result: DiagnosisApiResult };

export function DiagnosisResult({ diagnosisId }: { diagnosisId: string }) {
  const [view, setView] = useState<ResultViewState>({ kind: "polling" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let attempts = 0;
    let consecutiveErrors = 0;
    let stopped = false;

    // 테스트 편의: 비프로덕션에서만 폴링 파라미터 축소 허용
    let intervalMs = POLL_INTERVAL_MS;
    let maxAttempts = POLL_MAX_ATTEMPTS;
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search);
      const p = Number(q.get("_test_pollMs"));
      const m = Number(q.get("_test_maxAttempts"));
      if (Number.isFinite(p) && p >= 50) intervalMs = p;
      if (Number.isFinite(m) && m >= 1) maxAttempts = m;
    }

    const stop = () => {
      stopped = true;
      clearInterval(timer);
    };

    const poll = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/diagnoses/${diagnosisId}`, { cache: "no-store" });
        if (res.status === 404) {
          stop();
          setView({ kind: "error" });
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PollResponse;
        consecutiveErrors = 0;
        if (json.status === "COMPLETED") {
          stop();
          setView({ kind: "completed", result: json.result });
          track("diagnosis_result_view");
          return;
        }
        if (json.status === "FAILED") {
          stop();
          setView({ kind: "failed" });
          return;
        }
        if (attempts >= maxAttempts) {
          stop();
          setView({ kind: "timeout" });
        }
      } catch {
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          stop();
          setView({ kind: "error" });
        }
      }
    };

    const timer = setInterval(() => void poll(), intervalMs);
    void poll(); // 즉시 1회 — 이미 COMPLETED면 스피너가 안 보인다
    return stop;
  }, [diagnosisId, nonce]);

  return (
    <ResultView
      view={view}
      diagnosisId={diagnosisId}
      onRetry={() => {
        setView({ kind: "polling" });
        setNonce((n) => n + 1);
      }}
    />
  );
}
