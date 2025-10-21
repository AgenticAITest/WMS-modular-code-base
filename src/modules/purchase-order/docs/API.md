# Purchase Order API Documentation

## Overview
Complete CRUD APIs for managing purchase orders and their line items in the warehouse management system.

## Base URL
`/api/modules/purchase-order`

## Authentication
All endpoints require:
- Bearer token authentication
- Module authorization for 'purchase-order'
- Appropriate role/permission (ADMIN or specific permissions)

---

## Purchase Orders Endpoints

### 1. List Purchase Orders
**GET** `/orders`

Retrieve a paginated list of purchase orders with supplier information.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 10) - Items per page
- `search` (string, optional) - Search by order number or notes
- `status` (string, optional) - Filter by status: `pending`, `approved`, `received`, `completed`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "orderNumber": "PO-2510-0001",
      "supplierId": "uuid",
      "supplierName": "ABC Supplies Inc.",
      "supplierLocationId": "uuid",
      "status": "pending",
      "workflowState": "create",
      "orderDate": "2025-10-21",
      "expectedDeliveryDate": "2025-10-28",
      "totalAmount": "15000.00",
      "notes": "Urgent order",
      "createdBy": "uuid",
      "createdByName": "John Doe",
      "createdAt": "2025-10-21T10:00:00Z",
      "updatedAt": "2025-10-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Permissions Required:** `purchase-order.view`

---

### 2. Get Purchase Order by ID
**GET** `/orders/:id`

Retrieve detailed information about a specific purchase order including all items.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "PO-2510-0001",
    "supplierId": "uuid",
    "supplierName": "ABC Supplies Inc.",
    "supplierEmail": "contact@abc.com",
    "supplierPhone": "+1234567890",
    "supplierLocationId": "uuid",
    "locationAddress": "123 Main St",
    "locationCity": "New York",
    "status": "pending",
    "workflowState": "create",
    "orderDate": "2025-10-21",
    "expectedDeliveryDate": "2025-10-28",
    "totalAmount": "15000.00",
    "notes": "Urgent order",
    "createdBy": "uuid",
    "createdByName": "John Doe",
    "createdAt": "2025-10-21T10:00:00Z",
    "updatedAt": "2025-10-21T10:00:00Z",
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "productName": "Widget A",
        "productSku": "WID-001",
        "orderedQuantity": 100,
        "receivedQuantity": 0,
        "unitCost": "50.00",
        "totalCost": "5000.00",
        "expectedExpiryDate": "2026-10-21",
        "notes": "Handle with care"
      }
    ]
  }
}
```

**Permissions Required:** `purchase-order.view`

---

### 3. Create Purchase Order
**POST** `/orders`

Create a new purchase order with optional line items.

**Request Body:**
```json
{
  "orderNumber": "PO-2510-0001",
  "supplierId": "uuid",
  "supplierLocationId": "uuid",
  "status": "pending",
  "workflowState": "create",
  "orderDate": "2025-10-21",
  "expectedDeliveryDate": "2025-10-28",
  "totalAmount": "15000.00",
  "notes": "Urgent order",
  "items": [
    {
      "productId": "uuid",
      "orderedQuantity": 100,
      "unitCost": "50.00",
      "expectedExpiryDate": "2026-10-21",
      "notes": "Handle with care"
    }
  ]
}
```

**Required Fields:**
- `orderNumber` (string, unique)
- `supplierId` (uuid)
- `orderDate` (date)

**Optional Fields:**
- `supplierLocationId` (uuid)
- `status` (enum: pending, approved, received, completed) - default: "pending"
- `workflowState` (enum: create, approve, receive, putaway, complete) - default: "create"
- `expectedDeliveryDate` (date)
- `totalAmount` (decimal)
- `notes` (text)
- `items` (array of order items)

**Response:**
```json
{
  "success": true,
  "data": { /* created purchase order */ },
  "message": "Purchase order created successfully"
}
```

**Permissions Required:** `purchase-order.create`

---

### 4. Update Purchase Order
**PUT** `/orders/:id`

Update an existing purchase order.

**Request Body:**
```json
{
  "status": "approved",
  "workflowState": "approve",
  "expectedDeliveryDate": "2025-10-30",
  "notes": "Updated delivery date"
}
```

**Note:** The following fields cannot be updated:
- `id`
- `tenantId`
- `createdAt`
- `createdBy`

**Response:**
```json
{
  "success": true,
  "data": { /* updated purchase order */ },
  "message": "Purchase order updated successfully"
}
```

**Permissions Required:** `purchase-order.edit`

---

### 5. Delete Purchase Order
**DELETE** `/orders/:id`

Delete a purchase order and all associated items (cascade delete).

**Response:**
- Status: `204 No Content` on success
- Status: `404 Not Found` if order doesn't exist

**Permissions Required:** `purchase-order.delete`

---

## Purchase Order Items Endpoints

### 1. List Purchase Order Items
**GET** `/items`

Retrieve a paginated list of purchase order items.

**Query Parameters:**
- `purchaseOrderId` (uuid, optional) - Filter by specific purchase order
- `page` (integer, default: 1)
- `limit` (integer, default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "purchaseOrderId": "uuid",
      "orderNumber": "PO-2510-0001",
      "productId": "uuid",
      "productName": "Widget A",
      "productSku": "WID-001",
      "orderedQuantity": 100,
      "receivedQuantity": 50,
      "unitCost": "50.00",
      "totalCost": "5000.00",
      "expectedExpiryDate": "2026-10-21",
      "notes": "Handle with care",
      "createdAt": "2025-10-21T10:00:00Z",
      "updatedAt": "2025-10-21T12:00:00Z"
    }
  ],
  "pagination": { /* ... */ }
}
```

