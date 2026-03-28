import { NextResponse } from "next/server";

const publicRoutes = ["/login"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token cookie
  const token = request.cookies.get("sb-access-token")?.value;

  // Redirect only page routes, not API/static/internal routes
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect app pages only.
     * Exclude:
     * - api routes
     * - Next internals
     * - all files with extensions
     */
    "/((?!api|_next|favicon.ico|.*\\..*).*)",
  ],
};
