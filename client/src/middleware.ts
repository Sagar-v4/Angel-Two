import type { NextRequest } from "next/server";
import { MiddlewareConfig, NextResponse } from "next/server";

export const config: MiddlewareConfig = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

export const publicRouteStartsWith: string[] = ["/", "/auth"];

export default async function middleware(request: NextRequest) {
  if (
    publicRouteStartsWith.some((route) =>
      request.nextUrl.pathname.startsWith(route)
    )
  ) {
    return NextResponse.next();
  }

  // TODO: Auth checking
  return NextResponse.next();
}
