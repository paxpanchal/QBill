import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { BusinessDocument, AppSettings } from '../types';
import { buildInvoiceDocumentHtml } from './invoiceTemplate';
import { printInvoiceDocument } from './printService';
import { dbService } from '../services/storage';

export { buildInvoiceDocumentHtml } from './invoiceTemplate';
export { printInvoiceDocument } from './printService';

/**
 * Creates an isolated off-screen rendering element and generates a high-resolution jsPDF instance.
 * Uses html2canvas-pro with scale 3 for crisp, professional typography and sharp vector lines.
 */
async function createPdfFromDocument(
  doc: BusinessDocument,
  settings: AppSettings | null,
  copyType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL',
  isReprint = false
): Promise<jsPDF> {
  const resolvedSettings = settings || (await dbService.getSettings());

  const container = document.createElement('div');
  container.className = 'pdf-export-container';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // 210mm in 96dpi pixels for standard A4
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#090d16';
  container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif";
  container.style.fontSize = '12px';
  container.style.lineHeight = '1.4';
  container.style.boxSizing = 'border-box';
  container.style.padding = '24px';

  container.innerHTML = buildInvoiceDocumentHtml(doc, resolvedSettings, copyType, isReprint);
  document.body.appendChild(container);

  try {
    // Wait for fonts to be loaded
    if ((document as any).fonts?.ready) {
      try {
        await (document as any).fonts.ready;
      } catch {
        // continue
      }
    }

    // Wait for any embedded images (logos, stamps, signatures) to load
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length > 0) {
      await Promise.all(
        images.map(
          img =>
            new Promise(resolve => {
              if (img.complete) {
                resolve(true);
              } else {
                img.onload = () => resolve(true);
                img.onerror = () => resolve(true);
              }
            })
        )
      );
    }

    // High resolution rasterization with html2canvas-pro at scale: 2.8 for razor-sharp vector-like text
    const canvas = await html2canvas(container, {
      scale: 2.8,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // A4 dimensions: 210mm x 297mm
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 10;
    const contentWidth = pdfWidth - margin * 2; // 190mm
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    const pageAvailableHeight = pdfHeight - margin * 2; // 277mm

    if (contentHeight <= pageAvailableHeight) {
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
    } else {
      let heightLeft = contentHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
      heightLeft -= pageAvailableHeight;

      while (heightLeft > 0) {
        position = position - pageAvailableHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
        heightLeft -= pageAvailableHeight;
      }
    }

    return pdf;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Generate and trigger download of a pixel-perfect A4 PDF
 * for QuickBill PRP Invoices & Quotations.
 */
export async function downloadDocumentAsPdf(
  doc: BusinessDocument,
  settings: AppSettings | null,
  copyType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL',
  isReprint = false
): Promise<void> {
  const cleanDocNumber = doc.docNumber.replace(/[\/\\]/g, '_');
  const filename = `${doc.docType}_${cleanDocNumber}.pdf`;

  const pdf = await createPdfFromDocument(doc, settings, copyType, isReprint);
  pdf.save(filename);
}

/**
 * Generate a PDF Blob for sharing via Web Share API
 */
export async function generateDocumentPdfBlob(
  doc: BusinessDocument,
  settings: AppSettings | null,
  copyType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL',
  isReprint = false
): Promise<{ blob: Blob; filename: string }> {
  const cleanDocNumber = doc.docNumber.replace(/[\/\\]/g, '_');
  const filename = `${doc.docType}_${cleanDocNumber}.pdf`;

  const pdf = await createPdfFromDocument(doc, settings, copyType, isReprint);
  const pdfBlob: Blob = pdf.output('blob');

  return { blob: pdfBlob, filename };
}

/**
 * Unified Print Handler - delegates to printInvoiceDocument
 */
export async function printDocument(
  doc: BusinessDocument,
  settings: AppSettings | null,
  copyType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL',
  isReprint = false
): Promise<void> {
  await printInvoiceDocument(doc, settings, copyType, isReprint);
}
