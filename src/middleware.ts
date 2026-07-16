import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/session";
import { verifySession } from "@/lib/session-server";
import { roleMayAccessRoute } from "@/lib/route-access";
import { loginUrlWithNext, readLoginRedirectParam, safeRedirectPath } from "@/lib/auth-redirect";

const PUBLIC_PATHS = new Set(["/login"]);

function redirectToLogin(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  return NextResponse.redirect(loginUrlWithNext(request.url, pathname, request.nextUrl.search));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/apply")) {
    return NextResponse.next();
  }

  /** Public training manual — no login (like an external how-to site). */
  if (pathname.startsWith("/training-manual")) {
    return NextResponse.next();
  }

  if (pathname === "/help") {
    const url = request.nextUrl.clone();
    url.pathname = "/training-manual/how-to";
    return NextResponse.redirect(url);
  }

  if (PUBLIC_PATHS.has(pathname)) {
    const token = request.cookies.get(sessionCookieName)?.value;
    if (token) {
      const session = await verifySession(token);
      if (session) {
        const next = readLoginRedirectParam(request.nextUrl.searchParams);
        return NextResponse.redirect(new URL(safeRedirectPath(next), request.url));
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(sessionCookieName)?.value;

  if (pathname === "/") {
    if (!token) {
      return redirectToLogin(request);
    }
    const session = await verifySession(token);
    if (!session) {
      return redirectToLogin(request);
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!token) {
    return redirectToLogin(request);
  }

  const session = await verifySession(token);
  if (!session) {
    const res = redirectToLogin(request);
    res.cookies.delete(sessionCookieName);
    return res;
  }

  if (!roleMayAccessRoute(session.role, pathname)) {
    const url = new URL("/access-denied", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-kastros-user", session.email);
  requestHeaders.set("x-kastros-role", session.role);
  requestHeaders.set("x-kastros-name", session.name);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image).*)"],
};
