// src/components/VideoPlayer.jsx
import { useMemo } from "react";

/**
 * Minimal file player with graceful degradation:
 *  – shows native <video> controls when the browser can play the mime
 *  – otherwise opens the blob / url in an <iframe>, letting Safari
 *    hand it off to QuickTime so controls appear there.
 */
export default function VideoPlayer({ src, ...props }) {
  // crude mime sniff from file extension
  const mime = useMemo(() => {
    const ext = (src.split(".").pop() || "").toLowerCase();
    return {
      mp4:  "video/mp4",
      webm: "video/webm",
      ogg:  "video/ogg",
      mov:  "video/quicktime",
      m4v:  "video/x-m4v",
    }[ext] || "";
  }, [src]);

  // feature-detect once
  const canPlay = useMemo(() => {
    if (!mime) return true;                       // unknown → try anyway
    const v = document.createElement("video");
    return v.canPlayType(mime) !== "";
  }, [mime]);

  /* ---------- happy path ---------- */
  if (canPlay) {
    return (
      <video
        key={src}             /* force reload on url change   */
        src={src}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full object-contain bg-black"
        {...props}
      />
    );
  }

  /* ---------- graceful fallback ---------- */
  return (
    <div className="w-full h-full flex flex-col">
      <div className="text-center text-xs text-white bg-red-600 py-1">
        Your browser can’t play this format. Opening in an external viewer…
      </div>
      <iframe
        title="video-fallback"
        src={src}
        className="flex-1 border-0 bg-black"
      />
    </div>
  );
}
