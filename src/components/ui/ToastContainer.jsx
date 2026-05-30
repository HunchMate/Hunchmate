'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, X, CheckCircle, Info } from 'lucide-react';
import './ToastContainer.css';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const { message, type = 'success', eventTitle } = e.detail || {};
      const id = Date.now() + Math.random().toString(36).substr(2, 9);
      
      setToasts((prev) => [...prev, { id, message, type, eventTitle }]);

      // Auto-remove toast after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item toast-item--${toast.type} glass`}
        >
          <div className="toast-item__icon-container">
            {toast.type === 'bookmark-add' ? (
              <Bookmark size={18} className="toast-icon toast-icon--add" fill="#ff6b00" color="#ff6b00" />
            ) : toast.type === 'bookmark-remove' ? (
              <Bookmark size={18} className="toast-icon toast-icon--remove" color="#4c69a4" />
            ) : toast.type === 'success' ? (
              <CheckCircle size={18} className="toast-icon toast-icon--success" color="#16a34a" />
            ) : (
              <Info size={18} className="toast-icon toast-icon--info" color="#2559bd" />
            )}
          </div>
          <div className="toast-item__content">
            {toast.eventTitle && (
              <div className="toast-item__title">{toast.eventTitle}</div>
            )}
            <div className="toast-item__message">{toast.message}</div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="toast-item__close"
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
