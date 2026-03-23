"use client";

import { useEffect, useState } from "react";
import { subscribeDailyPlanExists } from "@/services/daily-plan-service";

export function useDailyPlanExists(dateKey: string) {
  const [exists, setExists] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeDailyPlanExists(dateKey, setExists);
    return unsubscribe;
  }, [dateKey]);

  return exists;
}
