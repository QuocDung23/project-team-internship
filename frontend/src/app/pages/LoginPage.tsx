import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck } from "@phosphor-icons/react";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    const target = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={target} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 text-zinc-100">
      <form onSubmit={onSubmit} className="panel flex w-full max-w-sm flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
            <ShieldCheck size={22} weight="duotone" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Driver Safety Login</h1>
            <p className="text-xs text-zinc-500">Sign in to continue</p>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Email
          <input
            className="rounded-md border border-hairline bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Password
          <input
            className="rounded-md border border-hairline bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-500"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className="text-xs text-rose-300">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
