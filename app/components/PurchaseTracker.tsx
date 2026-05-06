"use client";

import { useEffect, useRef } from "react";

const HANDOFF_KEY = "fmx_funnel_handoff";
const FIRED_KEY = "fmx_purchase_fired";
const PIXEL_ID = "415485235553341";
const CAPI_PURCHASE_ENDPOINT = "/api/capi/purchase";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type Handoff = {
  purchase_event_id?: string;
  content_name?: string;
  value?: number;
  purchase_value?: number;
  currency?: string;
  score?: number;
  tier?: string;
  email?: string;
  phone?: string;
  firstname?: string;
  first_name?: string;
  lastname?: string;
  last_name?: string;
  city?: string;
  state?: string;
  zip?: string;
  zipcode?: string;
  cep?: string;
  country?: string;
  gender?: string;
  dob?: string;
  birthdate?: string;
  fbp?: string;
  fbc?: string;
  utm?: Record<string, string>;
  ts?: number;
};

type AdvancedMatching = {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  ct?: string;
  st?: string;
  zp?: string;
  country?: string;
  ge?: string;
  db?: string;
  external_id?: string;
};

function generateEventId(): string {
  if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "evt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\\/+^]/g, "\\$&") + "=([^;]*)"),
  );
  return m ? decodeURIComponent(m[1]) : "";
}

function getFbp(): string {
  return getCookie("_fbp");
}

function getFbc(): string {
  const c = getCookie("_fbc");
  if (c) return c;
  if (typeof window === "undefined") return "";
  const p = new URLSearchParams(window.location.search);
  const fbclid = p.get("fbclid");
  if (fbclid) return `fb.1.${Date.now()}.${fbclid}`;
  return "";
}

function readHandoff(): Handoff | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Handoff) : null;
  } catch {
    return null;
  }
}

function readQuery(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function toNumber(v: string | undefined | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const norm = (s: unknown) => (s == null ? "" : String(s)).toLowerCase().trim();
const digits = (s: unknown) => (s == null ? "" : String(s)).replace(/\D/g, "");
const noSpaces = (s: unknown) => norm(s).replace(/\s/g, "");

function buildAdvancedMatching(h: Handoff | null, p: URLSearchParams): AdvancedMatching {
  const am: AdvancedMatching = {};
  const email = norm(h?.email || p.get("email"));
  const phone = digits(h?.phone || p.get("phone"));
  const fn = norm(h?.firstname || h?.first_name);
  const ln = norm(h?.lastname || h?.last_name);
  const ct = noSpaces(h?.city || p.get("city"));
  const st = norm(h?.state || p.get("state")).slice(0, 2);
  const zp = digits(h?.zip || h?.zipcode || h?.cep || p.get("zip"));
  const country = norm(h?.country || "br");
  const ge = norm(h?.gender);
  const db = digits(h?.dob || h?.birthdate);

  if (email) am.em = email;
  if (phone) am.ph = phone;
  if (fn) am.fn = fn;
  if (ln) am.ln = ln;
  if (ct) am.ct = ct;
  if (st) am.st = st;
  if (zp) am.zp = zp;
  if (country) am.country = country;
  if (ge) am.ge = ge;
  if (db) am.db = db;
  if (email) am.external_id = email;

  return am;
}

export default function PurchaseTracker() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Idempotência por sessão (evita duplo disparo se React Strict Mode/StrictMode dupla montagem)
    try {
      if (window.sessionStorage.getItem(FIRED_KEY) === "1") return;
      window.sessionStorage.setItem(FIRED_KEY, "1");
    } catch {
      /* sessionStorage indisponível — segue */
    }

    const query = readQuery();
    const handoff = readHandoff();
    const am = buildAdvancedMatching(handoff, query);

    // Re-init Pixel com Advanced Matching (atualiza user_data dos próximos eventos)
    // Chamar init múltiplas vezes com o mesmo PIXEL_ID é suportado pela Meta.
    if (typeof window.fbq === "function") {
      try {
        window.fbq("init", PIXEL_ID, am as unknown as Record<string, unknown>);
      } catch (e) {
        console.warn("[Pixel init AM]", e);
      }
    }

    // Esta página é a obrigado DESQUALIFICADA — quem cai aqui pagou no funnel desqualificado.
    // Webhook PagTrust desqualificada NÃO dispara Purchase (config no route.ts) pra evitar dup.
    // Logo, browser é a única fonte. Dispara sempre.

    const transactionId =
      query.get("transaction") ||
      query.get("transaction_id") ||
      query.get("id") ||
      query.get("order");
    const eventId = transactionId
      ? `pt_${transactionId}`
      : query.get("eid") || handoff?.purchase_event_id || generateEventId();

    const value =
      toNumber(query.get("value")) ??
      handoff?.value ??
      handoff?.purchase_value ??
      7;
    const currency = query.get("currency") || handoff?.currency || "BRL";
    const contentName =
      query.get("content_name") || handoff?.content_name || "desqualificado";
    const tier = query.get("tier") || handoff?.tier || "red";
    const score =
      handoff?.score != null
        ? handoff.score
        : toNumber(query.get("score")) ?? 0;

    const customData: Record<string, unknown> = {
      value,
      currency,
      content_name: contentName,
      content_category: "desafio-breathwork",
      tier,
      score,
    };

    const fbp = getFbp() || handoff?.fbp || "";
    const fbc = getFbc() || handoff?.fbc || "";

    // 1) Browser pixel (Advanced Matching já ativo do init acima)
    try {
      if (typeof window.fbq === "function") {
        window.fbq("track", "Purchase", customData, { eventID: eventId });
      }
    } catch (e) {
      console.warn("[Pixel] Purchase falhou:", e);
    }

    // 2) Server CAPI com PII expandido + MESMO event_id pra dedup
    const capiPayload = {
      event_id: eventId,
      event_name: "Purchase",
      event_source_url: window.location.href,
      action_source: "website" as const,
      user_data: {
        email: am.em || handoff?.email || "",
        phone: am.ph || handoff?.phone || "",
        firstname: am.fn || handoff?.firstname || "",
        lastname: am.ln || handoff?.lastname || "",
        city: am.ct || "",
        state: am.st || "",
        zip: am.zp || "",
        country: am.country || "br",
        gender: am.ge || "",
        dob: am.db || "",
        external_id: am.external_id || "",
        fbp,
        fbc,
        client_user_agent: navigator.userAgent,
      },
      custom_data: {
        ...customData,
        transaction_id: transactionId || "",
      },
      utm: handoff?.utm,
    };

    try {
      void fetch(CAPI_PURCHASE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(capiPayload),
        keepalive: true,
      }).catch((err) => {
        console.warn("[CAPI] Purchase falha:", err);
      });
    } catch (e) {
      console.warn("[CAPI] Purchase exception:", e);
    }
  }, []);

  return null;
}
