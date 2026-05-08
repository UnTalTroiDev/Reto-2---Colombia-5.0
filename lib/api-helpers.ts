import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  ok: false;
  error: { code: string; message: string };
};

export function jsonOk<T>(data: T, meta?: Record<string, unknown>, cacheSeconds = 600) {
  return NextResponse.json<ApiSuccess<T>>(
    { ok: true, data, ...(meta ? { meta } : {}) },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`,
      },
    },
  );
}

export function jsonErr(code: string, message: string, status = 400) {
  return NextResponse.json<ApiError>(
    { ok: false, error: { code, message } },
    { status, headers: CORS_HEADERS },
  );
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function clampInt(v: string | null, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
