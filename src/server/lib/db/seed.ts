import bcrypt from "bcryptjs";
import { db } from ".";
import { permission, role, rolePermission, tenant, user, userRole, userTenant } from "./schema/system";
import { moduleRegistry } from "./schema/module";
import { seedWorkflows } from "@modules/workflow/server/lib/seedWorkflows";

async function seed() {

  // Check if data already exists
  console.log("Checking for existing data...");
  const existingTenants = await db.select({ id: tenant.id }).from(tenant).limit(1);
  
  if (existingTenants.length > 0) {
    console.log("\n⚠️  WARNING: Database already contains data!");
    console.log("Found existing tenants. Skipping seed to preserve your data.");
    console.log("\nIf you really want to re-seed (THIS WILL DELETE ALL DATA):");
    console.log("1. Manually delete all data first");
    console.log("2. Or use a fresh database");
    console.log("\nSeed aborted to protect your existing data.");
    return;
  }

  console.log("No existing data found. Proceeding with seed...\n");

  console.log("Seeding tenant");
  const sysTenantId = crypto.randomUUID();
  const pubTenantId = crypto.randomUUID();
  await db.insert(tenant).values([
    { id: sysTenantId, code: "SYSTEM", name: "System", description: "System Tenant" },
    { id: pubTenantId, code: "PUBLIC", name: "Public", description: "Public Tenant" }
  ]);

  console.log("Seeding user");
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash("S3cr3T", 10);
  await db.insert(user).values([
    { id: userId, username: "sysadmin", passwordHash: passwordHash, fullname: "System Admin", status: "active", activeTenantId:sysTenantId }
  ]);

  console.log("Seeding role");
  const sysRoleId = crypto.randomUUID();
  const pubRoleId = crypto.randomUUID();
  await db.insert(role).values([
    { id: sysRoleId, code: "SYSADMIN", name: "System Admin", description: "Role System Admin", isSystem: true, tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "USER", name: "Role User", description: "Regular user role", isSystem: false, tenantId: sysTenantId },
    { id: pubRoleId, code: "SYSADMIN", name: "System Admin", description: "Role System Admin", isSystem: true, tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "USER", name: "Role User", description: "Regular user role", isSystem: false, tenantId: pubTenantId }
  ]);

  console.log("seeding user tenant");
  await db.insert(userTenant).values([
    { userId: userId, tenantId: sysTenantId },
    { userId: userId, tenantId: pubTenantId }
  ]);

  console.log("Seeding user role");
  await db.insert(userRole).values([
    { userId: userId, roleId: sysRoleId, tenantId: sysTenantId },
    { userId: userId, roleId: pubRoleId, tenantId: pubTenantId }
  ]);

  console.log("Seeding permission");
  await db.insert(permission).values([

    // system tenant permission
    { id: crypto.randomUUID(), code: "system.tenant.view", name: "View Tenant", description: "Permission to view tenant", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.create", name: "Create Tenant", description: "Permission to add tenant", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.edit", name: "Edit Tenant", description: "Permission to edit tenant", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.delete", name: "Delete Tenant", description: "Permission to delete tenant", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.user.view", name: "View User", description: "Permission to view user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.create", name: "Create User", description: "Permission to add user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.edit", name: "Edit User", description: "Permission to edit user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.delete", name: "Delete User", description: "Permission to delete user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.reset_password", name: "Reset Password", description: "Permission to reset password user", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.role.view", name: "View Role", description: "Permission to view role", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.role.create", name: "Create Role", description: "Permission to add role", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.role.edit", name: "Edit Role", description: "Permission to edit role", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.role.delete", name: "Delete Role", description: "Permission to delete role", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.permission.view", name: "View Permission", description: "Permission to view permission", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.permission.create", name: "Create Permission", description: "Permission to add permission", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.permission.edit", name: "Edit Permission", description: "Permission to edit permission", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.permission.delete", name: "Delete Permission", description: "Permission to delete permission", tenantId: sysTenantId },  

    { id: crypto.randomUUID(), code: "system.option.view", name: "View Option", description: "Permission to view option", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.option.create", name: "Create Option", description: "Permission to add option", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.option.edit", name: "Edit Option", description: "Permission to edit option", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.option.delete", name: "Delete Option", description: "Permission to delete option", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.module.view", name: "View Module", description: "Permission to view module", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.module.manage", name: "Manage Module", description: "Permission to manage module", tenantId: sysTenantId },

    // public tenant permissions
    { id: crypto.randomUUID(), code: "system.tenant.view", name: "View Tenant", description: "Permission to view tenant", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.edit", name: "Edit Tenant", description: "Permission to edit tenant", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.user.view", name: "View User", description: "Permission to view user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.create", name: "Create User", description: "Permission to add user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.edit", name: "Edit User", description: "Permission to edit user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.delete", name: "Delete User", description: "Permission to delete user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.reset_password", name: "Reset Password", description: "Permission to reset password user", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.role.view", name: "View Role", description: "Permission to view role", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.role.create", name: "Create Role", description: "Permission to add role", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.role.edit", name: "Edit Role", description: "Permission to edit role", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.role.delete", name: "Delete Role", description: "Permission to delete role", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.permission.view", name: "View Permission", description: "Permission to view permission", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.permission.create", name: "Create Permission", description: "Permission to add permission", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.permission.edit", name: "Edit Permission", description: "Permission to edit permission", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.permission.delete", name: "Delete Permission", description: "Permission to delete permission", tenantId: pubTenantId },  

    { id: crypto.randomUUID(), code: "system.option.view", name: "View Option", description: "Permission to view option", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.option.create", name: "Create Option", description: "Permission to add option", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.option.edit", name: "Edit Option", description: "Permission to edit option", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.option.delete", name: "Delete Option", description: "Permission to delete option", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.module.view", name: "View Module", description: "Permission to view module", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.module.manage", name: "Manage Module", description: "Permission to manage module", tenantId: pubTenantId },

  ]);

  console.log("Seeding module registry");
  await db.insert(moduleRegistry).values([
    { id: crypto.randomUUID(), moduleId: "sample-module", moduleName: "Sample Module", description: "Sample module for demonstrating the modular architecture with CRUD operations", version: "1.0.0", category: "Sample", isActive: true, repositoryUrl: "https://github.com/sample/sample-module",documentationUrl: "https://docs.sample.com/sample-module"},
  ]);

  console.log("\nSeeding workflows for SYSTEM tenant");
  await seedWorkflows(sysTenantId);
  
  console.log("\nSeeding workflows for PUBLIC tenant");
  await seedWorkflows(pubTenantId);

}

async function main() {
  await seed();
  console.log("Seed completed");
  process.exit(0);
}

main();
