import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Paths that require Admin or Editor role
const ADMIN_PATHS = ["/yonetim"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicPaths = ["/login", "/api/seed"];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // API rotalarını atla (bazıları public, bazıları kendi içinde korunuyor)
  if (isPublicPath) {
    return NextResponse.next({ request });
  }

  // Update session and get user
  const { supabaseResponse, user, supabase } = await updateSession(request);

  if (!user) {
    // User is not authenticated, redirect to login
    // BUT only if it's not an API route (API routes should return 401 instead)
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // RBAC: Check role for admin-only paths
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));

  if (isAdminPath) {
    // Profil tablosundan rolü çek
    const { data: profile } = await supabase
      .from('personnel')
      .select('rol')
      .eq('id', user.id)
      .single();

    const role = profile?.rol || "";

    if (role !== "Admin" && role !== "Editor" && role !== "Shift_Leader") {
      // Redirect unauthorized users (User role) to dashboard
      const dashUrl = new URL("/", request.url);
      dashUrl.searchParams.set("unauthorized", "1");
      return NextResponse.redirect(dashUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|models|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
