import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

const statusColors: Record<OrderStatus, string> = {
  pending: "border border-yellow-200 text-yellow-800 bg-yellow-50",
  processing: "border border-blue-200 text-blue-700 bg-blue-50",
  shipped: "border border-purple-200 text-purple-700 bg-purple-50",
  delivered: "border border-green-200 text-green-700 bg-green-50",
  cancelled: "border border-red-200 text-red-700 bg-red-50",
};

const buildAddressLines = (order: Order) => {
  const address = order.shipping_address;
  if (!address) return ["Not provided"];

  const fullName = [address.firstName, address.lastName].filter(Boolean).join(" ");
  const cityLine = [address.city, address.state, address.zip].filter(Boolean).join(", ");
  const lines = [
    fullName || undefined,
    address.address1,
    address.address2,
    cityLine,
    address.country,
  ].filter(Boolean) as string[];

  return lines.length ? lines : ["Not provided"];
};

export function OrderInvoiceDetails({ order }: { order: Order }) {
  const addressLines = buildAddressLines(order);
  const items = order.items || [];
  const paymentMethod = order.payment_method
    ? order.payment_method === "card"
      ? "VISA"
      : order.payment_method === "cod"
      ? "Cash on Delivery"
      : order.payment_method.toUpperCase()
    : "Not set";
  const paymentStatus = order.payment_status ? order.payment_status.toUpperCase() : "UNPAID";
  const paidAtLabel = order.paid_at ? format(new Date(order.paid_at), "MMM d, yyyy HH:mm") : "Not paid";
  const amountCents = order.total_amount_cents || 0;
  const orderAmount = amountCents > 0 ? amountCents / 100 : Number(order.total);

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Order ID</p>
            <p className="font-mono text-lg font-semibold">#{order.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={statusColors[order.status]}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {format(new Date(order.created_at), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <p className="font-medium">{paymentMethod}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payment Status</p>
            <p className="font-medium">{paymentStatus}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Paid At</p>
            <p className="font-medium">{paidAtLabel}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Transaction ID</p>
            <p className="font-mono text-sm break-all">
              {order.transaction_id || "Not available"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Order Amount</p>
            <p className="font-medium">{formatCurrency(orderAmount)}</p>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{order.customer_name || "Guest"}</p>
            <p className="text-sm text-muted-foreground">{order.customer_email || "Not provided"}</p>
            <p className="text-sm text-muted-foreground">
              {order.shipping_address?.phone || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Shipping Address</p>
            <div className="mt-2 space-y-1 text-sm">
              {addressLines.map((line, index) => (
                <p key={`${line}-${index}`} className="text-foreground">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Products</h3>
          <span className="text-sm text-muted-foreground">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No items found for this order.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.unit_price))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.total_price))}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-6 border-t border-border pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatCurrency(Number(order.shipping_cost))}</span>
          </div>
          {Number(order.discount_amount || 0) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>
                Discount {order.coupon_code ? `(${order.coupon_code})` : ''}
              </span>
              <span>-{formatCurrency(Number(order.discount_amount || 0))}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(Number(order.total))}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
