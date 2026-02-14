const TOKEN_KEY = "rag_user_token";
const USER_EMAIL_KEY = "rag_user_email";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    return;
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_EMAIL_KEY);
  } catch {
    return;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(USER_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function setUserEmail(email: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_EMAIL_KEY, email);
  } catch {
    return;
  }
}
