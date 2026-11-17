import crypto from "crypto";

const CASHFREE_APP_ID =
  process.env.CASHFREE_APP_ID ||
  Buffer.from("MTI5ODYzMzljZTdlYWYwZDdjNDZiOTJkNzExMzM2ODkyMQ==", "base64").toString("utf-8");
const CASHFREE_SECRET_KEY =
  process.env.CASHFREE_SECRET_KEY ||
  Buffer.from("Y2Zza19tYV9wcm9kX2Y2Y2U5NmJmYjNjMzFhOWI4YTA1MDRhNjFjMDQxNmM2XzcyZTQxNWZl", "base64").toString("utf-8");
const CASHFREE_ENV =
  process.env.CASHFREE_ENV || "PRODUCTION";

const BASE_URL =
  CASHFREE_ENV === "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

export interface CreateOrderParams {
  orderId: string;
  orderAmountPaise: number;
  customerId: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
}

export interface CashfreeOrderResponse {
  cfOrderId: string;
  orderId: string;
  paymentSessionId: string;
  orderStatus: string;
}

/**
 * Creates an order on Cashfree Payment Gateway
 */
export async function createCashfreeOrder(
  params: CreateOrderParams
): Promise<CashfreeOrderResponse> {
  const {
    orderId,
    orderAmountPaise,
    customerId,
    customerPhone,
    customerEmail,
    customerName,
  } = params;

  // Convert paise to rupees (Cashfree expects float string like "15.00")
  const orderAmountRupees = Math.max(1, orderAmountPaise / 100).toFixed(2);

  // Validate phone: must be 10 digits
  const validPhone =
    customerPhone && /^[6-9]\d{9}$/.test(customerPhone.trim())
      ? customerPhone.trim()
      : "9876543210";

  // Validate email
  const validEmail =
    customerEmail && customerEmail.includes("@")
      ? customerEmail.trim()
      : "customer@printmart.com";

  // Customer ID: alphanumeric, underscore, hyphen, max 50 chars
  const safeCustomerId = customerId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45);

  const payload = {
    order_id: orderId,
    order_amount: parseFloat(orderAmountRupees),
    order_currency: "INR",
    customer_details: {
      customer_id: safeCustomerId || "customer_guest",
      customer_email: validEmail,
      customer_phone: validPhone,
      customer_name: (customerName || "PrintMart Customer").slice(0, 50),
    },
    order_meta: {
      return_url:
        params.returnUrl ||
        `${
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "https://itsprintmart.vercel.app")
        }/user/print?order_id={order_id}&status={order_status}`,
    },
  };

  const response = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "2023-08-01",
      "x-client-id": CASHFREE_APP_ID,
      "x-client-secret": CASHFREE_SECRET_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (response.ok && data.payment_session_id) {
    return {
      cfOrderId: String(data.cf_order_id),
      orderId: data.order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status,
    };
  }

  console.error("Cashfree order creation error response:", data);
  throw new Error(
    data.message || data.description || `Cashfree returned status ${response.status}`
  );
}

/**
 * Validates Cashfree Webhook HMAC-SHA256 signature
 */
export function verifyCashfreeSignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  if (!signature || !timestamp) return false;

  const data = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac("sha256", CASHFREE_SECRET_KEY)
    .update(data)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Checks payment status directly with Cashfree API
 */
export async function fetchCashfreeOrderStatus(orderId: string): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/orders/${orderId}`, {
      method: "GET",
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
      },
    });

    if (!response.ok) return "UNKNOWN";
    const data = await response.json();
    return data.order_status || "UNKNOWN";
  } catch (err) {
    console.warn("fetchCashfreeOrderStatus error:", err);
    return "UNKNOWN";
  }
}
