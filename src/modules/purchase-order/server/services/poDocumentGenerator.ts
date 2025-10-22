import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { eq, and, desc } from 'drizzle-orm';

interface PODocumentData {
  id: string;
  tenantId: string;
  orderNumber: string;
  orderDate: string;
  expectedDeliveryDate: string | null;
  totalAmount: string;
  notes: string | null;
  supplierName: string;
  supplierEmail: string | null;
  supplierPhone: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationPostalCode: string | null;
  locationCountry: string | null;
  warehouseName: string | null;
  warehouseAddress: string | null;
  createdByName: string | null;
  items: Array<{
    productSku: string;
    productName: string;
    orderedQuantity: number;
    unitCost: string;
    totalCost: string;
    notes: string | null;
  }>;
}

export class PODocumentGenerator {
  private static generateHTML(poData: PODocumentData): string {
    const supplierAddress = [
      poData.locationAddress,
      poData.locationCity,
      poData.locationState,
      poData.locationPostalCode,
      poData.locationCountry
    ].filter(Boolean).join(', ') || 'N/A';

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedOrderDate = poData.orderDate 
      ? new Date(poData.orderDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';

    const formattedDeliveryDate = poData.expectedDeliveryDate
      ? new Date(poData.expectedDeliveryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'N/A';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Order - ${poData.orderNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #000;
      background: #fff;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .header p {
      font-size: 14px;
      color: #666;
    }
    
    .document-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    
    .info-section {
      border: 2px solid #e0e0e0;
      padding: 20px;
      border-radius: 8px;
    }
    
    .info-section h2 {
      font-size: 14px;
      font-weight: bold;
      color: #555;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-section .company-name {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .info-section .detail-line {
      font-size: 14px;
      margin: 4px 0;
    }
    
    .info-section .label {
      font-weight: 600;
      display: inline-block;
      width: 140px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      border: 2px solid #000;
    }
    
    .items-table thead {
      background-color: #f5f5f5;
    }
    
    .items-table th {
      padding: 12px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #000;
      font-size: 14px;
      text-transform: uppercase;
    }
    
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
      font-size: 14px;
    }
    
    .items-table tbody tr:last-child td {
      border-bottom: 2px solid #000;
    }
    
    .items-table .text-right {
      text-align: right;
    }
    
    .items-table .text-center {
      text-align: center;
    }
    
    .total-section {
      display: flex;
      justify-content: flex-end;
      margin: 20px 0;
    }
    
    .total-box {
      background-color: #f9f9f9;
      border: 2px solid #000;
      padding: 15px 25px;
      min-width: 300px;
    }
    
    .total-box .total-label {
      font-size: 18px;
      font-weight: bold;
      display: inline-block;
      margin-right: 20px;
    }
    
    .total-box .total-amount {
      font-size: 24px;
      font-weight: bold;
      float: right;
    }
    
    .notes-section {
      margin: 30px 0;
      padding: 20px;
      background-color: #f9f9f9;
      border-left: 4px solid #000;
    }
    
    .notes-section h3 {
      font-size: 16px;
      margin-bottom: 10px;
      font-weight: bold;
    }
    
    .notes-section p {
      font-size: 14px;
      line-height: 1.8;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #000;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PURCHASE ORDER</h1>
    <p>This document serves as an official purchase order</p>
  </div>
  
  <div class="document-info">
    <div class="info-section">
      <h2>Supplier Information</h2>
      <div class="company-name">${poData.supplierName}</div>
      <div class="detail-line">${supplierAddress}</div>
      ${poData.supplierEmail ? `<div class="detail-line">Email: ${poData.supplierEmail}</div>` : ''}
      ${poData.supplierPhone ? `<div class="detail-line">Phone: ${poData.supplierPhone}</div>` : ''}
    </div>
    
    <div class="info-section">
      <h2>Order Information</h2>
      <div class="detail-line">
        <span class="label">PO Number:</span>
        <strong>${poData.orderNumber}</strong>
      </div>
      <div class="detail-line">
        <span class="label">Order Date:</span>
        ${formattedOrderDate}
      </div>
      <div class="detail-line">
        <span class="label">Expected Delivery:</span>
        ${formattedDeliveryDate}
      </div>
      ${poData.createdByName ? `
      <div class="detail-line">
        <span class="label">Created By:</span>
        ${poData.createdByName}
      </div>
      ` : ''}
      <div class="detail-line">
        <span class="label">Generated:</span>
        ${currentDate}
      </div>
    </div>
  </div>
  
  <div class="document-info" style="margin-bottom: 30px;">
    <div class="info-section">
      <h2>Delivery Address</h2>
      <div class="company-name">${poData.warehouseName || 'N/A'}</div>
      <div class="detail-line">${poData.warehouseAddress || 'Address not specified'}</div>
    </div>
  </div>
  
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 15%;">SKU</th>
        <th style="width: 35%;">Product Name</th>
        <th class="text-center" style="width: 12%;">Quantity</th>
        <th class="text-right" style="width: 15%;">Unit Cost</th>
        <th class="text-right" style="width: 15%;">Total Cost</th>
      </tr>
    </thead>
    <tbody>
      ${poData.items.map(item => `
      <tr>
        <td>${item.productSku}</td>
        <td>
          ${item.productName}
          ${item.notes ? `<br><small style="color: #666;">${item.notes}</small>` : ''}
        </td>
        <td class="text-center">${item.orderedQuantity}</td>
        <td class="text-right">$${parseFloat(item.unitCost).toFixed(2)}</td>
        <td class="text-right">$${parseFloat(item.totalCost).toFixed(2)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="total-section">
    <div class="total-box">
      <span class="total-label">TOTAL AMOUNT:</span>
      <span class="total-amount">$${parseFloat(poData.totalAmount).toFixed(2)}</span>
    </div>
  </div>
  
  ${poData.notes ? `
  <div class="notes-section">
    <h3>Notes</h3>
    <p>${poData.notes}</p>
  </div>
  ` : ''}
  
  <div class="footer">
    <p>This is a computer-generated document. No signature is required.</p>
    <p>Generated on ${currentDate} | Document ID: ${poData.id}</p>
  </div>
</body>
</html>`;
  }

  static async generateAndSave(
    poData: PODocumentData,
    userId: string,
    version: number = 1
  ): Promise<{ filePath: string; documentId: string }> {
    try {
      const year = new Date(poData.orderDate).getFullYear();
      const dirPath = path.join(
        process.cwd(),
        'public',
        'documents',
        'tenants',
        poData.tenantId,
        'po',
        year.toString()
      );

      await fs.mkdir(dirPath, { recursive: true });

      const fileName = `${poData.orderNumber}.html`;
      const filePath = path.join(dirPath, fileName);
      const htmlContent = this.generateHTML(poData);

      await fs.writeFile(filePath, htmlContent, 'utf-8');

      const relativePath = `documents/tenants/${poData.tenantId}/po/${year}/${fileName}`;
      const fileStats = await fs.stat(filePath);

      const [document] = await db
        .insert(generatedDocuments)
        .values({
          tenantId: poData.tenantId,
          documentType: 'purchase_order',
          documentNumber: poData.orderNumber,
          referenceType: 'purchase_order',
          referenceId: poData.id,
          files: {
            html: {
              path: relativePath,
              size: fileStats.size,
              generated_at: new Date().toISOString()
            }
          },
          version,
          generatedBy: userId
        })
        .returning();

      return {
        filePath: relativePath,
        documentId: document.id
      };
    } catch (error) {
      console.error('Error generating PO document:', error);
      throw error;
    }
  }

  static async regenerateDocument(
    poData: PODocumentData,
    userId: string
  ): Promise<{ filePath: string; documentId: string }> {
    const existingDocs = await db
      .select()
      .from(generatedDocuments)
      .where(
        and(
          eq(generatedDocuments.tenantId, poData.tenantId),
          eq(generatedDocuments.referenceType, 'purchase_order'),
          eq(generatedDocuments.referenceId, poData.id)
        )
      )
      .orderBy(desc(generatedDocuments.version))
      .limit(1);

    const nextVersion = existingDocs.length > 0 ? existingDocs[0].version + 1 : 1;

    return this.generateAndSave(poData, userId, nextVersion);
  }
}
