"use client";

import Link from "next/link";
import { useState } from "react";
import NoticeModal from "@/components/NoticeModal";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", acceptedRules: false });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось зарегистрироваться");
      window.location.href = "/account";
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return <><main className="page-container" style={{maxWidth:600}}>
    <Link href="/" className="brand d-inline-block mb-4">VOLT RIDE</Link>
    <div className="panel">
      <h1 className="section-title mb-2">Создай аккаунт</h1><p className="muted mb-4">Один аккаунт — все поездки и история баланса.</p>

      <form onSubmit={submit} className="d-grid gap-3">
        <label>Имя<input className="form-control mt-2" autoComplete="name" required minLength={2} maxLength={80} value={form.name} onChange={e => setForm({...form,name:e.target.value})}/></label>
        <label>Email<input className="form-control mt-2" type="email" autoComplete="email" required maxLength={190} value={form.email} onChange={e => setForm({...form,email:e.target.value})}/></label>
        <label>Пароль<input className="form-control mt-2" type="password" autoComplete="new-password" required minLength={10} maxLength={72} value={form.password} onChange={e => setForm({...form,password:e.target.value})}/><span className="muted small">Минимум 10 символов, строчная и заглавная латинские буквы, цифра.</span></label>
        <label className="d-flex gap-2 align-items-start"><input className="form-check-input mt-1" type="checkbox" required checked={form.acceptedRules} onChange={e => setForm({...form,acceptedRules:e.target.checked})}/><span>Мне исполнилось 18 лет, я ознакомился с правилами аренды и обязуюсь соблюдать местные требования.</span></label>
        <button className="btn btn-volt" disabled={busy}>{busy ? "Создаём аккаунт…" : "Зарегистрироваться"}</button>
      </form>
      <p className="muted mt-4 mb-0">Уже зарегистрирован? <Link href="/login" style={{color:"var(--accent)"}}>Войти</Link></p>
    </div>
  </main>
    <NoticeModal open={!!error} title="Не удалось выполнить действие" message={error} tone="error" onClose={() => setError("")} /></>;
}
