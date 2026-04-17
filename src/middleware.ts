import { NextResponse, type NextRequest } from "next/server";

// Paths that require Admin or Editor role
const ADMIN_PATHS = ["/yonetim"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicPaths = ["/login", "/api"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublicPath) {
    return NextResponse.next({ request });
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("sivas-auth-active");

  if (!authCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // RBAC: Check role for admin-only paths
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));

  if (isAdminPath) {
    const roleCookie = request.cookies.get("sivas-auth-role");
    const role = roleCookie?.value || "";

    if (role !== "Admin" && role !== "Editor" && role !== "Shift_Leader") {
      // Redirect unauthorized users (User role) to dashboard
      const dashUrl = new URL("/", request.url);
      dashUrl.searchParams.set("unauthorized", "1");
      return NextResponse.redirect(dashUrl);
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|models|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
