"use client";

import { useEffect, useState } from "react";
import { ReminderItem } from "@/types/firestore";
import { subscribeReminders } from "@/services/reminders-service";

export function useReminders() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeReminders(setReminders);
    return unsubscribe;
  }, []);

  return reminders;
}
