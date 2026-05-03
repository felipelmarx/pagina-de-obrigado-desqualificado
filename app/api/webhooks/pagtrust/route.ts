import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendEventToMeta, type CapiPayload } from "../../capi/_lib/meta-capi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FUNNEL_QUALIFIED = "fn2b9610af";
const FUNNEL_DISQUALIFIED = "fn4b1b7547";

function pickFirst<T>(...vals: (T | undefined | null | "")[]): T | undefined {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}

function getString(obj: unknown, ...paths: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  for (const path of paths) {
    const parts = path.split(".");
    let cur: unknown = o;
    for (const p of parts) {
      if (!cur || typeof cur !== "object") {
        cur = undefined;
        break;
      }
      cur = (cur as Record<string, unknown>)[p];
    }
    if (typeof cur === "string" && cur) return cur;
    if (typeof cur === "number") return String(cur);
  }
  return undefined;
}

function getNumber(obj: unknown, ...paths: string[]): number | undefined {
  const s = getString(obj, ...paths);
  if (s === undefined) return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

function classifyContentName(funnelHint: string | undefined): string {
  if (!funnelHint) return "qualificado";
  const s = funnelHint.toLowerCase();
  if (s.includes(FUNNEL_DISQUALIFIED) || s.includes("desqualif") || /\[d\]/.test(s) || /\bd\b/.test(s)) {
    return "desqualificado";
  }
  if (s.includes(FUNNEL_QUALIFIED) || s.includes("qualif") || /\[q\]/.test(s) || /\bq\b/.test(s)) {
    return "qualificado";
  }
  return "qualificado";
}

function isPaymentApproved(statusHint: string | undefined): boolean {
  if (!statusHint) return false;
  return /paid|approved|aprovad|confirm|success|complet|paga/i.test(statusHint);
}

export async function POST(req: NextRequest) {
  const expectedToken = process.env.PAGTRUST_WEBHOOK_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  const headerToken = pickFirst(
    req.headers.get("x-pagtrust-token") ?? "",
    req.headers.get("x-webhook-token") ?? "",
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "",
  );
  const queryToken = req.nextUrl.searchParams.get("token") ?? "";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const bodyToken = pickFirst(
    getString(body, "token"),
    getString(body, "webhook_token"),
    getString(body, "security_token"),
  );

  const providedToken = pickFirst(headerToken, queryToken, bodyToken);
  if (providedToken !== expectedToken) {
    console.warn("[Webhook PagTrust] invalid token", { headerToken: !!headerToken, queryToken: !!queryToken, bodyToken: !!bodyToken });
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  console.log("[Webhook PagTrust] payload received:", JSON.stringify(body));

  const status = pickFirst(
    getString(body, "status"),
    getString(body, "event"),
    getString(body, "data.status"),
    getString(body, "data.purchase.status"),
    getString(body, "transaction.status"),
    getString(body, "payment.status"),
  );

  if (!isPaymentApproved(status)) {
    return NextResponse.json({ ok: true, ignored: true, status });
  }

  const email = pickFirst(
    getString(body, "data.buyer.email"),
    getString(body, "buyer.email"),
    getString(body, "customer.email"),
    getString(body, "client.email"),
    getString(body, "data.customer.email"),
    getString(body, "transaction.customer_email"),
    getString(body, "email"),
  );

  const phone = pickFirst(
    getString(body, "data.buyer.checkout_full_phone"),
    getString(body, "data.buyer.checkout_phone"),
    getString(body, "data.buyer.phone"),
    getString(body, "buyer.checkout_full_phone"),
    getString(body, "buyer.checkout_phone"),
    getString(body, "customer.phone"),
    getString(body, "customer.phone_number"),
    getString(body, "customer.whatsapp"),
    getString(body, "client.phone"),
    getString(body, "phone"),
  );

  const firstname = pickFirst(
    getString(body, "data.buyer.name"),
    getString(body, "data.buyer.firstname"),
    getString(body, "data.buyer.first_name"),
    getString(body, "buyer.name"),
    getString(body, "customer.firstname"),
    getString(body, "customer.first_name"),
    getString(body, "customer.name"),
    getString(body, "client.name"),
  );

  const transactionId = pickFirst(
    getString(body, "data.transaction"),
    getString(body, "id"),
    getString(body, "data.id"),
    getString(body, "data.purchase.transaction"),
    getString(body, "orderId"),
    getString(body, "transaction.id"),
    getString(body, "transaction_id"),
    getString(body, "payment.id"),
  );

  const funnelHint = pickFirst(
    getString(body, "data.purchase.checkout.url"),
    getString(body, "data.purchase.funnel.name"),
    getString(body, "data.purchase.funnel.code"),
    getString(body, "data.origin.term"),
    getString(body, "data.origin.utmterm"),
    getString(body, "funnel"),
    getString(body, "funnel_id"),
    getString(body, "utm_term"),
    getString(body, "tier"),
    getString(body, "content_name"),
  );

  const amount = pickFirst(
    getNumber(body, "data.purchase.full_price.value"),
    getNumber(body, "data.purchase.original_offer_price.value"),
    getNumber(body, "data.purchase.price.price"),
    getNumber(body, "transaction.amount"),
    getNumber(body, "transaction.value"),
    getNumber(body, "amount"),
    getNumber(body, "value"),
    7,
  );

  const valueReal = (amount as number) > 100 ? (amount as number) / 100 : (amount as number);
  const content_name = classifyContentName(funnelHint);

  // PagTrust não passa transaction_id na URL pós-pagamento → browser não consegue
  // gerar event_id que case com webhook server-side. Pra evitar duplicação, webhook
  // NÃO dispara Purchase em nenhum tier. Browser-side (PurchaseTracker no Vercel
  // desqualificada + snippet WP qualificada) é a fonte única.
  console.log("[Webhook PagTrust] purchase NOT fired (browser-side is single source)", {
    content_name,
    transactionId,
    valueReal,
  });
  return NextResponse.json({ ok: true, skipped: "browser_is_single_source", content_name });

  /* eslint-disable no-unreachable -- intentional dead code; pode ser reativado se PagTrust
     começar a passar transaction_id na URL pós-pagamento (browser daria pt_{tx} igual e dedup ok) */
  const event_id = transactionId ? `pt_${transactionId}` : crypto.randomUUID();

  console.log("[Webhook PagTrust] extracted fields:", {
    email_present: !!email,
    phone_present: !!phone,
    firstname_present: !!firstname,
    transaction_id: transactionId,
    funnel_hint: funnelHint?.slice(0, 80),
    classified_as: content_name,
    amount_raw: amount,
    amount_real: valueReal,
  });

  const capiPayload: CapiPayload = {
    event_id,
    event_name: "Purchase",
    event_source_url: "https://parabens-breathwork-desafio-5d.vercel.app/",
    action_source: "website",
    user_data: {
      email,
      phone,
      firstname,
    },
    custom_data: {
      value: valueReal,
      currency: "BRL",
      content_name,
      content_category: "desafio-breathwork",
    },
  };

  const result = await sendEventToMeta(capiPayload, req);

  console.log("[Webhook PagTrust] Purchase result:", {
    event_id,
    content_name,
    value: valueReal,
    transaction_id: transactionId,
    meta_ok: result.ok,
    meta_status: result.status,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "meta_capi_failed", meta: result.body },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, event_id, content_name, value: valueReal });
}
