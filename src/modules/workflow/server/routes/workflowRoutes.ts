import express from 'express';
import { db } from '@server/lib/db';
import { workflows, workflowSteps } from '../lib/db/schemas/workflow';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, or } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('workflow'));

/**
 * @swagger
 * components:
 *   schemas:
 *     Workflow:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         type:
 *           type: string
 *         isDefault:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     WorkflowStep:
 *       type: object
 *       required:
 *         - workflowId
 *         - stepKey
 *         - stepName
 *         - stepOrder
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         workflowId:
 *           type: string
 *           format: uuid
 *         stepKey:
 *           type: string
 *         stepName:
 *           type: string
 *         stepOrder:
 *           type: integer
 *         isInitial:
 *           type: boolean
 *         isTerminal:
 *           type: boolean
 *         requiredFields:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ==================== WORKFLOWS CRUD ====================

/**
 * @swagger
 * /api/modules/workflow/workflows:
 *   get:
 *     summary: Get all workflows
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of workflows
 *       401:
 *         description: Unauthorized
 */
router.get('/workflows', authorized('ADMIN', 'workflow.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const typeFilter = req.query.type as string;
    const isActiveFilter = req.query.isActive as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(workflows.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(ilike(workflows.name, `%${search}%`));
    }

    if (typeFilter) {
      whereConditions.push(eq(workflows.type, typeFilter));
    }

    if (isActiveFilter !== undefined) {
      whereConditions.push(eq(workflows.isActive, isActiveFilter === 'true'));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(workflows)
      .where(and(...whereConditions));

    // Get paginated data
    const data = await db
      .select()
      .from(workflows)
      .where(and(...whereConditions))
      .orderBy(desc(workflows.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalResult.count / limit);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/workflow/workflows/{id}:
 *   get:
 *     summary: Get a workflow by ID with its steps
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow found
 *       404:
 *         description: Workflow not found
 *       401:
 *         description: Unauthorized
 */
router.get('/workflows/:id', authorized('ADMIN', 'workflow.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(workflows)
      .where(and(
        eq(workflows.id, id),
        eq(workflows.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    // Get steps for this workflow
    const steps = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, id))
      .orderBy(workflowSteps.stepOrder);

    res.json({
      success: true,
      data: {
        ...record,
        steps,
      },
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/workflow/workflows:
 *   post:
 *     summary: Create a new workflow with optional steps
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     stepKey:
 *                       type: string
 *                     stepName:
 *                       type: string
 *                     stepOrder:
 *                       type: integer
 *                     isInitial:
 *                       type: boolean
 *                     isTerminal:
 *                       type: boolean
 *                     requiredFields:
 *                       type: object
 *     responses:
 *       201:
 *         description: Workflow created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/workflows', authorized('ADMIN', 'workflow.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { 
      name, 
      type,
      isDefault = false,
      isActive = true,
      steps = []
    } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required',
      });
    }

    // If setting as default, unset other defaults for this type
    if (isDefault) {
      await db
        .update(workflows)
        .set({ isDefault: false })
        .where(and(
          eq(workflows.tenantId, tenantId),
          eq(workflows.type, type),
          eq(workflows.isDefault, true)
        ));
    }

    // Create workflow
    const [newWorkflow] = await db
      .insert(workflows)
      .values({
        id: uuidv4(),
        tenantId,
        name,
        type,
        isDefault,
        isActive,
      })
      .returning();

    // Create steps if provided
    if (steps.length > 0) {
      const stepsToInsert = steps.map((step: any) => ({
        id: uuidv4(),
        workflowId: newWorkflow.id,
        stepKey: step.stepKey,
        stepName: step.stepName,
        stepOrder: step.stepOrder,
        isInitial: step.isInitial || false,
        isTerminal: step.isTerminal || false,
        requiredFields: step.requiredFields || null,
      }));

      await db.insert(workflowSteps).values(stepsToInsert);
    }

    res.status(201).json({
      success: true,
      data: newWorkflow,
      message: 'Workflow created successfully',
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/workflow/workflows/{id}:
 *   put:
 *     summary: Update a workflow
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Workflow updated successfully
 *       404:
 *         description: Workflow not found
 *       401:
 *         description: Unauthorized
 */
router.put('/workflows/:id', authorized('ADMIN', 'workflow.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.tenantId;
    delete updateData.createdAt;

    // If setting as default, unset other defaults for this type
    if (updateData.isDefault === true) {
      const [currentWorkflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, id));

      if (currentWorkflow) {
        await db
          .update(workflows)
          .set({ isDefault: false })
          .where(and(
            eq(workflows.tenantId, tenantId),
            eq(workflows.type, currentWorkflow.type),
            eq(workflows.isDefault, true)
          ));
      }
    }

    const [updatedWorkflow] = await db
      .update(workflows)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(workflows.id, id),
        eq(workflows.tenantId, tenantId)
      ))
      .returning();

    if (!updatedWorkflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      data: updatedWorkflow,
      message: 'Workflow updated successfully',
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/workflow/workflows/{id}:
 *   delete:
 *     summary: Delete a workflow
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Workflow deleted successfully
 *       404:
 *         description: Workflow not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/workflows/:id', authorized('ADMIN', 'workflow.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const result = await db
      .delete(workflows)
      .where(and(
        eq(workflows.id, id),
        eq(workflows.tenantId, tenantId)
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// ==================== WORKFLOW STEPS CRUD ====================

/**
 * @swagger
 * /api/modules/workflow/steps:
 *   get:
 *     summary: Get all workflow steps
 *     tags: [Workflow Steps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workflowId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of workflow steps
 *       401:
 *         description: Unauthorized
 */
router.get('/steps', authorized('ADMIN', 'workflow.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const workflowId = req.query.workflowId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    let whereConditions;
    
    if (workflowId) {
      // Verify workflow belongs to tenant
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(and(
          eq(workflows.id, workflowId),
          eq(workflows.tenantId, tenantId)
        ));

      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found',
        });
      }

      whereConditions = eq(workflowSteps.workflowId, workflowId);
    } else {
      // Get steps for all workflows of this tenant
      const tenantWorkflows = await db
        .select({ id: workflows.id })
        .from(workflows)
        .where(eq(workflows.tenantId, tenantId));

      const workflowIds = tenantWorkflows.map(w => w.id);
      
      if (workflowIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        });
      }

      whereConditions = or(...workflowIds.map(id => eq(workflowSteps.workflowId, id)));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(workflowSteps)
      .where(whereConditions);

    // Get paginated data
    const data = await db
      .select({
        id: workflowSteps.id,
        workflowId: workflowSteps.workflowId,
        workflowName: workflows.name,
        workflowType: workflows.type,
        stepKey: workflowSteps.stepKey,
        stepName: workflowSteps.stepName,
        stepOrder: workflowSteps.stepOrder,
        isInitial: workflowSteps.isInitial,
        isTerminal: workflowSteps.isTerminal,
        requiredFields: workflowSteps.requiredFields,
        createdAt: workflowSteps.createdAt,
        updatedAt: workflowSteps.updatedAt,
      })
      .from(workflowSteps)
      .leftJoin(workflows, eq(workflowSteps.workflowId, workflows.id))
      .where(whereConditions)
      .orderBy(workflowSteps.stepOrder)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalResult.count / limit);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: totalResult.count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching workflow steps:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/workflow/steps/{id}:
 *   get:
 *     summary: Get a workflow step by ID
 *     tags: [Workflow Steps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow step found
 *       404:
 *         description: Workflow step not found
 *       401:
 *         description: Unauthorized
 */
router.get('/steps/:id', authorized('ADMIN', 'workflow.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select({
        id: workflowSteps.id,
        workflowId: workflowSteps.workflowId,
        workflowName: workflows.name,
        workflowType: workflows.type,
        stepKey: workflowSteps.stepKey,
        stepName: workflowSteps.stepName,
        stepOrder: workflowSteps.stepOrder,
        isInitial: workflowSteps.isInitial,
        isTerminal: workflowSteps.isTerminal,
        requiredFields: workflowSteps.requiredFields,
        createdAt: workflowSteps.createdAt,
        updatedAt: workflowSteps.updatedAt,
      })
      .from(workflowSteps)
      .leftJoin(workflows, eq(workflowSteps.workflowId, workflows.id))
      .where(and(
        eq(workflowSteps.id, id),
        eq(workflows.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Workflow step not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching workflow step:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/workflow/steps:
 *   post:
 *     summary: Create a new workflow step
 *     tags: [Workflow Steps]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workflowId
 *               - stepKey
 *               - stepName
 *               - stepOrder
 *             properties:
 *               workflowId:
 *                 type: string
 *                 format: uuid
 *               stepKey:
 *                 type: string
 *               stepName:
 *                 type: string
 *               stepOrder:
 *                 type: integer
 *               isInitial:
 *                 type: boolean
 *               isTerminal:
 *                 type: boolean
 *               requiredFields:
 *                 type: object
 *     responses:
 *       201:
 *         description: Workflow step created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/steps', authorized('ADMIN', 'workflow.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { 
      workflowId, 
      stepKey, 
      stepName,
      stepOrder,
      isInitial = false,
      isTerminal = false,
      requiredFields
    } = req.body;

    // Validation
    if (!workflowId || !stepKey || !stepName || stepOrder === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Workflow ID, step key, step name, and step order are required',
      });
    }

    // Verify workflow belongs to tenant
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(
        eq(workflows.id, workflowId),
        eq(workflows.tenantId, tenantId)
      ));

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    const [newStep] = await db
      .insert(workflowSteps)
      .values({
        id: uuidv4(),
        workflowId,
        stepKey,
        stepName,
        stepOrder,
        isInitial,
        isTerminal,
        requiredFields: requiredFields || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newStep,
      message: 'Workflow step created successfully',
    });
  } catch (error) {
    console.error('Error creating workflow step:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/workflow/steps/{id}:
 *   put:
 *     summary: Update a workflow step
 *     tags: [Workflow Steps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Workflow step updated successfully
 *       404:
 *         description: Workflow step not found
 *       401:
 *         description: Unauthorized
 */
router.put('/steps/:id', authorized('ADMIN', 'workflow.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.workflowId;

    // Verify step belongs to tenant's workflow
    const [existingStep] = await db
      .select()
      .from(workflowSteps)
      .leftJoin(workflows, eq(workflowSteps.workflowId, workflows.id))
      .where(and(
        eq(workflowSteps.id, id),
        eq(workflows.tenantId, tenantId)
      ));

    if (!existingStep) {
      return res.status(404).json({
        success: false,
        message: 'Workflow step not found',
      });
    }

    const [updatedStep] = await db
      .update(workflowSteps)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(workflowSteps.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedStep,
      message: 'Workflow step updated successfully',
    });
  } catch (error) {
    console.error('Error updating workflow step:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/workflow/steps/{id}:
 *   delete:
 *     summary: Delete a workflow step
 *     tags: [Workflow Steps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Workflow step deleted successfully
 *       404:
 *         description: Workflow step not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/steps/:id', authorized('ADMIN', 'workflow.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    // Verify step belongs to tenant's workflow
    const [existingStep] = await db
      .select()
      .from(workflowSteps)
      .leftJoin(workflows, eq(workflowSteps.workflowId, workflows.id))
      .where(and(
        eq(workflowSteps.id, id),
        eq(workflows.tenantId, tenantId)
      ));

    if (!existingStep) {
      return res.status(404).json({
        success: false,
        message: 'Workflow step not found',
      });
    }

    await db
      .delete(workflowSteps)
      .where(eq(workflowSteps.id, id));

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting workflow step:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
