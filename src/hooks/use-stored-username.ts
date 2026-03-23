"use client";

import { useSyncExternalStore } from "react";
import { getStoredUsername } from "@/lib/storage";

function subscribe(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getSnapshot(): string | null {
  return getStoredUsername();
}

function getServerSnapshot(): null {
  return null;
}

export function useStoredUsername() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
