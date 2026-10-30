"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function TopNav() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let alive=true;
    const refresh=()=>fetch("/api/auth/me").then(r=>r.ok?r.json():null).then(d=>{if(alive)setUser(d?.user||null)}).catch(()=>{});
    const monitor=async()=>{try{const r=await fetch("/api/rides/monitor",{method:"POST"});const d=await r.json();if(d.finished){await refresh();window.dispatchEvent(new Event("volt:ride-updated"));}}catch{}};
    refresh(); monitor();
    const timer=setInterval(()=>{monitor();refresh();},7000);
    window.addEventListener("volt:refresh",refresh);window.addEventListener("volt:ride-updated",refresh);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener("volt:refresh",refresh);window.removeEventListener("volt:ride-updated",refresh)};
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <nav className="navbar navbar-custom sticky-top">
      <div className="container-fluid px-4 py-2">
        <Link className="navbar-brand brand" href="/">VOLT<span style={{color:"#f3f5ef"}}>RIDE</span></Link>
        <div className="d-flex align-items-center flex-wrap gap-2">
          <Link href="/#rules" className="btn btn-outline-custom btn-sm">Правила</Link>
          {user ? <>
            <Link href="/account" className="btn btn-outline-custom btn-sm">Кабинет · {(user.balanceCents / 100).toFixed(2)} ₽</Link>
            {user.role === "admin" && <Link href="/admin" className="btn btn-outline-custom btn-sm">Админка</Link>}
            <button className="btn btn-volt btn-sm" onClick={logout}>Выйти</button>
          </> : <>
            <Link href="/login" className="btn btn-outline-custom btn-sm">Войти</Link>
            <Link href="/register" className="btn btn-volt btn-sm">Регистрация</Link>
          </>}
        </div>
      </div>
    </nav>
  );
}
