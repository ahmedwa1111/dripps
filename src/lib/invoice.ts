const getApiBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return base ? base.replace(/\/$/, "") : "";
};

export const buildInvoiceUrl = (orderId: string, inline?: boolean) => {
  const query = inline ? "?inline=1" : "";
  const base = getApiBaseUrl();
  return `${base}/api/orders/${orderId}/invoice${query}`;
};

const getAuthHeaders = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const fetchInvoicePdf = async (
  orderId: string,
  token?: string,
  inline?: boolean
) => {
  const response = await fetch(buildInvoiceUrl(orderId, inline), {
    headers: {
      ...getAuthHeaders(token),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to fetch invoice PDF.");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/pdf")) {
    const bodyText = await response.text();
    throw new Error(
      bodyText
        ? `Invoice endpoint did not return a PDF. Received: ${contentType}`
        : "Invoice endpoint did not return a PDF."
    );
  }

  return response.blob();
};

export const downloadInvoicePdf = async (orderId: string, token?: string) => {
  const blob = await fetchInvoicePdf(orderId, token);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `drippss-invoice-${orderId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const openInvoicePdf = async (orderId: string, token?: string) => {
  const blob = await fetchInvoicePdf(orderId, token, true);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  // Revoke after the new tab has a chance to load the blob URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};
