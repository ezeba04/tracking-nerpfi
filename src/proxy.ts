import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidAuthToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const authCookie = request.cookies.get("site-auth");

  if (!authCookie || !isValidAuthToken(authCookie.value)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon.ico).*)",
  ],
};
