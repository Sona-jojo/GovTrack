import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
    "/",
    "/notices",
    "/splash",
    "/about-us",
    "/contact-us",
    "/login",
    "/report-issue",
    "/track-issue",
    "/complaint",
    "/api/complaints",
    "/api/login",
    "/api/local-bodies",
    "/api/wards",
    "/api/staff",
    "/api/notices",
    "/api/admin",
    "/api/profile",
    "/api/settings/get",
    "/api/feedback",
];

function isPublic(pathname) {
    return PUBLIC_PATHS.some(
        (p) => pathname === p || pathname.startsWith(p + "/"),
    );
}

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // Allow public routes and static assets
    if (
        isPublic(pathname) ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.match(/\.(svg|png|jpg|ico|css|js)$/)
    ) {
        return NextResponse.next();
    }

    // Create Supabase client for middleware
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(tokens) {
                    for (const { name, value, options } of tokens) {
                        request.cookies.set(name, value);
                        response.cookies.set(name, value, options);
                    }
                },
            },
        },
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
