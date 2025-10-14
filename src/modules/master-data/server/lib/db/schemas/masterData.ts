import { relations } from 'drizzle-orm';
import { boolean, decimal, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '@server/lib/db/schema/system';

export const productTypes = pgTable('product_types', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('product_types_unique_idx').on(t.tenantId, t.name),
  ]
);

export const packageTypes = pgTable('package_types', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  unitsPerPackage: integer('units_per_package'),
  barcode: varchar('barcode', { length: 100 }),
  dimensions: varchar('dimensions', { length: 100 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('package_types_unique_idx').on(t.tenantId, t.name),
  ]
);

export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  inventoryTypeId: uuid('inventory_type_id')
    .references(() => productTypes.id),
  packageTypeId: uuid('package_type_id')
    .references(() => packageTypes.id),
  sku: varchar('sku', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  minimumStockLevel: integer('minimum_stock_level'),
  reorderPoint: integer('reorder_point'),
  requiredTemperatureMin: decimal('required_temperature_min', { precision: 5, scale: 2 }),
  requiredTemperatureMax: decimal('required_temperature_max', { precision: 5, scale: 2 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  dimensions: varchar('dimensions', { length: 100 }),
  active: boolean('active').default(true),
  hasExpiryDate: boolean('has_expiry_date').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('products_unique_idx').on(t.tenantId, t.sku),
  ]
);

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  taxId: varchar('tax_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('suppliers_unique_idx').on(t.tenantId, t.name),
  ]
);

export const supplierLocations = pgTable('supplier_locations', {
  id: uuid('id').primaryKey(),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  locationType: varchar('location_type', { length: 50 }).default('pickup'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  latitude: decimal('latitude', { precision: 9, scale: 6 }),
  longitude: decimal('longitude', { precision: 9, scale: 6 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  contactPerson: varchar('contact_person', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  taxId: varchar('tax_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex('customers_unique_idx').on(t.tenantId, t.name),
  ]
);

export const customerLocations = pgTable('customer_locations', {
  id: uuid('id').primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  locationType: varchar('location_type', { length: 50 }).notNull(),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }),
  latitude: decimal('latitude', { precision: 9, scale: 6 }),
  longitude: decimal('longitude', { precision: 9, scale: 6 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const productTypesRelations = relations(productTypes, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [productTypes.tenantId],
    references: [tenant.id],
  }),
  products: many(products),
}));

export const packageTypesRelations = relations(packageTypes, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [packageTypes.tenantId],
    references: [tenant.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  tenant: one(tenant, {
    fields: [products.tenantId],
    references: [tenant.id],
  }),
  productType: one(productTypes, {
    fields: [products.inventoryTypeId],
    references: [productTypes.id],
  }),
  packageType: one(packageTypes, {
    fields: [products.packageTypeId],
    references: [packageTypes.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [suppliers.tenantId],
    references: [tenant.id],
  }),
  locations: many(supplierLocations),
}));

export const supplierLocationsRelations = relations(supplierLocations, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierLocations.supplierId],
    references: [suppliers.id],
  }),
  tenant: one(tenant, {
    fields: [supplierLocations.tenantId],
    references: [tenant.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [customers.tenantId],
    references: [tenant.id],
  }),
  locations: many(customerLocations),
}));

export const customerLocationsRelations = relations(customerLocations, ({ one }) => ({
  customer: one(customers, {
    fields: [customerLocations.customerId],
    references: [customers.id],
  }),
  tenant: one(tenant, {
    fields: [customerLocations.tenantId],
    references: [tenant.id],
  }),
}));

export type ProductType = typeof productTypes.$inferSelect;
export type NewProductType = typeof productTypes.$inferInsert;

export type PackageType = typeof packageTypes.$inferSelect;
export type NewPackageType = typeof packageTypes.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export type SupplierLocation = typeof supplierLocations.$inferSelect;
export type NewSupplierLocation = typeof supplierLocations.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type CustomerLocation = typeof customerLocations.$inferSelect;
export type NewCustomerLocation = typeof customerLocations.$inferInsert;
