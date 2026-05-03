import crypto from "crypto";
import type { NextRequest } from "next/server";

export const META_GRAPH_VERSION = "v21.0";
export const DEFAULT_PIXEL_ID = "415485235553341";

export type CapiUserData = {
  email?: string;
  phone?: string;
  firstname?: string;
  lastname?: string;
  fbp?: string;
  fbc?: string;
  client_user_agent?: string;
};

export type CapiCustomData = {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  score?: number;
  tier?: string;
};

export type CapiPayload = {
  event_id: string;
  event_name: string;
  event_source_url?: string;
  action_source?: "website" | "app" | "email" | "chat" | "phone_call" | "physical_store" | "system_generated" | "other";
  user_data?: CapiUserData;
  custom_data?: CapiCustomData;
  utm?: Record<string, string>;
};

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhoneBR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  if (digits.length >= 10 && digits.length <= 11) return "55" + digits;
  return digits;
}

function normalizeName(name: string): string {
  return stripDiacritics(name.trim().toLowerCase());
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "";
}

function buildHashedUserData(user: CapiUserData, req: NextRequest): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (user.email) {
    const em = normalizeEmail(user.email);
    if (em) out.em = [sha256(em)];
  }
  if (user.phone) {
    const ph = normalizePhoneBR(user.phone);
    if (ph) out.ph = [sha256(ph)];
  }
  if (user.firstname) {
    const fn = normalizeName(user.firstname);
    if (fn) out.fn = [sha256(fn)];
  }
  if (user.lastname) {
    const ln = normalizeName(user.lastname);
    if (ln) out.ln = [sha256(ln)];
  }

  if (user.fbp) out.fbp = user.fbp;
  if (user.fbc) out.fbc = user.fbc;

  const ua = user.client_user_agent || req.headers.get("user-agent") || "";
  if (ua) out.client_user_agent = ua;

  const ip = getClientIp(req);
  if (ip) out.client_ip_address = ip;

  return out;
}

export type SendResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

export async function sendEventToMeta(
  payload: CapiPayload,
  req: NextRequest,
): Promise<SendResult> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      ok: false,
      status: 500,
      body: { error: "META_ACCESS_TOKEN not configured" },
    };
  }

  const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;
  const testEventCode = process.env.META_TEST_EVENT_CODE || "";

  const event = {
    event_name: payload.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: payload.event_id,
    event_source_url: payload.event_source_url || req.headers.get("referer") || "",
    action_source: payload.action_source || "website",
    user_data: buildHashedUserData(payload.user_data || {}, req),
    custom_data: payload.custom_data || {},
  };

  const body: Record<string, unknown> = {
    data: [event],
    access_token: accessToken,
  };
  if (testEventCode) body.test_event_code = testEventCode;

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body: json };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      body: { error: "fetch_failed", message: err instanceof Error ? err.message : String(err) },
    };
  }
}

export async function parseCapiBody(req: NextRequest): Promise<CapiPayload | null> {
  try {
    const data = (await req.json()) as Partial<CapiPayload>;
    if (!data || typeof data !== "object") return null;
    if (!data.event_id || !data.event_name) return null;
    return data as CapiPayload;
  } catch {
    return null;
  }
}
