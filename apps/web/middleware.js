import { NextResponse } from "next/server";

const publicRoutes = ["/login", "/reset-password", "/auth/confirm"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("sb-access-token.0")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
