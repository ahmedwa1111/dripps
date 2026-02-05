import { MainLayout } from '@/components/layout/MainLayout';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="bg-white">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 space-y-4">
              <span className="drip-badge drip-badge-purple">Legal</span>
              <h1 className="text-4xl font-bold text-foreground md:text-5xl">Terms &amp; Conditions</h1>
              <p className="text-muted-foreground text-base md:text-lg">
                These terms set the expectations for using the Drippss website and services.
                Please read them carefully before placing an order.
              </p>
              <p className="text-sm text-muted-foreground">Last updated: February 5, 2026</p>
            </div>

            <div className="space-y-6">
              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Agreement to Terms</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  By accessing or using Drippss, you agree to these Terms &amp; Conditions and any
                  additional policies referenced here. If you do not agree, do not use the site.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Eligibility &amp; Account</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  You must be able to form a binding contract to shop with us. If you create an
                  account, you are responsible for maintaining its security and accuracy.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Products &amp; Availability</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Product availability can change without notice. We may limit quantities, refuse
                  service, or discontinue items at any time.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Pricing &amp; Payments</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Prices are shown in the store at checkout. Taxes, shipping, and applicable fees
                  will be presented before you complete a purchase. Payment details must be valid
                  and authorized by you.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Shipping &amp; Delivery</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  We aim to ship orders promptly. Delivery times are estimates and may vary based on
                  location, carrier delays, or other factors outside our control.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Returns &amp; Exchanges</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Returns and exchanges are handled according to our current store policies.
                  Items must be in original condition and may be subject to restocking or shipping
                  charges.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Intellectual Property</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  All content, designs, graphics, and trademarks on Drippss are owned by or licensed
                  to us and are protected by applicable intellectual property laws.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">User Content &amp; Reviews</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  If you submit reviews or other content, you grant Drippss permission to display
                  that content in connection with our services. You are responsible for the content
                  you submit.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Prohibited Use</h2>
                <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground">
                  <li>Using the site for unlawful or fraudulent purposes.</li>
                  <li>Attempting to access restricted areas or accounts without permission.</li>
                  <li>Introducing malware, scraping, or disrupting site performance.</li>
                  <li>Misrepresenting your identity or placing unauthorized orders.</li>
                </ul>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Disclaimer</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  The Drippss site and services are provided "as is" and "as available" without
                  warranties of any kind. We do not guarantee uninterrupted or error-free service.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Limitation of Liability</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  To the maximum extent permitted by law, Drippss will not be liable for indirect,
                  incidental, or consequential damages arising from your use of the site or
                  purchases.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Indemnification</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  You agree to indemnify and hold Drippss harmless from any claims, damages, or
                  expenses arising from your use of the site or violation of these terms.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Changes to Terms</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  We may update these Terms &amp; Conditions from time to time. Updates will be
                  posted here with a new "Last updated" date.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Contact</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Questions about these terms? Email{" "}
                  <a
                    href="mailto:support@drippss.com"
                    className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
                  >
                    support@drippss.com
                  </a>
                  .
                </p>
                <p className="text-sm text-muted-foreground">
                  For privacy details, review our{" "}
                  <Link
                    to="/privacy-policy"
                    className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

