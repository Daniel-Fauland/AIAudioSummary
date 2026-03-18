import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internals and auth API routes through without auth check
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  let session;
  try {
    session = await auth();
  } catch {
    // Stale or corrupted session cookie — clear it and redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("authjs.session-token");
    response.cookies.delete("__Secure-authjs.session-token");
    return response;
  }

  // Authenticated users hitting /login should be redirected to /
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated users hitting anything other than /login should be redirected
  if (pathname !== "/login" && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
