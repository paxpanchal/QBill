import { BusinessDocument, AppSettings } from '../types';
import { buildInvoiceDocumentHtml } from './invoiceTemplate';

/**
 * QUICKBILL PRP – DEDICATED PRINT SERVICE
 * 
 * Guarantees that printing prints ONLY the actual A4 commercial invoice document.
 * Never prints:
 * - Application sidebar
 * - Navigation
 * - Buttons / Action headers
 * - Preview chrome or dashboard UI
 * 
 * Uses an isolated print iframe with exact A4 portrait dimensions and safe margins.
 */
export async function printInvoiceDocument(
  doc: BusinessDocument,
  settings: AppSettings | null,
  copyType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL',
  isReprint = false
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const invoiceHtml = buildInvoiceDocumentHtml(doc, settings, copyType, isReprint);

      const fullPageHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>${doc.docNumber} - ${doc.customerName}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              *, *:before, *:after {
                box-sizing: border-box;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #090d16 !important;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .print-container {
                width: 210mm;
                min-height: 297mm;
                padding: 10mm 12mm;
                margin: 0 auto;
                background: #ffffff;
                box-sizing: border-box;
              }
              @media print {
                html, body {
                  width: 210mm !important;
                  height: 297mm !important;
                }
                .print-container {
                  width: 100% !important;
                  min-height: 100% !important;
                  padding: 8mm 10mm !important;
                  margin: 0 !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${invoiceHtml}
            </div>
          </body>
        </html>
      `;

      // Remove any existing print iframes
      const oldFrame = document.getElementById('quickbill-print-frame');
      if (oldFrame) {
        oldFrame.remove();
      }

      // Create isolated invisible iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'quickbill-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      iframe.style.zIndex = '-9999';

      document.body.appendChild(iframe);

      const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!frameDoc) {
        throw new Error('Could not access print frame document');
      }

      frameDoc.open();
      frameDoc.write(fullPageHtml);
      frameDoc.close();

      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        throw new Error('Could not access print frame window');
      }

      // Wait for fonts & embedded images (logo, stamp, signature) to fully load
      const waitLoad = async () => {
        if ((frameDoc as any).fonts?.ready) {
          try {
            await (frameDoc as any).fonts.ready;
          } catch {
            // continue
          }
        }

        const images = Array.from(frameDoc.querySelectorAll('img'));
        if (images.length > 0) {
          await Promise.all(
            images.map(
              img =>
                new Promise(imgRes => {
                  if (img.complete) {
                    imgRes(true);
                  } else {
                    img.onload = () => imgRes(true);
                    img.onerror = () => imgRes(true);
                  }
                })
            )
          );
        }
      };

      await waitLoad();

      // Give a tiny tick for final layout paint
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
          resolve();
        } catch (err) {
          console.error('Print window error:', err);
          // Fallback: window.print()
          window.print();
          resolve();
        } finally {
          // Clean up frame after print dialog interaction
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 3000);
        }
      }, 250);
    } catch (error) {
      console.error('Print service failure:', error);
      reject(error);
    }
  });
}
