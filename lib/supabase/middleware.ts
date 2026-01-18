import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Configuration du timeout d'inactivité (en millisecondes)
const SESSION_INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_COOKIE_NAME = 'session_last_activity';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // DEV MODE: Skip auth for testing UI without Supabase
  if (process.env.DEV_SKIP_AUTH === 'true') {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }: {
              name: string;
              value: string;
              options: CookieOptions;
            }) => supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Vérifier le timeout d'inactivité côté serveur
    const lastActivityCookie = request.cookies.get(ACTIVITY_COOKIE_NAME);
    const now = Date.now();

    if (lastActivityCookie) {
      const lastActivity = parseInt(lastActivityCookie.value, 10);
      const timeSinceLastActivity = now - lastActivity;

      // Si inactif depuis trop longtemps, déconnecter
      if (timeSinceLastActivity > SESSION_INACTIVITY_TIMEOUT) {
        // Supprimer le cookie d'activité
        supabaseResponse.cookies.set(ACTIVITY_COOKIE_NAME, '', {
          maxAge: 0,
          path: '/',
        });

        // Déconnecter l'utilisateur de Supabase
        await supabase.auth.signOut();

        // Rediriger vers login avec message
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('reason', 'inactivity');
        return NextResponse.redirect(url);
      }
    }

    // Mettre à jour le cookie d'activité
    supabaseResponse.cookies.set(ACTIVITY_COOKIE_NAME, now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 heures (le cookie lui-même)
    });
  }

  // Redirect to admin if already logged in and trying to access login
  if (request.nextUrl.pathname === '/login') {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
