type InvoiceItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type InvoiceTemplateData = {
  brandName: string;
  orderId: string;
  orderDate: string;
  orderStatus: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingAddressLines: string[];
  items: InvoiceItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  qrDataUrl: string;
  orderUrl: string;
  logoDataUrl?: string | null;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatCurrency = (amount: number): string =>
  `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L.E.`;

const renderAddress = (lines: string[]) =>
  lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");

const renderItems = (items: InvoiceItem[]) =>
  items
    .map(
      (item) => `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-qty">${item.quantity}</td>
          <td class="item-unit">${formatCurrency(item.unitPrice)}</td>
          <td class="item-total">${formatCurrency(item.totalPrice)}</td>
        </tr>
      `
    )
    .join("");

export function buildInvoiceHtml(data: InvoiceTemplateData): string {
  const {
    brandName,
    orderId,
    orderDate,
    orderStatus,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddressLines,
    items,
    subtotal,
    shippingFee,
    total,
    qrDataUrl,
    orderUrl,
    logoDataUrl,
  } = data;

  const safeCustomerEmail = customerEmail ? escapeHtml(customerEmail) : "Not provided";
  const safeCustomerPhone = customerPhone ? escapeHtml(customerPhone) : "Not provided";

  const logoMarkup = logoDataUrl
    ? `<img class="logo" src="${logoDataUrl}" alt="${escapeHtml(brandName)} logo" />`
    : `<div class="logo-placeholder">${escapeHtml(brandName)}</div>`;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(brandName)} Invoice</title>
        <style>
          :root {
            --purple: #6d28d9;
            --purple-dark: #4c1d95;
            --yellow: #facc15;
            --text: #111827;
            --muted: #6b7280;
            --line: #e5e7eb;
            --bg-soft: #fafafa;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Segoe UI", "Inter", system-ui, -apple-system, sans-serif;
            background: #ffffff;
            color: var(--text);
          }
          .page {
            padding: 32px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--purple);
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .logo {
            height: 48px;
            width: auto;
          }
          .logo-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: var(--purple);
            color: #fff;
            font-weight: 700;
            font-size: 14px;
          }
          .brand-name {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 0.4px;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            background: var(--yellow);
            color: #111827;
          }
          .meta {
            text-align: right;
            font-size: 13px;
            color: var(--muted);
          }
          .meta strong {
            display: block;
            font-size: 16px;
            color: var(--text);
          }
          .section {
            margin-top: 24px;
            padding: 20px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: #ffffff;
          }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--purple-dark);
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .label {
            font-size: 12px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .value {
            font-size: 14px;
            font-weight: 600;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          thead th {
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--muted);
            border-bottom: 1px solid var(--line);
            padding: 10px 8px;
          }
          tbody td {
            padding: 12px 8px;
            border-bottom: 1px solid var(--line);
            font-size: 14px;
          }
          .item-name {
            font-weight: 600;
          }
          .item-qty,
          .item-unit,
          .item-total {
            text-align: right;
            white-space: nowrap;
          }
          .summary {
            display: flex;
            justify-content: flex-end;
            margin-top: 12px;
          }
          .summary-card {
            min-width: 240px;
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 16px;
            background: var(--bg-soft);
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .summary-row.total {
            font-size: 16px;
            font-weight: 700;
            color: var(--purple-dark);
            border-top: 1px dashed var(--line);
            padding-top: 10px;
            margin-top: 10px;
          }
          .qr-card {
            display: flex;
            align-items: center;
            gap: 16px;
            background: #fdf7e4;
            border: 1px solid #f6e2a1;
            padding: 16px;
            border-radius: 16px;
          }
          .qr-card img {
            width: 96px;
            height: 96px;
            border-radius: 12px;
            background: #fff;
            padding: 6px;
          }
          .qr-caption {
            font-size: 12px;
            color: var(--muted);
          }
          .footer {
            margin-top: 28px;
            text-align: center;
            font-size: 13px;
            color: var(--muted);
          }
        </style>
      </head>
      <body>
        <div class="page">
          <header class="header">
            <div class="brand">
              ${logoMarkup}
              <div>
                <div class="brand-name">${escapeHtml(brandName)}</div>
                <div class="badge">Invoice / Order Policy</div>
              </div>
            </div>
            <div class="meta">
              <strong>#${escapeHtml(orderId)}</strong>
              <div>${escapeHtml(orderDate)}</div>
              <div>Status: ${escapeHtml(orderStatus)}</div>
            </div>
          </header>

          <section class="section">
            <div class="section-title">Customer & Shipping</div>
            <div class="grid">
              <div>
                <div class="label">Customer</div>
                <div class="value">${escapeHtml(customerName)}</div>
                <div class="value">${safeCustomerEmail}</div>
                <div class="value">${safeCustomerPhone}</div>
              </div>
              <div>
                <div class="label">Shipping Address</div>
                <div class="value">${renderAddress(shippingAddressLines)}</div>
              </div>
            </div>
          </section>

          <section class="section">
            <div class="section-title">Order Items</div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align:right;">Qty</th>
                  <th style="text-align:right;">Price</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${renderItems(items)}
              </tbody>
            </table>
            <div class="summary">
              <div class="summary-card">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>${formatCurrency(subtotal)}</span>
                </div>
                <div class="summary-row">
                  <span>Shipping</span>
                  <span>${formatCurrency(shippingFee)}</span>
                </div>
                <div class="summary-row total">
                  <span>Total</span>
                  <span>${formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </section>

          <section class="section">
            <div class="section-title">Track Your Order</div>
            <div class="qr-card">
              <img src="${qrDataUrl}" alt="Order QR code" />
              <div>
                <div class="value">Scan to view order details</div>
                <div class="qr-caption">${escapeHtml(orderUrl)}</div>
              </div>
            </div>
          </section>

          <div class="footer">Thank you for shopping with Drippss.</div>
        </div>
      </body>
    </html>
  `;
}
