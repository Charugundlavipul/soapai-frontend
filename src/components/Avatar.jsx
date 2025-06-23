import React from "react";

/**
 * @param {string} url       – avatar image URL
 * @param {string} name      – full name for initials
 * @param {string} className – tailwind-sizing classes (e.g. "w-20 h-20")
 */
export default function Avatar({ url, name, className = "" }) {
  // Build up to two initials:
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map(w => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return url ? (
    <img
      src={url}
      alt={name}
      className={`object-cover rounded-full ${className}`}
    />
  ) : (
    <div
      className={`bg-primary text-white flex items-center justify-center rounded-full ${className}`}
    >
      <span className="text-lg font-semibold">{initials}</span>
    </div>
  );
}
