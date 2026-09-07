import "server-only";

/**
 * Telegram 알림. TELEGRAM_BOT_TOKEN 또는 대상 chat id 가 없으면 조용히 no-op + warn.
 * 라운드 2는 진단 실패 알림에만 쓴다(성공 "신규 진단" 알림은 n8n 담당 — Phase 2).
 * 호출부는 반드시 await ...catch 로 감싸 실패가 응답을 막지 않게 한다.
 */
export async function sendTelegram(text: string, chatId?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const target = chatId ?? process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !target) {
    console.warn("[telegram] 미설정 — 알림 skip:", text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: target, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error("[telegram] sendMessage 실패:", res.status, await res.text());
  }
}
