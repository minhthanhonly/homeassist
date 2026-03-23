"use client";

import { useEffect, useState } from "react";
import {
  defaultAppConfig,
  ensureAppConfigInitialized,
  subscribeAppConfig,
} from "@/services/app-config-service";
import { AppConfig } from "@/types/firestore";

export function useAppConfig() {
  const [appConfig, setAppConfig] = useState<AppConfig>(defaultAppConfig);

  useEffect(() => {
    void ensureAppConfigInitialized();
    const unsubscribe = subscribeAppConfig(setAppConfig);
    return unsubscribe;
  }, []);

  return appConfig;
}
