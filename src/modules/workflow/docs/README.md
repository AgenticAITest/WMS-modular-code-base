# Workflow Module

Workflow configuration for a tenant

## Overview

This module provides CRUD operations for Workflow management with the following features:

- Create, Read, Update, Delete operations
- Multi-tenant support
- Server-side pagination
- Search and filtering
- Form validation
- TypeScript support
- Modern UI components

## Structure

```
workflow/
├── module.json                     # Module metadata
├── client/                         # React frontend
│   ├── components/                 # Reusable components
│   ├── pages/                      # Page components
│   │   ├── WorkflowList.tsx       # List view
│   │   ├── WorkflowAdd.tsx        # Create form
│   │   ├── WorkflowView.tsx       # Detail view (TODO)
│   │   └── WorkflowEdit.tsx       # Edit form (TODO)
│   ├── menus/                      # Sidebar menu config
│   └── routes/                     # React routes
└── server/                         # Express backend
    ├── routes/                     # API endpoints
    └── lib/db/schemas/             # Database schema
```

## API Endpoints

- `GET /api/modules/workflow/workflow` - List all records
- `POST /api/modules/workflow/workflow` - Create new record
- `GET /api/modules/workflow/workflow/:id` - Get record by ID
- `PUT /api/modules/workflow/workflow/:id` - Update record (TODO)
- `DELETE /api/modules/workflow/workflow/:id` - Delete record (TODO)

## Database Schema

The module uses the following database table:

```sql
CREATE TABLE workflow (
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

- `workflow.view` - View records
- `workflow.create` - Create new records  
- `workflow.edit` - Edit existing records
- `workflow.delete` - Delete records

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

- **Date**: 10/21/2025
- **Author**: NFI
- **Version**: 1.0.0
