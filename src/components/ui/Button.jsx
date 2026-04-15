import { forwardRef } from 'react';
import './Button.css';

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spinner" />}
      {Icon && !loading && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} />}
      <span>{children}</span>
      {IconRight && <IconRight size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} />}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
