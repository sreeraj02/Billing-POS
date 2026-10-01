import { createPortal } from "react-dom";

// Rendered inside the phone frame on /mobile-admin, otherwise on the page body.
export default function Modal({ title, onClose, children, wide }) {
  const target = document.querySelector(".phone") || document.body;
  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    target
  );
}