import PropTypes from "prop-types";

export default function DropdownChips({
  label,
  placeholder,
  options,      // [{ id, label }]
  selected,     // array of ids
  setSelected
}) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>

      {/* simple <select> for adding one id at a time */}
      <select
        value=""
        onChange={e => {
          const val = e.target.value;
          if (val && !selected.includes(val)) setSelected([...selected, val]);
        }}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
      >
        <option value="">{placeholder}</option>
        {options
          .filter(o => !selected.includes(o.id))
          .map(o => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
      </select>

      {/* chip list */}
      <div className="mt-2 flex flex-wrap gap-2">
        {selected.map(id => {
          const lbl = options.find(o => o.id === id)?.label || id;
          return (
            <span
              key={id}
              className="flex items-center gap-1 bg-primary text-white rounded-full px-3 py-1 text-sm"
            >
              {lbl}
              <button
                type="button"
                onClick={() => setSelected(selected.filter(x => x !== id))}
                className="ml-1 font-bold text-white/80 hover:text-white/60"
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

DropdownChips.propTypes = {
  label       : PropTypes.string.isRequired,
  placeholder : PropTypes.string.isRequired,
  options     : PropTypes.array.isRequired,
  selected    : PropTypes.array.isRequired,
  setSelected : PropTypes.func.isRequired
};
