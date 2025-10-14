import { relations } from 'drizzle-orm';
import { boolean, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '@server/lib/db/schema/system';

export const sampleModule = pgTable('sample_module', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  status: varchar('status', { length: 50, enum: ["active", "inactive"] }).notNull().default("active"),
  isPublic: boolean('is_public').notNull().default(false),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// Relations
export const sampleModuleRelations = relations(sampleModule, ({ one }) => ({
  tenant: one(tenant, {
    fields: [sampleModule.tenantId],
    references: [tenant.id],
  }),
}));

// Types
export type SampleModule = typeof sampleModule.$inferSelect;
export type NewSampleModule = typeof sampleModule.$inferInsert;

