import { Link, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Check, XCircle } from "lucide-react";

export default function PaymentResultPage() {
  const [params] = useSearchParams();

  // Paymob usually returns success=true | false
  const successParam = params.get("success");
  const isSuccess = successParam === "true" || successParam === "1";

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
              ? "Your payment was completed successfully."
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
