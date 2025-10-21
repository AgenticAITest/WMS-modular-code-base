import { relations } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { tenant } from '@server/lib/db/schema/system';

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    index('workflows_tenant_idx').on(t.tenantId),
    index('workflows_type_idx').on(t.type),
    index('workflows_tenant_type_default_idx').on(t.tenantId, t.type, t.isDefault),
  ]
);

export const workflowSteps = pgTable('workflow_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  stepKey: varchar('step_key', { length: 50 }).notNull(),
  stepName: varchar('step_name', { length: 255 }).notNull(),
  stepOrder: integer('step_order').notNull(),
  isInitial: boolean('is_initial').notNull().default(false),
  isTerminal: boolean('is_terminal').notNull().default(false),
  requiredFields: jsonb('required_fields'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    index('workflow_steps_workflow_idx').on(t.workflowId),
    index('workflow_steps_order_idx').on(t.workflowId, t.stepOrder),
  ]
);

// Relations
export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [workflows.tenantId],
    references: [tenant.id],
  }),
  steps: many(workflowSteps),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
    references: [workflows.id],
  }),
}));

// Types
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;

export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type NewWorkflowStep = typeof workflowSteps.$inferInsert;
