
# React Admin

A comprehensive admin dashboard built with React, TypeScript, Vite, and Drizzle ORM. This project is designed to serve as a base foundation app for building larger applications. It provides a modular, scalable, and modern starting point for managing users, roles, and permissions, with authentication and authorization features, multitenancy support, and a clean UI.

## Tech Stack

- **Frontend:**
  - React
  - TypeScript
  - Vite
  - Custom UI components using shadcn ui (Avatar, Button, Card, Dropdown, etc.)
  - Tailwind CSS
- **Backend:**
  - Node.js
  - Express
  - Drizzle ORM (for database access)
- **Database:**
  - PostgresSQL Relational database (schema managed via Drizzle)

## Features

- Modular page structure (Home, Error, Auth, Console, Dashboard, System)
- Authentication (Login, Register, AuthProvider)
- Authorization (Role-based and permission-based access control)
- User, Role, and Permission management
- Responsive sidebar navigation
- Custom UI components for consistent design
- API routes for system and auth operations

## Database Schema

The database schema is managed via Drizzle ORM migrations. Key tables include:

- **Tenant**: Supports multitenancy by grouping users, roles, and permissions under separate tenants
- **User**: Stores user information and credentials
- **Role**: Defines roles for access control
- **Permission**: Defines granular permissions
- **UserRole**: Maps users to roles
- **RolePermission**: Maps roles to permissions

Migration files are located in `drizzle/` and schema definitions in `src/client/server/lib/db/schema` folder.

## Project Structure

```
react-admin/
├── components.json
├── drizzle.config.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle/
│   ├── [migration files].sql
│   └── meta/
│       ├── _journal.json
│       └── [snapshot].json
├── public/
│   ├── vite.svg
│   └── fonts/
│       └── Geist/
│           ├── geist-mono.woff2
│           ├── geist.woff2
│           └── LICENSE.TXT
├── src/
│   └── client/
│       ├── App.css
│       ├── App.tsx
│       ├── index.css
│       ├── main.tsx
│       ├── route.ts
│       ├── tsconfig.json
│       ├── vite-env.d.ts
│       ├── assets/
│       │   └── react.svg
│       ├── components/
│       │   ├── app-sidebar.tsx
│       │   ├── nav-main.tsx
│       │   ├── nav-projects.tsx
│       │   ├── nav-user.tsx
│       │   ├── team-switcher.tsx
│       │   └── auth/
│       │       ├── authorized.tsx
│       │       ├── has-permissions.tsx
│       │       ├── has-roles.tsx
│       │       ├── login-form.tsx
│       │       └── register-form.tsx
│       │   └── ui/
│       │       ├── avatar.tsx
│       │       ├── breadcrumb.tsx
│       │       ├── button.tsx
│       │       ├── card.tsx
│       │       ├── collapsible.tsx
│       │       ├── dropdown-menu.tsx
│       │       ├── input.tsx
│       │       ├── label.tsx
│       │       ├── separator.tsx
│       │       ├── sheet.tsx
│       │       ├── sidebar.tsx
│       │       ├── skeleton.tsx
│       │       └── tooltip.tsx
│       ├── hooks/
│       │   └── use-mobile.ts
│       ├── lib/
│       │   └── utils.ts
│       ├── pages/
│       │   ├── ErrorPage.tsx
│       │   ├── Home.tsx
│       │   ├── RootLayout.tsx
│       │   └── auth/
│       │       ├── AuthLayout.tsx
│       │       ├── Login.tsx
│       │       └── Register.tsx
│       │   └── console/
│       │       ├── ConsoleLayout.tsx
│       │       ├── Dashboard.tsx
│       │       └── system/
│       │           ├── Permission.tsx
│       │           ├── Role.tsx
│       │           └── User.tsx
│       ├── provider/
│       │   └── authProvider.tsx
│       ├── server/
│       │   ├── main.ts
│       │   └── lib/
│       │       └── db/
│       │           ├── index.ts
│       │           ├── seed.ts
│       │           └── schema/
│       │               └── system.ts
│       │   └── middleware/
│       │       ├── authMiddleware.ts
│       │       └── validationMiddleware.ts
│       │   └── routes/
│       │       └── auth/
│       │           └── auth.ts
│       │       └── system/
│       │           └── permission.ts
│       │   └── schemas/
│       │       └── userSchema.ts
│       │   └── types/
│       │       └── express/
│       │           └── index.d.ts
```

## How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in the required values for your environment (e.g., database connection, API keys).
   - Example:
     ```bash
     cp .env.example .env
     # Edit .env with your settings
     ```

3. **Set up the database:**
   - Configure your database connection in Drizzle config (`drizzle.config.ts`) and `.env`.
   - Run migrations:
     ```bash
     npm run db:migrate
     ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   - Backend and Frontend runs on port 3000.

## How to Build

1. **Build the frontend:**
   ```bash
   npm run build
   ```
   - Output is generated in the `dist/` folder.

2. **Run production build:**
   ```bash
   npm run start
   ```

## API Endpoints

- `/api/auth/*` — Authentication routes (login, register)
- `/api/system/permission` — Permission management
- `/api/system/role` — Role management
- `/api/system/user` — User management
- `/api-docs` — Swagger UI for interactive API documentation

## Customization

- Add new pages in `src/client/pages/`
- Add new components in `src/client/components`
- Add new API routes in `src/server/routes` for backend endpoints and always add swagger js doc for every new endpoints.
- Add new database schema file in `src/server/lib/db/schema` and run migrations

