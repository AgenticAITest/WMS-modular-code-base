# Sample Module

This is a sample module implementation for the React Admin project, demonstrating the modular architecture pattern.

## Structure

```
sample-module/
├── module.json           # Module metadata and configuration
├── client/              # Frontend React components and logic
│   ├── components/      # Reusable UI components
│   │   └── SampleModuleComponent.tsx
│   ├── pages/          # Page components
│   │   ├── SampleModuleList.tsx
│   │   ├── SampleModuleAdd.tsx
│   │   ├── SampleModuleEdit.tsx
│   │   └── SampleModuleDetail.tsx
│   ├── menus/          # Sidebar menu configuration
│   │   └── sideBarMenus.ts
│   └── routes/         # React route definitions
│       └── sampleModuleReactRoutes.ts
└── server/             # Backend API and database logic
    ├── routes/         # Express API routes
    │   └── sampleModuleRoutes.ts
    └── lib/
        └── db/
            └── schemas/ # Database schema definitions
                └── sampleModule.ts
```

## Features

- **CRUD Operations**: Create, Read, Update, Delete sample modules
- **Pagination**: List view with pagination support
- **Search & Filter**: Search modules by name and description
- **Status Management**: Active/inactive status with visual indicators
- **Public/Private**: Toggle module visibility
- **Multi-tenant**: Full tenant isolation support
- **Authentication**: Protected routes with JWT authentication
- **Validation**: Form validation on both client and server
- **TypeScript**: Full type safety throughout the module
- **Module Metadata**: Standardized module.json configuration file

## API Endpoints

- `GET /api/modules/sample-module` - List modules with pagination
- `GET /api/modules/sample-module/:id` - Get module details
- `POST /api/modules/sample-module` - Create new module
- `PUT /api/modules/sample-module/:id` - Update module
- `DELETE /api/modules/sample-module/:id` - Delete module

## Usage

### 1. Register Server Routes

Add to your main server file (`src/server/main.ts`):

```typescript
import sampleModuleRoutes from '../modules/sample-module/server/routes/sampleModuleRoutes';

// Register module routes
app.use('/api/modules/sample-module', sampleModuleRoutes);
```

### 2. Register Client Routes

Add to your route configuration (`src/client/route.ts`):

```typescript
import { sampleModuleReactRoutes } from '../modules/sample-module/client/routes/sampleModuleReactRoutes';

// Add to your console routes children array
{
  path: "console",
  Component: ConsoleLayout,
  children: [
    // ... existing routes
    sampleModuleReactRoutes,
  ],
}
```

### 3. Add Sidebar Menu

Add to your sidebar configuration (`src/client/components/app-sidebar.tsx`):

```typescript
import { sampleModuleSidebarMenus } from '../modules/sample-module/client/menus/sideBarMenus';

// Add to your navMain array
const data = {
  navMain: [
    // ... existing menu items
    sampleModuleSidebarMenus,
  ],
}
```

## Database Migration

After implementing the module, run:

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

## Module Configuration

The `module.json` file contains essential metadata about the module:

```json
{
  "id": "sample-module",
  "name": "Sample Module", 
  "owner": "React Admin Team",
  "description": "A comprehensive sample module...",
  "version": "1.0.0",
  "metadata": {
    "category": "Sample",
    "permissions": ["sample-module.view", "sample-module.create", ...],
    "routes": {
      "api": "/api/modules/sample-module",
      "client": "/console/modules/sample-module"
    },
    "dependencies": { "requires": ["authentication", "multi-tenant"] },
    "features": ["CRUD operations", "Pagination", ...]
  }
}
```

## Customization

This module serves as a template. To create your own module:

1. Copy the `sample-module` directory
2. Rename all files and references to your module name
3. **Update the `module.json` file** with your module's metadata
4. Update the database schema in `schemas/` 
5. Modify the API routes in `server/routes/`
6. Customize the UI components in `client/components/` and `client/pages/`
7. Update menu and route configurations
8. Register the new module in your main application

## Dependencies

This module uses the same dependencies as the main application:
- React with TypeScript
- shadcn/ui components
- Axios for API calls
- React Router for navigation
- Sonner for notifications
- Lucide React for icons
- Express for API routes
- Drizzle ORM for database operations