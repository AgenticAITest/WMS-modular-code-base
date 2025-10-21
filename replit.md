# React Admin - Warehouse Management System

## Overview
This project is a comprehensive admin dashboard built with React, TypeScript, Vite, and Drizzle ORM. Its primary purpose is to provide a modular and scalable foundation for warehouse management, including features for managing users, roles, permissions, and multi-tenant organizations with robust authentication and authorization. The system aims to streamline warehouse operations, from product and inventory type management to detailed hierarchical setup of warehouses, zones, aisles, shelves, and bins.

## User Preferences
None specified yet

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
- **Development Workflow**: Set up for a streamlined development process using Vite for bundling, nodemon for backend auto-restarts, and Drizzle Kit for database schema management.

## External Dependencies
- **PostgreSQL**: Primary database for all application data, managed via Drizzle ORM.
- **Swagger UI**: For interactive API documentation, accessible at `/api-docs`.
- **Replit**: The deployment environment; configured for PostgreSQL integration, trusted proxy, and port `5000` binding.