// public/components/js/Toast.jsx
import React, { useEffect, useState } from "react";

export default function Toast({ message, type, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div
      className={`toast align-items-center text-white ${type === 'success' ? 'bg-success' : 'bg-danger'} show position-fixed top-0 end-0 m-4`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{ minWidth: "250px", zIndex: 1055 }}
    >
      <div className="d-flex">
        <div className="toast-body">
          {message}
        </div>
        <button
          type="button"
          className="btn-close btn-close-white me-2 m-auto"
          aria-label="Close"
          onClick={() => {
            setVisible(false);
            if (onClose) onClose();
          }}
        ></button>
      </div>
    </div>
  );
}
