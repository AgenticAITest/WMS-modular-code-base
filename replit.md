# React Admin - Warehouse Management System

## Overview
A comprehensive admin dashboard built with React, TypeScript, Vite, and Drizzle ORM. This application provides a modular, scalable foundation for managing users, roles, permissions, and multi-tenant organizations with authentication and authorization features.

## Current State
- ✅ Successfully imported and configured for Replit environment
- ✅ PostgreSQL database created and seeded
- ✅ Frontend and backend running on port 5000
- ✅ JWT authentication configured
- ✅ Development workflow set up
- ✅ Deployment configuration ready

## Recent Changes (October 14, 2025)
- **Customer and Supplier Schema Implementation:**
  - Added 4 new database tables: suppliers, supplier_locations, customers, customer_locations
  - Implemented in master-data module following modular architecture pattern
  - Added multi-tenant support with proper foreign key relationships
  - Unique indexes on (tenant_id, name) for suppliers and customers
  - Location tracking with geolocation support (latitude/longitude)
  - Schema pushed to database successfully
- **Master Data Management Module Implemented:**
  - Created comprehensive Master Data Management page with 6-tab structure
  - Built 3 functional tabs with full CRUD operations (Product, Inventory Type, Package Type)
  - Added 3 placeholder tabs for future development (Supplier, Customer, Number)
  - Implemented data tables with search, pagination, and sorting
  - Created Add/Edit dialogs with form validation using React Hook Form and Zod
  - Fixed numeric field handling to properly transform NaN to undefined
  - Integrated with existing authentication and API systems
- Configured Swagger documentation with absolute paths (65 API endpoints documented)
- Configured Vite server to bind to 0.0.0.0:5000 for Replit proxy compatibility
- Added Express trust proxy configuration for rate limiting
- Set up PostgreSQL database with Drizzle ORM
- Seeded database with initial tenant, user, roles, and permissions
- Configured JWT secrets for authentication
- Set up development workflow with nodemon and vite-express
- Configured autoscale deployment

## Project Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, vite-express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (Access, Refresh, Reset tokens)
- **UI Components**: Radix UI, shadcn/ui components

### Key Features
- Multi-tenant architecture
- Role-based access control (RBAC)
- Permission-based authorization
- User management system
- Master Data Management:
  - Product/Inventory Item management
  - Inventory Type classification
  - Package Type configuration
  - Full CRUD operations with validation
- Modular page structure
- API documentation with Swagger
- Rate limiting and CORS support
- File upload support

### Project Structure
```
├── src/
│   ├── client/              # Frontend React application
│   │   ├── components/      # UI components
│   │   ├── pages/          # Application pages
│   │   ├── provider/       # Auth and theme providers
│   │   └── hooks/          # Custom React hooks
│   ├── server/             # Backend Express application
│   │   ├── lib/db/         # Database schema and utilities
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   └── schemas/        # Validation schemas
│   └── modules/            # Modular feature extensions
├── public/                 # Static assets
└── drizzle/               # Database migrations
```

### Database Schema

**System Tables:**
- **sys_tenant**: Multi-tenant organization management
- **sys_user**: User accounts and credentials
- **sys_role**: Role definitions
- **sys_permission**: Permission definitions
- **sys_user_role**: User-role mappings
- **sys_role_permission**: Role-permission mappings
- **sys_module_registry**: Module registration system
- **sys_module_auth**: Module authorization per tenant

**Master Data Tables:**
- **product_types**: Inventory type categories (name, description, category, status)
- **package_types**: Package configurations (name, description, units, barcode, dimensions, weight)
- **products**: Inventory items (SKU, name, type, package, stock levels, expiry, temperature range)
- **suppliers**: Supplier master data (name, contact person, email, phone, tax ID)
- **supplier_locations**: Supplier location details (pickup/billing addresses, geolocation, contact info)
- **customers**: Customer master data (name, contact person, email, phone, tax ID)
- **customer_locations**: Customer location details (billing/shipping addresses, geolocation, contact info)

### Environment Configuration
Required secrets (already configured):
- `DATABASE_URL`: PostgreSQL connection (auto-configured by Replit)
- `ACCESS_TOKEN_SECRET`: JWT access token secret
- `REFRESH_TOKEN_SECRET`: JWT refresh token secret
- `RESET_PASSWORD_TOKEN_SECRET`: Password reset token secret

Optional configuration:
- SMTP settings for email functionality (in .env.example)

### API Endpoints
- `/api/auth/*` - Authentication (login, register)
- `/api/system/user` - User management
- `/api/system/role` - Role management
- `/api/system/permission` - Permission management
- `/api/system/tenant` - Tenant management
- `/api/system/module-registry` - Module registry
- `/api/system/module-authorization` - Module authorization
- `/api/modules/master-data/product-types` - Inventory types CRUD
- `/api/modules/master-data/package-types` - Package types CRUD
- `/api/modules/master-data/products` - Products CRUD
- `/api-docs` - Swagger UI documentation (65 endpoints)

### Default Login Credentials
After database seeding, you can login with:
- **Username**: `sysadmin@system.tenant` (format: username@tenant.domain)
- **Password**: `S3cr3T`
- **Role**: System Admin

## Development Workflow
- **Start dev server**: `npm run dev` (auto-runs via workflow)
- **Build frontend**: `npm run build`
- **Database push**: `npm run db:push` (sync schema changes)
- **Database seed**: `npm run db:seed` (reset and seed data)
- **Create module**: `npm run create-module` (scaffold new module)

## Deployment
- **Target**: Autoscale (stateless web application)
- **Build**: `npm run build`
- **Run**: `npm run start` (production mode)

## User Preferences
- None specified yet

## Notes
- The application uses vite-express to serve both frontend and backend on the same port (5000)
- Trust proxy is enabled for Replit's proxy environment
- Rate limiting is configured for API protection
- Database migrations are managed through Drizzle Kit
- The application supports modular architecture for extensibility
