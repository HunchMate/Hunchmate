import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);
    } else {
      document.body.style.overflow = '';
      if (previousFocusRef.current?.focus) {
        previousFocusRef.current.focus();
      }
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableEls = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableEls.length) return;

    const first = focusableEls[0];
    const last = focusableEls[focusableEls.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id={titleId} className="modal-title">{title}</h3>
          <button ref={closeButtonRef} className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
