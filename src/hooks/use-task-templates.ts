"use client";

import { useEffect, useState } from "react";
import { TaskTemplate } from "@/types/firestore";
import { subscribeTaskTemplates } from "@/services/task-templates-service";

export function useTaskTemplates() {
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeTaskTemplates(setTaskTemplates);
    return unsubscribe;
  }, []);

  return taskTemplates;
}
