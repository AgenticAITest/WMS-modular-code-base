# Generated Documents Table

## Overview
The `generated_documents` table stores metadata and file references for all HTML-based documents generated in the system (PO, SO, packing slips, shipping labels, etc.). This approach keeps the database lean while enabling document reprinting at any time.

## Table Schema

### Fields

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique document record identifier |
| `tenant_id` | uuid | NOT NULL, FK → sys_tenant.id | Tenant ownership |
| `document_type` | varchar(50) | NOT NULL | Document type (should match document_number_config.document_type) |
| `document_number` | varchar(100) | NOT NULL | The formatted document number (e.g., 'PO-2510-0001') |
| `reference_type` | varchar(50) | NOT NULL | Type of source record (e.g., 'purchase_order', 'sales_order') |
| `reference_id` | uuid | NOT NULL | UUID of the source record |
| `files` | jsonb | NOT NULL | File metadata (paths, sizes, timestamps) |
| `version` | integer | DEFAULT 1, NOT NULL | Version number for document regenerations |
| `generated_by` | uuid | NOT NULL, FK → sys_user.id | User who generated the document |
| `created_at` | timestamp | DEFAULT now(), NOT NULL | Creation timestamp |
| `updated_at` | timestamp | DEFAULT now(), NOT NULL | Last update timestamp |

### Indexes

1. **gen_docs_tenant_type_idx**: UNIQUE (tenant_id, document_type)
   - Fast lookup of all documents of a specific type for a tenant
   
2. **gen_docs_ref_idx**: UNIQUE (tenant_id, reference_type, reference_id)
   - Find all document versions for a specific source record
   
3. **gen_docs_number_idx**: UNIQUE (tenant_id, document_number)
   - Quick lookup by document number

### Foreign Keys

- `tenant_id` → `sys_tenant.id`
- `generated_by` → `sys_user.id`

## JSONB Files Structure

The `files` column stores metadata for all associated files in a flexible JSONB format:

```json
{
  "html": {
    "path": "documents/tenants/uuid/po/2025/PO-2510-0001.html",
    "size": 15234,
    "generated_at": "2025-10-22T10:30:00Z"
  },
  "signature": {
    "path": "documents/tenants/uuid/signatures/sig-uuid.png",
    "size": 8192,
    "signed_by": "user-uuid",
    "signed_at": "2025-10-22T11:00:00Z"
  },
  "attachments": [
    {
      "path": "documents/tenants/uuid/attachments/invoice.pdf",
      "name": "Commercial Invoice",
      "size": 12345,
      "type": "application/pdf"
    }
  ]
}
```

### File Storage Structure

Files are organized in the filesystem as follows:

```
public/documents/
└── tenants/
    └── {tenant-uuid}/
        ├── purchase_order/
        │   └── 2025/
        │       ├── PO-2510-0001.html
        │       └── PO-2510-0002.html
        ├── sales_order/
        │   └── 2025/
        │       └── SO-2510-0001.html
        ├── packing_slip/
        │   └── 2025/
        │       └── PACK-2510-0001.html
        └── signatures/
            ├── sig-uuid-1.png
            └── sig-uuid-2.png
```

## Usage Examples

### 1. Create a Document Record

```typescript
import { db } from '@server/lib/db';
import { generatedDocuments } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';

const newDoc = await db.insert(generatedDocuments).values({
  tenantId: user.activeTenantId,
  documentType: 'purchase_order',
  documentNumber: 'PO-2510-WH1-0001',
  referenceType: 'purchase_order',
  referenceId: purchaseOrderId,
  files: {
    html: {
      path: 'documents/tenants/uuid/po/2025/PO-2510-WH1-0001.html',
      size: 15234,
      generated_at: new Date().toISOString()
    }
  },
  version: 1,
  generatedBy: user.id
}).returning();
```

### 2. Find Document by Number

```typescript
const doc = await db
  .select()
  .from(generatedDocuments)
  .where(
    and(
      eq(generatedDocuments.tenantId, tenantId),
      eq(generatedDocuments.documentNumber, 'PO-2510-0001')
    )
  )
  .limit(1);
```

### 3. Get All Versions of a Document

