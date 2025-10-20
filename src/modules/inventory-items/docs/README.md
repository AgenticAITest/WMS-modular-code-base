# Inventory Items Module

Inventory Information in the warehouse

## Overview

This module provides CRUD operations for Inventory Items management with the following features:

- Create, Read, Update, Delete operations
- Multi-tenant support
- Server-side pagination
- Search and filtering
- Form validation
- TypeScript support
- Modern UI components

## Structure

```
inventory-items/
├── module.json                     # Module metadata
├── client/                         # React frontend
│   ├── components/                 # Reusable components
│   ├── pages/                      # Page components
│   │   ├── InventoryItemsList.tsx       # List view
│   │   ├── InventoryItemsAdd.tsx        # Create form
│   │   ├── InventoryItemsView.tsx       # Detail view (TODO)
│   │   └── InventoryItemsEdit.tsx       # Edit form (TODO)
│   ├── menus/                      # Sidebar menu config
│   └── routes/                     # React routes
└── server/                         # Express backend
    ├── routes/                     # API endpoints
    └── lib/db/schemas/             # Database schema
```

## API Endpoints

- `GET /api/modules/inventory-items/inventory-items` - List all records
- `POST /api/modules/inventory-items/inventory-items` - Create new record
- `GET /api/modules/inventory-items/inventory-items/:id` - Get record by ID
- `PUT /api/modules/inventory-items/inventory-items/:id` - Update record (TODO)
- `DELETE /api/modules/inventory-items/inventory-items/:id` - Delete record (TODO)

## Database Schema

The module uses the following database table:

```sql
CREATE TABLE inventoryItems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Permissions

The module defines the following permissions:

- `inventory-items.view` - View records
- `inventory-items.create` - Create new records  
- `inventory-items.edit` - Edit existing records
- `inventory-items.delete` - Delete records

## TODO

- [ ] Implement Edit page and functionality
- [ ] Implement View page  
- [ ] Implement Delete functionality
- [ ] Add PUT and DELETE API endpoints
- [ ] Add form validation schemas
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add confirmation dialogs
- [ ] Add bulk operations
- [ ] Add export functionality
- [ ] Add import functionality
- [ ] Add advanced filtering
- [ ] Add sorting options
- [ ] Write unit tests
- [ ] Write integration tests

## Getting Started

1. Make sure the module is registered in `src/client/route.ts`
2. Make sure the server routes are registered in `src/server/main.ts`
3. Run database migrations to create the table
4. Configure module authorization if required
5. Start implementing the TODO items above

## Created

- **Date**: 10/20/2025
- **Author**: NFI
- **Version**: 1.0.0
