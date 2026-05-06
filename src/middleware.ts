import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName, verifySession } from "@/lib/session";
import { roleMayAccessRoute } from "@/lib/route-access";

const PUBLIC_PATHS = new Set(["/login"]);

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

  if (PUBLIC_PATHS.has(pathname)) {
    const token = request.cookies.get(sessionCookieName)?.value;
    if (token) {
      const session = await verifySession(token);
      if (session) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(sessionCookieName)?.value;

  if (pathname === "/") {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const session = await verifySession(token);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySession(token);
  if (!session) {
    const res = NextResponse.redirect(new URL("/login", request.url));
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
