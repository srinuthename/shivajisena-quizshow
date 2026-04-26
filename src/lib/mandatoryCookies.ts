const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export const setMandatoryCookie = (name: string, value: string): void => {
  if (typeof document === "undefined") return;
  const safeValue = encodeURIComponent(value ?? "");
  document.cookie = `${name}=${safeValue}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
};

export const getMandatoryCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const key = `${name}=`;
  const cookies = document.cookie.split(";");
  for (const cookieRaw of cookies) {
    const cookie = cookieRaw.trim();
    if (cookie.startsWith(key)) {
      try {
        return decodeURIComponent(cookie.slice(key.length));
      } catch {
        return cookie.slice(key.length);
      }
    }
  }
  return null;
};
