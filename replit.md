# React Admin - Warehouse Management System

## Overview
This project is a comprehensive admin dashboard built with React, TypeScript, Vite, and Drizzle ORM. Its primary purpose is to provide a modular and scalable foundation for warehouse management, including features for managing users, roles, permissions, and multi-tenant organizations with robust authentication and authorization. The system aims to streamline warehouse operations, from product and inventory type management to detailed hierarchical setup of warehouses, zones, aisles, shelves, and bins.

## User Preferences
None specified yet

## ⚠️ CRITICAL: Database Seed Scripts - Data Loss Warning

**DANGER**: The seed scripts in this project are **DESTRUCTIVE** and will **DELETE ALL YOUR DATA**. Only run them during initial project setup!

### What Gets Deleted:
- **`npm run db:seed`**: Wipes ALL system tables (users, roles, tenants, workflows) using `TRUNCATE ... CASCADE`
- **`npm run db:seed-master-data`**: Deletes ALL master data (products, product types, package types, inventory items)

### When To Run Seeds:
- ✅ **ONLY** during first-time project initialization (empty database)
- ✅ **NEVER** after you've added real data through the UI
- ✅ **NEVER** after running `npm run db:push` (schema updates are safe and don't require re-seeding)

### Safe Database Operations:
1. **Schema Changes**: Use `npm run db:push` to update schema - this is SAFE and preserves data
2. **Force Schema Sync**: If needed, use `npm run db:push --force` - still SAFE for schema-only changes
3. **Adding Data**: Use the UI or write custom SQL - DO NOT re-run seed scripts

### Recovery From Data Loss:
If you accidentally ran a seed script:
1. Check if Replit has automatic backups/checkpoints
2. Manually re-enter critical business data through the UI
3. Consider implementing a backup strategy before making changes

**Remember**: `db:push` = Safe schema updates. `db:seed` = Nuclear option that wipes everything!

## Data Model Clarification - CRITICAL
**Products vs Inventory Items:**
- **`products` table**: Master SKU list defining what types of SKUs the warehouse CAN store. This is the product catalog/master data.
- **`inventory_items` table**: Actual stock information showing what the warehouse HAS in stock right now. This includes quantities, locations, batches, etc.

**Important**: When creating Purchase Orders (PO), the SKU selection should ALWAYS query the `inventory_items` table, NOT the `products` table. This shows items already in the warehouse system that need reordering.

## System Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Radix UI, shadcn/ui components
- **Backend**: Node.js, Express, vite-express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (Access, Refresh, Reset tokens)

### Key Features
- Multi-tenant architecture
- Role-based access control (RBAC) and Permission-based authorization
- User management
- Master Data Management: Product, Inventory Type, Package Type, Supplier, and Customer CRUD operations with validation.
- Document Numbering System: Standardized document number generation for all warehouse operations with period-based formatting (PO, GRN, SO, PICK, PACK, SHIP, etc.). Supports flexible prefixes, auto-incrementing sequences, and live preview.
- Modular page structure for extensibility.
- Comprehensive API documentation with Swagger.
- Rate limiting and CORS support.
- Hierarchical Warehouse Setup: Management of Warehouses, Zones, Aisles, Shelves, and Bins with detailed configurations.
- UX enhancements for warehouse hierarchy, including instant expansion and robust add/edit dialogs with form validation.
- Inventory Items Management: Complete CRUD operations for inventory items with product and bin associations, batch/lot tracking, expiry dates, and cost tracking.
- Stock Information: Aggregated view of inventory by product showing available quantities, location counts, and detailed location breakdowns via modal. Stock is managed through PO/SO workflows (to be implemented).
- **Workflow Configuration**: Tenant-specific workflow customization for Purchase Orders (PO) and Sales Orders (SO). Each tenant can toggle workflow steps on/off via the Workflow Settings page. Standard PO workflow includes Create, Approve, Receive, Putaway, and Complete steps. Standard SO workflow includes Create, Allocate, Pick, Pack, Ship, Deliver, and Complete steps. Initial and terminal steps (Create & Complete) are always active and cannot be disabled.

### System Design Choices
- **UI/UX**: Utilizes shadcn/ui and Radix UI for a consistent and accessible component library. The warehouse hierarchy employs an accordion-based visualization for intuitive navigation and management, with instant data loading for improved user experience. **Critical Fix - Radix UI Dialog Bug**: ALL Dialog components must implement the exact pointer-events cleanup pattern shown below to prevent the "clicks disabled after closing dialog" bug (Radix UI GitHub #3445). This pattern is mandatory for all Add/Edit dialogs:
  
  ```typescript
  // At component top level
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // useEffect pattern (MUST be exactly this)
  useEffect(() => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    
    if (!open) {
      cleanupTimerRef.current = setTimeout(() => {
        document.body.style.pointerEvents = '';
        cleanupTimerRef.current = null;
      }, 100);
    }
    
    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
        cleanupTimerRef.current = null;
      }
    };
  }, [open]);
  
  // Simplified cleanup function
  const cleanupPointerEvents = () => {
    document.body.style.pointerEvents = '';
  };
  ```
  
  **Currently Fixed Dialogs**: AddWarehouseDialog, AddZoneDialog, AddAisleDialog, AddShelfDialog, AddBinDialog, EditWarehouseDialog, EditZoneDialog, EditAisleDialog, EditShelfDialog, EditBinDialog, ViewStockDetailsDialog. Reference these files when creating new dialogs.
- **Backend**: Employs a modular structure for features, with dedicated modules for system, master-data, warehouse-setup, and document-numbering. API endpoints follow a clear naming convention and support multi-tenant isolation. Database transactions are used for atomic operations, such as creating a warehouse and its configuration simultaneously.
- **Document Numbering**: The system uses a period-based numbering scheme (e.g., PO-2510-WH1-LOCAL-0001) where the period component (YYMM, YYYYMM, YYWW, or YYYYWW) is mandatory. Supports 0-2 optional user-defined prefixes with configurable labels, default values, and required flags. Each unique combination of (type, period, prefix1, prefix2) maintains its own auto-incrementing sequence. The UI provides live client-side preview showing the exact format. 15 default document types are pre-configured: PO, GRN, PUTAWAY (Inbound), SO, PICK, PACK, SHIP, DELIVERY (Outbound), STOCKADJ, RELOC, CYCCOUNT (Inventory), RMA, TRANSFER, QC, LOAD (Additional).
- **Database Schema**: Designed with a clear separation between system, master data, and warehouse-specific tables. Key relationships ensure data integrity and support multi-tenancy across all modules. Geolocation support is included for supplier and customer locations.
- **Authentication**: JWT-based authentication for secure access, with separate tokens for access, refresh, and password reset.
- **Workflow Module**: Database-driven workflow configuration using `workflows` and `workflow_steps` tables. The `isActive` boolean field on workflow steps allows per-tenant customization. **Critical React Pattern**: When loading workflow step states, always batch all `setState` calls into a single update to prevent React state race conditions. Reference `WorkflowSettings.tsx` for the correct pattern: collect all states in an object, then call `setStepStates` once. Never use multiple rapid `setState` calls in a loop as they can overwrite each other asynchronously.
- **Development Workflow**: Set up for a streamlined development process using Vite for bundling, nodemon for backend auto-restarts, and Drizzle Kit for database schema management.

## External Dependencies
- **PostgreSQL**: Primary database for all application data, managed via Drizzle ORM.
- **Swagger UI**: For interactive API documentation, accessible at `/api-docs`.
- **Replit**: The deployment environment; configured for PostgreSQL integration, trusted proxy, and port `5000` binding.