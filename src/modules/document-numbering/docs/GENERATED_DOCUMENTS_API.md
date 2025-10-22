# Generated Documents API - Complete Reference

## ✅ API Status
**All routes are live and registered in Swagger!**

Access the interactive API documentation at: **http://localhost:5000/api-docs**

Search for: **"Generated Documents"** tag in Swagger UI

---

## 📍 API Endpoints

### 1. **List All Documents** (with filtering & pagination)
```http
GET /api/modules/document-numbering/documents
```

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `documentType` (string) - Filter by type (e.g., "purchase_order")
- `referenceType` (string) - Filter by reference type
- `search` (string) - Search by document number

**Example:**
```bash
GET /api/modules/document-numbering/documents?page=1&limit=20&documentType=purchase_order
```

---

### 2. **Get Document by ID**
```http
GET /api/modules/document-numbering/documents/{id}
```

**Path Parameters:**
- `id` (uuid) - Document ID

**Example:**
```bash
GET /api/modules/document-numbering/documents/550e8400-e29b-41d4-a716-446655440000
```

---

### 3. **Get Document by Document Number**
```http
GET /api/modules/document-numbering/documents/by-number/{documentNumber}
```

**Path Parameters:**
- `documentNumber` (string) - The formatted document number (e.g., "PO-2510-0001")

**Example:**
```bash
GET /api/modules/document-numbering/documents/by-number/PO-2510-WH1-0001
```

---

### 4. **Get All Versions by Reference**
```http
GET /api/modules/document-numbering/documents/by-reference/{referenceType}/{referenceId}
```

**Path Parameters:**
- `referenceType` (string) - Type of reference (e.g., "purchase_order")
- `referenceId` (uuid) - UUID of the reference record

**Example:**
```bash
GET /api/modules/document-numbering/documents/by-reference/purchase_order/550e8400-e29b-41d4-a716-446655440000
```

**Use Case:** Get all regenerated versions of a purchase order document

---

### 5. **Create New Document**
```http
POST /api/modules/document-numbering/documents
```

**Request Body:**
```json
{
  "documentType": "purchase_order",
  "documentNumber": "PO-2510-WH1-0001",
  "referenceType": "purchase_order",
  "referenceId": "550e8400-e29b-41d4-a716-446655440000",
  "files": {
    "html": {
      "path": "documents/tenants/uuid/po/2025/PO-2510-WH1-0001.html",
      "size": 15234,
      "generated_at": "2025-10-22T10:30:00Z"
    },
    "signature": {
      "path": "documents/tenants/uuid/signatures/sig-uuid.png",
      "size": 8192,
      "signed_by": "user-uuid",
      "signed_at": "2025-10-22T11:00:00Z"
    }
  },
  "version": 1
}
```

**Required Fields:**
- `documentType`
- `documentNumber`
- `referenceType`
- `referenceId`
- `files` (JSONB object)

**Auto-populated:**
- `tenantId` (from authenticated user)
- `generatedBy` (from authenticated user)

---

### 6. **Update Document**
```http
PUT /api/modules/document-numbering/documents/{id}
```

**Path Parameters:**
- `id` (uuid) - Document ID

**Request Body:**
```json
{
  "files": {
    "html": {
      "path": "documents/tenants/uuid/po/2025/PO-2510-WH1-0001.html",
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
        "size": 12345
      }
    ]
  },
  "version": 2
}
```

**Use Case:** Add a signature or attachments to an existing document

---

### 7. **Delete Document**
```http
DELETE /api/modules/document-numbering/documents/{id}
```

**Path Parameters:**
- `id` (uuid) - Document ID

**Response:**
```json
{
  "message": "Document deleted successfully"
}
```

---

## 🔐 Authentication

All endpoints require authentication via JWT Bearer token.

**Header:**
```
Authorization: Bearer <your-jwt-token>
```

**Get Token:**
1. Login at `/api/auth/login`
2. Use the returned `accessToken` in subsequent requests

---

## 📊 Response Format

### Success Response (Single Document)
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenantId": "8e017478-2f5f-4be3-b8b6-e389436ca28a",
    "documentType": "purchase_order",
    "documentNumber": "PO-2510-WH1-0001",
    "referenceType": "purchase_order",
    "referenceId": "123e4567-e89b-12d3-a456-426614174000",
    "files": {
      "html": {
        "path": "documents/tenants/uuid/po/2025/PO-2510-WH1-0001.html",
        "size": 15234,
        "generated_at": "2025-10-22T10:30:00Z"
      }
    },
    "version": 1,
    "generatedBy": "user-uuid",
    "createdAt": "2025-10-22T10:30:00.000Z",
    "updatedAt": "2025-10-22T10:30:00.000Z"
  }
}
```

### Success Response (List with Pagination)
```json
{
  "data": [
    { /* document 1 */ },
    { /* document 2 */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Error Responses
```json
{
  "error": "Document not found"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## 🧪 Testing with Swagger

1. Navigate to: **http://localhost:5000/api-docs**
2. Find the **"Generated Documents"** section
3. Click "Authorize" and enter your Bearer token
4. Try the endpoints interactively!

**Steps:**
1. Click on an endpoint to expand it
2. Click "Try it out"
3. Fill in parameters/body
4. Click "Execute"
5. View the response

---

## 🔍 Common Use Cases

### Use Case 1: Store a Generated PO Document
```javascript
// After generating HTML for PO-2510-0001
const response = await fetch('/api/modules/document-numbering/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    documentType: 'purchase_order',
    documentNumber: 'PO-2510-0001',
    referenceType: 'purchase_order',
    referenceId: poId,
    files: {
      html: {
        path: `documents/tenants/${tenantId}/po/2025/PO-2510-0001.html`,
        size: htmlContent.length,
        generated_at: new Date().toISOString()
      }
    }
  })
});
```

### Use Case 2: Add Signature to Document
```javascript
// Fetch existing document
const doc = await fetch(`/api/modules/document-numbering/documents/${docId}`);
const docData = await doc.json();

// Update with signature
await fetch(`/api/modules/document-numbering/documents/${docId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    files: {
      ...docData.data.files,
      signature: {
        path: `documents/tenants/${tenantId}/signatures/${signatureId}.png`,
        size: signatureFile.size,
        signed_by: userId,
        signed_at: new Date().toISOString()
      }
    }
  })
});
```

### Use Case 3: Find All Versions of a PO
```javascript
const versions = await fetch(
  `/api/modules/document-numbering/documents/by-reference/purchase_order/${poId}`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
```

---

## ✅ Implementation Checklist

- [x] Database table created (`generated_documents`)
- [x] Drizzle ORM schema defined
- [x] CRUD API routes implemented
- [x] Swagger documentation added
- [x] Routes registered in main.ts
- [x] Server restarted (auto-restart on file changes)
- [x] Multi-tenant support (all queries filtered by tenantId)
- [x] Authentication middleware applied
- [x] Error handling implemented
- [x] Pagination support
- [x] Filtering by documentType and referenceType
- [x] Search by document number
- [x] TypeScript types exported

---

## 📚 Next Steps

1. **Create HTML Generation Service**
   - Template engine for PO/SO/Packing Slips
   - File writing to `public/documents/`

2. **File Upload Handling**
   - Signature upload endpoint
   - Attachment management

3. **Frontend UI Components**
   - Document preview modal
   - Reprint button
   - Version history viewer

4. **Integration with PO/SO Workflows**
   - Auto-generate documents on PO creation
   - Store document reference in PO record
