"use client";

import { useEffect, useRef } from "react";

const HANDOFF_KEY = "fmx_funnel_handoff";
const FIRED_KEY = "fmx_purchase_fired";
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
  currency?: string;
  score?: number;
  tier?: string;
  email?: string;
  phone?: string;
  firstname?: string;
  fbp?: string;
  fbc?: string;
  utm?: Record<string, string>;
  ts?: number;
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

function readQuery(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  p.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function toNumber(v: string | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
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

    // Esta página é a obrigado DESQUALIFICADA — quem cai aqui pagou no funnel desqualificado.
    // Webhook PagTrust desqualificada NÃO dispara Purchase (config no route.ts) pra evitar dup.
    // Logo, browser é a única fonte. Dispara sempre.

    const transactionId =
      query.transaction || query.transaction_id || query.id || query.order;
    const eventId = transactionId
      ? `pt_${transactionId}`
      : query.eid || handoff?.purchase_event_id || generateEventId();

    const value = toNumber(query.value) ?? handoff?.value ?? 7;
    const currency = query.currency || handoff?.currency || "BRL";
    const contentName = query.content_name || handoff?.content_name || "desqualificado";
    const tier = query.tier || handoff?.tier || "red";

    const customData: Record<string, unknown> = {
      value,
      currency,
      content_name: contentName,
      content_category: "desafio-breathwork",
    };
    if (tier) customData.tier = tier;
    if (handoff?.score != null) customData.score = handoff.score;

    const fbp = getFbp() || handoff?.fbp || "";
    const fbc = getFbc() || handoff?.fbc || "";

    // 1) Browser pixel
    try {
      if (typeof window.fbq === "function") {
        window.fbq("track", "Purchase", customData, { eventID: eventId });
      }
    } catch (e) {
      console.warn("[Pixel] Purchase falhou:", e);
    }

    // 2) Server CAPI
    const capiPayload = {
      event_id: eventId,
      event_name: "Purchase",
      event_source_url: window.location.href,
      action_source: "website" as const,
      user_data: {
        email: handoff?.email,
        phone: handoff?.phone,
        firstname: handoff?.firstname,
        fbp,
        fbc,
        client_user_agent: navigator.userAgent,
      },
      custom_data: customData,
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
