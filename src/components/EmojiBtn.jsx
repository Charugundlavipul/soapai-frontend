import { useState } from "react";
import Picker from "emoji-picker-react";

/* button that shows the picker and returns the chosen emoji char */
export default function EmojiBtn({ onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-gray-400 hover:text-primary"
      >
        🙂
      </button>

      {open && (
        <div className="absolute bottom-12 right-0 z-50 drop-shadow-lg">
          <Picker
            height={350}
            width={300}
            skinTonesDisabled
            onEmojiClick={(emojiData /* , ev */) => {
              /* emojiData.emoji is the plain character */
              onSelect(emojiData.emoji);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
