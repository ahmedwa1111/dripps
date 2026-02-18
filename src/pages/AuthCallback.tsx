import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    let isMounted = true;

    const finalizeAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

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
        navigate("/", { replace: true });
        return;
      }

      navigate("/", { replace: true });
    };

    finalizeAuth().catch(() => {
      if (!isMounted) {
        return;
      }

      setStatus("Unable to complete sign-in. Redirecting...");
      window.setTimeout(() => navigate("/", { replace: true }), 900);
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
