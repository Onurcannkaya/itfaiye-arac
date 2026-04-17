import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicPaths = ["/login", "/api"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublicPath) {
    return NextResponse.next({ request });
  }

  // Check for auth cookie (set by client-side auth store via a cookie sync)
  const authCookie = request.cookies.get("sivas-auth-active");

  if (!authCookie?.value) {
    // Redirect to login with return URL
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|models|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
