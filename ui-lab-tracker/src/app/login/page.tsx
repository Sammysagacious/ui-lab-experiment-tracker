"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("researcher.demo@ui.edu.ng");
  const [password, setPassword] = useState("LabDemo123!");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg("Authentication failed. Verify your institutional email and password.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  function applyDemoRole(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("LabDemo123!");
    setErrorMsg(null);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
      {/* Left Navy Institutional Panel */}
      <aside className="relative flex flex-col justify-between bg-[#081a30] p-8 text-white lg:col-span-5 xl:col-span-5 lg:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.45) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Top Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/15 text-sky-300">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/90">
                University of Ibadan
              </p>
              <h2 className="text-sm font-bold tracking-wide text-white">
                FACULTY OF SCIENCE
              </h2>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Division of Laboratory Custody &amp; Research
              </p>
            </div>
          </div>

          {/* Center System Title */}
          <div className="mt-12 lg:mt-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              CENTRAL RESEARCH INFRASTRUCTURE V4.2
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              Laboratory Experiment Tracking System
            </h1>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
              Centralized archival, sample custody, and protocol tracking for
              departmental laboratories and scientific research clusters across
              the Faculty of Science.
            </p>

            {/* Telemetry Strip */}
            <div className="mt-8 grid grid-cols-3 gap-4 border-y border-white/10 py-4 tabular-nums">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Node Status
                </p>
                <p className="mt-1 text-sm font-bold text-white">UI-CERLS 01</p>
                <p className="text-[11px] text-emerald-400">● Subnet Active</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Departments
                </p>
                <p className="mt-1 text-sm font-bold text-white">11 Active</p>
                <p className="text-[11px] text-slate-400">Faculty of Science</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Custody Integrity
                </p>
                <p className="mt-1 text-sm font-bold text-white">99.98%</p>
                <p className="text-[11px] text-sky-300">Audit Trail Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Motto & Est */}
        <div className="relative z-10 mt-10 flex items-end justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <div>
            <p className="italic text-slate-300">
              &ldquo;Recte Sapere Fons&rdquo; — To know wisely is the fountain of
              knowledge.
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">
              EST. 1948 • IBADAN
            </p>
          </div>
          <span className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300">
            UI-FOS-PORTAL
          </span>
        </div>
      </aside>

      {/* Right Sign-In Card */}
      <main className="flex flex-col items-center justify-center bg-[#f4f6f9] p-6 lg:col-span-7 xl:col-span-7 lg:p-12">
        <div className="w-full max-w-lg rounded-xl border border-slate-200/90 bg-white p-7 shadow-sm sm:p-9">
          {/* Top Gateway Status Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              System Gateway Online
            </span>
            <span className="rounded bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-600">
              UI-SCI-SEC-V3
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign In to Lab Portal
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter your institutional credentials to access assigned experiments,
            sample custody logs, and laboratory equipment.
          </p>

          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Institutional Email
                </label>
                <span className="font-mono text-[11px] text-slate-400">
                  @ui.edu.ng
                </span>
              </div>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher.demo@ui.edu.ng"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50/50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 transition focus:border-[#0B1F3A] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  Demo Pass: LabDemo123!
                </span>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-900 transition focus:border-[#0B1F3A] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0B1F3A] focus:ring-[#0B1F3A]"
                />
                <span>Remember this workstation for 30 days</span>
              </label>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                RBAC Enabled
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B1F3A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#132f57] disabled:opacity-60"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Workbench"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Demo Role Switcher for Presentation */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                Live Demo Role Quick-Fill
              </span>
              <span className="text-[11px] text-slate-400">Click to populate</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => applyDemoRole("researcher.demo@ui.edu.ng")}
                className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-left transition hover:border-sky-400 hover:bg-sky-50/50"
              >
                <p className="text-xs font-bold text-slate-800">Researcher</p>
                <p className="text-[10px] text-slate-500">Experiments</p>
              </button>

              <button
                type="button"
                onClick={() => applyDemoRole("assistant.demo@ui.edu.ng")}
                className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-left transition hover:border-sky-400 hover:bg-sky-50/50"
              >
                <p className="text-xs font-bold text-slate-800">Lab Asst.</p>
                <p className="text-[10px] text-slate-500">Samples &amp; Gear</p>
              </button>

              <button
                type="button"
                onClick={() => applyDemoRole("supervisor.demo@ui.edu.ng")}
                className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-left transition hover:border-sky-400 hover:bg-sky-50/50"
              >
                <p className="text-xs font-bold text-slate-800">Supervisor</p>
                <p className="text-[10px] text-slate-500">Review &amp; Reports</p>
              </button>

              <button
                type="button"
                onClick={() => applyDemoRole("admin.demo@ui.edu.ng")}
                className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-left transition hover:border-sky-400 hover:bg-sky-50/50"
              >
                <p className="text-xs font-bold text-slate-800">Admin</p>
                <p className="text-[10px] text-slate-500">Users &amp; Access</p>
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-slate-200/80 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              Protected by Faculty of Science Role-Based Access Control (RBAC).
              All sample custody updates, experiment logs, and results are
              recorded with user and timestamp attribution.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}