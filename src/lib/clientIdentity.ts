import { HOST_PRODUCT_KEY } from "@/config/hostProduct";

const BROWSER_CLIENT_ID_KEY = `${HOST_PRODUCT_KEY}.browserClientId`;

const generateId = (): string => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fallback below
  }
  return `cid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export const getBrowserClientId = (): string => {
  try {
    const existing = localStorage.getItem(BROWSER_CLIENT_ID_KEY);
    if (existing && existing.trim()) return existing;
    const created = generateId();
    localStorage.setItem(BROWSER_CLIENT_ID_KEY, created);
    return created;
  } catch {
    return generateId();
  }
};
