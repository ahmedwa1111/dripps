import { useEffect, useMemo, useState, type FormEvent, type SVGProps } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, type OAuthProvider } from "@/auth/AuthContext";

type AuthTab = "signin" | "signup";
type AuthMethod = "password" | "magic_link";
type LoadingAction =
  | "signin"
  | "signup"
  | "magic_link"
  | "forgot_password"
  | "reset_password"
  | "oauth_google"
  | "oauth_facebook"
  | "oauth_apple";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buttonBaseClass =
  "flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M21.805 10.023h-9.18v3.955h5.262c-.227 1.272-.953 2.35-2.03 3.076v2.553h3.286c1.922-1.77 3.029-4.378 3.029-7.486 0-.696-.063-1.365-.18-2.098Z"
      />
      <path
        fill="#34A853"
        d="M12.625 22c2.587 0 4.758-.857 6.344-2.393l-3.286-2.553c-.913.612-2.082.973-3.058.973-2.35 0-4.339-1.587-5.05-3.72H4.183v2.633C5.76 20.069 8.922 22 12.625 22Z"
      />
      <path
        fill="#FBBC05"
        d="M7.575 14.307c-.18-.54-.282-1.115-.282-1.707 0-.592.102-1.168.282-1.707V8.26H4.183A9.358 9.358 0 0 0 3.2 12.6c0 1.503.361 2.924.983 4.34l3.392-2.633Z"
      />
      <path
        fill="#EA4335"
        d="M12.625 7.173c1.406 0 2.67.484 3.664 1.433l2.747-2.747C17.376 4.331 15.208 3.2 12.625 3.2c-3.703 0-6.864 1.931-8.442 4.86l3.392 2.633c.711-2.133 2.7-3.52 5.05-3.52Z"
      />
    </svg>
  );
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M22 12.07C22 6.507 17.523 2 12 2S2 6.507 2 12.07c0 5.026 3.657 9.193 8.438 9.93v-7.026H7.898V12.07h2.54V9.856c0-2.514 1.478-3.903 3.74-3.903 1.083 0 2.217.196 2.217.196v2.468h-1.25c-1.232 0-1.617.772-1.617 1.565v1.888h2.752l-.44 2.904h-2.312V22c4.781-.737 8.438-4.904 8.438-9.93Z"
      />
    </svg>
  );
}

function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.119-.417 2.146-1.112 2.9-.739.793-1.943 1.406-3.057 1.314-.141-1.056.382-2.148 1.113-2.862.75-.746 2.026-1.287 3.056-1.352ZM20.483 17.474c-.42.98-.619 1.417-1.16 2.287-.753 1.212-1.816 2.72-3.136 2.734-1.174.012-1.478-.77-3.073-.762-1.595.008-1.929.776-3.103.764-1.321-.014-2.326-1.373-3.08-2.586-2.104-3.376-2.326-7.342-1.027-9.353.921-1.426 2.37-2.261 3.73-2.261 1.386 0 2.258.778 3.406.778 1.111 0 1.787-.779 3.39-.779 1.211 0 2.493.672 3.41 1.838-2.997 1.681-2.51 6.042.643 7.34Z"
      />
    </svg>
  );
}

interface OAuthButtonProps {
  label: string;
  provider: OAuthProvider;
  loadingAction: LoadingAction | null;
  disabled: boolean;
  onClick: (provider: OAuthProvider) => Promise<void>;
}

