# Audit Logging Usage Examples

## Field Usage Guide

### Important: Understanding Field Purpose

- **`changedFields`** (JSONB) - Store detailed data, field changes, or any complex objects
- **`previousState`** (VARCHAR 50) - ONLY for workflow states (e.g., 'approve', 'receive')
- **`newState`** (VARCHAR 50) - ONLY for workflow states (e.g., 'approve', 'receive')

⚠️ **Common Mistake**: Do NOT use `newState` for storing JSON objects - it's only 50 characters!

## Internal Logging Service

### Basic Usage

```typescript
import { logAudit, getClientIp } from '@server/services/auditService';

// ✅ CORRECT: Log a create action with changedFields
await logAudit({
  tenantId: req.user.activeTenantId,
  userId: req.user.id,
  module: 'purchase-order',
  action: 'create',
  resourceType: 'purchase_order',
  resourceId: newOrder.id,
  description: `Created PO ${newOrder.orderNumber}`,
  changedFields: {
    orderNumber: newOrder.orderNumber,
    supplierId: newOrder.supplierId,
    totalAmount: newOrder.totalAmount,
    status: 'pending'
  },
  ipAddress: getClientIp(req),
});

// ✅ CORRECT: Log an update with field changes
await logAudit({
  tenantId: req.user.activeTenantId,
  userId: req.user.id,
  module: 'purchase-order',
  action: 'update',
  resourceType: 'purchase_order',
  resourceId: orderId,
  changedFields: {
    totalAmount: { from: '1000.00', to: '1500.00' },
    status: { from: 'pending', to: 'approved' }
  },
  description: 'Updated order amount and approved',
  ipAddress: getClientIp(req),
});

// ✅ CORRECT: Log a workflow state transition
await logAudit({
  tenantId: req.user.activeTenantId,
  userId: req.user.id,
  module: 'purchase-order',
  action: 'state_change',
  resourceType: 'purchase_order',
  resourceId: orderId,
  previousState: 'approve',  // ✅ Short workflow state
  newState: 'receive',       // ✅ Short workflow state
  description: 'Transitioned to receive state',
  ipAddress: getClientIp(req),
});

// Log a delete action
await logAudit({
  tenantId: req.user.activeTenantId,
  userId: req.user.id,
  module: 'warehouse-setup',
  action: 'delete',
  resourceType: 'warehouse',
  resourceId: warehouseId,
  description: 'Deleted warehouse',
  ipAddress: getClientIp(req),
});

// Log bulk operations
const batchId = uuidv4();
await logAudit({
  tenantId: req.user.activeTenantId,
  userId: req.user.id,
  module: 'inventory-items',
  action: 'bulk_update',
  resourceType: 'inventory_item',
  resourceId: 'multiple',
  batchId,
  description: 'Updated 50 inventory items in batch',
  ipAddress: getClientIp(req),
});

// Log failed operations
await logAudit({
  tenantId: req.user.activeTenantId,
  userId: req.user.id,
  module: 'purchase-order',
  action: 'approve',
  resourceType: 'purchase_order',
  resourceId: orderId,
  status: 'failure',
  errorMessage: 'Insufficient permissions to approve',
  ipAddress: getClientIp(req),
});
```

## REST API Endpoints

### 1. Get Audit Logs with Filters

```bash
GET /api/audit-logs?module=purchase-order&action=create&limit=50&offset=0
```

Query Parameters:
- `module` - Filter by module (e.g., 'purchase-order', 'warehouse-setup')
- `action` - Filter by action (e.g., 'create', 'update', 'delete')
- `resourceType` - Filter by resource type (e.g., 'purchase_order', 'warehouse')
- `resourceId` - Filter by specific resource ID
- `userId` - Filter by user ID
- `startDate` - Filter logs from this date (ISO 8601 format)
- `endDate` - Filter logs until this date (ISO 8601 format)
- `status` - Filter by status ('success' or 'failure')
- `limit` - Number of records to return (default: 50, max: 500)
- `offset` - Number of records to skip (default: 0)

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "userId": "uuid",
      "module": "purchase-order",
      "action": "create",
      "resourceType": "purchase_order",
      "resourceId": "uuid",
      "changedFields": null,
      "description": "Created PO PO-2510-WH-0001",
      "previousState": null,
      "newState": null,
      "batchId": null,
      "status": "success",
      "errorMessage": null,
      "ipAddress": "127.0.0.1",
      "createdAt": "2025-10-25T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

### 2. Get Resource History

```bash
GET /api/audit-logs/resource/purchase_order/{orderId}
```

Response:
```json
{
  "success": true,
  "resourceType": "purchase_order",
  "resourceId": "uuid",
  "data": [
    {
      "id": "uuid",
      "action": "create",
      "description": "Created PO PO-2510-WH-0001",
      "createdAt": "2025-10-25T12:00:00.000Z"
    },
    {
      "id": "uuid",
      "action": "state_change",
      "previousState": "create",
      "newState": "approve",
      "description": "Transitioned to approve state",
      "createdAt": "2025-10-25T12:05:00.000Z"
    }
  ]
}
```

## Common Action Types

- `create` - Resource creation
- `update` - Resource update
- `delete` - Resource deletion
- `state_change` - Workflow state transition
- `approve` - Approval action
- `reject` - Rejection action
- `bulk_update` - Bulk operations
- `bulk_delete` - Bulk deletions
- `export` - Data export
- `import` - Data import

## Common Resource Types

- `purchase_order` - Purchase orders
- `purchase_order_item` - PO line items
- `warehouse` - Warehouses
- `zone` - Warehouse zones
- `product` - Products
- `inventory_item` - Inventory items
- `supplier` - Suppliers
- `customer` - Customers
