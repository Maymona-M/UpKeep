"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ next }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      router.push(next || "/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-6"
      style={{ borderColor: "var(--color-ink-soft)", background: "var(--color-ink-soft)" }}
    >
      <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: "var(--color-mint-soft)" }}>
        Email
      </label>
      <input
        id="email"
        type="email"
        autoFocus
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl px-4 py-2.5 text-white bg-transparent border outline-none mb-4"
        style={{ borderColor: "var(--color-teal)" }}
        placeholder="you@example.com"
      />

      <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: "var(--color-mint-soft)" }}>
        Password
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl px-4 py-2.5 text-white bg-transparent border outline-none"
        style={{ borderColor: "var(--color-teal)" }}
        placeholder="••••••••"
      />

      {error && (
        <p className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: "#F2A93B22", color: "var(--color-amber)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="mt-4 w-full rounded-xl py-2.5 font-medium transition disabled:opacity-50"
        style={{ background: "var(--color-teal)", color: "white" }}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <div className="mt-4 flex items-center justify-between text-xs">
        <a href="/signup" style={{ color: "var(--color-mint)" }}>
          Create an account
        </a>
        <a href="/forgot-password" style={{ color: "var(--color-mint)" }}>
          Forgot password?
        </a>
      </div>

      <p className="mt-4 text-xs text-center" style={{ color: "var(--color-mint)" }}>
        Family members don't sign in here — use the private link the admin shared with you.
      </p>
    </form>
  );
}
