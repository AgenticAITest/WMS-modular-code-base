import { relations } from 'drizzle-orm';
import { date, decimal, index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '@server/lib/db/schema/system';
import { products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { bins } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  binId: uuid('bin_id')
    .notNull()
    .references(() => bins.id),
  availableQuantity: integer('available_quantity').notNull(),
  reservedQuantity: integer('reserved_quantity').default(0).notNull(),
  expiryDate: date('expiry_date'),
  batchNumber: varchar('batch_number', { length: 100 }),
  lotNumber: varchar('lot_number', { length: 100 }),
  receivedDate: date('received_date'),
  costPerUnit: decimal('cost_per_unit', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    index('inventory_items_tenant_product_bin_idx').on(t.tenantId, t.productId, t.binId),
    index('inventory_items_tenant_expiry_idx').on(t.tenantId, t.expiryDate),
    index('inventory_items_tenant_batch_idx').on(t.tenantId, t.batchNumber),
    index('inventory_items_tenant_idx').on(t.tenantId),
  ]
);

// Relations
export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  tenant: one(tenant, {
    fields: [inventoryItems.tenantId],
    references: [tenant.id],
  }),
  product: one(products, {
    fields: [inventoryItems.productId],
    references: [products.id],
  }),
  bin: one(bins, {
    fields: [inventoryItems.binId],
    references: [bins.id],
  }),
}));

// Types
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
