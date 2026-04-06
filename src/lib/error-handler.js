import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV !== "production";

export function apiSuccess(data = null, message = "OK", status = 200) {
    return NextResponse.json({ success: true, message, data }, { status });
}

export function apiError(message = "Something went wrong", status = 400) {
    return NextResponse.json({ success: false, message, data: null }, { status });
}

export function handleApiError(error) {
    if (isDev) {
        console.error("[API Error]", error);
    }
    let message = "Internal server error";
    if (error instanceof Error) {
        message = error.message;
    } else if (error && typeof error === "object" && error.message) {
        message = error.message;
    } else if (typeof error === "string") {
        message = error;
    }
    return apiError(isDev ? message : "Internal server error", 500);
}