**Permissions Required:** `purchase-order.view`

---

### 2. Get Purchase Order Item by ID
**GET** `/items/:id`

Retrieve detailed information about a specific purchase order item.

**Permissions Required:** `purchase-order.view`

---

### 3. Create Purchase Order Item
**POST** `/items`

Add a new item to an existing purchase order.

**Request Body:**
```json
{
  "purchaseOrderId": "uuid",
  "productId": "uuid",
  "orderedQuantity": 100,
  "unitCost": "50.00",
  "expectedExpiryDate": "2026-10-21",
  "notes": "Handle with care"
}
```

**Required Fields:**
- `purchaseOrderId` (uuid)
- `productId` (uuid)
- `orderedQuantity` (integer)

**Optional Fields:**
- `unitCost` (decimal)
- `expectedExpiryDate` (date)
- `notes` (text)

**Auto-calculated Fields:**
- `totalCost` - Automatically calculated from `unitCost * orderedQuantity`
- `receivedQuantity` - Defaults to 0

**Response:**
```json
{
  "success": true,
  "data": { /* created item */ },
  "message": "Purchase order item created successfully"
}
```

**Permissions Required:** `purchase-order.create`

---

### 4. Update Purchase Order Item
**PUT** `/items/:id`

Update an existing purchase order item.

**Request Body:**
```json
{
  "orderedQuantity": 150,
  "receivedQuantity": 75,
  "unitCost": "45.00",
  "notes": "Partial delivery received"
}
```

**Note:** 
- Total cost is automatically recalculated when `unitCost` or `orderedQuantity` changes
- The following fields cannot be updated: `id`, `tenantId`, `createdAt`, `purchaseOrderId`

**Permissions Required:** `purchase-order.edit`

---

### 5. Delete Purchase Order Item
**DELETE** `/items/:id`

Remove an item from a purchase order.

**Response:**
- Status: `204 No Content` on success
- Status: `404 Not Found` if item doesn't exist

**Permissions Required:** `purchase-order.delete`

---

## Status Workflows

### Purchase Order Status
1. **pending** - Order created, awaiting approval
2. **approved** - Order approved, ready for processing
3. **received** - Items received at warehouse
4. **completed** - Order fully processed

### Workflow States
1. **create** - Initial creation
2. **approve** - Approval process
3. **receive** - Receiving goods
4. **putaway** - Storing inventory
5. **complete** - Finalized

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Order number, supplier, and order date are required"
}
```

### 401 Unauthorized
```json
{
  "message": "No Bearer token provided or invalid format."
}
```

### 403 Forbidden
```json
{
  "message": "Access denied. This module is not authorized for your tenant.",
  "moduleId": "purchase-order",
  "tenantId": "uuid"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Purchase order not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Features

### Multi-tenant Isolation
- All queries automatically filter by `tenantId`
- Users can only access data from their active tenant

### Relations
- Purchase orders joined with supplier information
- Items joined with product details
- Creator information included in responses

### Automatic Calculations
- `totalCost` automatically calculated from `unitCost × orderedQuantity`
- Updated automatically when either value changes

### Cascading Deletes
- Deleting a purchase order automatically deletes all associated items
- Prevents orphaned item records

### Search & Filtering
- Search by order number or notes
- Filter by status (pending, approved, received, completed)
- Filter items by purchase order

### Pagination
- Consistent pagination across all list endpoints
- Includes helpful metadata (hasNext, hasPrev, totalPages)

---

## Database Schema

### purchase_orders
- Primary Key: `id` (UUID)
- Unique: `orderNumber`
- Foreign Keys: `tenantId`, `supplierId`, `supplierLocationId`, `createdBy`
- Indexes: `orderNumber`, `tenantId`, `supplierId`, `status`

### purchase_order_items
- Primary Key: `id` (UUID)
- Foreign Keys: `purchaseOrderId` (cascade delete), `productId`, `tenantId`
- Indexes: `tenantId`, `purchaseOrderId`, `productId`
