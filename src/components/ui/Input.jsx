import { useState, useEffect, useCallback, useRef } from 'react';
import './Input.css';

export default function Input({
  label,
  type = 'text',
  icon: Icon,
  error,
  helper,
  fullWidth = true,
  className = '',
  value,
  onChange,
  ...props
}) {
  const [localValue, setLocalValue] = useState(value || '');
  const isTyping = useRef(false);

  useEffect(() => {
    if (!isTyping.current) {
      setLocalValue(value || '');
    }
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (isTyping.current && onChange && localValue !== value) {
        onChange({ target: { value: localValue, name: props.name } });
        isTyping.current = false;
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [localValue, onChange, value, props.name]);

  const handleChange = (e) => {
    isTyping.current = true;
    setLocalValue(e.target.value);
  };

  const handleBlur = (e) => {
    if (isTyping.current && onChange && localValue !== value) {
      onChange({ target: { value: localValue, name: props.name } });
      isTyping.current = false;
    }
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <div className={`input-group ${fullWidth ? 'input-full' : ''} ${error ? 'input-error' : ''} ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrapper">
        {Icon && <Icon size={18} className="input-icon" />}
        {type === 'textarea' ? (
          <textarea 
            className="input-field input-textarea" 
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            {...props} 
          />
        ) : (
          <input 
            type={type} 
            className="input-field" 
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            {...props} 
          />
        )}
      </div>
      {error && <span className="input-error-msg">{error}</span>}
      {helper && !error && <span className="input-helper">{helper}</span>}
    </div>
  );
}
