"use client";

import { useEffect, useState } from "react";
import { SpinLog } from "@/types/firestore";
import { subscribeSpinLogs } from "@/services/daily-plan-service";

export function useSpinLogs(dateKey: string) {
  const [logs, setLogs] = useState<SpinLog[]>([]);

  useEffect(() => {
    if (!dateKey) {
      return;
    }

    const unsubscribe = subscribeSpinLogs(dateKey, setLogs);
    return unsubscribe;
  }, [dateKey]);

  return logs;
}
