# Supplier & Customer API Documentation

## Overview
Complete CRUD APIs for managing suppliers and customers with nested location support in the master-data module.

## Database Schema

### Tables Created
- **`suppliers`** - Supplier master records
- **`supplier_locations`** - Multiple locations per supplier (pickup, billing)
- **`customers`** - Customer master records  
- **`customer_locations`** - Multiple locations per customer (billing, shipping)

### Key Features
✅ Multi-tenant isolation (all queries filtered by tenant_id)  
✅ Unique constraint on (tenant_id, name) prevents duplicates  
✅ Geolocation support (latitude/longitude with precision 9, scale 6)  
✅ One-to-many relationships (1 supplier/customer → N locations)  
✅ Cascade delete (deleting supplier/customer removes all locations)

## API Endpoints

### Suppliers

#### GET /api/modules/master-data/suppliers
List all suppliers for the authenticated tenant
```
Query Parameters:
- page: integer (default: 1)
- limit: integer (default: 10)
- search: string (searches in name field)

Response:
{
  "success": true,
  "data": [...],
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

#### GET /api/modules/master-data/suppliers/:id
Get a specific supplier with all locations
```
Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "ABC Supplier",
    "contactPerson": "John Doe",
    "email": "john@abc.com",
    "phone": "123-456-7890",
    "taxId": "TAX123",
    "locations": [
      {
        "id": "uuid",
        "supplierId": "uuid",
        "locationType": "pickup",
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "USA",
        "latitude": "40.712776",
        "longitude": "-74.005974",
        "contactPerson": "Jane Smith",
        "phone": "555-0123",
        "email": "warehouse@abc.com",
        "isActive": true
      }
    ],
    "createdAt": "2025-10-14T...",
    "updatedAt": "2025-10-14T..."
  }
}
```

#### POST /api/modules/master-data/suppliers
Create a new supplier with locations
```json
Request Body:
{
  "name": "ABC Supplier",
  "contactPerson": "John Doe",
  "email": "john@abc.com",
  "phone": "123-456-7890",
  "taxId": "TAX123",
  "locations": [
    {
      "locationType": "pickup",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA",
      "latitude": 40.712776,
      "longitude": -74.005974,
      "contactPerson": "Jane Smith",
      "phone": "555-0123",
      "email": "warehouse@abc.com",
      "isActive": true
    },
    {
      "locationType": "billing",
      "address": "456 Office Ave",
      "city": "New York",
      "state": "NY",
      "postalCode": "10002",
      "country": "USA"
    }
  ]
}

Response: 201 Created
{
  "success": true,
  "data": { ...supplier with locations... },
  "message": "Supplier created successfully"
}
```

#### PUT /api/modules/master-data/suppliers/:id
Update supplier and replace all locations
```json
Request Body:
{
  "name": "ABC Supplier Updated",
  "contactPerson": "John Doe",
  "email": "john@abc.com",
  "phone": "123-456-7890",
  "taxId": "TAX123",
  "locations": [
    {
      "locationType": "pickup",
      "address": "789 New Location",
      ...
    }
  ]
}

Response: 200 OK
{
  "success": true,
  "data": { ...updated supplier with locations... },
  "message": "Supplier updated successfully"
}
```

**Note:** The update operation deletes all existing locations and creates new ones from the request.

#### DELETE /api/modules/master-data/suppliers/:id
Delete supplier and all its locations
```
Response: 200 OK
{
  "success": true,
  "message": "Supplier deleted successfully"
}
```

### Customers

All customer endpoints follow the same pattern as suppliers:

- **GET** `/api/modules/master-data/customers` - List customers
- **GET** `/api/modules/master-data/customers/:id` - Get customer with locations
- **POST** `/api/modules/master-data/customers` - Create customer with locations
- **PUT** `/api/modules/master-data/customers/:id` - Update customer and locations
- **DELETE** `/api/modules/master-data/customers/:id` - Delete customer and locations

**Location Types for Customers:** `billing`, `shipping`  
**Location Types for Suppliers:** `pickup`, `billing`

## Authentication & Authorization

All endpoints require:
- **Authentication:** Valid JWT bearer token
- **Authorization:** 
  - GET: `ADMIN` role or `master-data.view` permission
  - POST: `ADMIN` role or `master-data.create` permission
  - PUT: `ADMIN` role or `master-data.edit` permission
  - DELETE: `ADMIN` role or `master-data.delete` permission

## Data Validation

### Required Fields
- **Supplier/Customer:** `name` (required)
- **Location:** `locationType` (required for customers)

### Optional Fields
- contactPerson, email, phone, taxId
- Location: address, city, state, postalCode, country, latitude, longitude, contactPerson, phone, email, isActive

## Location Management

### Adding Locations
Include `locations` array in POST/PUT request body. Each location can have:
```json
{
  "locationType": "pickup|billing|shipping",
  "address": "string",
  "city": "string",
  "state": "string",
  "postalCode": "string",
  "country": "string",
  "latitude": 40.712776,
  "longitude": -74.005974,
  "contactPerson": "string",
  "phone": "string",
  "email": "string",
  "isActive": true
}
```

### Updating Locations
PUT operation replaces ALL locations. To preserve existing locations:
1. GET the supplier/customer first
2. Include existing locations in PUT request
3. Add/modify/remove as needed

### Deleting Locations
- Locations are automatically deleted when parent supplier/customer is deleted
- To remove specific locations, use PUT with desired locations only

## Error Responses

```json
// 400 Bad Request
{
  "success": false,
  "message": "Name is required"
}

// 404 Not Found
{
  "success": false,
  "message": "Supplier not found"
}

// 500 Internal Server Error
{
  "success": false,
  "message": "Internal server error"
}
```

## Swagger Documentation

All endpoints are documented in Swagger UI at `/api-docs`

Tags:
- `Master Data - Suppliers`
- `Master Data - Customers`

## Implementation Details

### File Location
`src/modules/master-data/server/routes/masterDataRoutes.ts`

### Total Routes Added
- 5 Supplier endpoints
- 5 Customer endpoints
- **10 new routes total**

### Technology Stack
- Express.js for routing
- Drizzle ORM for database queries
- crypto.randomUUID() for ID generation
- Multi-tenant data isolation
- Pagination and search support
