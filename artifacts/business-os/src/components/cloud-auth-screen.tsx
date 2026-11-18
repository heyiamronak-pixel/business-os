import * as React from "react";
import { Cloud, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithPassword, signUpWithPassword } from "@/lib/cloud";
import { useAppStore } from "@/lib/store";

export function CloudAuthScreen() {
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!email.trim() || password.length < 8) {
      setMessage("Enter your email and a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const session = await signUpWithPassword(email, password);
        if (!session) {
          setMessage("Account created. Check your email to confirm your account, then sign in here.");
          toast.success("Check your email to confirm your account.");
          return;
        }
      } else {
        await signInWithPassword(email, password);
      }
      await useAppStore.getState().hydrate();
      toast.success("Secure cloud workspace connected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not authenticate. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-backdrop flex min-h-dvh items-center justify-center px-4 py-10 text-foreground">
      <section className="w-full max-w-[440px] overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_24px_80px_rgba(19,43,61,0.12)]">
        <div className="bg-[#102033] px-7 py-8 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#1B4965] via-[#16747A] to-[#55B8AE]"><Cloud className="size-5" /></span>
            <div>
              <p className="text-sm font-semibold tracking-tight">Business Sutra</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.17em] text-[#A9BAC9]">Secure cloud workspace</p>
            </div>
          </div>
          <h1 className="mt-8 font-display text-[2rem] leading-tight tracking-[-0.05em]">{mode === "signin" ? "Welcome back." : "Create your account."}</h1>
          <p className="mt-2 text-sm leading-6 text-[#B8C7D4]">Your business records sync securely to your cloud database and stay available across devices.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-7">
          <div className="flex rounded-xl bg-muted p-1">
            <button type="button" onClick={() => { setMode("signin"); setMessage(""); }} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Sign in</button>
            <button type="button" onClick={() => { setMode("signup"); setMessage(""); }} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Create account</button>
          </div>
          <label className="block space-y-1.5 text-xs font-semibold">
            Email address
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="h-11 pl-10" />
            </span>
          </label>
          <label className="block space-y-1.5 text-xs font-semibold">
            Password
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="h-11 pl-10" />
            </span>
          </label>
          {message ? <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">{message}</p> : null}
          <Button type="submit" disabled={busy} className="h-11 w-full">{busy ? "Please wait…" : mode === "signin" ? "Sign in securely" : "Create secure account"}</Button>
          <div className="flex items-start gap-2 rounded-xl bg-muted/70 p-3 text-[11px] leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Business data is protected by database access policies. Your password is handled by Supabase Auth and is never stored in Business Sutra.</span>
          </div>
        </form>
      </section>
    </main>
  );
}
