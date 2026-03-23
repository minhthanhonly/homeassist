"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUsername, setStoredUsername } from "@/lib/storage";

export function LoginForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = getStoredUsername();

    if (existing) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = name.trim();

    if (!normalized) {
      setError("Vui long nhap ten de tiep tuc.");
      return;
    }

    setStoredUsername(normalized);
    router.replace("/dashboard");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"
    >
      <h1 className="text-xl font-semibold text-zinc-900">Home Assist</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Nhap ten de bat dau quan ly cong viec gia dinh.
      </p>

      <label htmlFor="username" className="mt-4 block text-sm font-medium text-zinc-700">
        Ten cua ban
      </label>
      <input
        id="username"
        type="text"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setError("");
        }}
        placeholder="Vi du: Thanh"
        className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-indigo-200 placeholder:text-zinc-400 focus:ring-2"
      />

      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
      >
        Vao ung dung
      </button>
    </form>
  );
}
