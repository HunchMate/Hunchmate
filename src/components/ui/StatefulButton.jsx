'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function StatefulButton({ onClick, children, disabled, className = '', style }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success'

  const handleClick = async (e) => {
    if (disabled || status !== 'idle') return;
    e.preventDefault();
    setStatus('loading');
    try {
      await onClick?.(e);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (_) {
      setStatus('idle');
    }
  };

  const isDisabled = disabled || status !== 'idle';

  return (
    <motion.button
      onClick={handleClick}
      disabled={isDisabled}
      className={`sb-btn ${className}`}
      style={style}
    >
      <div className="sb-inner">
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.svg
              key="loader"
              initial={{ opacity: 0, scale: 0.5, width: 0, marginRight: 0 }}
              animate={{ opacity: 1, scale: 1, width: 20, marginRight: 8, rotate: 360 }}
              exit={{ opacity: 0, scale: 0.5, width: 0, marginRight: 0 }}
              transition={{
                rotate: { duration: 0.5, repeat: Infinity, ease: 'linear' },
                default: { duration: 0.2 }
              }}
              xmlns="http://www.w3.org/2000/svg"
              width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              className="sb-loader"
              style={{ flexShrink: 0 }}
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 3a9 9 0 1 0 9 9" />
            </motion.svg>
          )}

          {status === 'success' && (
            <motion.svg
              key="check"
              initial={{ opacity: 0, scale: 0.5, width: 0, marginRight: 0 }}
              animate={{ opacity: 1, scale: 1, width: 20, marginRight: 8 }}
              exit={{ opacity: 0, scale: 0.5, width: 0, marginRight: 0 }}
              transition={{ duration: 0.2 }}
              xmlns="http://www.w3.org/2000/svg"
              width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              className="sb-check"
              style={{ flexShrink: 0 }}
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
              <path d="M9 12l2 2l4 -4" />
            </motion.svg>
          )}
        </AnimatePresence>

        <span>{children}</span>
      </div>
    </motion.button>
  );
}
