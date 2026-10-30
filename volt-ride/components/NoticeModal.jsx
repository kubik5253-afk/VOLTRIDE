"use client";

export default function NoticeModal({ open, title = "Уведомление", message, onClose, children, tone = "info" }) {
  if (!open) return null;
  return <div className="volt-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.(); }}>
    <section className="volt-modal" role="dialog" aria-modal="true" aria-labelledby="volt-modal-title">
      <div className={`volt-modal-mark ${tone === "error" ? "is-error" : tone === "success" ? "is-success" : ""}`}>{tone === "error" ? "!" : tone === "success" ? "✓" : "i"}</div>
      <h2 id="volt-modal-title">{title}</h2>
      {message && <p>{message}</p>}
      {children}
      <button type="button" className="btn btn-volt w-100 mt-3" onClick={onClose}>Понятно</button>
    </section>
  </div>;
}
