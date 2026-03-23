"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { clearStoredUsername, getStoredUsername } from "@/lib/storage";

export default function DashboardPage() {
  const router = useRouter();
  const username = useMemo(() => getStoredUsername(), []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-zinc-50 px-4 py-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-900">Home Assist</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Xin chao, <span className="font-medium text-zinc-900">{username ?? "Ban"}</span>.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
        <h2 className="text-base font-semibold text-zinc-900">PHASE_1 completed</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Firebase va Firestore da duoc cau hinh san sang cho cac phase tiep theo.
        </p>
      </section>

      <button
        type="button"
        onClick={() => {
          clearStoredUsername();
          router.replace("/login");
        }}
        className="mt-auto rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
      >
        Dang xuat
      </button>
    </main>
  );
}
