import { STORAGE_USERNAME_KEY } from "@/lib/constants";

const isBrowser = typeof window !== "undefined";

export function getStoredUsername(): string | null {
  if (!isBrowser) {
    return null;
  }

  const value = window.localStorage.getItem(STORAGE_USERNAME_KEY)?.trim();
  return value ? value : null;
}

export function setStoredUsername(username: string): void {
  if (!isBrowser) {
    return;
  }

  window.localStorage.setItem(STORAGE_USERNAME_KEY, username.trim());
}

export function clearStoredUsername(): void {
  if (!isBrowser) {
    return;
  }

  window.localStorage.removeItem(STORAGE_USERNAME_KEY);
}
