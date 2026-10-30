"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import NoticeModal from "@/components/NoticeModal";
import { getRideAccruedCost } from "@/lib/pricing";

const money = cents => new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB"}).format(Number(cents||0)/100);
const date = value => value ? new Date(value).toLocaleString("ru-RU") : "—";
const operationNames = { topup:"Пополнение баланса", ride_charge:"Оплата поездки", fine:"Оплата штрафа", refund:"Возврат средств", adjustment:"Корректировка баланса" };

function elapsedLabel(startedAt, now) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return h ? `${h} ч ${m} мин ${s} сек` : `${m} мин ${s} сек`;
}

export default function AccountPage() {
  const [data,setData] = useState(null);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const [busy,setBusy] = useState(false);
  const [topupOpen,setTopupOpen] = useState(false);
  const [topupAmount,setTopupAmount] = useState("100");
  const [now,setNow] = useState(Date.now());

  async function load() {
    const r = await fetch("/api/account");
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Войдите в аккаунт"); return; }
    setData(d);
    window.dispatchEvent(new Event("volt:refresh"));
  }
  useEffect(()=>{
    load().catch(()=>setError("Не удалось загрузить кабинет"));
    const timer=setInterval(()=>load().catch(()=>{}),8000);
    const clock=setInterval(()=>setNow(Date.now()),1000);
    return()=>{clearInterval(timer);clearInterval(clock)};
  },[]);

  async function topup() {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) <= 0) { setError("Введите положительную сумму пополнения."); setTopupOpen(false); return; }
    setBusy(true); setError(""); setSuccess("");
    try {
      const r = await fetch("/api/wallet/topup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount})});
      const d = await r.json(); if(!r.ok) throw new Error(d.error || "Ошибка пополнения");
      await load();
      setTopupOpen(false);
      setSuccess("Баланс успешно пополнен в локальном демонстрационном режиме. Реальные деньги не списывались.");
    } catch(e) { setTopupOpen(false); setError(e.message); } finally { setBusy(false); }
  }

  async function rideAction(rideId, action) {
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/rides/${rideId}/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      const d = await r.json(); if(!r.ok) throw new Error(d.error || "Ошибка поездки");
      await load();
      window.dispatchEvent(new Event("volt:refresh"));
      setSuccess("Поездка успешно завершена.");
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }

  if (error && !data) return <><TopNav/><main className="page-container"><div className="panel"><h1 className="section-title">Личный кабинет</h1><p>{error}</p><Link className="btn btn-volt" href="/login">Войти</Link></div></main><NoticeModal open={!!error} title="Не удалось загрузить кабинет" message={error} tone="error" onClose={()=>setError("")}/></>;
  if (!data) return <><TopNav/><main className="page-container">Загружаем кабинет…</main></>;

  const {user,transactions,rides,fines,notifications} = data;
  return <><TopNav/><main className="page-container">
    <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4"><div><div className="badge-volt">ЛИЧНЫЙ КАБИНЕТ</div><h1 className="hero-title mt-3">Привет, <span>{user.name}</span></h1><p className="muted">{user.email}</p></div><button className="btn btn-volt" disabled={busy} onClick={()=>{setTopupAmount("100");setTopupOpen(true)}}>＋ Пополнить баланс</button></div>
    <div className="row g-3 mb-4">
      <div className="col-md-4"><div className="panel"><div className="muted">Текущий баланс</div><div className="stat-number mt-2">{money(user.balanceCents)}</div><div className="muted small mt-2">Баланс аккаунта</div></div></div>
      <div className="col-md-4"><div className="panel"><div className="muted">Всего поездок</div><div className="stat-number mt-2">{rides.filter(r=>r.status==="completed").length}</div></div></div>
      <div className="col-md-4"><div className="panel"><div className="muted">Неоплаченные штрафы</div><div className="stat-number mt-2">{fines.filter(f=>f.status==="unpaid").length}</div></div></div>
    </div>

    <section className="panel mb-4"><h2 className="section-title">Активные поездки</h2>
      {rides.filter(r=>r.status==="active").map(r=>{
        const seconds=Math.max(0,Math.floor((now-new Date(r.started_at).getTime())/1000));
        const elapsedMinutes=Math.max(1,Math.floor(seconds/60));
        const used=Math.min(elapsedMinutes,Number(r.tariff_minutes)||elapsedMinutes);
        const cost=getRideAccruedCost({pricePerMinuteCents:r.price_per_minute_cents,tariffMinutes:r.tariff_minutes,prepaidCents:r.prepaid_cents,elapsedMinutes:used});
        return <div className="rule-item" key={r.id}><div className="flex-grow-1"><strong>{r.name}</strong><div className="muted small">Начало: {date(r.started_at)} · {money(r.price_per_minute_cents)}/мин</div><div className="mt-2 d-flex flex-wrap gap-3"><span><span className="muted">Время аренды:</span> <strong>{elapsedLabel(r.started_at,now)}</strong></span><span><span className="muted">Стоимость:</span> <strong>{money(cost)}</strong></span></div>{Number(r.tariff_minutes)>0&&<div className="muted small mt-1">Тариф на {r.tariff_minutes} минут · предоплата {money(r.prepaid_cents)}</div>}</div><button className="btn btn-volt btn-sm" disabled={busy} onClick={()=>rideAction(r.id,"finish")}>Завершить поездку</button></div>
      })}
      {!rides.some(r=>r.status==="active") && <p className="muted mb-0">Активных поездок нет.</p>}
    </section>

    <section className="panel mb-4"><h2 className="section-title">История поездок</h2>
      {!rides.length && <p className="muted">Пока поездок нет.</p>}
      <div className="table-responsive"><table className="table table-dark-custom align-middle"><thead><tr><th>Самокат</th><th>Дата начала</th><th>Статус</th><th>Время</th><th>Стоимость</th></tr></thead><tbody>{rides.map(r=><tr key={r.id}><td>{r.name}</td><td>{date(r.started_at)}</td><td>{r.status==="completed"?"Завершена":r.status==="active"?"Активна":"Отменена"}</td><td>{r.duration_minutes ?? "—"} мин.</td><td>{r.total_cents == null ? "—" : money(r.total_cents)}</td></tr>)}</tbody></table></div>
    </section>

    <section className="panel mb-4"><h2 className="section-title">Штрафы</h2>
      {!fines.length && <p className="muted mb-0">Штрафов нет.</p>}
      {fines.map(f=><div className="rule-item" key={f.id}><div className="flex-grow-1"><strong>{money(f.amount_cents)} · {f.status==="unpaid"?"Не оплачен":f.status==="paid"?"Оплачен":"Отменён"}</strong><div className="muted small">{f.reason}</div></div>{f.status==="unpaid"&&<button className="btn btn-volt btn-sm" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{const r=await fetch("/api/fines/pay",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fineId:f.id})});const d=await r.json();if(!r.ok)throw new Error(d.error);await load();window.dispatchEvent(new Event("volt:refresh"));setSuccess("Штраф успешно оплачен.");}catch(e){setError(e.message)}finally{setBusy(false)}}}>Оплатить</button>}</div>)}
    </section>

    <section className="panel mb-4"><h2 className="section-title">Сообщения</h2>
      {!notifications.length && <p className="muted mb-0">Новых сообщений нет.</p>}
      {notifications.map(n=><div className="rule-item" key={n.id}><div><strong>{n.title}</strong><div>{n.message}</div><div className="muted small">{date(n.created_at)}</div></div></div>)}
    </section>

    <section className="panel"><h2 className="section-title">Операции по балансу</h2>
      {!transactions.length && <p className="muted">Операций пока нет.</p>}
      <div className="table-responsive"><table className="table table-dark-custom align-middle"><thead><tr><th>Дата</th><th>Операция</th><th>Описание</th><th>Сумма</th></tr></thead><tbody>{transactions.map(t=><tr key={t.id}><td>{date(t.created_at)}</td><td>{operationNames[t.type] || "Операция"}</td><td>{t.description}</td><td>{money(t.amount_cents)}</td></tr>)}</tbody></table></div>
    </section>
  </main>
  <NoticeModal open={!!error || !!success} title={error?"Не удалось выполнить действие":"Готово"} message={error||success} tone={error?"error":"success"} onClose={()=>{setError("");setSuccess("")}} />
  <NoticeModal open={topupOpen} title="Пополнение баланса" message="Укажите любую положительную сумму в рублях. В локальном режиме реальные деньги не списываются." onClose={()=>setTopupOpen(false)}>
    <div className="text-start mt-3"><label className="form-label" htmlFor="topup-amount">Сумма, ₽</label><input id="topup-amount" className="form-control" type="number" min="0.01" step="0.01" placeholder="Например, 250 или 125.50" value={topupAmount} onChange={e=>setTopupAmount(e.target.value)}/><button type="button" className="btn btn-volt w-100 mt-3" disabled={busy} onClick={topup}>{busy?"Пополняем…":"Пополнить"}</button></div>
  </NoticeModal>
  </>;
}
