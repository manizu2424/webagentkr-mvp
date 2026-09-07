// 화면 밖 숨김 입력. display:none 은 일부 봇이 걸러내므로 쓰지 않는다 (기술 스펙 §5).
// 제어 컴포넌트: wizard 상태(hp_field)에 값을 담아 제출 시 서버로 실제 전송한다.
export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", top: "auto" }}
    >
      <label htmlFor="hp_field">이 칸은 비워 두세요</label>
      <input
        id="hp_field"
        name="hp_field"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
