"use client";

import { useEffect, useState } from "react";
import { PlanHistoryLog } from "@/types/firestore";
import { subscribePlanHistory } from "@/services/daily-plan-service";

export function usePlanHistory(dateKey: string) {
  const [logs, setLogs] = useState<PlanHistoryLog[]>([]);

  useEffect(() => {
    if (!dateKey) {
      return;
    }

    const unsubscribe = subscribePlanHistory(dateKey, setLogs);
    return unsubscribe;
  }, [dateKey]);

  return logs;
}
