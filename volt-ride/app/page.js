"use client";

import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import ScooterMapLoader from "@/components/ScooterMapLoader";
import NoticeModal from "@/components/NoticeModal";
import { getTariffPrice } from "@/lib/pricing";

const typeNames = { child: "Детский", adult: "Взрослый", professional: "Профессиональный" };
const rules = [
  "Аренда доступна только пользователям от 18 лет.",
  "Один человек — один самокат.",
  "Совершайте поездки только в трезвом состоянии.",
  "По пешеходному переходу передвигайтесь пешком."
];

function money(cents) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(cents / 100);
}

export default function Home() {
  const [scooters, setScooters] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tariff, setTariff] = useState("minute");

  useEffect(() => {
    const loadScooters=()=>fetch("/api/scooters").then(r=>r.json()).then(d=>setScooters(d.scooters||[])).catch(()=>setNotice("Не удалось загрузить самокаты."));
    loadScooters();
    const refreshTimer=setInterval(loadScooters,10000);
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => setUser(d?.user || null)).catch(() => {});
    window.addEventListener("volt:ride-updated",loadScooters);
    return()=>{clearInterval(refreshTimer);window.removeEventListener("volt:ride-updated",loadScooters)};
  }, []);

  const filtered = useMemo(() => scooters.filter(s => filter === "all" || s.type === filter), [scooters, filter]);
  const tariffMinutes = tariff === "half_hour" ? 30 : tariff === "hour" ? 60 : 0;
  const tariffPrice = selected && tariffMinutes ? getTariffPrice(selected.priceCents, tariffMinutes) : 0;

  async function startRide(scooter) {
    if (!user) {
      window.location.href = "/login?next=/account";
      return;
    }
    setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/rides/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scooterId: scooter.id, tariff })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось начать поездку");
      setScooters(current => user?.role === "admin" ? current.map(item => item.id === scooter.id ? {...item,status:"riding"} : item) : current.filter(item => item.id !== scooter.id));
      setSelected(null);
      window.dispatchEvent(new Event("volt:refresh"));
      setNotice(`Поездка на самокате ${scooter.name} началась.`);
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }

  return <>
    <TopNav />
    <main className="page-container">
      <section className="row align-items-center g-4 mb-5">
        <div className="col-lg-7">
          <div className="badge-volt mb-3">⚡ ТВОЙ ГОРОД. ТВОЯ СКОРОСТЬ.</div>
          <h1 className="hero-title mb-3">Город ближе,<br/><span>чем кажется.</span></h1>
          <p className="muted fs-5 mb-4">Найди самокат рядом, выбери маршрут и отправляйся навстречу новым впечатлениям.</p>
          <a href="#map" className="btn btn-volt">Найти самокат ↗</a>
        </div>
        <div className="col-lg-5">
          <div className="panel">
            <div className="row g-3">
              <div className="col-6"><div className="stat-card"><div className="muted small">Доступно самокатов</div><div className="stat-number">{scooters.filter(s => s.status === "available").length}</div></div></div>
              <div className="col-6"><div className="stat-card"><div className="muted small">Цена от</div><div className="stat-number">{scooters.length ? money(Math.min(...scooters.map(s => s.priceCents))) : "—"}</div><div className="muted small">за минуту</div></div></div>
            </div>

          </div>
        </div>
      </section>

      <NoticeModal open={!!notice} title={notice.toLowerCase().includes("не удалось") || notice.toLowerCase().includes("недостаточно") || notice.toLowerCase().includes("активная поездка") ? "Не удалось выполнить действие" : "VOLT RIDE"} message={notice} onClose={() => setNotice("")} tone={notice.toLowerCase().includes("не удалось") || notice.toLowerCase().includes("недостаточно") || notice.toLowerCase().includes("активная поездка") ? "error" : "success"} />

      <section id="map" className="mb-5">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div><h2 className="section-title mb-1">Найди свой VOLT</h2><p className="muted mb-0">Выбери самокат на карте или в списке.</p></div>
          <div className="d-flex flex-wrap gap-2">
            {[["all","Все"],["child","Детские"],["adult","Взрослые"],["professional","Pro"]].map(([v,l]) =>
              <button key={v} onClick={() => setFilter(v)} className={`btn ${filter === v ? "btn-volt" : "btn-outline-custom"}`}>{l}</button>
            )}
          </div>
        </div>
        <div className="panel"><ScooterMapLoader scooters={filtered} onSelect={setSelected}/></div>
      </section>

      {selected && <section className="panel mb-5">
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div><span className="badge-volt">{typeNames[selected.type]}</span><h2 className="section-title mt-3">{selected.name}</h2></div>
          <button className="btn btn-outline-custom" onClick={() => setSelected(null)}>Закрыть</button>
        </div>
        <div className="row g-3 mt-2">
          {[["Заряд",`${selected.battery}%`],["Максимальная скорость",`${selected.maxSpeed} км/ч`],["Запас хода",`~${selected.rangeKm} км`],["Цена",`${money(selected.priceCents)}/мин`]].map(([label,value]) =>
            <div className="col-6 col-lg-3" key={label}><div className="stat-card"><div className="muted small">{label}</div><div className="stat-number">{value}</div></div></div>
          )}
        </div>
        <div className="mt-4">
          <label className="form-label">Тариф</label>
          <select className="form-select mb-3" value={tariff} onChange={e=>setTariff(e.target.value)}>
            <option value="minute">Поминутный — {money(selected.priceCents)} за минуту</option>
            <option value="half_hour">30 минут — скидка 20%</option>
            <option value="hour">60 минут — скидка 40%</option>
          </select>
          {tariffMinutes > 0 ? <div className="stat-card mb-3"><div className="muted small">Стоимость за {tariffMinutes} минут с учётом скидки {tariffMinutes === 30 ? "20%" : "40%"}</div><div className="stat-number">{money(tariffPrice)}</div><div className="muted small">Вместо {money(selected.priceCents * tariffMinutes)} без скидки</div></div> : <p className="muted small mb-3">Оплата по фактическому времени: {money(selected.priceCents)} за минуту.</p>}
          <button disabled={busy || selected.status !== "available"} className="btn btn-volt w-100" onClick={() => startRide(selected)}>
            {busy ? "Запускаем поездку…" : selected.status === "available" ? "Начать поездку" : "Сейчас недоступен"}
          </button>
        </div>
      </section>}

      <section className="mb-5">
        <h2 className="section-title mb-3">Выбирай свой стиль</h2>
        <div className="row g-3">
          {filtered.map(s => <div className="col-md-6 col-xl-3" key={s.id}>
            <div className="scooter-card">
              <div className="d-flex justify-content-between align-items-start mb-4"><div className="scooter-icon">🛴</div><span className="badge-volt">{s.battery}% 🔋</span></div>
              <div className="muted small">{typeNames[s.type]}</div><h3 className="fs-5 fw-bold mt-1">{s.name}</h3>
              <div className="muted small mb-3">До {s.maxSpeed} км/ч · ~{s.rangeKm} км</div>
              {user?.role === "admin" && s.status !== "available" && <div className="muted small mb-2">Статус: {s.status === "riding" ? "В поездке" : s.status === "maintenance" ? "Обслуживание" : "Недоступен"}</div>}
              <div className="d-flex justify-content-between align-items-center gap-2"><div><strong className="fs-5">{money(s.priceCents)}</strong><span className="muted small">/мин</span></div>
                <button className="btn btn-volt" onClick={() => setSelected(s)}>Выбрать</button></div>

            </div>
          </div>)}
        </div>
        {!filtered.length && <p className="muted mt-3">Свободных самокатов этого типа сейчас нет.</p>}
      </section>

      <section id="rules" className="panel mb-5">
        <h2 className="section-title">Правила поездки</h2><p className="muted">Безопасность важнее скорости.</p>
        {rules.map((rule,i) => <div className="rule-item" key={rule}><div className="rule-number">{i+1}</div><div>{rule}</div></div>)}
        <p className="muted small mt-3 mb-0">Перед поездкой соблюдайте местные правила дорожного движения и требования безопасности.</p>
      </section>
      <footer className="text-center py-4">VOLT RIDE · Передвигайся по-новому ⚡</footer>
    </main>
  </>;
}
