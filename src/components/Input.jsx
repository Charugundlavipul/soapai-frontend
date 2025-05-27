// Input.jsx
export function Input({ label, value, onChange, ...rest }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm">{label}</label>}
      <input
        value={value ?? ''}
        onChange={onChange}
        {...rest}
        className="w-full px-4 py-2 rounded-xl bg-gray-100
                   focus:bg-white focus:ring-2 focus:ring-primary outline-none"
      />
    </div>
  );
}
export function Select({ label, value, onChange, children, ...rest }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        {...rest}
        className="w-full px-4 py-2 rounded-xl bg-gray-100
                   focus:bg-white focus:ring-2 focus:ring-primary outline-none"
      >
        {children}
      </select>
    </div>
  );
}
