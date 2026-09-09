"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSessionClient } from "@/lib/supabase/session-client";

const STATUS = [
  "NEW",
  "CONTACT_PENDING",
  "SCHEDULED",
  "PROPOSAL_SENT",
  "CONTRACTED",
  "ON_HOLD",
  "CLOSED",
] as const;

type ActionResult = { ok: true } | { error: string };

export async function updateConsultationStatus(id: string, next: string): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), next: z.enum(STATUS) }).safeParse({ id, next });
  if (!parsed.success) return { error: "잘못된 요청입니다." };

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "세션이 만료되었습니다. 다시 로그인해 주세요." };

  const { data, error } = await supabase
    .from("consultations")
    .update({ status: parsed.data.next })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[admin] status update 실패:", error.code, error.message);
    return { error: "상태 변경에 실패했습니다." };
  }
  if (!data) return { error: "저장 대상을 찾지 못했습니다." };
  revalidatePath(`/admin/consultations/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateConsultationMemo(id: string, memo: string): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid(), memo: z.string().max(5000) }).safeParse({ id, memo });
  if (!parsed.success) return { error: "메모가 너무 깁니다." };

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "세션이 만료되었습니다. 다시 로그인해 주세요." };

  const { data, error } = await supabase
    .from("consultations")
    .update({ memo: parsed.data.memo })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[admin] memo update 실패:", error.code, error.message);
    return { error: "메모 저장에 실패했습니다." };
  }
  if (!data) return { error: "저장 대상을 찾지 못했습니다." };
  revalidatePath(`/admin/consultations/${id}`);
  return { ok: true };
}
