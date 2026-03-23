"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUsername } from "@/lib/storage";

type RouteGuardProps = {
  children: ReactNode;
};

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const [hasUser] = useState(() => Boolean(getStoredUsername()));

  useEffect(() => {
    if (!hasUser) {
      router.replace("/login");
    }
  }, [hasUser, router]);

  if (!hasUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <p className="text-sm text-zinc-600">Dang kiem tra phien dang nhap...</p>
      </div>
    );
  }

  return <>{children}</>;
}
