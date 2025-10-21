import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenant } from '@server/lib/db/schema/system'; // Adjust import path as needed

export const purchaseOrder = pgTable('purchase-order', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenant.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type PurchaseOrder = typeof purchaseOrder.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrder.$inferInsert;
