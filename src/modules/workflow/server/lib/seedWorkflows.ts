import { db } from '@server/lib/db';
import { workflows, workflowSteps } from './db/schemas/workflow';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed default workflows for a tenant
 * Creates Purchase Order and Sales Order workflows with their standard steps
 */
export async function seedWorkflows(tenantId: string) {
  console.log('Starting workflow seeding...');

  // Create Purchase Order Workflow
  const poWorkflowId = uuidv4();
  const [poWorkflow] = await db
    .insert(workflows)
    .values({
      id: poWorkflowId,
      tenantId,
      name: 'Standard Purchase Order Workflow',
      type: 'PURCHASE_ORDER',
      isDefault: true,
      isActive: true,
    })
    .returning();
  console.log('✓ Created PO workflow:', poWorkflow.name);

  // Create PO workflow steps
  const poSteps = [
    { stepKey: 'create', stepName: 'Create', stepOrder: 1, isInitial: true, isTerminal: false },
    { stepKey: 'approve', stepName: 'Approve', stepOrder: 2, isInitial: false, isTerminal: false },
    { stepKey: 'receive', stepName: 'Receive', stepOrder: 3, isInitial: false, isTerminal: false },
    { stepKey: 'putaway', stepName: 'Putaway', stepOrder: 4, isInitial: false, isTerminal: false },
    { stepKey: 'complete', stepName: 'Complete', stepOrder: 5, isInitial: false, isTerminal: true },
  ];

  const poStepRecords = await db
    .insert(workflowSteps)
    .values(
      poSteps.map((step) => ({
        id: uuidv4(),
        workflowId: poWorkflowId,
        ...step,
        isActive: true,
        requiredFields: null,
      }))
    )
    .returning();
  console.log(`✓ Created ${poStepRecords.length} PO workflow steps`);

  // Create Sales Order Workflow
  const soWorkflowId = uuidv4();
  const [soWorkflow] = await db
    .insert(workflows)
    .values({
      id: soWorkflowId,
      tenantId,
      name: 'Standard Sales Order Workflow',
      type: 'SALES_ORDER',
      isDefault: true,
      isActive: true,
    })
    .returning();
  console.log('✓ Created SO workflow:', soWorkflow.name);

  // Create SO workflow steps
  const soSteps = [
    { stepKey: 'create', stepName: 'Create', stepOrder: 1, isInitial: true, isTerminal: false },
    { stepKey: 'allocate', stepName: 'Allocate', stepOrder: 2, isInitial: false, isTerminal: false },
    { stepKey: 'pick', stepName: 'Pick', stepOrder: 3, isInitial: false, isTerminal: false },
    { stepKey: 'pack', stepName: 'Pack', stepOrder: 4, isInitial: false, isTerminal: false },
    { stepKey: 'ship', stepName: 'Ship', stepOrder: 5, isInitial: false, isTerminal: false },
    { stepKey: 'deliver', stepName: 'Deliver', stepOrder: 6, isInitial: false, isTerminal: false },
    { stepKey: 'complete', stepName: 'Complete', stepOrder: 7, isInitial: false, isTerminal: true },
  ];

  const soStepRecords = await db
    .insert(workflowSteps)
    .values(
      soSteps.map((step) => ({
        id: uuidv4(),
        workflowId: soWorkflowId,
        ...step,
        isActive: true,
        requiredFields: null,
      }))
    )
    .returning();
  console.log(`✓ Created ${soStepRecords.length} SO workflow steps`);

  console.log('\n📋 Workflow Seeding Summary:');
  console.log(`   ✓ Workflows: 2 (PO, SO)`);
  console.log(`   ✓ PO Steps: ${poStepRecords.length}`);
  console.log(`   ✓ SO Steps: ${soStepRecords.length}`);

  return {
    poWorkflow,
    poSteps: poStepRecords,
    soWorkflow,
    soSteps: soStepRecords,
  };
}
