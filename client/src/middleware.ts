import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if(pathname === "/") {
    return NextResponse.next();
  }

  // --- Angel One Callback Handling ---
  if (pathname === "/angel1") {
    console.log("[Middleware] Intercepted Angel One callback at /angel1");

    const authTokenFromAngel = searchParams.get("auth_token");
    // Assuming Angel One might send other tokens directly in the query for simplicity here.
    // In a real scenario, `auth_token` might be an authorization code
    // that your backend exchanges for actual tokens.
    // For this example, let's assume `auth_token` is the main JWT, and others might be present.
    const feedTokenFromAngel = searchParams.get("feed_token"); // If Angel sends this
    const refreshTokenFromAngel = searchParams.get("refresh_token"); // If Angel sends this

    // Log extracted tokens (for debugging - remove or secure in production)
    console.log("[Middleware] auth_token from Angel One:", authTokenFromAngel);
    if (feedTokenFromAngel)
      console.log(
        "[Middleware] feed_token from Angel One:",
        feedTokenFromAngel
      );
    if (refreshTokenFromAngel)
      console.log(
        "[Middleware] refresh_token from Angel One:",
        refreshTokenFromAngel
      );

    if (authTokenFromAngel) {
      try {
        const goApiBaseUrl = process.env.NEXT_PUBLIC_GO_API_BASE_URL;
        if (!goApiBaseUrl) {
          console.error("[Middleware] Go API Base URL is not configured.");
          throw new Error("Server configuration error.");
        }
        const loginApiUrl = `${goApiBaseUrl}/api/login`;

        console.log(`[Middleware] Calling backend login API: ${loginApiUrl}`);
        const backendResponse = await fetch(loginApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Map to the field names your Go API service's /api/login endpoint expects
            jwt_token: authTokenFromAngel,
            feed_token: feedTokenFromAngel || "", // Send empty string if null
            refresh_token: refreshTokenFromAngel || "", // Send empty string if null
          }),
        });

        if (backendResponse.ok) {
          const responseData = await backendResponse.json();
          const userTokenFromGoAPI = responseData.user_token;

          if (userTokenFromGoAPI) {
            console.log(
              "[Middleware] Successfully received user_token from backend."
            );
            const watchListUrl = new URL("/watchlist", request.url); // Redirect to watchList
            const response = NextResponse.redirect(watchListUrl);

            const cookieName =
              process.env.NEXT_PUBLIC_USER_TOKEN_COOKIE_NAME ||
              "user_session_token";
            const maxAge = parseInt(
              process.env.NEXT_PUBLIC_COOKIE_MAX_AGE_SECONDS || "86400"
            );

            console.log(
              `[Middleware] Setting cookie: Name=${cookieName}, MaxAge=${maxAge}`
            );
            response.cookies.set({
              name: cookieName,
              value: userTokenFromGoAPI,
              httpOnly: true,
              path: "/",
              secure: process.env.NODE_ENV === "production", // Use true in production (HTTPS)
              sameSite: "lax", // Good default for session cookies
              maxAge: maxAge,
            });

            console.log(
              "[Middleware] Cookie set by Next.js middleware. Redirecting to /watchList."
            );
            return response;
          } else {
            console.error(
              "[Middleware] Backend login OK, but user_token was missing in the response body."
            );
            const errorUrl = new URL("/", request.url); // Redirect to login
            errorUrl.searchParams.set("error", "token_processing_failed");
            return NextResponse.redirect(errorUrl);
          }
        } else {
          const errorText = await backendResponse.text();
          console.error(
            `[Middleware] Backend login API call failed: ${backendResponse.status} - ${errorText}`
          );
          const errorUrl = new URL("/", request.url);
          errorUrl.searchParams.set("error", "backend_login_failed");
          errorUrl.searchParams.set(
            "status",
            backendResponse.status.toString()
          );
          return NextResponse.redirect(errorUrl);
        }
      } catch (error) {
        console.error(
          "[Middleware] Exception during Angel One callback processing:",
          error
        );
        const errorUrl = new URL("/", request.url);
        errorUrl.searchParams.set("error", "callback_exception");
        return NextResponse.redirect(errorUrl);
      }
    } else {
      console.warn(
        '[Middleware] Angel One callback at /angel1 did not contain "auth_token".'
      );
      const errorUrl = new URL("/", request.url);
      errorUrl.searchParams.set("error", "missing_auth_token");
      return NextResponse.redirect(errorUrl);
    }
  } else {
    const userTokenCookieName =
      process.env.NEXT_PUBLIC_USER_TOKEN_COOKIE_NAME || "user_session_token";
    const userToken = request.cookies.get(userTokenCookieName)?.value;
    if (!userToken) {
      console.log(
        `[Middleware] No user token for protected route ${pathname}. Redirecting to login.`
      );
      const loginUrl = new URL("/", request.url); // Redirect to root login page
      // Optionally preserve the intended destination to redirect back after login
      // loginUrl.searchParams.set("redirect_to", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Here, you could optionally verify the token by calling your Go API's /api/auth/verify endpoint
    // For now, just checking presence. A full verification would be more secure.
    console.log(
      `[Middleware] User token found for protected route ${pathname}. Allowing access.`
    );
  }

  return NextResponse.next(); // Allow other requests to proceed
}

// Config to specify which paths the middleware should run on.
export const config = {
  matcher: [
    "/angel1", // Specifically for the callback
    // Apply to other pages, excluding API routes, static files, and image optimization.
    // This regex tries to match general page routes.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    // The above regex means:
    // (?!api) - not starting with /api
    // (?!_next/static) - not starting with /_next/static
    // (?!_next/image) - not starting with /_next/image
    // (?!favicon.ico) - not favicon.ico
    // (?!.*\\..*) - not containing a dot (to exclude files like .png, .js usually served from public or _next)
    // The last part (?!.*\\..*) might be too broad or too narrow depending on your URL structure for pages.
    // A simpler matcher for general pages if you don't have dots in your page routes:
    // '/dashboard/:path*', '/profile/:path*' // etc. list your protected top-level routes
  ],
};
