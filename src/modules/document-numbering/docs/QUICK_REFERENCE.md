# Generated Documents - Quick Reference

## Table Created ✅
- **Table Name**: `generated_documents`
- **Location**: Document Numbering Module
- **Schema File**: `src/modules/document-numbering/server/lib/db/schemas/documentNumbering.ts`

## Quick File Path Example

```typescript
// Example file paths for a purchase order
const filePaths = {
  html: `documents/tenants/${tenantId}/purchase_order/2025/PO-2510-WH1-0001.html`,
  signature: `documents/tenants/${tenantId}/signatures/${signatureUuid}.png`,
  attachment: `documents/tenants/${tenantId}/attachments/${filename}.pdf`
};
```

## Quick Insert Example

```typescript
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';

await db.insert(generatedDocuments).values({
  tenantId: user.activeTenantId,
  documentType: 'purchase_order',
  documentNumber: 'PO-2510-WH1-0001',
  referenceType: 'purchase_order',
  referenceId: poId,
  files: {
    html: {
      path: 'documents/tenants/xxx/po/2025/PO-2510-WH1-0001.html',
      size: 15234,
      generated_at: new Date().toISOString()
    }
  },
  version: 1,
  generatedBy: user.id
});
```

## Quick Query Examples

```typescript
// Find by document number
const doc = await db.select()
  .from(generatedDocuments)
  .where(and(
    eq(generatedDocuments.tenantId, tenantId),
    eq(generatedDocuments.documentNumber, 'PO-2510-0001')
  ));

// Get latest version for a PO
const latest = await db.select()
  .from(generatedDocuments)
  .where(and(
    eq(generatedDocuments.referenceType, 'purchase_order'),
    eq(generatedDocuments.referenceId, poId)
  ))
  .orderBy(desc(generatedDocuments.version))
  .limit(1);
```

## JSONB Files Format

```json
{
  "html": { "path": "...", "size": 15234, "generated_at": "2025-10-22T10:30:00Z" },
  "signature": { "path": "...", "size": 8192, "signed_by": "uuid", "signed_at": "..." },
  "attachments": [{ "path": "...", "name": "...", "size": 12345 }]
}
```

## Next Steps
1. Create API routes for document generation
2. Implement HTML template rendering
3. Add file upload handling for signatures
4. Create document preview/reprint UI
