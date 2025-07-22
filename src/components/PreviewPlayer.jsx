/* ───────── NEW PreviewPlayer.jsx ───────── */
import { useMemo } from "react";

/**
 * Plays a recorded blob URL with graceful degradation.
 * If the current browser can’t decode the mime, we render
 * an <iframe> that navigates to the blob – Safari / iOS
 * will open QuickTime, desktop Chrome still plays inline.
 */
export default function PreviewPlayer({ url, mime }) {
  // 1) Detect once per mime
  const canPlay = useMemo(() => {
    if (!mime || typeof document === "undefined") return false;
    const v = document.createElement("video");
    return v.canPlayType(mime) !== "";
  }, [mime]);

  if (!url) return null; // nothing yet

  // 2) Native playback path
  if (canPlay) {
    return (
      <video
        key={url}                  /* force reload on new blob   */
        src={url}
        autoPlay
        controls
        playsInline
        muted
        preload="metadata"
        className="w-full h-full object-contain bg-black"
      />
    );
  }

  // 3) Fallback viewer + notice
  return (
    <div className="w-full h-full flex flex-col">
      <div className="text-center text-xs text-white bg-red-600 py-1">
        Your browser can’t decode <code>{mime}</code>. Opening in a new viewer…
      </div>
      <iframe
        title="video-preview"
        src={url}
        className="flex-1 border-0"
      />
    </div>
  );
}
