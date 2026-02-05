import { MainLayout } from '@/components/layout/MainLayout';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <div className="bg-white">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="mb-10 space-y-4">
              <span className="drip-badge drip-badge-purple">Legal</span>
              <h1 className="text-4xl font-bold text-foreground md:text-5xl">Privacy Policy</h1>
              <p className="text-muted-foreground text-base md:text-lg">
                Your privacy matters. This policy explains how Drippss collects, uses, and
                protects your information when you browse or shop with us.
              </p>
              <p className="text-sm text-muted-foreground">Last updated: February 5, 2026</p>
            </div>

            <div className="space-y-6">
              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Overview</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Drippss collects only the information we need to deliver products, support
                  customers, and improve the shopping experience. We do not sell personal data.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Information We Collect</h2>
                <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground">
                  <li>Contact info, such as your name, email, and phone number.</li>
                  <li>Order details, including products, size/color selections, and delivery info.</li>
                  <li>Account info if you create an account with us.</li>
                  <li>Preferences like favorites, settings, and saved items.</li>
                  <li>
                    Technical data such as basic analytics, device identifiers, and browser data.
                  </li>
                </ul>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">How We Use Your Information</h2>
                <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground">
                  <li>Process orders, payments, and delivery.</li>
                  <li>Provide customer support and respond to inquiries.</li>
                  <li>Improve our site, products, and overall experience.</li>
                  <li>Prevent fraud, abuse, and protect our customers.</li>
                  <li>Send marketing messages only when you opt in, and you can opt out at any time.</li>
                </ul>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Cookies & Similar Technologies</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  We use cookies and similar tools to keep the site secure, remember your
                  preferences, and understand how visitors use the store. You can manage
                  cookies in your browser settings.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Sharing of Information</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  We share information with trusted partners who help us run the store, such as:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground">
                  <li>Shipping providers for fulfillment and delivery updates.</li>
                  <li>Payment processors to complete transactions securely.</li>
                  <li>Analytics tools (if used) to understand performance.</li>
                </ul>
                <p className="text-sm md:text-base text-muted-foreground">
                  We never sell your personal information.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Data Retention</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  We keep personal information only as long as needed to fulfill orders, provide
                  support, or meet legitimate business needs, and then delete or anonymize it.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Security</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  We use reasonable safeguards to protect your information. No system is 100%
                  secure, but we continuously work to keep your data safe.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Your Rights</h2>
                <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground">
                  <li>Request access to the personal information we hold about you.</li>
                  <li>Request corrections to inaccurate or incomplete data.</li>
                  <li>Ask us to delete your information where applicable.</li>
                  <li>Opt out of marketing communications at any time.</li>
                </ul>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Children's Privacy</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Drippss is not directed to children under 13, and we do not knowingly collect
                  personal information from children.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Changes to This Policy</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  We may update this policy from time to time. Any updates will be posted on this
                  page with a new "Last updated" date.
                </p>
              </section>

              <section className="glass-card p-6 md:p-8 space-y-4">
                <h2 className="text-2xl font-semibold text-primary">Contact Us</h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Questions about privacy? Reach out at{" "}
                  <a
                    href="mailto:support@drippss.com"
                    className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
                  >
                    support@drippss.com
                  </a>
                  .
                </p>
                <p className="text-sm text-muted-foreground">
                  Want to review our terms? Visit{" "}
                  <Link
                    to="/terms"
                    className="text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
                  >
                    Terms &amp; Conditions
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

