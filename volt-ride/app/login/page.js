"use client";

import Link from "next/link";
import { useState } from "react";
import NoticeModal from "@/components/NoticeModal";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось войти");
      window.location.href = data.user.role === "admin" ? "/admin" : "/account";
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return <><main className="page-container" style={{maxWidth:560}}>
    <Link href="/" className="brand d-inline-block mb-4">VOLT RIDE</Link>
    <div className="panel">
      <h1 className="section-title mb-2">С возвращением</h1><p className="muted mb-4">Войди в аккаунт, чтобы продолжить.</p>

      <form onSubmit={submit} className="d-grid gap-3">
        <label>Email<input className="form-control mt-2" type="email" autoComplete="email" required maxLength={190} value={form.email} onChange={e => setForm({...form,email:e.target.value})}/></label>
        <label>Пароль<input className="form-control mt-2" type="password" autoComplete="current-password" required value={form.password} onChange={e => setForm({...form,password:e.target.value})}/></label>
        <button className="btn btn-volt" disabled={busy}>{busy ? "Входим…" : "Войти"}</button>
      </form>
      <p className="muted mt-4 mb-0">Нет аккаунта? <Link href="/register" style={{color:"var(--accent)"}}>Зарегистрироваться</Link></p>
    </div>
  </main>
    <NoticeModal open={!!error} title="Не удалось выполнить действие" message={error} tone="error" onClose={() => setError("")} /></>;
}
