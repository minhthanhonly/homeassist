"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoredUsername } from "@/hooks/use-stored-username";

type RouteGuardProps = {
  children: ReactNode;
};

export function RouteGuard({ children }: RouteGuardProps) {
  const router = useRouter();
  const username = useStoredUsername();
  const hasUser = Boolean(username);

  useEffect(() => {
    if (!hasUser) {
      router.replace("/login");
    }
  }, [hasUser, router]);

  if (!hasUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <p className="text-sm text-zinc-600">Dang chuyen huong den trang dang nhap...</p>
      </div>
    );
  }

  return <>{children}</>;
}
