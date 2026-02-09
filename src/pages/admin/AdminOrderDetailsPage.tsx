import { Link, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOrder } from "@/hooks/useOrders";
import { useQrDataUrl } from "@/hooks/useQrCode";
import { downloadInvoicePdf, openInvoicePdf, openInvoicePrintView } from "@/lib/invoice";
import { OrderInvoiceDetails } from "@/components/orders/OrderInvoiceDetails";
import { toast } from "sonner";

export default function AdminOrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const { data: order, isLoading, error } = useOrder(id || "");

  const orderUrl =
    typeof window !== "undefined" && id ? `${window.location.origin}/order/${id}` : null;
  const { dataUrl: qrDataUrl, isLoading: qrLoading } = useQrDataUrl(orderUrl);

  const handleDownload = async () => {
    if (!id) return;
    try {
      await downloadInvoicePdf(id, session?.access_token);
    } catch (err: any) {
      openInvoicePrintView(id);
      toast.error("PDF service unavailable. Opening print view instead.");
    }
  };

  const handlePrint = async () => {
    if (!id) return;
    try {
      await openInvoicePdf(id, session?.access_token);
    } catch (err: any) {
      openInvoicePrintView(id);
      toast.error("PDF service unavailable. Opening print view instead.");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Admin / Orders</p>
            <h1 className="font-display text-2xl font-bold">Order Details</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handlePrint}>
              Print Invoice
            </Button>
            <Button variant="hero" onClick={handleDownload}>
              Download PDF
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-card rounded-xl border border-border p-6">Loading order...</div>
        ) : error ? (
          <div className="bg-card rounded-xl border border-border p-6 text-destructive">
            Failed to load order.
          </div>
        ) : order ? (
          <>
            <OrderInvoiceDetails order={order} />

            <section className="bg-card rounded-xl border border-border p-6 flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1">
                <h2 className="font-display text-lg font-bold mb-2">QR Preview</h2>
                <p className="text-sm text-muted-foreground">
                  Customers can scan this to open their order details page.
                </p>
                {orderUrl && (
                  <p className="text-xs text-muted-foreground mt-2 break-all">{orderUrl}</p>
                )}
              </div>
              <div className="flex items-center justify-center w-36 h-36 rounded-xl border border-border bg-white">
                {qrLoading ? (
                  <span className="text-xs text-muted-foreground">Generating...</span>
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt="Order QR Code" className="w-28 h-28" />
                ) : (
                  <span className="text-xs text-muted-foreground">Unavailable</span>
                )}
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <Link to="/admin/orders">
                <Button variant="outline">Back to Orders</Button>
              </Link>
              {orderUrl && (
                <a href={orderUrl} target="_blank" rel="noreferrer">
                  <Button variant="ghost">Open Customer View</Button>
                </a>
              )}
            </div>
          </>
        ) : (
          <div className="bg-card rounded-xl border border-border p-6 text-muted-foreground">
            Order not found.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
