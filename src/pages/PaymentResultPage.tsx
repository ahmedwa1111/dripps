import { Link, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const successParam = searchParams.get('success');
  const isSuccess = successParam === 'true' || successParam === '1';

  return (
    <MainLayout showFooter={false}>
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">
              {isSuccess ? 'Payment Successful' : 'Payment Pending'}
            </h1>
            <p className="text-muted-foreground">
              {isSuccess
                ? 'Thanks for your purchase. You can view your order status in your account.'
                : 'We are still confirming your payment. If you were charged, your order will update shortly.'}
            </p>
          </div>

          <div className="space-y-3">
            {isSuccess && (
              <Link to="/orders">
                <Button variant="hero" size="lg" className="w-full">
                  Go to My Orders
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
