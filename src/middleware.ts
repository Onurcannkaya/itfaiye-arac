import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // TODO: Supabase Auth entegrasyonu sonradan eklenecek.
  // Şimdilik tüm isteklere izin ver (demo modu).
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|models|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
