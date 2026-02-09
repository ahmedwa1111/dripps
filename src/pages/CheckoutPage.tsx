import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Lock, CreditCard, Check, Wallet } from 'lucide-react';
import { Address } from '@/types';
import { toast } from 'sonner';
import { formatCurrency, getFreeShippingThreshold, SHIPPING_COST, SHIPPING_DOUBLE_ITEMS_THRESHOLD, MAX_SHIPPING_COST } from '@/lib/utils';
import type { CartItem } from '@/types';
import { trackEvent } from '@/lib/analytics';

function getShippingCost(
  items: CartItem[],
  subtotal: number,
  freeShippingThreshold: number
): { cost: number; isDoubled: boolean } {
  if (subtotal >= freeShippingThreshold) return { cost: 0, isDoubled: false };
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const base = items.reduce(
    (sum, item) => sum + item.quantity * (item.product.shipping_price ?? SHIPPING_COST),
    0
  );
  const isDoubled = itemCount > SHIPPING_DOUBLE_ITEMS_THRESHOLD;
  const computed = isDoubled ? base * 2 : base;
  return { cost: Math.min(computed, MAX_SHIPPING_COST), isDoubled };
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal } = useCart();
  const { user } = useAuth();
  const createOrder = useCreateOrder();

  const [customerInfo, setCustomerInfo] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
  });

  const [shippingAddress, setShippingAddress] = useState<Address>({
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'EG',
    phone: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');

  const freeShippingThreshold = getFreeShippingThreshold();
  const { cost: shippingCost, isDoubled: shippingIsDoubled } = getShippingCost(
    items,
    subtotal,
    freeShippingThreshold
  );
  const total = subtotal + shippingCost;

  useEffect(() => {
    if (items.length === 0) return;
    trackEvent('checkout_start');
  }, [items.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!customerInfo.email || !shippingAddress.address1 || !shippingAddress.city) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1) Create order in your system first
      const created = await createOrder.mutateAsync({
        shippingAddress: {
          ...shippingAddress,
          firstName: shippingAddress.firstName || customerInfo.firstName,
          lastName: shippingAddress.lastName || customerInfo.lastName,
          country: 'EG',
        },
        customerEmail: customerInfo.email,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
        paymentMethod,
      });

      if (paymentMethod === 'cod') {
        setOrderComplete(true);
        toast.success('Order placed. Pay with cash on delivery.');
        return;
      }

      // لازم يكون ده order id من قاعدة بياناتك
      const merchantOrderId =
        (created as any)?.id ||
        (created as any)?.order?.id ||
        (created as any)?.data?.id ||
        `ORDER_${Date.now()}`;

      // 2) Amount in cents (EGP)
      const amountCents = Math.round(total * 100);

      // 3) Ask server to create paymob payment + return iframeUrl
      const resp = await fetch('/api/paymob/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          merchantOrderId,
          billingData: {
            first_name: customerInfo.firstName || shippingAddress.firstName || 'Customer',
            last_name: customerInfo.lastName || shippingAddress.lastName || 'Name',
            email: customerInfo.email,
            phone_number: shippingAddress.phone || '01000000000',
            city: shippingAddress.city || 'Cairo',
            state: shippingAddress.state || 'Cairo',
            street: shippingAddress.address1 || 'NA',
            postal_code: shippingAddress.zip || 'NA',
            country: 'EG',
            apartment: shippingAddress.address2 || 'NA',
            floor: 'NA',
            building: 'NA',
            shipping_method: 'NA',
          },
          items: items.map((i) => ({
            name: i.product.name,
            amount_cents: String(Math.round(i.product.price * 100)),
            description: i.product.description || i.product.name,
            quantity: i.quantity,
          })),
          returnUrl: `${window.location.origin}/payment-result`,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const message =
          typeof data?.error === 'string' && data.error.length > 0
            ? data.error
            : 'Payment setup failed';
        throw new Error(message);
      }

      // 4) Redirect to Paymob iframe
      window.location.href = data.iframeUrl;
    } catch (error) {
      console.error('Checkout failed:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Checkout failed. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <MainLayout showFooter={false}>
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold mb-4">Order Confirmed!</h1>
            <p className="text-muted-foreground mb-8">
              Thank you for your order.{' '}
              {paymentMethod === 'cod'
                ? 'You selected Cash on Delivery.'
                : "We've sent a confirmation email to"}{' '}
              {paymentMethod === 'cod' ? null : (
                <span className="font-medium text-foreground">{customerInfo.email}</span>
              )}
              {paymentMethod === 'cod' ? null : '.'}
            </p>
            <div className="space-y-4">
              <Link to="/orders">
                <Button variant="hero" size="lg" className="w-full">
                  View My Orders
                </Button>
              </Link>
              <Link to="/shop">
                <Button variant="outline" size="lg" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <MainLayout showFooter={false}>
      <div className="container mx-auto px-4 py-8">
        <Link to="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cart
        </Link>

        <h1 className="font-display text-3xl lg:text-4xl font-bold mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Contact */}
              <section className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-xl font-bold mb-6">Contact Information</h2>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={customerInfo.firstName}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={customerInfo.lastName}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Shipping */}
              <section className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-display text-xl font-bold mb-6">Shipping Address</h2>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="address1">Address *</Label>
                    <Input
                      id="address1"
                      value={shippingAddress.address1}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address1: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address2">Apartment, suite, etc. (optional)</Label>
                    <Input
                      id="address2"
                      value={shippingAddress.address2}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address2: e.target.value })}
                    />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code *</Label>
                      <Input
                        id="zip"
                        value={shippingAddress.zip}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone (recommended)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                      placeholder="010xxxxxxxx"
                    />
                  </div>
                </div>
              </section>

              {/* Payment */}
              <section className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl font-bold">Payment</h2>
                </div>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as 'card' | 'cod')}
                  className="grid gap-3"
                >
                  <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer">
                    <RadioGroupItem value="card" id="pay-card" />
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted text-primary">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Pay with Card</p>
                        <p className="text-xs text-muted-foreground">
                          Pay securely via Paymob (VISA/MASTERCARD).
                        </p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer">
                    <RadioGroupItem value="cod" id="pay-cod" />
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted text-amber-600">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">
                          Pay in cash when your order arrives.
                        </p>
                      </div>
                    </div>
                  </label>
                </RadioGroup>
                {paymentMethod === 'card' && (
                  <div className="bg-muted rounded-lg p-4 flex items-start gap-3 mt-4">
                    <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      You will be redirected to Paymob to complete your payment securely.
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card rounded-xl border border-border p-6 space-y-6">
                <h2 className="font-display text-xl font-bold">Order Summary</h2>

                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={item.product.image_url || '/placeholder.svg'}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                        {(item.size || item.color) && (
                          <p className="text-xs text-muted-foreground">
                            {[item.size ? `Size: ${item.size}` : null, item.color ? `Color: ${item.color}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.product.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {shippingCost === 0 ? (
                        <span className="text-green-600">Included</span>
                      ) : (
                        formatCurrency(shippingCost)
                      )}
                    </span>
                  </div>
                  {shippingIsDoubled && shippingCost > 0 && (
                    <p className="text-xs text-muted-foreground">
                      2× shipping applied (more than {SHIPPING_DOUBLE_ITEMS_THRESHOLD} items)
                    </p>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between text-lg">
                    <span className="font-display font-bold">Total</span>
                    <span className="font-display font-bold">{formatCurrency(total)}</span>
                  </div>
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting
                    ? paymentMethod === 'card'
                      ? 'Redirecting...'
                      : 'Placing order...'
                    : paymentMethod === 'card'
                    ? 'Pay with Card'
                    : 'Place Order (Cash on Delivery)'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By placing your order, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
