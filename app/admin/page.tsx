import Link from "next/link";
import { createSessionClient } from "@/lib/supabase/session-client";
import { StatusBadge } from "@/components/admin/status-badge";
import { cn } from "@/lib/utils";

const FILTERS = {
  all: { label: "전체", statuses: null as string[] | null },
  new: { label: "신규", statuses: ["NEW"] },
  active: { label: "진행중", statuses: ["CONTACT_PENDING", "SCHEDULED", "PROPOSAL_SENT"] },
  closed: { label: "종결", statuses: ["CONTRACTED", "ON_HOLD", "CLOSED"] },
} as const;
type FilterKey = keyof typeof FILTERS;

type Row = {
  id: string;
  status: string;
  consultation_type: string | null;
  preferred_date: string | null;
  suggested_service_type: string | null;
  created_at: string;
  leads: { company_name: string } | null;
};

function todayStartIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filter: FilterKey = sp.filter && sp.filter in FILTERS ? (sp.filter as FilterKey) : "all";

  const supabase = await createSessionClient();

  let query = supabase
    .from("consultations")
    .select("id,status,consultation_type,preferred_date,suggested_service_type,created_at,leads(company_name)")
    .order("created_at", { ascending: false });
  const statuses = FILTERS[filter].statuses;
  if (statuses) query = query.in("status", statuses);

  const [{ data: rows, error }, todayDiag, newCount] = await Promise.all([
    query,
    supabase.from("diagnoses").select("id", { count: "exact", head: true }).gte("created_at", todayStartIso()),
    supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "NEW"),
  ]);

  if (error) {
    return <p className="text-[0.9rem] text-danger">데이터를 불러오지 못했습니다.</p>;
  }

  const list = ((rows ?? []) as unknown[]).map((raw): Row => {
    const r = raw as Omit<Row, "leads"> & {
      leads: { company_name: string } | { company_name: string }[] | null;
    };
    return { ...r, leads: Array.isArray(r.leads) ? (r.leads[0] ?? null) : r.leads };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[1.3rem] font-extrabold tracking-tight text-ink">상담</h1>
        <p className="mt-1 text-[0.8rem] text-ink-soft">
          오늘 접수된 진단 {todayDiag.count ?? 0}건 · 미착수 상담 {newCount.count ?? 0}건
        </p>
      </div>

      <nav className="flex gap-1 text-[0.8rem]">
        {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
          <Link
            key={k}
            href={k === "all" ? "/admin" : `/admin?filter=${k}`}
            className={cn(
              "min-h-9 rounded-md px-3 py-1.5 transition-colors motion-reduce:transition-none",
              k === filter ? "bg-signal text-white" : "text-ink-soft hover:bg-panel hover:text-ink",
            )}
          >
            {FILTERS[k].label}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <p className="text-[0.9rem] text-ink-soft">해당하는 상담이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-[0.85rem]">
            <thead>
              <tr className="border-b border-line text-left text-[0.75rem] text-ink-soft">
                <th className="py-2 pr-3 font-medium">상태</th>
                <th className="py-2 pr-3 font-medium">회사</th>
                <th className="py-2 pr-3 font-medium">상담 방식 / 희망 시기</th>
                <th className="py-2 pr-3 font-medium">추정 서비스</th>
                <th className="py-2 font-medium">접수일</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-line hover:bg-panel">
                  <td className="py-2.5 pr-3">
                    <Link href={`/admin/consultations/${r.id}`} className="block">
                      <StatusBadge kind="consultation" value={r.status} />
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/admin/consultations/${r.id}`} className="block text-ink hover:text-signal">
                      {r.leads?.company_name ?? "—"}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-ink-soft">
                    {(r.consultation_type ?? "—") + " / " + (r.preferred_date ?? "—")}
                  </td>
                  <td className="py-2.5 pr-3 text-ink-soft">{r.suggested_service_type ?? "—"}</td>
                  <td className="py-2.5 text-ink-soft">{r.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
