"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: authError } = await createBrowserSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (authError) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5">
      <form onSubmit={onSubmit} className="w-full max-w-[22rem] rounded-lg border border-line bg-panel p-6">
        <h1 className="text-[1.1rem] font-extrabold tracking-tight text-ink">관리자 로그인</h1>
        <label className="mt-5 block text-[0.85rem] text-ink-soft">
          이메일
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-[0.95rem] text-ink outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          />
        </label>
        <label className="mt-4 block text-[0.85rem] text-ink-soft">
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-[0.95rem] text-ink outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          />
        </label>
        {error && (
          <p className="mt-4 border-l-2 border-danger bg-danger/[0.05] px-3 py-2 text-[0.85rem] text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-5 min-h-11 w-full rounded-md bg-signal px-4 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-60 motion-reduce:transition-none"
        >
          {submitting ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
