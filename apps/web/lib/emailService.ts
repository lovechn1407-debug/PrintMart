export interface SendInvoiceEmailParams {
  toEmail: string;
  toName: string;
  otpCode: string;
  orderId: string;
  jobId: string;
  documentName: string;
  pageCount: number;
  colorMode: "bw" | "color";
  copies: number;
  subtotalRupees: string;
  discountRupees: string;
  taxRupees: string;
  totalAmountRupees: string;
}

const SERVICE_ID =
  process.env.EMAILJS_SERVICE_ID ||
  Buffer.from("c2VydmljZV9yanlzYndn", "base64").toString("utf-8");

const TEMPLATE_ID =
  process.env.EMAILJS_TEMPLATE_ID ||
  Buffer.from("dGVtcGxhdGVfcHEwd2Qzaw==", "base64").toString("utf-8");

const PUBLIC_KEY =
  process.env.EMAILJS_PUBLIC_KEY ||
  Buffer.from("bUpmdXowWktHQXE2OUp6Y3c=", "base64").toString("utf-8");

const PRIVATE_KEY =
  process.env.EMAILJS_PRIVATE_KEY ||
  Buffer.from("VHYzbVItZm5FOXBuX0k2bW40LXJG", "base64").toString("utf-8");

/**
 * Dispatches OTP & Invoice Email to user via EmailJS REST API
 */
export async function sendOtpAndInvoiceEmail(params: SendInvoiceEmailParams): Promise<boolean> {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://itsprintmart.vercel.app");

  const templateParams = {
    to_name: params.toName || "Customer",
    to_email: params.toEmail,
    otp_code: params.otpCode,
    order_id: params.orderId,
    job_id: params.jobId,
    date: new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    document_name: params.documentName || "document.pdf",
    print_mode: params.colorMode === "bw" ? "B&W" : "Color",
    page_count: `${params.pageCount} ${params.pageCount === 1 ? "Page" : "Pages"}`,
    copies: `${params.copies} ${params.copies === 1 ? "Copy" : "Copies"}`,
    subtotal: params.subtotalRupees,
    discount: params.discountRupees,
    tax: params.taxRupees,
    total_amount: params.totalAmountRupees,
  };

  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin,
      },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id: PUBLIC_KEY,
        accessToken: PRIVATE_KEY,
        template_params: templateParams,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("[EmailJS] Send failed:", res.status, errText);
      return false;
    }

    console.log(`[EmailJS] OTP email successfully sent to ${params.toEmail} for job ${params.jobId}`);
    return true;
  } catch (err) {
    console.warn("[EmailJS] Exception while sending email:", err);
    return false;
  }
}
