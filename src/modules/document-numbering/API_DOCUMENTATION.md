# Document Numbering API Documentation

## ✅ Implementation Complete

The Document Numbering module has been successfully created with full CRUD APIs for managing document number configurations, generating numbers, and tracking history.

## 📍 API Endpoints

All APIs are accessible at: **`/api/modules/document-numbering/`**

### 1. Configuration Management (`/configs`)

#### GET `/api/modules/document-numbering/configs`
List all document number configurations
- **Query Parameters**: page, limit, search, isActive
- **Response**: Paginated list of configurations

#### GET `/api/modules/document-numbering/configs/:id`
Get a specific configuration by ID

#### POST `/api/modules/document-numbering/configs`
Create a new document number configuration
- **Request Body**:
  ```json
  {
    "documentType": "PO",
    "documentName": "Purchase Order",
    "periodFormat": "YYMM",
    "prefix1Label": "Warehouse",
    "prefix1DefaultValue": "WH1",
    "prefix1Required": true,
    "prefix2Label": "Category",
    "prefix2DefaultValue": "LOCAL",
    "prefix2Required": false,
    "sequenceLength": 4,
    "separator": "-"
  }
  ```

#### PUT `/api/modules/document-numbering/configs/:id`
Update an existing configuration

#### DELETE `/api/modules/document-numbering/configs/:id`
Delete a configuration

---

### 2. Number Generation (`/generate`, `/preview`)

#### POST `/api/modules/document-numbering/generate`
Generate a new document number
- **Request Body**:
  ```json
  {
    "documentType": "PO",
    "prefix1": "WH1",
    "prefix2": "LOCAL",
    "documentId": "uuid-optional",
    "documentTableName": "purchase_orders"
  }
  ```
- **Response**:
  ```json
  {
    "documentNumber": "PO-2510-WH1-LOCAL-0001",
    "period": "2510",
    "sequenceNumber": 1,
    "historyId": "uuid"
  }
  ```

#### POST `/api/modules/document-numbering/preview`
Preview the next number without generating
- **Request Body**:
  ```json
  {
    "documentType": "PO",
    "prefix1": "WH1",
    "prefix2": "LOCAL"
  }
  ```
- **Response**:
  ```json
  {
    "previewNumber": "PO-2510-WH1-LOCAL-0001",
    "period": "2510",
    "nextSequence": 1,
    "config": {...}
  }
  ```

---

### 3. History Tracking (`/history`)

#### GET `/api/modules/document-numbering/history`
List all generated document numbers
- **Query Parameters**: page, limit, documentType, period, search, isVoided

#### GET `/api/modules/document-numbering/history/:id`
Get a specific history record

#### POST `/api/modules/document-numbering/history/:id/void`
Mark a document number as voided
- **Request Body**:
  ```json
  {
    "voidReason": "Cancelled order"
  }
  ```

---

### 4. Sequence Trackers (`/trackers`)

#### GET `/api/modules/document-numbering/trackers`
List all sequence trackers
- **Query Parameters**: page, limit, documentType, period

#### GET `/api/modules/document-numbering/trackers/:id`
Get a specific tracker by ID

---

## 🔐 Authentication

All endpoints require authentication:
```bash
Authorization: Bearer <your-jwt-token>
```

---

## 📊 Swagger Documentation

View complete API documentation with request/response examples at:
**`http://localhost:5000/api-docs`**

Look for the **"Document Numbering"** tag in the Swagger UI.

---

## 🎯 Example Usage

### Step 1: Create Configuration
```bash
curl -X POST http://localhost:5000/api/modules/document-numbering/configs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "PO",
    "documentName": "Purchase Order",
    "periodFormat": "YYMM",
    "prefix1Label": "Warehouse",
    "prefix1Required": true,
    "prefix2Label": "Category",
    "prefix2Required": false,
    "sequenceLength": 4,
    "separator": "-"
  }'
```

### Step 2: Preview Next Number
```bash
curl -X POST http://localhost:5000/api/modules/document-numbering/preview \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentType":"PO","prefix1":"WH1","prefix2":"LOCAL"}'
```

### Step 3: Generate Number
```bash
curl -X POST http://localhost:5000/api/modules/document-numbering/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentType":"PO","prefix1":"WH1","prefix2":"LOCAL"}'
```

### Step 4: View History
```bash
curl -X GET "http://localhost:5000/api/modules/document-numbering/history?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✨ Generated Number Examples

Based on configuration, the system generates numbers like:

- **With 2 prefixes**: `PO-2510-WH1-LOCAL-0001`
- **With 1 prefix**: `SO-2510-NORTH-0001`
- **No prefixes**: `INV-2510-0001`

Period automatically resets sequences:
- October 2025: `PO-2510-WH1-0001`, `PO-2510-WH1-0002`
- November 2025: `PO-2511-WH1-0001` (sequence resets)

---

## 🗄️ Database Tables

Three tables power this system:

1. **document_number_config** - Configuration per document type
2. **document_sequence_tracker** - Current sequences per combination
3. **document_number_history** - Complete audit trail

All tables support multi-tenancy with `tenant_id` isolation.

---

## 📝 Notes

- Preview endpoint is read-only and doesn't increment sequences
- Generate endpoint creates tracker records automatically
- Each unique combination of (type, period, prefix1, prefix2) has its own sequence
- Sequences reset automatically when period changes
- All operations are logged in history table for audit purposes

---

## 🚀 Next Steps

The APIs are ready to use. After restarting the server, you can:

1. **View in Swagger**: Visit `/api-docs` to see all endpoints
2. **Test APIs**: Use the examples above or Swagger's "Try it out" feature
3. **Integrate**: Call these APIs from your frontend or other services

---

Created: October 21, 2025
Status: ✅ Ready for Production Use
