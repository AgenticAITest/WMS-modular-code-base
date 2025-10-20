# Inventory Items API Documentation

## Overview
The Inventory Items API provides comprehensive CRUD operations for managing inventory items in the warehouse management system. Each inventory item represents a specific quantity of a product stored in a specific bin location.

## Base URL
```
/api/modules/inventory-items
```

## Authentication
All endpoints require Bearer token authentication.

## Endpoints

### 1. Get All Inventory Items
**GET** `/inventory-items`

Retrieves a paginated list of inventory items with product and bin details.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 10) - Items per page
- `search` (string, optional) - Search by product SKU, product name, batch number, or lot number
- `productId` (uuid, optional) - Filter by specific product
- `binId` (uuid, optional) - Filter by specific bin

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "productId": "uuid",
      "binId": "uuid",
      "availableQuantity": 100,
      "reservedQuantity": 10,
      "expiryDate": "2025-12-31",
      "batchNumber": "BATCH-001",
      "lotNumber": "LOT-2025-1234",
      "receivedDate": "2025-01-15",
      "costPerUnit": "25.50",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z",
      "product": {
        "id": "uuid",
        "sku": "PROD-001",
        "name": "Product Name",
        "hasExpiryDate": true
      },
      "bin": {
        "id": "uuid",
        "name": "Bin A1-01-001"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 30,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Get Inventory Item by ID
**GET** `/inventory-items/:id`

Retrieves detailed information about a specific inventory item.

**Parameters:**
- `id` (uuid, required) - Inventory item ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "productId": "uuid",
    "binId": "uuid",
    "availableQuantity": 100,
    "reservedQuantity": 10,
    "expiryDate": "2025-12-31",
    "batchNumber": "BATCH-001",
    "lotNumber": "LOT-2025-1234",
    "receivedDate": "2025-01-15",
    "costPerUnit": "25.50",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z",
    "product": {
      "id": "uuid",
      "sku": "PROD-001",
      "name": "Product Name",
      "description": "Product description",
      "hasExpiryDate": true
    },
    "bin": {
      "id": "uuid",
      "name": "Bin A1-01-001",
      "barcode": "BIN-BARCODE-001"
    }
  }
}
```

### 3. Create Inventory Item
**POST** `/inventory-items`

Creates a new inventory item.

**Request Body:**
```json
{
  "productId": "uuid",              // Required
  "binId": "uuid",                  // Required
  "availableQuantity": 100,         // Required, >= 0
  "reservedQuantity": 10,           // Optional, >= 0, default: 0
  "expiryDate": "2025-12-31",       // Optional (ISO date)
  "batchNumber": "BATCH-001",       // Optional
  "lotNumber": "LOT-2025-1234",     // Optional
  "receivedDate": "2025-01-15",     // Optional (ISO date)
  "costPerUnit": 25.50              // Optional (decimal)
}
```

**Validations:**
- Product must exist and belong to the tenant
- Bin must exist and belong to the tenant
- Available quantity must be non-negative
- Reserved quantity must be non-negative

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "productId": "uuid",
    "binId": "uuid",
    "availableQuantity": 100,
    "reservedQuantity": 10,
    "expiryDate": "2025-12-31",
    "batchNumber": "BATCH-001",
    "lotNumber": "LOT-2025-1234",
    "receivedDate": "2025-01-15",
    "costPerUnit": "25.50",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  "message": "Inventory item created successfully"
}
```

### 4. Update Inventory Item
**PUT** `/inventory-items/:id`

Updates an existing inventory item. Only provided fields will be updated.

**Parameters:**
- `id` (uuid, required) - Inventory item ID

**Request Body:**
```json
{
  "availableQuantity": 150,         // Optional, >= 0
  "reservedQuantity": 15,           // Optional, >= 0
  "expiryDate": "2026-01-31",       // Optional
  "batchNumber": "BATCH-002",       // Optional
  "lotNumber": "LOT-2025-5678",     // Optional
  "receivedDate": "2025-02-01",     // Optional
  "costPerUnit": 27.00              // Optional
}
```

