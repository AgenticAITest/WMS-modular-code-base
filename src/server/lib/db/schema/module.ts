import { relations } from 'drizzle-orm';
import { boolean, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant } from './system';

export const moduleAuthorization = pgTable('sys_module_auth', {
  id: uuid('id').primaryKey(),
  moduleId: varchar('module_id', { length: 255 }).notNull(),
  moduleName: varchar('module_name', { length: 255 }).notNull(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  isEnabled: boolean('is_enabled').notNull().default(false),
  enabledAt: timestamp("enabled_at"),
  enabledBy: varchar('enabled_by', { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const moduleRegistry = pgTable('sys_module_registry', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: varchar('moduleId', { length: 255 }).notNull().unique(),
  moduleName: varchar('moduleName', { length: 255 }).notNull(),
  description: text('description'),
  version: varchar('version', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  isActive: boolean('isActive').notNull().default(true),
  repositoryUrl: varchar('repositoryUrl', { length: 500 }),
  documentationUrl: varchar('documentationUrl', { length: 500 }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
});

// Relations
export const moduleAuthorizationRelations = relations(moduleAuthorization, ({ one }) => ({
  tenant: one(tenant, {
    fields: [moduleAuthorization.tenantId],
    references: [tenant.id],
  }),
}));

export const moduleRegistryRelations = relations(moduleRegistry, ({ many }) => ({
  // Can add relations to other tables if needed in the future
}));

// Types
export type ModuleAuthorization = typeof moduleAuthorization.$inferSelect;
export type NewModuleAuthorization = typeof moduleAuthorization.$inferInsert;

export type ModuleRegistry = typeof moduleRegistry.$inferSelect;
export type NewModuleRegistry = typeof moduleRegistry.$inferInsert;