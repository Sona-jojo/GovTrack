import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServer() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) return null;

    const cookieStore = await cookies();

    return createServerClient(url, key, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(tokens) {
                try {
                    for (const { name, value, options } of tokens) {
                        cookieStore.set(name, value, options);
                    }
                } catch {
                    // setAll can fail in Server Components (read-only cookies).
                    // This is expected and safe to ignore.
                }
            },
        },
    });
}