**Note:** `productId` and `binId` cannot be changed after creation.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "productId": "uuid",
    "binId": "uuid",
    "availableQuantity": 150,
    "reservedQuantity": 15,
    "expiryDate": "2026-01-31",
    "batchNumber": "BATCH-002",
    "lotNumber": "LOT-2025-5678",
    "receivedDate": "2025-02-01",
    "costPerUnit": "27.00",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-02-01T14:20:00Z"
  },
  "message": "Inventory item updated successfully"
}
```

### 5. Delete Inventory Item
**DELETE** `/inventory-items/:id`

Deletes an inventory item.

**Parameters:**
- `id` (uuid, required) - Inventory item ID

**Response:**
```json
{
  "success": true,
  "message": "Inventory item deleted successfully"
}
```

### 6. Get Inventory Statistics
**GET** `/inventory-items/stats/summary`

Retrieves summary statistics for all inventory items.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalItems": 30,
    "totalAvailable": 7130,
    "totalReserved": 708
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Error description"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Inventory item not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Data Model

### Inventory Item Schema
```typescript
{
  id: uuid (primary key, auto-generated)
  tenantId: uuid (foreign key to tenants)
  productId: uuid (foreign key to products)
  binId: uuid (foreign key to bins)
  availableQuantity: integer (required, >= 0)
  reservedQuantity: integer (default: 0, >= 0)
  expiryDate: date (nullable)
  batchNumber: varchar(100) (nullable)
  lotNumber: varchar(100) (nullable)
  receivedDate: date (nullable)
  costPerUnit: decimal(10,2) (nullable)
  createdAt: timestamp (auto-generated)
  updatedAt: timestamp (auto-updated)
}
```

### Indexes
- (tenant_id, product_id, bin_id) - Composite index for efficient lookups
- (tenant_id, expiry_date) - For expiry tracking queries
- (tenant_id, batch_number) - For batch tracking
- tenant_id - For tenant isolation

## Usage Examples

### Example 1: Search for Inventory Items
```bash
curl -X GET "http://localhost:5000/api/modules/inventory-items/inventory-items?search=laptop&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 2: Create New Inventory Item
```bash
curl -X POST "http://localhost:5000/api/modules/inventory-items/inventory-items" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid-here",
    "binId": "bin-uuid-here",
    "availableQuantity": 100,
    "reservedQuantity": 0,
    "batchNumber": "BATCH-2025-001",
    "lotNumber": "LOT-2025-1234",
    "receivedDate": "2025-01-20",
    "costPerUnit": 25.99
  }'
```

### Example 3: Update Inventory Quantity
```bash
curl -X PUT "http://localhost:5000/api/modules/inventory-items/inventory-items/ITEM_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "availableQuantity": 150,
    "reservedQuantity": 20
  }'
```

### Example 4: Filter by Product
```bash
curl -X GET "http://localhost:5000/api/modules/inventory-items/inventory-items?productId=PRODUCT_UUID&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 5: Get Statistics
```bash
curl -X GET "http://localhost:5000/api/modules/inventory-items/inventory-items/stats/summary" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Best Practices

1. **Quantity Management**: Always validate that available quantity is sufficient before reserving items
2. **Expiry Tracking**: For perishable items, always set expiry dates and batch numbers
3. **Batch Tracking**: Use consistent batch number formats for traceability
4. **Cost Tracking**: Update cost per unit when receiving new inventory
5. **Multi-Tenancy**: All operations are automatically scoped to the authenticated user's tenant

## Permissions Required

- **View**: `inventory-items.view` or `ADMIN` role
- **Create**: `inventory-items.create` or `ADMIN` role
- **Edit**: `inventory-items.edit` or `ADMIN` role
- **Delete**: `inventory-items.delete` or `ADMIN` role

## Swagger Documentation

All endpoints are fully documented in Swagger UI at:
```
http://localhost:5000/api-docs
```

Look for the "Inventory Items" section in the API documentation.
