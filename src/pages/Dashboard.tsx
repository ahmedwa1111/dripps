import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);

    const { error: signOutError } = await signOut();

    setIsSigningOut(false);

    if (signOutError) {
      setError(signOutError);
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">You are signed in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Logged in as <span className="font-medium text-slate-900">{user?.email ?? "Unknown user"}</span>
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