function OAuthButton({ label, provider, loadingAction, disabled, onClick }: OAuthButtonProps) {
  const actionMap: Record<OAuthProvider, LoadingAction> = {
    google: "oauth_google",
    facebook: "oauth_facebook",
    apple: "oauth_apple",
  };

  const isLoading = loadingAction === actionMap[provider];

  const icon = {
    google: <GoogleIcon className="h-5 w-5" />,
    facebook: <FacebookIcon className="h-4 w-4 text-[#1877F2]" />,
    apple: <AppleIcon className="h-4 w-4 text-slate-900" />,
  }[provider];

  return (
    <button
      type="button"
      className={buttonBaseClass}
      disabled={disabled}
      onClick={() => onClick(provider)}
    >
      {icon}
      <span>{isLoading ? "Redirecting..." : label}</span>
    </button>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    loading,
    signIn,
    signUp,
    signInWithMagicLink,
    signInWithOAuth,
    sendPasswordResetEmail,
    updatePassword,
  } = useAuth();

  const [tab, setTab] = useState<AuthTab>("signin");
  const [method, setMethod] = useState<AuthMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [loadingAction, setLoadingAction] = useState<LoadingAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isResetMode = searchParams.get("mode") === "reset";
  const callbackError = searchParams.get("error");

  const redirectPath = useMemo(() => {
    const state = location.state as { from?: string } | null;
    if (!state?.from || state.from.startsWith("/auth")) {
      return "/dashboard";
    }

    return state.from;
  }, [location.state]);

  const isBusy = loading || loadingAction !== null;

  useEffect(() => {
    if (!callbackError) {
      return;
    }

    setError(callbackError);

    const next = new URLSearchParams(searchParams);
    next.delete("error");
    setSearchParams(next, { replace: true });
  }, [callbackError, searchParams, setSearchParams]);

  useEffect(() => {
    if (!loading && user && !isResetMode) {
      navigate(redirectPath, { replace: true });
    }
  }, [loading, user, isResetMode, redirectPath, navigate]);

  const clearMessages = () => {
    setError(null);
    setInfo(null);
  };

  const validateEmail = () => {
    if (!email.trim()) {
      return "Email is required.";
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return "Please enter a valid email address.";
    }

    return null;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      return "Password is required.";
    }

    if (value.length < 8) {
      return "Password must be at least 8 characters.";
    }

    return null;
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    clearMessages();

    const action: Record<OAuthProvider, LoadingAction> = {
      google: "oauth_google",
      facebook: "oauth_facebook",
      apple: "oauth_apple",
    }[provider];

    setLoadingAction(action);

    const { error: oauthError } = await signInWithOAuth(provider);

    if (oauthError) {
      setError(oauthError);
      setLoadingAction(null);
      return;
    }

    setInfo("Redirecting to provider...");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearMessages();

    if (isResetMode) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      if (!user) {
        setError("This reset link is invalid or expired. Request a new password reset email.");
        return;
      }

      setLoadingAction("reset_password");
      const { error: resetError } = await updatePassword(password);
      setLoadingAction(null);

      if (resetError) {
        setError(resetError);
        return;
      }

      setInfo("Password updated. Redirecting to your dashboard...");
      navigate("/dashboard", { replace: true });
      return;
    }

    const emailError = validateEmail();
    if (emailError) {
      setError(emailError);
      return;
    }

    if (forgotPasswordMode) {
      setLoadingAction("forgot_password");
      const { error: forgotError } = await sendPasswordResetEmail(email.trim());
      setLoadingAction(null);

      if (forgotError) {
        setError(forgotError);
        return;
      }

      setInfo("Password reset email sent. Check your inbox for the secure link.");
      return;
    }

    if (tab === "signup") {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setLoadingAction("signup");
      const { error: signUpError, requiresEmailVerification } = await signUp(email.trim(), password);
      setLoadingAction(null);

      if (signUpError) {
        setError(signUpError);
        return;
      }

      if (requiresEmailVerification) {
        setInfo("Account created. Check your email to verify your account before signing in.");
      } else {
        navigate("/dashboard", { replace: true });
      }

      return;
    }

    if (method === "magic_link") {
      setLoadingAction("magic_link");
      const { error: magicError } = await signInWithMagicLink(email.trim());
      setLoadingAction(null);

      if (magicError) {
        setError(magicError);
        return;
      }

      setInfo("Magic link sent. Open your email and continue from the secure link.");
      return;
    }

    const passwordError = password ? null : "Password is required.";
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoadingAction("signin");
    const { error: signInError } = await signIn(email.trim(), password);
    setLoadingAction(null);

    if (signInError) {
      setError(signInError);
      return;
    }

    navigate(redirectPath, { replace: true });
  };

  const title = isResetMode
    ? "Reset password"
    : forgotPasswordMode
      ? "Forgot password"
      : tab === "signin"
        ? "Sign in"
        : "Sign up";

  const subtitle = isResetMode
    ? "Set a new password for your account."
    : forgotPasswordMode
      ? "Enter your email and we will send a reset link."
      : tab === "signin"
        ? "Welcome back."
        : "Create your account to continue.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>

        {!isResetMode && !forgotPasswordMode && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setTab("signin");
                  clearMessages();
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === "signin" ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900"
                }`}
                disabled={isBusy}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setMethod("password");
                  clearMessages();
                }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === "signup" ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900"
                }`}
                disabled={isBusy}
              >
                Sign up
              </button>
            </div>

            {tab === "signin" && (
              <div className="mt-4 space-y-2">
                <OAuthButton
                  label="Continue with Google"
                  provider="google"
                  loadingAction={loadingAction}
                  disabled={isBusy}
                  onClick={handleOAuth}
                />
                <OAuthButton
                  label="Continue with Facebook"
                  provider="facebook"
                  loadingAction={loadingAction}
                  disabled={isBusy}
                  onClick={handleOAuth}
                />
                <OAuthButton
                  label="Continue with Apple"
                  provider="apple"
                  loadingAction={loadingAction}
                  disabled={isBusy}
                  onClick={handleOAuth}
                />
              </div>
            )}

            {tab === "signin" && (
              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                <span>or</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {info && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="you@example.com"
              disabled={isBusy}
              required
            />
          </div>

          {((tab === "signin" && method === "password" && !forgotPasswordMode) ||
            tab === "signup" ||
            isResetMode) && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                {tab === "signin" && !isResetMode && !forgotPasswordMode && method === "password" && (
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                    onClick={() => {
                      setForgotPasswordMode(true);
                      clearMessages();
                    }}
                    disabled={isBusy}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isResetMode ? "new-password" : tab === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-16 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter your password"
                  disabled={isBusy}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-600 hover:text-slate-900"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={isBusy}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {(tab === "signup" || isResetMode) && (
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="Re-enter your password"
                disabled={isBusy}
                required
              />
            </div>
          )}

          {tab === "signin" && !forgotPasswordMode && !isResetMode && (
            <button
              type="button"
              className="w-full text-left text-sm font-medium text-slate-600 hover:text-slate-900"
              onClick={() => {
                setMethod((current) => (current === "password" ? "magic_link" : "password"));
                setPassword("");
                clearMessages();
              }}
              disabled={isBusy}
            >
              {method === "password" ? "Use magic link instead" : "Use password instead"}
            </button>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
          >
            {loadingAction === "signin" && "Signing in..."}
            {loadingAction === "signup" && "Creating account..."}
            {loadingAction === "magic_link" && "Sending magic link..."}
            {loadingAction === "forgot_password" && "Sending reset email..."}
            {loadingAction === "reset_password" && "Updating password..."}
            {!loadingAction &&
              (isResetMode
                ? "Update password"
                : forgotPasswordMode
                  ? "Send reset link"
                  : tab === "signup"
                    ? "Create account"
                    : method === "magic_link"
                      ? "Send magic link"
                      : "Sign in")}
          </button>
        </form>

        {forgotPasswordMode && !isResetMode && (
          <button
            type="button"
            className="mt-4 w-full text-sm font-medium text-slate-600 hover:text-slate-900"
            onClick={() => {
              setForgotPasswordMode(false);
              setMethod("password");
              clearMessages();
            }}
            disabled={isBusy}
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
