/** Safe internal redirect target after login (blocks open redirects). */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next) return "/dashboard";
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/dashboard";
  if (trimmed.includes("\\") || trimmed.includes("://")) return "/dashboard";
  return trimmed;
}

export function readLoginRedirectParam(searchParams: URLSearchParams): string | null {
  return searchParams.get("next") ?? searchParams.get("callbackUrl");
}

export function loginUrlWithNext(requestUrl: string, pathname: string, search: string): URL {
  const loginUrl = new URL("/login", requestUrl);
  const next = `${pathname}${search}`;
  loginUrl.searchParams.set("next", next);
  return loginUrl;
}
