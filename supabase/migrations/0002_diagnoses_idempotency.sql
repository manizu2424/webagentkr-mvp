-- WEBAGENT.KR — diagnoses 멱등성 키 (결함 #13)
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣어 1회 실행 (0001 이후)
--
-- POST /api/diagnoses 는 폼이 마운트 시 만든 UUID(idempotencyKey)를 함께 받는다.
-- 더블클릭 / 네트워크 재시도로 같은 제출이 두 번 와도 leads·diagnoses 행과
-- n8n 호출이 한 번만 일어나게 한다. 재제출 시 라우트는 기존 diagnoses.id 를 반환한다.
--
-- 적용 확인: select column_name from information_schema.columns where table_name='diagnoses' and column_name='idempotency_key';

alter table diagnoses add column idempotency_key uuid;

-- 부분 유니크: 관리자/향후 생성 행(키 없음)은 서로 충돌하지 않는다.
create unique index diagnoses_idempotency_key_key
  on diagnoses (idempotency_key)
  where idempotency_key is not null;
