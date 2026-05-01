import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set<string>(["/api/health", "/api/users", "/favicon.ico"]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const authed = req.cookies.get("qc_auth")?.value === "1";

  // Allow /login for unauthenticated users; redirect away when already authed.
  if (pathname === "/login") {
    if (authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/projects";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Root should always follow auth flow.
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = authed ? "/projects" : "/login";
    return NextResponse.redirect(url);
  }

  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (searchParams.toString() ? `?${searchParams}` : ""));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

