"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Rock-Solid CKEditor 5 Component
 * - Dedicated DOM container without extra height (zero empty gap above editor).
 * - Mounts once on dedicated DOM container (zero React removeChild errors).
 * - Lifecycle never recreates the editor on typing (fixes unclick / loss-of-focus bug).
 * - Uses isTypingRef so internal keystrokes never trigger editor.setData().
 * - Only syncs when value changes externally (e.g. opening Edit modal).
 * - Compact and clean spacing directly below the form label.
 */
export default function CKEditorComponent({
  value = "",
  onChange,
  placeholder = "Write detailed content here...",
}) {
  const containerRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const isTypingRef = useRef(false);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Keep latest onChange in ref
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Editor lifecycle: mount once, destroy on unmount
  useEffect(() => {
    let isMounted = true;
    let timer = null;

    const startEditor = () => {
      if (!isMounted || !containerRef.current || editorInstanceRef.current) return;
      if (!window.ClassicEditor) return;

      window.ClassicEditor.create(containerRef.current, {
        placeholder: placeholder,
        toolbar: [
          "heading",
          "|",
          "bold",
          "italic",
          "underline",
          "strikethrough",
          "|",
          "bulletedList",
          "numberedList",
          "blockQuote",
          "|",
          "link",
          "insertTable",
          "|",
          "undo",
          "redo",
        ],
      })
        .then((editor) => {
          if (!isMounted) {
            editor.destroy().catch(() => {});
            return;
          }

          editorInstanceRef.current = editor;

          // Set initial value
          if (initialValueRef.current) {
            editor.setData(initialValueRef.current);
          }

          // Handle typing
          editor.model.document.on("change:data", () => {
            const data = editor.getData();
            isTypingRef.current = true;
            if (onChangeRef.current) {
              onChangeRef.current(data);
            }
            // Reset typing lock after microtask
            setTimeout(() => {
              isTypingRef.current = false;
            }, 50);
          });

          setIsEditorReady(true);
        })
        .catch((err) => {
          console.error("CKEditor create error:", err);
          setLoadFailed(true);
        });
    };

    if (typeof window !== "undefined") {
      if (window.ClassicEditor) {
        startEditor();
      } else {
        const SCRIPT_ID = "ckeditor5-cdn-script";
        let script = document.getElementById(SCRIPT_ID);

        if (!script) {
          script = document.createElement("script");
          script.id = SCRIPT_ID;
          script.src = "https://cdn.ckeditor.com/ckeditor5/39.0.1/classic/ckeditor.js";
          script.async = true;
          script.onload = () => {
            if (isMounted) startEditor();
          };
          script.onerror = () => {
            if (isMounted) setLoadFailed(true);
          };
          document.body.appendChild(script);
        } else {
          if (window.ClassicEditor) {
            startEditor();
          } else {
            script.addEventListener("load", startEditor);
            script.addEventListener("error", () => isMounted && setLoadFailed(true));
          }
        }

        timer = setTimeout(() => {
          if (isMounted && !window.ClassicEditor && !editorInstanceRef.current) {
            setLoadFailed(true);
          }
        }, 3000);
      }
    }

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy().catch(() => {});
        editorInstanceRef.current = null;
      }
      setIsEditorReady(false);
    };
  }, [placeholder]); // Only depends on placeholder, NOT on value or onChange!

  // Sync external value changes (e.g. user opens Edit modal or resets form)
  // NEVER called while user is typing
  useEffect(() => {
    if (isTypingRef.current) return;

    if (editorInstanceRef.current && isEditorReady) {
      const currentData = editorInstanceRef.current.getData();
      if (value !== currentData) {
        editorInstanceRef.current.setData(value || "");
      }
    }
  }, [value, isEditorReady]);

  // Fallback toolbar formatter for native textarea
  const applyFallbackFormat = (tag, closeTag = "") => {
    const textarea = document.getElementById("ckeditor-fallback-textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || "text";
    const closing = closeTag || tag;
    const replacement = `<${tag}>${selected}</${closing}>`;

    const newVal =
      textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    if (onChangeRef.current) onChangeRef.current(newVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, start + replacement.length - closing.length - 3);
    }, 50);
  };

  return (
    <div className="ckeditor-root-wrapper" style={{ margin: 0, padding: 0 }}>
      {/* 
        Source DOM element for CKEditor 5.
        Has 0 height/margin so it never leaves an empty gap above the editor.
      */}
      <div ref={containerRef} style={{ margin: 0, padding: 0 }} />

      {/* Fallback Editor if CDN failed to load */}
      {loadFailed && !isEditorReady && (
        <div className="border rounded bg-white p-2 mt-1">
          <div className="d-flex align-items-center gap-1 mb-2 pb-2 border-bottom flex-wrap">
            <span className="badge bg-light text-muted border me-2 small">Editor</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2 fw-bold"
              onClick={() => applyFallbackFormat("strong")}
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2 fst-italic"
              onClick={() => applyFallbackFormat("em")}
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              onClick={() => applyFallbackFormat("u")}
              title="Underline"
            >
              <u>U</u>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              onClick={() => applyFallbackFormat("h2")}
              title="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              onClick={() => applyFallbackFormat("h3")}
              title="Heading 3"
            >
              H3
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              onClick={() => applyFallbackFormat("p")}
              title="Paragraph"
            >
              &para;
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0 px-2"
              onClick={() => applyFallbackFormat("ul", "ul")}
              title="Bullet List"
            >
              &bull; List
            </button>
          </div>
          <textarea
            id="ckeditor-fallback-textarea"
            className="form-control border-0 shadow-none font-monospace"
            rows="8"
            placeholder={placeholder}
            value={value || ""}
            onChange={(e) => onChangeRef.current && onChangeRef.current(e.target.value)}
            style={{ resize: "vertical", fontSize: "14px" }}
          />
        </div>
      )}

      <style jsx global>{`
        .ckeditor-root-wrapper .ck.ck-editor {
          margin-top: 4px;
        }
        .ckeditor-root-wrapper .ck-editor__editable_inline {
          min-height: 180px;
          max-height: 420px;
          overflow-y: auto;
          font-family: inherit;
          font-size: 14px;
        }
        .ckeditor-root-wrapper .ck.ck-editor__main > .ck-editor__editable:not(.ck-focused) {
          border-color: #dee2e6;
        }
        .ckeditor-root-wrapper .ck.ck-editor__main > .ck-editor__editable.ck-focused {
          border-color: #58632a;
          box-shadow: 0 0 0 0.2rem rgba(88, 99, 42, 0.15);
        }
      `}</style>
    </div>
  );
}
