'use client';

import React from 'react';
import './ShinyButton.css';

/**
 * ShinyButton — animated conic-gradient border button.
 * Works as a drop-in for any auth form submit.
 *
 * Props:
 *   children  – button label
 *   onClick   – optional click handler
 *   disabled  – disables the button
 *   type      – "submit" | "button" | "reset" (default: "button")
 *   className – extra class names
 */
export function ShinyButton({ children, onClick, disabled = false, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      className={`shiny-cta ${disabled ? 'shiny-cta--disabled' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
    </button>
  );
}

export default ShinyButton;
