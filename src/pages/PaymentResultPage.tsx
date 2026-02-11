import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Check, XCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useCreateOrder } from "@/hooks/useOrders";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const { items } = useCart();
  const [orderCreated, setOrderCreated] = useState(false);
  const hasSubmitted = useRef(false);

  // Paymob usually returns success=true | false
  const successParam = params.get("success");
  const isSuccess = successParam === "true" || successParam === "1";

  useEffect(() => {
    if (!isSuccess) return;
    trackEvent("purchase");
  }, [isSuccess]);

  useEffect(() => {
    if (!isSuccess || hasSubmitted.current) return;
    const pendingRaw = window.localStorage.getItem("drippss_pending_payment");
    if (!pendingRaw) return;
    if (items.length === 0) {
      toast.error("Cart is empty. Unable to create the order.");
      return;
    }

    const transactionId =
      params.get("id") ||
      params.get("transaction_id") ||
      params.get("txn_id") ||
      params.get("transaction_id");

    const pending = JSON.parse(pendingRaw) as {
      orderId: string;
      customerEmail: string;
      customerName: string;
      shippingAddress: any;
      billingAddress: any;
    };

    hasSubmitted.current = true;

    createOrder
      .mutateAsync({
        shippingAddress: pending.shippingAddress,
        billingAddress: pending.billingAddress,
        customerEmail: pending.customerEmail,
        customerName: pending.customerName,
        paymentMethod: "card",
        paymentStatus: "paid",
        transactionId: transactionId ?? null,
        paidAt: new Date().toISOString(),
        orderId: pending.orderId,
      })
      .then((created) => {
        window.localStorage.removeItem("drippss_pending_payment");
        setOrderCreated(true);
        const targetId = created?.id || pending.orderId;
        if (targetId) {
          navigate(`/order/${targetId}`, { replace: true });
        }
      })
      .catch((error) => {
        console.error("Failed to create order after payment:", error);
        hasSubmitted.current = false;
        if (pending.orderId) {
          toast.message("Payment succeeded. Opening your order details...");
          navigate(`/order/${pending.orderId}`, { replace: true });
          return;
        }
        toast.error("Payment succeeded but order creation failed. Please contact support.");
      });
  }, [isSuccess, items.length, params, createOrder]);

  return (
    <MainLayout showFooter={false}>
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center bg-card border border-border rounded-xl p-8">
          <div className="flex justify-center mb-6">
            {isSuccess ? (
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-600" />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
            )}
          </div>

          <h1 className="font-display text-3xl font-bold mb-3">
            {isSuccess ? "Payment Successful" : "Payment Failed"}
          </h1>

          <p className="text-muted-foreground mb-8">
            {isSuccess
              ? orderCreated
                ? "Your payment was completed successfully."
                : "Payment successful. Finalizing your order..."
              : "Your payment could not be completed. Please try again."}
          </p>

          <div className="space-y-3">
            {isSuccess && (
              <Link to="/orders">
                <Button variant="hero" size="lg" className="w-full">
                  View My Orders
                </Button>
              </Link>
            )}

            <Link to="/checkout">
              <Button variant="outline" size="lg" className="w-full">
                Back to Checkout
              </Button>
            </Link>

            <Link to="/shop">
              <Button variant="ghost" size="lg" className="w-full">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
