# Workflow API Documentation

## Overview
Complete CRUD APIs for managing workflows and workflow steps. Workflows define configurable multi-step processes for various operations (purchase orders, sales orders, etc.) that can be customized per tenant.

## Base URL
`/api/modules/workflow`

## Authentication
All endpoints require:
- Bearer token authentication
- Module authorization for 'workflow'
- Appropriate role/permission (ADMIN or specific permissions)

---

## Workflows Endpoints

### 1. List Workflows
**GET** `/workflows`

Retrieve a paginated list of workflows for the tenant.

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 10) - Items per page
- `search` (string, optional) - Search by workflow name
- `type` (string, optional) - Filter by workflow type (e.g., "purchase_order", "sales_order")
- `isActive` (boolean, optional) - Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Standard Purchase Order Flow",
      "type": "purchase_order",
      "isDefault": true,
      "isActive": true,
      "createdAt": "2025-10-21T10:00:00Z",
      "updatedAt": "2025-10-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

**Permissions Required:** `workflow.view`

---

### 2. Get Workflow by ID
**GET** `/workflows/:id`

Retrieve detailed information about a specific workflow including all its steps.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Standard Purchase Order Flow",
    "type": "purchase_order",
    "isDefault": true,
    "isActive": true,
    "createdAt": "2025-10-21T10:00:00Z",
    "updatedAt": "2025-10-21T10:00:00Z",
    "steps": [
      {
        "id": "uuid",
        "workflowId": "uuid",
        "stepKey": "create",
        "stepName": "Create Order",
        "stepOrder": 1,
        "isInitial": true,
        "isTerminal": false,
        "requiredFields": {
          "fields": ["orderNumber", "supplierId", "orderDate"]
        },
        "createdAt": "2025-10-21T10:00:00Z",
        "updatedAt": "2025-10-21T10:00:00Z"
      },
      {
        "id": "uuid",
        "workflowId": "uuid",
        "stepKey": "approve",
        "stepName": "Approve Order",
        "stepOrder": 2,
        "isInitial": false,
        "isTerminal": false,
        "requiredFields": null,
        "createdAt": "2025-10-21T10:00:00Z",
        "updatedAt": "2025-10-21T10:00:00Z"
      }
    ]
  }
}
```

**Permissions Required:** `workflow.view`

---

### 3. Create Workflow
**POST** `/workflows`

Create a new workflow with optional steps.

**Request Body:**
```json
{
  "name": "Express Purchase Order Flow",
  "type": "purchase_order",
  "isDefault": false,
  "isActive": true,
  "steps": [
    {
      "stepKey": "create",
      "stepName": "Create Order",
      "stepOrder": 1,
      "isInitial": true,
      "isTerminal": false,
      "requiredFields": {
        "fields": ["orderNumber", "supplierId", "orderDate"]
      }
    },
    {
      "stepKey": "receive",
      "stepName": "Receive Goods",
      "stepOrder": 2,
      "isInitial": false,
      "isTerminal": false,
      "requiredFields": {
        "fields": ["receivedQuantity"]
      }
    },
    {
      "stepKey": "complete",
      "stepName": "Complete",
      "stepOrder": 3,
      "isInitial": false,
      "isTerminal": true,
      "requiredFields": null
    }
  ]
}
```

**Required Fields:**
- `name` (string) - Workflow name
- `type` (string) - Workflow type (e.g., "purchase_order", "sales_order")

**Optional Fields:**
- `isDefault` (boolean) - Whether this is the default workflow for this type (default: false)
- `isActive` (boolean) - Whether this workflow is active (default: true)
- `steps` (array) - Array of workflow steps to create

**Auto-behavior:**
- If `isDefault` is set to `true`, any existing default workflow for this type will be set to non-default
- Only one workflow can be default per type per tenant

**Response:**
```json
{
  "success": true,
  "data": { /* created workflow */ },
  "message": "Workflow created successfully"
}
```

**Permissions Required:** `workflow.create`

---

### 4. Update Workflow
**PUT** `/workflows/:id`

Update an existing workflow.

**Request Body:**
```json
{
  "name": "Updated Purchase Order Flow",
  "isDefault": true,
  "isActive": false
}
```

**Note:** 
- The following fields cannot be updated: `id`, `tenantId`, `createdAt`
- Setting `isDefault` to `true` will automatically unset other defaults for this type

**Response:**
```json
{
  "success": true,
  "data": { /* updated workflow */ },
  "message": "Workflow updated successfully"
}
```

**Permissions Required:** `workflow.edit`

---

### 5. Delete Workflow
**DELETE** `/workflows/:id`

Delete a workflow and all associated steps (cascade delete).

**Response:**
- Status: `204 No Content` on success
- Status: `404 Not Found` if workflow doesn't exist

**Permissions Required:** `workflow.delete`

---

## Workflow Steps Endpoints

### 1. List Workflow Steps
**GET** `/steps`

Retrieve workflow steps with optional filtering.

**Query Parameters:**
- `workflowId` (uuid, optional) - Filter by specific workflow
- `page` (integer, default: 1)
- `limit` (integer, default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workflowId": "uuid",
      "workflowName": "Standard Purchase Order Flow",
      "workflowType": "purchase_order",
      "stepKey": "create",
      "stepName": "Create Order",
      "stepOrder": 1,
      "isInitial": true,
      "isTerminal": false,
      "requiredFields": {
        "fields": ["orderNumber", "supplierId", "orderDate"]
      },
      "createdAt": "2025-10-21T10:00:00Z",
      "updatedAt": "2025-10-21T10:00:00Z"
    }
  ],
  "pagination": { /* ... */ }
}
```

