import { BusinessDocument, AppSettings } from '../types';
import { formatIndianCurrency, formatDate } from './indianNumbering';
import { extractPinCodeFromAddress } from '../services/ewayBillService';

/**
 * QUICKBILL PRP – CANONICAL INVOICE TEMPLATE
 * 
 * Single source of truth for:
 * 1. Invoice Preview (Screen)
 * 2. Download PDF (jsPDF / html2canvas)
 * 3. Print (Direct A4 paper printing via dedicated print frame)
 * 
 * Sized and typeset specifically for commercial A4 Portrait documents.
 */
export function buildInvoiceDocumentHtml(
  doc: BusinessDocument,
  settings: AppSettings | null,
  copyType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL',
  isReprint = false
): string {
  const isQuotation = doc.docType === 'QUOTATION';
  const isCancelled = doc.status === 'CANCELLED';

  const copyTypeText =
    copyType === 'ORIGINAL'
      ? 'Original for Recipient'
      : copyType === 'DUPLICATE'
      ? 'Duplicate for Transporter'
      : 'Triplicate for Supplier';

  const resolvedCustomerPin =
    doc.customerPinCode || extractPinCodeFromAddress(doc.customerAddress) || '';

  // Logo: Show if logoUrl exists and showLogo is not explicitly false
  const shouldShowLogo = Boolean(
    settings?.branding?.logoUrl && settings?.branding?.showLogo !== false
  );

  return `
    <div class="quickbill-invoice-sheet" style="width: 100%; box-sizing: border-box; background: #ffffff; color: #090d16; position: relative; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility;">
      ${
        isCancelled
          ? `<div style="position: absolute; top: 32%; left: 10%; right: 10%; text-align: center; border: 8px solid rgba(239, 68, 68, 0.22); color: rgba(239, 68, 68, 0.22); font-size: 72px; font-weight: 900; letter-spacing: 12px; transform: rotate(-25deg); padding: 18px 24px; border-radius: 24px; z-index: 50; pointer-events: none; text-transform: uppercase;">CANCELLED</div>`
          : ''
      }

      <!-- Top Header Row: GSTIN, Copy Type, PAN -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px; font-size: 10px; font-weight: 700; color: #475569;">
        <div>
          <span>GSTIN: </span>
          <span style="font-family: 'Roboto Mono', monospace; font-weight: 700; color: #090d16; letter-spacing: 0.5px;">${settings?.business.gstin || '-'}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="background: #f8fafc; border: 1px solid #94a3b8; padding: 2px 10px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #1e293b;">
            ${copyTypeText}
          </div>
          ${
            isReprint
              ? `<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #92400e;">REPRINT</div>`
              : ''
          }
        </div>
        <div>
          <span>PAN: </span>
          <span style="font-family: 'Roboto Mono', monospace; font-weight: 700; color: #090d16; letter-spacing: 0.5px;">${settings?.business.pan || '-'}</span>
        </div>
      </div>

      <!-- Company Header Section -->
      <div style="text-align: center; padding-bottom: 10px; border-bottom: 2px solid #0f172a;">
        <div style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 3px;">
          ${
            shouldShowLogo
              ? `<img src="${settings?.branding.logoUrl}" alt="Logo" style="max-height: 48px; max-width: 130px; object-fit: contain; flex-shrink: 0;" />`
              : ''
          }
          <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #020617; letter-spacing: -0.2px; text-transform: uppercase; line-height: 1.18;">
            ${settings?.business.businessName || 'YOUR BUSINESS NAME'}
          </h1>
        </div>
        <div style="font-size: 11px; font-weight: 500; color: #334155; max-width: 620px; margin: 0 auto; line-height: 1.42;">
          ${settings?.business.address || 'Address not configured in Settings'}${settings?.business.city ? `, ${settings.business.city}` : ''}${settings?.business.state ? `, ${settings.business.state}` : ''}${settings?.business.pinCode ? ` - ${settings.business.pinCode}` : ''}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 3px; display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; font-weight: 500;">
          ${settings?.business.primaryContact ? `<span><strong style="color: #334155;">Phone:</strong> ${settings.business.primaryContact}</span><span>•</span>` : ''}
          ${settings?.business.email ? `<span><strong style="color: #334155;">Email:</strong> ${settings.business.email}</span><span>•</span>` : ''}
          <span><strong style="color: #334155;">State Code:</strong> ${settings?.business.stateCode || '-'} ${settings?.business.state ? `(${settings.business.state})` : ''}</span>
        </div>
      </div>

      <!-- Document Title Banner -->
      <div style="background: #0f172a; color: #ffffff; text-align: center; padding: 5.5px 0; margin: 8px 0; border-radius: 3px; font-weight: 900; letter-spacing: 2px; font-size: 12px; text-transform: uppercase;">
        ${isQuotation ? 'QUOTATION' : 'TAX INVOICE'}
      </div>

      <!-- Customer Details & Document Metadata Grid (2-Column) -->
      <div style="display: flex; border: 1.5px solid #0f172a; border-radius: 2px; margin-bottom: 10px; font-size: 10.5px; background: #ffffff; break-inside: avoid; page-break-inside: avoid;">
        <!-- Left: Customer Details -->
        <div style="flex: 1.1; padding: 8px 12px; border-right: 1.5px solid #0f172a; box-sizing: border-box;">
          <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 3px; letter-spacing: 0.6px;">
            Details of Receiver / Billed To:
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #020617; line-height: 1.25; margin-bottom: 4px; word-break: break-word;">
            ${doc.customerName}
          </div>
          <div style="color: #334155; font-size: 10px; line-height: 1.4; margin-bottom: 6px; white-space: pre-wrap; word-break: break-word; font-weight: 500;">
            ${doc.customerAddress || 'Address on record'}
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 10px; line-height: 1.5;">
            ${
              resolvedCustomerPin
                ? `
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #475569; font-weight: 700;">Customer PIN Code:</span>
                <span style="font-family: 'Roboto Mono', monospace; font-weight: 700; color: #090d16; letter-spacing: 0.5px;">${resolvedCustomerPin}</span>
              </div>
            `
                : ''
            }
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #475569; font-weight: 700;">GSTIN / UIN:</span>
              <span style="font-family: 'Roboto Mono', monospace; font-weight: 700; color: #090d16; letter-spacing: 0.5px;">${doc.customerGstin || 'Unregistered'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #475569;">Contact No:</span>
              <span style="font-weight: 600; color: #090d16;">${doc.customerContact || '-'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #475569;">State & Code:</span>
              <span style="font-weight: 700; color: #090d16;">${doc.customerState} (${doc.customerStateCode})</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #475569;">Place of Supply:</span>
              <span style="font-weight: 700; color: #090d16;">${doc.placeOfSupply}</span>
            </div>
          </div>
        </div>

        <!-- Right: Invoice / Quotation Metadata -->
        <div style="flex: 0.9; padding: 8px 12px; box-sizing: border-box; font-size: 10px; line-height: 1.48;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
            <span style="color: #475569; font-weight: 700;">${isQuotation ? 'Quotation No:' : 'Invoice No:'}</span>
            <span style="font-weight: 900; font-family: 'Roboto Mono', monospace; font-size: 11px; color: #020617; letter-spacing: 0.3px;">${doc.docNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 2.5px 0;">
            <span style="color: #475569; font-weight: 700;">Dated:</span>
            <span style="font-weight: 700; color: #090d16;">${formatDate(doc.docDate)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 2.5px 0;">
            <span style="color: #475569;">Buyer Order No & Date:</span>
            <span style="font-weight: 600; color: #090d16;">${doc.buyerOrderNo ? `${doc.buyerOrderNo} (${formatDate(doc.buyerOrderDate)})` : '-'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 2.5px 0;">
            <span style="color: #475569;">Dispatch Doc / LR No:</span>
            <span style="font-weight: 600; color: #090d16;">${doc.dispatchDocNo || '-'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 2.5px 0;">
            <span style="color: #475569;">Dispatched Through:</span>
            <span style="font-weight: 600; color: #090d16;">${doc.dispatchedThrough || '-'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 2.5px 0;">
            <span style="color: #475569;">Terms of Payment:</span>
            <span style="font-weight: 700; color: #090d16;">${doc.paymentTerms || '30 Days Net'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 2.5px;">
            <span style="color: #475569;">Terms of Delivery:</span>
            <span style="font-weight: 600; color: #090d16;">${doc.termsOfDelivery || 'Door Delivery'}</span>
          </div>
        </div>
      </div>

      <!-- Product Items Table -->
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a; margin-bottom: 10px; font-size: 10px; font-feature-settings: 'tnum' 1; table-layout: fixed;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 1.5px solid #0f172a; text-transform: uppercase; font-size: 9px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">
            <th style="padding: 6px 4px; text-align: center; width: 34px; border-right: 1px solid #0f172a;">Sr.</th>
            <th style="padding: 6px 8px; text-align: left; border-right: 1px solid #0f172a;">Description of Goods</th>
            <th style="padding: 6px 4px; text-align: center; width: 68px; border-right: 1px solid #0f172a;">HSN/SAC</th>
            <th style="padding: 6px 4px; text-align: center; width: 42px; border-right: 1px solid #0f172a;">GST</th>
            <th style="padding: 6px 6px; text-align: right; width: 58px; border-right: 1px solid #0f172a;">Qty</th>
            <th style="padding: 6px 6px; text-align: right; width: 78px; border-right: 1px solid #0f172a;">Rate (₹)</th>
            <th style="padding: 6px 8px; text-align: right; width: 92px;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${doc.items
            .map(
              (item, idx) => `
            <tr style="border-bottom: 1px solid #cbd5e1; vertical-align: top; break-inside: avoid; page-break-inside: avoid;">
              <td style="padding: 6px 4px; text-align: center; font-weight: 700; color: #475569; border-right: 1px solid #0f172a;">
                ${idx + 1}
              </td>
              <td style="padding: 6px 8px; border-right: 1px solid #0f172a; word-break: break-word;">
                <div style="font-weight: 800; color: #020617; font-size: 11px; line-height: 1.3;">${item.productName}</div>
                ${
                  item.productDescription
                    ? `<div style="font-size: 9px; color: #475569; margin-top: 1.5px; line-height: 1.35; white-space: pre-wrap; font-weight: 400;">${item.productDescription}</div>`
                    : ''
                }
              </td>
              <td style="padding: 6px 4px; text-align: center; font-family: 'Roboto Mono', monospace; font-size: 9.5px; font-weight: 600; color: #334155; border-right: 1px solid #0f172a;">
                ${item.hsnSac || '-'}
              </td>
              <td style="padding: 6px 4px; text-align: center; font-weight: 700; color: #334155; border-right: 1px solid #0f172a;">
                ${item.gstRate}%
              </td>
              <td style="padding: 6px 6px; text-align: right; font-weight: 800; color: #090d16; border-right: 1px solid #0f172a; white-space: nowrap;">
                ${item.quantity} ${item.unit ? `<span style="font-size: 8.5px; font-weight: 500; color: #64748b;">${item.unit}</span>` : ''}
              </td>
              <td style="padding: 6px 6px; text-align: right; font-weight: 700; color: #090d16; border-right: 1px solid #0f172a; white-space: nowrap;">
                ${formatIndianCurrency(item.rate, false)}
              </td>
              <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #020617; white-space: nowrap;">
                ${formatIndianCurrency(item.amount, false)}
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <!-- Lower Calculation & Declaration Grid (2-Column) -->
      <div style="display: flex; border: 1.5px solid #0f172a; border-radius: 2px; font-size: 10px; margin-bottom: 8px; break-inside: avoid; page-break-inside: avoid; background: #ffffff;">
        <!-- Left Sub-panel: Words, Bank Details, Terms, Declaration -->
        <div style="flex: 1.15; padding: 8px 12px; border-right: 1.5px solid #0f172a; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
          <!-- Amount in Words -->
          <div style="background: #f8fafc; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 3px; margin-bottom: 6px;">
            <div style="font-size: 8.5px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
              Total Amount Chargeable (in words):
            </div>
            <div style="font-weight: 800; color: #090d16; font-size: 10.5px; margin-top: 2px; line-height: 1.35; word-break: break-word;">
              ${doc.amountInWords}
            </div>
          </div>

          ${
            doc.notes
              ? `
            <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 3px; padding: 4px 8px; margin-bottom: 6px; font-size: 9px; line-height: 1.35; color: #78350f;">
              <span style="font-weight: 800; text-transform: uppercase; font-size: 8px; color: #92400e; display: block; margin-bottom: 2px; letter-spacing: 0.5px;">Notes / Remarks:</span>
              <span>${doc.notes.replace(/\n/g, '<br/>')}</span>
            </div>
          `
              : ''
          }

          <!-- Bank Details -->
          ${
            settings?.print.showBankDetails
              ? `
            <div style="border: 1px solid #cbd5e1; border-radius: 3px; padding: 5px 8px; margin-bottom: 6px; font-size: 9px; line-height: 1.45; background: #fafafa;">
              <div style="font-weight: 900; text-transform: uppercase; color: #1e293b; margin-bottom: 2px; font-size: 8.5px; letter-spacing: 0.5px;">
                Company Bank Details
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; color: #334155;">
                <div>Bank: <strong style="color: #090d16;">${settings?.bank.bankName || '-'}</strong></div>
                <div>A/c Name: <strong style="color: #090d16;">${settings?.bank.accountHolder || '-'}</strong></div>
                <div>A/c No: <strong style="color: #090d16; font-family: 'Roboto Mono', monospace; font-size: 9.5px;">${settings?.bank.accountNumber || '-'}</strong></div>
                <div>IFSC: <strong style="color: #090d16; font-family: 'Roboto Mono', monospace; font-size: 9.5px;">${settings?.bank.ifsc || '-'}</strong></div>
                <div>Branch: <span style="color: #334155;">${settings?.bank.branch || '-'}</span></div>
                <div>UPI ID: <strong style="color: #4338ca; font-family: 'Roboto Mono', monospace;">${settings?.bank.upiId || '-'}</strong></div>
              </div>
            </div>
          `
              : ''
          }

          <!-- Terms & Conditions -->
          ${
            settings?.print.showTerms
              ? `
            <div style="font-size: 8px; color: #475569; margin-bottom: 5px; line-height: 1.35;">
              <div style="font-weight: 900; text-transform: uppercase; color: #1e293b; margin-bottom: 2px; letter-spacing: 0.5px;">Terms & Conditions:</div>
              <ol style="margin: 0; padding-left: 14px;">
                ${(isQuotation ? settings?.terms.quotationTerms : settings?.terms.invoiceTerms)
                  ?.map(term => `<li style="margin-bottom: 1px;">${term}</li>`)
                  .join('')}
              </ol>
            </div>
          `
              : ''
          }

          <!-- Declaration -->
          ${
            settings?.print.showDeclaration
              ? `
            <div style="border-top: 1px solid #e2e8f0; padding-top: 3px; font-size: 8px; color: #64748b; line-height: 1.35;">
              <strong style="color: #334155;">Declaration:</strong> ${settings?.terms.declaration}
            </div>
          `
              : ''
          }
        </div>

        <!-- Right Sub-panel: Calculation Breakdown & Signatory -->
        <div style="flex: 0.85; padding: 8px 12px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; font-feature-settings: 'tnum' 1;">
          <div style="line-height: 1.6;">
            <div style="display: flex; justify-content: space-between; color: #334155;">
              <span>Subtotal Amount:</span>
              <strong style="color: #090d16; font-weight: 700;">${formatIndianCurrency(doc.productTotal)}</strong>
            </div>

            ${
              doc.discountAmount > 0
                ? `
              <div style="display: flex; justify-content: space-between; color: #dc2626;">
                <span>Discount:</span>
                <strong style="font-weight: 700;">- ${formatIndianCurrency(doc.discountAmount)}</strong>
              </div>
            `
                : ''
            }

            <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 2.5px; font-weight: 800; color: #020617;">
              <span>Taxable Value:</span>
              <span>${formatIndianCurrency(doc.taxableValue)}</span>
            </div>

            ${
              doc.freightCharges > 0
                ? `
              <div style="display: flex; justify-content: space-between; color: #334155;">
                <span>Freight & Cartage:</span>
                <strong style="color: #090d16; font-weight: 700;">${formatIndianCurrency(doc.freightCharges)}</strong>
              </div>
            `
                : ''
            }

            ${
              doc.isInterState
                ? `
              <div style="display: flex; justify-content: space-between; color: #581c87; font-weight: 800;">
                <span>IGST (Integrated Tax):</span>
                <span>${formatIndianCurrency(doc.igst)}</span>
              </div>
            `
                : `
              <div style="display: flex; justify-content: space-between; color: #334155;">
                <span>CGST (Central Tax):</span>
                <strong style="color: #090d16; font-weight: 700;">${formatIndianCurrency(doc.cgst)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #334155;">
                <span>SGST (State Tax):</span>
                <strong style="color: #090d16; font-weight: 700;">${formatIndianCurrency(doc.sgst)}</strong>
              </div>
            `
            }

            ${
              doc.otherCharges > 0
                ? `
              <div style="display: flex; justify-content: space-between; color: #334155;">
                <span>Other Charges:</span>
                <strong style="color: #090d16; font-weight: 700;">${formatIndianCurrency(doc.otherCharges)}</strong>
              </div>
            `
                : ''
            }

            ${
              doc.roundingOff !== 0
                ? `
              <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 9px;">
                <span>Rounding Off:</span>
                <span style="font-weight: 600;">${formatIndianCurrency(doc.roundingOff)}</span>
              </div>
            `
                : ''
            }
          </div>

          <!-- Grand Total Highlight Bar -->
          <div style="border-top: 2px solid #0f172a; margin-top: 5px; padding: 5px 8px; background: #f1f5f9; border-radius: 3px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 900; color: #020617;">
            <span>Grand Total:</span>
            <span style="color: #1e1b4b; font-size: 14px; font-weight: 900;">${formatIndianCurrency(doc.grandTotal)}</span>
          </div>

          <!-- Authorized Signatory Stamp & Signature Box -->
          <div style="margin-top: 10px; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 5px;">
            <div style="font-size: 8.5px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-bottom: 2px; letter-spacing: 0.5px;">
              For ${settings?.business.businessName || 'Authorized Signatory'}
            </div>
            <div style="height: 42px; display: flex; align-items: center; justify-content: center; position: relative;">
              ${
                settings?.branding.stampUrl && settings.branding.showStamp !== false
                  ? `<img src="${settings.branding.stampUrl}" alt="Stamp" style="max-height: 40px; opacity: 0.88; object-fit: contain;" />`
                  : ''
              }
              ${
                settings?.branding.signatureUrl && settings.branding.showSignature !== false
                  ? `<img src="${settings.branding.signatureUrl}" alt="Signature" style="max-height: 36px; object-fit: contain; position: absolute;" />`
                  : ''
              }
              ${
                !settings?.branding.signatureUrl && !settings?.branding.stampUrl
                  ? `<span style="color: #94a3b8; font-size: 9.5px; font-style: italic;">[ Authorized Signatory ]</span>`
                  : ''
              }
            </div>
            <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #475569; border-top: 1px dashed #94a3b8; padding-top: 2px; letter-spacing: 0.5px;">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Computer Generated Note -->
      <div style="display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 3px;">
        <span>This is a computer generated document.</span>
        <span>Doc: ${doc.docNumber} | Generated By: ${doc.generatedByName}</span>
      </div>
    </div>
  `;
}
