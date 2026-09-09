import "server-only";

/**
 * Telegram 알림. TELEGRAM_BOT_TOKEN 또는 대상 chat id 가 없으면 조용히 no-op + warn.
 * 라운드 2는 진단 실패 알림에만 쓴다(성공 "신규 진단" 알림은 n8n 담당 — Phase 2).
 * 호출부는 fire-and-forget(응답을 막지 않음). 이 함수는 **스스로 throw 하지 않는다** —
 * 네트워크 오류·타임아웃도 여기서 잡아 로그만 남긴다. (호출부 `.catch(() => {})` 가
 * 삼키는 바람에 전송 실패가 로그에 전혀 안 남던 문제 — 실 DB 검증 중 발견.)
 */
export async function sendTelegram(text: string, chatId?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const target = chatId ?? process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !target) {
    console.warn("[telegram] 미설정 — 알림 skip:", text);
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: target, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[telegram] sendMessage 실패:", res.status, await res.text());
    }
  } catch (e) {
    // fetch 실패(DNS·라우팅·TLS·타임아웃) — 알림은 유실되지만 요청 흐름은 계속.
    console.error(
      "[telegram] sendMessage 네트워크 오류:",
      e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    );
  }
}