**Note:** If no `workflowId` is provided, returns steps from all workflows belonging to the tenant.

**Permissions Required:** `workflow.view`

---

### 2. Get Workflow Step by ID
**GET** `/steps/:id`

Retrieve detailed information about a specific workflow step.

**Permissions Required:** `workflow.view`

---

### 3. Create Workflow Step
**POST** `/steps`

Add a new step to an existing workflow.

**Request Body:**
```json
{
  "workflowId": "uuid",
  "stepKey": "quality_check",
  "stepName": "Quality Check",
  "stepOrder": 3,
  "isInitial": false,
  "isTerminal": false,
  "requiredFields": {
    "fields": ["qualityScore", "inspectorNotes"],
    "validations": {
      "qualityScore": {
        "type": "number",
        "min": 0,
        "max": 100,
        "required": true
      }
    }
  }
}
```

**Required Fields:**
- `workflowId` (uuid) - The workflow this step belongs to
- `stepKey` (string) - Unique key for code reference (e.g., "create", "approve")
- `stepName` (string) - Display name
- `stepOrder` (integer) - Position in workflow sequence

**Optional Fields:**
- `isInitial` (boolean) - Whether this is the starting step (default: false)
- `isTerminal` (boolean) - Whether this is the final step (default: false)
- `requiredFields` (jsonb) - Field validation rules

**Response:**
```json
{
  "success": true,
  "data": { /* created step */ },
  "message": "Workflow step created successfully"
}
```

**Permissions Required:** `workflow.create`

---

### 4. Update Workflow Step
**PUT** `/steps/:id`

Update an existing workflow step.

**Request Body:**
```json
{
  "stepName": "Updated Step Name",
  "stepOrder": 2,
  "isTerminal": true,
  "requiredFields": {
    "fields": ["completionNotes"]
  }
}
```

**Note:** The following fields cannot be updated: `id`, `workflowId`, `createdAt`

**Permissions Required:** `workflow.edit`

---

### 5. Delete Workflow Step
**DELETE** `/steps/:id`

Remove a step from a workflow.

**Response:**
- Status: `204 No Content` on success
- Status: `404 Not Found` if step doesn't exist

**Permissions Required:** `workflow.delete`

---

## Workflow Types

Common workflow types:
- `purchase_order` - Purchase order workflows
- `sales_order` - Sales order workflows
- `inventory_transfer` - Inventory transfer workflows
- `quality_control` - Quality control workflows

Types are flexible and can be customized per tenant.

---

## Step Configuration

### Step Keys
Step keys are used in code to reference specific steps. Common examples:
- `create` - Initial creation step
- `approve` - Approval step
- `receive` - Receiving goods
- `putaway` - Storage/putaway
- `complete` - Final completion step

### Required Fields (JSONB)
The `requiredFields` column stores validation rules as JSON:

```json
{
  "fields": ["fieldName1", "fieldName2"],
  "validations": {
    "fieldName1": {
      "type": "string|number|date|boolean",
      "required": true|false,
      "min": 0,
      "max": 100,
      "pattern": "regex-pattern"
    }
  }
}
```

---

## Features

### Multi-tenant Isolation
- All queries automatically filter by `tenantId`
- Users can only access workflows from their active tenant
- Steps are validated to ensure they belong to tenant's workflows

### Default Workflows
- Each tenant can have one default workflow per type
- Setting a workflow as default automatically unsets other defaults
- Useful for auto-assigning workflows to new entities

### Cascade Delete
- Deleting a workflow automatically deletes all its steps
- Prevents orphaned step records

### Flexible Step Ordering
- Steps can be reordered by updating `stepOrder`
- Multiple workflows can share similar step patterns
- No hard limit on number of steps

### Type Filtering
- Filter workflows by type (purchase_order, sales_order, etc.)
- Each type can have multiple workflow variants
- Active/inactive status for workflow lifecycle management

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Name and type are required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Workflow not found"
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

## Database Schema

### workflows
- Primary Key: `id` (UUID)
- Foreign Keys: `tenantId`
- Indexes: `tenantId`, `type`, composite `(tenantId, type, isDefault)`
- Unique Constraint: One default workflow per `(tenantId, type)` combination

### workflow_steps
- Primary Key: `id` (UUID)
- Foreign Keys: `workflowId` (cascade delete)
- Indexes: `workflowId`, composite `(workflowId, stepOrder)`
- Ordering: Steps ordered by `stepOrder` field
