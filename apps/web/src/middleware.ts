import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth'];

// Permission-based route protection at the edge
// JWT now includes `permissions[]` resolved from role_permissions DB table.
// Maps routes to required permissions. User needs ANY listed permission.
// PLATFORM_ADMIN role bypasses all checks.
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/admin/organisations': ['ORG_VIEW', 'ORG_CREATE', 'ORG_UPDATE'],
  '/admin/business-units': ['BU_VIEW', 'BU_CREATE', 'BU_UPDATE'],
  '/admin/users': ['USER_VIEW', 'USER_CREATE', 'USER_ASSIGN_ROLE'],
  '/admin/master-data': ['ADMIN_SETTINGS'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Check for access token in Authorization header or cookie
  const token = request.cookies.get('access_token')?.value
    || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode JWT payload (structure check + expiry + role extraction)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    const payload = JSON.parse(atob(parts[1]));

    // Expiry check
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Permission-based route protection (from JWT permissions array)
    const userRoles: string[] = (payload.roles || []).map((r: { role: string }) => r.role);
    const userPermissions: string[] = payload.permissions || [];
    const isPlatformAdmin = userRoles.includes('PLATFORM_ADMIN');

    if (!isPlatformAdmin) {
      // Check route-specific permissions
      for (const [route, requiredPerms] of Object.entries(ROUTE_PERMISSIONS)) {
        if (pathname.startsWith(route)) {
          const hasAny = requiredPerms.some(p => userPermissions.includes(p));
          if (!hasAny) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
          break;
        }
      }
    }

  } catch {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
