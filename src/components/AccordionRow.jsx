import PropTypes from "prop-types";
import { ChevronLeft } from "lucide-react";

export default function AccordionRow({ open, onToggle, header, children }) {
  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center px-4 py-2 bg-gray-50"
      >
        {header}
        <ChevronLeft
          className={`w-4 h-4 transition-transform ${
            open ? "-rotate-90" : "rotate-90"
          }`}
        />
      </button>

      {open && <div className="p-4 space-y-3 bg-white">{children}</div>}
    </div>
  );
}

AccordionRow.propTypes = {
  open     : PropTypes.bool.isRequired,
  onToggle : PropTypes.func.isRequired,
  header   : PropTypes.node.isRequired,
  children : PropTypes.node
};
