/**
 * Checkbox — animated wave checkbox component (Uiverse.io by vishnupprajapat).
 *
 * Usage:
 *   <Checkbox id="my-id" checked={val} onChange={fn} label="Remember me" />
 *
 * Props:
 *   id       — required for label<->input wiring (must be unique on page)
 *   checked  — boolean
 *   onChange — (e) => void
 *   label    — string or ReactNode shown next to the checkbox
 *   className — extra class on the wrapper
 *   disabled  — disables interaction
 */
import './Checkbox.css';

export default function Checkbox({
  id,
  checked,
  onChange,
  label,
  className = '',
  disabled = false,
}) {
  return (
    <div className={`hm-cbx-wrap ${className}`}>
      <input
        type="checkbox"
        id={id}
        className="hm-cbx-inp"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <label htmlFor={id} className="hm-cbx">
        <span className="hm-cbx__box">
          <svg viewBox="0 0 12 10" height="10px" width="12px">
            <polyline points="1.5 6 4.5 9 10.5 1" />
          </svg>
        </span>
        {label && <span className="hm-cbx__label">{label}</span>}
      </label>
    </div>
  );
}
