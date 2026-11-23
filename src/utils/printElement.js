/**
 * Utility to reliably print any DOM element (voucher, invoice, receipt)
 * by cloning its content into an isolated print iframe.
 * This guarantees ZERO interference from modal overlays, backdrops,
 * scrollbars, fixed positions, or background pages.
 */
export const printElement = (elementId, title = "Print Official Document") => {
  if (typeof window === "undefined") return;

  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Remove any previous print frame if present
  const existingFrame = document.getElementById("hidden-print-iframe");
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "hidden-print-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  // Extract all existing style and link tags so exact fonts, bootstrap classes & theme apply
  let styleTags = "";
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((tag) => {
    styleTags += tag.outerHTML;
  });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      ${styleTags}
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
        }
        html, body {
          background: #ffffff !important;
          color: #0f172a !important;
          margin: 0 !important;
          padding: 6px !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          overflow: visible !important;
          height: auto !important;
          min-height: 0 !important;
        }
        .no-print, .btn, button, .btn-close, .modal-header, .modal-footer, .modal-header-custom, .modal-footer-custom {
          display: none !important;
        }
        .print-only-block {
          display: block !important;
        }
        .print-only-flex {
          display: flex !important;
        }
        .border {
          border: 1px solid #cbd5e1 !important;
        }
        .border-bottom {
          border-bottom: 1px solid #cbd5e1 !important;
        }
        .border-top {
          border-top: 1px solid #cbd5e1 !important;
        }
        .table {
          width: 100% !important;
          margin-bottom: 1rem !important;
          border-collapse: collapse !important;
        }
        .table th, .table td {
          border: 1px solid #cbd5e1 !important;
          padding: 6px 10px !important;
        }
        .bg-light {
          background-color: #f8fafc !important;
        }
      </style>
    </head>
    <body>
      <div style="background:#ffffff; width:100%; max-width:100%; margin:0 auto; padding:4px;">
        ${element.innerHTML}
      </div>
    </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow.print();
    } catch (e) {
      console.error("Print error:", e);
      window.print();
    }
  }, 350);
};
