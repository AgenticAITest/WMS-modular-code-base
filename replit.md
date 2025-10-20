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
- Modular page structure for extensibility.
- Comprehensive API documentation with Swagger.
- Rate limiting and CORS support.
- Hierarchical Warehouse Setup: Management of Warehouses, Zones, Aisles, Shelves, and Bins with detailed configurations.
- UX enhancements for warehouse hierarchy, including instant expansion and robust add/edit dialogs with form validation.

### System Design Choices
- **UI/UX**: Utilizes shadcn/ui and Radix UI for a consistent and accessible component library. The warehouse hierarchy employs an accordion-based visualization for intuitive navigation and management, with instant data loading for improved user experience. Implements a robust pointer-events cleanup pattern to prevent Radix UI Dialog modal overlay from blocking button interactions after dialog close.
- **Backend**: Employs a modular structure for features, with dedicated modules for system, master-data, and warehouse-setup. API endpoints follow a clear naming convention and support multi-tenant isolation. Database transactions are used for atomic operations, such as creating a warehouse and its configuration simultaneously.
- **Database Schema**: Designed with a clear separation between system, master data, and warehouse-specific tables. Key relationships ensure data integrity and support multi-tenancy across all modules. Geolocation support is included for supplier and customer locations.
- **Authentication**: JWT-based authentication for secure access, with separate tokens for access, refresh, and password reset.
- **Development Workflow**: Set up for a streamlined development process using Vite for bundling, nodemon for backend auto-restarts, and Drizzle Kit for database schema management.

## External Dependencies
- **PostgreSQL**: Primary database for all application data, managed via Drizzle ORM.
- **Swagger UI**: For interactive API documentation, accessible at `/api-docs`.
- **Replit**: The deployment environment; configured for PostgreSQL integration, trusted proxy, and port `5000` binding.