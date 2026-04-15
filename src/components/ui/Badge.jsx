import './Badge.css';

export default function Badge({ children, variant = 'default', size = 'sm', dot = false, className = '' }) {
  return (
    <span className={`badge badge-${variant} badge-${size} ${className}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}
