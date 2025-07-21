"use client";
import { useRef, useEffect, useCallback, memo } from "react";
import { marked } from "marked";

const EDITOR_BASE_CLS = `
prose max-w-none min-h-[200px] focus:outline-none text-sm
[&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-gray-900 [&>h1]:mb-0 [&>h1]:mt-1
[&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mb-3 [&>h2]:mt-5
[&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-gray-800 [&>h3]:mb-2 [&>h3]:mt-3
[&>h4]:text-base [&>h4]:font-semibold [&>h4]:text-gray-800 [&>h4]:mb-2 [&>h4]:mt-3
[&>h5]:text-sm [&>h5]:font-semibold [&>h5]:text-gray-800 [&>h5]:mb-1 [&>h5]:mt-2
[&>h6]:text-sm [&>h6]:font-medium [&>h6]:text-gray-700 [&>h6]:mb-1 [&>h6]:mt-2
[&>ul]:list-disc [&>ul]:ml-4 [&>ul]:mb-3
[&>ol]:list-decimal [&>ol]:ml-4 [&>ol]:mb-3
[&>li]:mb-1 [&>li]:leading-relaxed
[&>p]:mb-3 [&>p]:leading-relaxed
[&>strong]:font-semibold [&>strong]:text-gray-800
[&>em]:italic [&>em]:text-gray-700
[&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>blockquote]:mb-3
[&>code]:bg-gray-100 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm [&>code]:font-mono
[&>pre]:bg-gray-100 [&>pre]:p-3 [&>pre]:rounded [&>pre]:overflow-x-auto [&>pre]:mb-3
[&>hr]:border-gray-300 [&>hr]:my-4
`;

function mdToHTML(md = "") {
  try {
    return marked.parse(md);
  } catch {
    return md;
  }
}

function LiveMarkdownEditor({ markdown = "", onChange, className = "" }) {
  const editorRef = useRef(null);

  /* initial paint only */
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = mdToHTML(markdown);
  }, [markdown]);

  const handleInput = useCallback(
    (e) => onChange?.(e.currentTarget.innerHTML),
    [onChange],
  );

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      className={`${EDITOR_BASE_CLS} ${className}`}
    />
  );
}

/* skip re‑render unless the `markdown` prop really changed */
export default memo(LiveMarkdownEditor, (p, n) => p.markdown === n.markdown);