```typescript
const versions = await db
  .select()
  .from(generatedDocuments)
  .where(
    and(
      eq(generatedDocuments.tenantId, tenantId),
      eq(generatedDocuments.referenceType, 'purchase_order'),
      eq(generatedDocuments.referenceId, poId)
    )
  )
  .orderBy(desc(generatedDocuments.version));
```

### 4. Add Signature to Existing Document

```typescript
// Fetch current document
const [doc] = await db
  .select()
  .from(generatedDocuments)
  .where(eq(generatedDocuments.id, docId));

// Update files with signature
const updatedFiles = {
  ...doc.files,
  signature: {
    path: 'documents/tenants/uuid/signatures/sig-123.png',
    size: 8192,
    signed_by: userId,
    signed_at: new Date().toISOString()
  }
};

await db
  .update(generatedDocuments)
  .set({ 
    files: updatedFiles,
    updatedAt: new Date()
  })
  .where(eq(generatedDocuments.id, docId));
```

### 5. Regenerate Document (New Version)

```typescript
const [latestDoc] = await db
  .select()
  .from(generatedDocuments)
  .where(
    and(
      eq(generatedDocuments.referenceType, 'purchase_order'),
      eq(generatedDocuments.referenceId, poId)
    )
  )
  .orderBy(desc(generatedDocuments.version))
  .limit(1);

const newVersion = await db.insert(generatedDocuments).values({
  ...latestDoc,
  id: undefined, // Generate new ID
  version: latestDoc.version + 1,
  files: {
    html: {
      path: `documents/tenants/${tenantId}/po/2025/PO-2510-0001-v${latestDoc.version + 1}.html`,
      size: 16000,
      generated_at: new Date().toISOString()
    }
  },
  generatedBy: currentUserId,
  createdAt: new Date(),
  updatedAt: new Date()
}).returning();
```

## Design Decisions

### Why File Storage Instead of Database Blobs?

1. **Database Size**: HTML documents can be large; storing them as files keeps the database lean
2. **Performance**: Serving files from filesystem/CDN is faster than extracting from database
3. **Backup**: Files are easier to backup independently and can be stored on cloud object storage
4. **CDN-Ready**: Files can be served directly via CDN without database queries
5. **Inspection**: HTML files can be opened directly for debugging without database tools

### Why JSONB for File Metadata?

1. **Flexibility**: Can add new file types (PDF exports, attachments) without schema changes
2. **Queryability**: PostgreSQL JSONB supports indexing and querying
3. **Type Safety**: Structured format is easier to validate and work with than strings
4. **Extensibility**: Each file type can have its own metadata fields

### Why Version Field?

Documents may need to be regenerated due to:
- Template changes
- Data corrections
- Additional signatures required
- Regulatory compliance (audit trail)

Versioning allows you to:
- Keep history of all generated versions
- Query for latest version
- Audit when and why documents were regenerated

## API Endpoints (To Be Implemented)

Suggested endpoints for working with generated documents:

- `GET /api/modules/document-numbering/documents/:id` - Get document metadata
- `GET /api/modules/document-numbering/documents/:id/file/:type` - Download specific file (html, signature, etc.)
- `POST /api/modules/document-numbering/documents` - Create new document record
- `PUT /api/modules/document-numbering/documents/:id/signature` - Add signature
- `POST /api/modules/document-numbering/documents/:id/regenerate` - Create new version
- `GET /api/modules/document-numbering/documents/by-number/:docNumber` - Lookup by document number
- `GET /api/modules/document-numbering/documents/by-reference/:type/:id` - Get all versions for a reference

## Multi-Tenancy

All queries **MUST** filter by `tenant_id` to ensure data isolation:

```typescript
// ✅ CORRECT
const docs = await db
  .select()
  .from(generatedDocuments)
  .where(eq(generatedDocuments.tenantId, user.activeTenantId));

// ❌ WRONG - Missing tenant filter
const docs = await db
  .select()
  .from(generatedDocuments);
```

## Security Considerations

1. **File Access**: Implement middleware to verify tenant ownership before serving files
2. **Path Validation**: Sanitize file paths to prevent directory traversal attacks
3. **File Upload**: Validate signature file types and sizes
4. **Permissions**: Check document-specific permissions before allowing access
