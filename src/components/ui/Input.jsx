import './Input.css';

export default function Input({
  label,
  type = 'text',
  icon: Icon,
  error,
  helper,
  fullWidth = true,
  className = '',
  ...props
}) {
  return (
    <div className={`input-group ${fullWidth ? 'input-full' : ''} ${error ? 'input-error' : ''} ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrapper">
        {Icon && <Icon size={18} className="input-icon" />}
        {type === 'textarea' ? (
          <textarea className="input-field input-textarea" {...props} />
        ) : (
          <input type={type} className="input-field" {...props} />
        )}
      </div>
      {error && <span className="input-error-msg">{error}</span>}
      {helper && !error && <span className="input-helper">{helper}</span>}
    </div>
  );
}
