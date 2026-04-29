import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAuthPage = nextUrl.pathname.startsWith("/auth");
  const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
  const isPublic = isAuthPage || isApiAuth;

  if (!isLoggedIn && !isPublic) {
    const signinUrl = new URL("/auth/signin", nextUrl);
    return NextResponse.redirect(signinUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
