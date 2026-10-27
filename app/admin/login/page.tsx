"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Utensils } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { LanguageSwitch } from "@/components/language-switch";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("auth.couldNotSignIn"));
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.couldNotSignIn"));
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#f7f8f6] px-4 py-10 text-[#202521]">
      <LanguageSwitch className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#174d3c] text-white">
            <Utensils className="size-6" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight"></h1>
          <p className="mt-1 text-xs uppercase tracking-[.18em] text-[#89938b]">
            {t("auth.adminPanel")}
          </p>
        </div>
        <form
          onSubmit={submit}
          className="rounded-2xl border border-[#e3e8e1] bg-white p-6 shadow-sm"
        >
          <h2 className="font-serif text-lg font-bold">{t("auth.signIn")}</h2>
          <p className="mt-1 text-xs text-[#87928a]">
            {t("auth.signInHint")}
          </p>
          <label
            className="mt-6 block text-xs font-semibold text-[#5f6b62]"
            htmlFor="email"
          >
            {t("auth.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] px-3 text-sm outline-none focus:border-[#8eaf9b]"
          />
          <label
            className="mt-4 block text-xs font-semibold text-[#5f6b62]"
            htmlFor="password"
          >
            {t("auth.password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-[#e2e7e1] bg-[#fbfcfb] px-3 text-sm outline-none focus:border-[#8eaf9b]"
          />
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-[#fdf0ec] px-3 py-2 text-xs font-medium text-[#b4472c]"
            >
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#174d3c] text-sm font-semibold text-white transition hover:bg-[#123f31] disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LockKeyhole className="size-4" />
            )}{" "}
            {t("auth.signIn")}
          </button>
        </form>
      </div>
    </main>
  );
}
