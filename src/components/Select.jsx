export function Select({ label, children, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-sm">{label}</label>
      <select
        className="w-full px-4 py-2 rounded-xl bg-gray-100 focus:bg-white focus:ring-2 focus:ring-primary outline-none"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
