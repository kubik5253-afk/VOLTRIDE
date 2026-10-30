"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import NoticeModal from "@/components/NoticeModal";

const money = cents => new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB"}).format(Number(cents||0)/100);

export default function AdminPage() {
  const [data,setData] = useState(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [fine,setFine] = useState({userId:"",amount:"100",reason:""});
  const [message,setMessage] = useState({userId:"",title:"Сообщение от VOLT RIDE",message:""});
  const [scooter,setScooter] = useState({name:"Volt City",type:"adult",battery:"90",maxSpeed:"25",rangeKm:"30",price:"8",latitude:"55.7519",longitude:"37.6178"});
  async function editScooter(s) {
    const name=window.prompt("Название",s.name); if(name===null)return;
    const type=window.prompt("Тип: child (детский), adult (взрослый), professional (профессиональный)",s.type); if(type===null)return;
    const battery=window.prompt("Заряд, %",s.battery); if(battery===null)return;
    const maxSpeed=window.prompt("Максимальная скорость, км/ч",s.max_speed); if(maxSpeed===null)return;
    const rangeKm=window.prompt("Запас хода, км",s.range_km); if(rangeKm===null)return;
    const price=window.prompt("Цена за минуту, ₽",Number(s.price_per_minute_cents)/100); if(price===null)return;
    const latitude=window.prompt("Широта",s.latitude); if(latitude===null)return;
    const longitude=window.prompt("Долгота",s.longitude); if(longitude===null)return;
    await act(`/api/admin/scooters/${s.id}`,{name,type,battery:Number(battery),maxSpeed:Number(maxSpeed),rangeKm:Number(rangeKm),price:Number(price),latitude:Number(latitude),longitude:Number(longitude)},"PATCH");
  }

  async function load() {
    const r=await fetch("/api/admin");
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||"Нет доступа");
    setData(d);
  }
  useEffect(()=>{load().catch(e=>setError(e.message));const timer=setInterval(()=>load().catch(()=>{}),10000);return()=>clearInterval(timer);},[]);

  async function act(url,body,method="POST") {
    setBusy(true);setError("");
    try {
      const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:body===null?undefined:JSON.stringify(body)});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||"Операция не выполнена");
      await load();
    } catch(e){setError(e.message)} finally{setBusy(false)}
  }

  if(!data) return <><TopNav/><main className="page-container"><div className="panel">Загружаем админ-панель…</div></main><NoticeModal open={!!error} title="Ошибка админ-панели" message={error} tone="error" onClose={()=>setError("")}/></>;
  return <><TopNav/><main className="page-container">
    <div className="mb-4"><div className="badge-volt">УПРАВЛЕНИЕ СЕРВИСОМ</div><h1 className="hero-title mt-3">Панель <span>админа</span></h1><p className="muted">Пользователи, парк, штрафы и сообщения.</p></div>

    <div className="row g-3 mb-4"><div className="col-md-4"><div className="panel"><div className="muted">Пользователи</div><div className="stat-number">{data.users.length}</div></div></div><div className="col-md-4"><div className="panel"><div className="muted">Самокаты</div><div className="stat-number">{data.scooters.length}</div></div></div><div className="col-md-4"><div className="panel"><div className="muted">Активные поездки</div><div className="stat-number">{data.activeRides}</div></div></div></div>

    <section className="panel mb-4"><h2 className="section-title">Пользователи</h2><div className="table-responsive"><table className="table table-dark-custom align-middle"><thead><tr><th>ID</th><th>Пользователь</th><th>Роль</th><th>Баланс</th><th>Статус</th><th>Действие</th></tr></thead><tbody>{data.users.map(u=><tr key={u.id}><td>{u.id}</td><td>{u.name}<div className="muted small">{u.email}</div></td><td>{u.role}</td><td>{money(u.balance_cents)}</td><td>{u.is_blocked?"Заблокирован":"Активен"}</td><td>{u.role!=="admin"&&<button disabled={busy} className="btn btn-outline-custom btn-sm" onClick={()=>act(`/api/admin/users/${u.id}/block`,{blocked:!u.is_blocked})}>{u.is_blocked?"Разблокировать":"Заблокировать"}</button>}</td></tr>)}</tbody></table></div></section>

    <div className="row g-4 mb-4">
      <div className="col-lg-6"><section className="panel h-100"><h2 className="section-title">Назначить штраф</h2><form className="d-grid gap-3" onSubmit={e=>{e.preventDefault();act("/api/admin/fines",{...fine,userId:Number(fine.userId),amount:Number(fine.amount)});}}><label>ID пользователя<select className="form-select mt-2" required value={fine.userId} onChange={e=>setFine({...fine,userId:e.target.value})}><option value="">Выберите пользователя</option>{data.users.filter(u=>u.role!=="admin").map(u=><option key={u.id} value={u.id}>#{u.id} — {u.name} ({u.email})</option>)}</select></label><label>Сумма, ₽<input className="form-control mt-2" type="number" min="1" max="1000" required value={fine.amount} onChange={e=>setFine({...fine,amount:e.target.value})}/></label><label>Причина<textarea className="form-control mt-2" minLength="5" maxLength="500" required value={fine.reason} onChange={e=>setFine({...fine,reason:e.target.value})}/></label><button disabled={busy} className="btn btn-volt">Выписать штраф</button></form></section></div>
      <div className="col-lg-6"><section className="panel h-100"><h2 className="section-title">Отправить сообщение</h2><form className="d-grid gap-3" onSubmit={e=>{e.preventDefault();act("/api/admin/messages", {...message,userId:Number(message.userId)});}}><label>Получатель<select className="form-select mt-2" required value={message.userId} onChange={e=>setMessage({...message,userId:e.target.value})}><option value="">Выберите пользователя</option>{data.users.filter(u=>u.role!=="admin").map(u=><option key={u.id} value={u.id}>#{u.id} — {u.name}</option>)}</select></label><label>Заголовок<input className="form-control mt-2" required maxLength="120" value={message.title} onChange={e=>setMessage({...message,title:e.target.value})}/></label><label>Текст<textarea className="form-control mt-2" required maxLength="3000" value={message.message} onChange={e=>setMessage({...message,message:e.target.value})}/></label><button disabled={busy} className="btn btn-volt">Отправить</button></form></section></div>
    </div>

    <section className="panel mb-4"><h2 className="section-title">Активные поездки и пользователи</h2>
      {!data.rides?.length&&<p className="muted mb-0">Активных поездок нет.</p>}
      <div className="table-responsive"><table className="table table-dark-custom align-middle"><thead><tr><th>Поездка</th><th>Пользователь</th><th>Самокат</th><th>Начало</th><th>Действие</th></tr></thead><tbody>{(data.rides||[]).map(r=><tr key={r.id}><td>#{r.id}</td><td>{r.user_name}<div className="muted small">{r.email} · ID {r.user_id}</div></td><td>{r.scooter_name} · #{r.scooter_id}</td><td>{new Date(r.started_at).toLocaleString("ru-RU")}</td><td><button className="btn btn-outline-custom btn-sm" disabled={busy} onClick={()=>act(`/api/admin/rides/${r.id}/stop`,{})}>Отключить самокат</button></td></tr>)}</tbody></table></div>
    </section>

    <section className="panel mb-4"><h2 className="section-title">Добавить самокат</h2><form className="row g-3" onSubmit={e=>{e.preventDefault();act("/api/admin/scooters",{...scooter,battery:Number(scooter.battery),maxSpeed:Number(scooter.maxSpeed),rangeKm:Number(scooter.rangeKm),price:Number(scooter.price),latitude:Number(scooter.latitude),longitude:Number(scooter.longitude)});}}>
      <div className="col-md-4"><label>Название<input className="form-control mt-2" required value={scooter.name} onChange={e=>setScooter({...scooter,name:e.target.value})}/></label></div>
      <div className="col-md-4"><label>Тип<select className="form-select mt-2" value={scooter.type} onChange={e=>setScooter({...scooter,type:e.target.value})}><option value="child">Детский</option><option value="adult">Взрослый</option><option value="professional">Профессиональный</option></select></label></div>
      <div className="col-md-4"><label>Заряд %<input className="form-control mt-2" type="number" min="0" max="100" value={scooter.battery} onChange={e=>setScooter({...scooter,battery:e.target.value})}/></label></div>
      <div className="col-md-3"><label>Скорость км/ч<input className="form-control mt-2" type="number" min="1" max="100" value={scooter.maxSpeed} onChange={e=>setScooter({...scooter,maxSpeed:e.target.value})}/></label></div>
      <div className="col-md-3"><label>Запас хода км<input className="form-control mt-2" type="number" min="1" max="200" value={scooter.rangeKm} onChange={e=>setScooter({...scooter,rangeKm:e.target.value})}/></label></div>
      <div className="col-md-3"><label>Цена ₽/мин<input className="form-control mt-2" type="number" min="1" max="1000" value={scooter.price} onChange={e=>setScooter({...scooter,price:e.target.value})}/></label></div>
      <div className="col-md-3"><label>Широта<input className="form-control mt-2" type="number" step="any" required value={scooter.latitude} onChange={e=>setScooter({...scooter,latitude:e.target.value})}/></label></div>
      <div className="col-md-3"><label>Долгота<input className="form-control mt-2" type="number" step="any" required value={scooter.longitude} onChange={e=>setScooter({...scooter,longitude:e.target.value})}/></label></div>
      <div className="col-12"><button className="btn btn-volt" disabled={busy}>Добавить самокат</button></div>
    </form></section>

    <section className="panel"><h2 className="section-title">Парк самокатов</h2><div className="table-responsive"><table className="table table-dark-custom align-middle"><thead><tr><th>ID</th><th>Название</th><th>Тип</th><th>Заряд</th><th>Статус</th><th>Действия</th></tr></thead><tbody>{data.scooters.map(s=><tr key={s.id}><td>{s.id}</td><td>{s.name}</td><td>{s.type}</td><td>{s.battery}%</td><td>{s.status}</td><td className="d-flex gap-2"><button disabled={busy} className="btn btn-outline-custom btn-sm" onClick={()=>editScooter(s)}>Изменить</button>{s.status==="available"&&<button disabled={busy} className="btn btn-volt btn-sm" onClick={()=>act("/api/rides/start",{scooterId:Number(s.id),tariff:"minute"})}>Начать (админ)</button>}<button disabled={busy} className="btn btn-outline-custom btn-sm" onClick={()=>act(`/api/admin/scooters/${s.id}/status`,{status:s.status==="maintenance"?"available":"maintenance"})}>{s.status==="maintenance"?"Вернуть в парк":"На обслуживание"}</button></td></tr>)}</tbody></table></div></section>
  </main><NoticeModal open={!!error} title="Не удалось выполнить действие" message={error} tone="error" onClose={()=>setError("")}/></>;
}
