import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Static asset extensions must be excluded, otherwise the auth check below
    // 307-redirects them to /login. Fonts were missing here, so every
    // self-hosted @font-face request returned the login HTML and failed to parse.
    // xml/txt/webmanifest for the same reason: a crawler fetching /sitemap.xml
    // or /robots.txt has no session, so both would have redirected to /login.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|otf|woff|woff2|xml|txt|webmanifest)$).*)',
  ],
};
