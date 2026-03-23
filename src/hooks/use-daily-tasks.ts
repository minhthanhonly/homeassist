"use client";

import { useEffect, useState } from "react";
import { DailyTask } from "@/types/firestore";
import { subscribeDailyTasks } from "@/services/daily-plan-service";

export function useDailyTasks(dateKey: string) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);

  useEffect(() => {
    if (!dateKey) {
      return;
    }

    const unsubscribe = subscribeDailyTasks(dateKey, setTasks);
    return unsubscribe;
  }, [dateKey]);

  return tasks;
}
