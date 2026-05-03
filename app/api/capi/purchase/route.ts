import { NextRequest, NextResponse } from "next/server";
import { parseCapiBody, sendEventToMeta } from "../_lib/meta-capi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const payload = await parseCapiBody(req);
  if (!payload) {
    return NextResponse.json(
      { error: "invalid_payload" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  payload.event_name = "Purchase";

  const result = await sendEventToMeta(payload, req);

  return NextResponse.json(
    { ok: result.ok, meta: result.body },
    { status: result.ok ? 200 : result.status, headers: CORS_HEADERS },
  );
}
