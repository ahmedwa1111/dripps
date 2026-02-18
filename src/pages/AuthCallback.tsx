import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const FALLBACK_ERROR = "Could not complete sign-in. Please try again.";

const getMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: string }).message;
    if (value) {
      return value;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return FALLBACK_ERROR;
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    let isMounted = true;

    const finalizeAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const providerError = params.get("error_description") || params.get("error");

      if (providerError) {
        throw new Error(providerError);
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          throw error;
        }
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (!isMounted) {
        return;
      }

      if (session?.user) {
        navigate("/dashboard", { replace: true });
        return;
      }

      navigate(`/auth?error=${encodeURIComponent(FALLBACK_ERROR)}`, { replace: true });
    };

    finalizeAuth().catch((error) => {
      if (!isMounted) {
        return;
      }

      const message = getMessage(error);
      setStatus(message);
      window.setTimeout(() => {
        navigate(`/auth?error=${encodeURIComponent(message)}`, { replace: true });
      }, 1200);
    });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <p className="text-sm text-slate-700">{status}</p>
      </div>
    </div>
  );
}
