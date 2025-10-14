import { db } from '@server/lib/db';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { and, desc, eq } from 'drizzle-orm';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sampleModule } from '../lib/db/schemas/sampleModule';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('sample-module'));

/**
 * @swagger
 * components:
 *   schemas:
 *     SampleModule:
 *       type: object
 *       required:
 *         - name
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the sample module
 *         name:
 *           type: string
 *           maxLength: 255
 *           description: Name of the sample module
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Description of the sample module
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *           description: Status of the sample module
 *         isPublic:
 *           type: boolean
 *           description: Whether the sample module is public
 *         tenantId:
 *           type: string
 *           format: uuid
 *           description: ID of the tenant this sample module belongs to
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/modules/sample-module/sample-module:
 *   get:
 *     summary: Get all sample modules
 *     tags: [Sample Module]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of sample modules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SampleModule'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/sample-module', authorized('ADMIN','sample-module.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const tenantId = req.user!.activeTenantId;

    const modules = await db
      .select()
      .from(sampleModule)
      .where(eq(sampleModule.tenantId, tenantId))
      .orderBy(desc(sampleModule.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: sampleModule.id })
      .from(sampleModule)
      .where(eq(sampleModule.tenantId, tenantId));

    const total = totalCount.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: modules,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching sample modules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/sample-module/sample-module/{id}:
 *   get:
 *     summary: Get a sample module by ID
 *     tags: [Sample Module]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sample module ID
 *     responses:
 *       200:
 *         description: Sample module details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SampleModule'
 *       404:
 *         description: Sample module not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/sample-module/:id', authorized('ADMIN','sample-module.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const module = await db
      .select()
      .from(sampleModule)
      .where(and(eq(sampleModule.id, id), eq(sampleModule.tenantId, tenantId)))
      .limit(1);

    if (module.length === 0) {
      return res.status(404).json({ error: 'Sample module not found' });
    }

    res.json(module[0]);
  } catch (error) {
    console.error('Error fetching sample module:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/sample-module/sample-module:
 *   post:
 *     summary: Create a new sample module
 *     tags: [Sample Module]
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
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Sample module created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SampleModule'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/sample-module', authorized('ADMIN','sample-module.create'), async (req, res) => {
  try {
    const { name, description, status = 'active', isPublic = false } = req.body;
    const tenantId = req.user!.activeTenantId;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const newModule = {
      id: uuidv4(),
      name,
      description,
      status,
      isPublic,
      tenantId,
    };

    const [createdModule] = await db
      .insert(sampleModule)
      .values(newModule)
      .returning();

    res.status(201).json(createdModule);
  } catch (error) {
    console.error('Error creating sample module:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/sample-module/sample-module/{id}:
 *   put:
 *     summary: Update a sample module
 *     tags: [Sample Module]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sample module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Sample module updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SampleModule'
 *       404:
 *         description: Sample module not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/sample-module/:id', authorized('ADMIN','sample-module.edit'),  async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, isPublic } = req.body;
    const tenantId = req.user!.activeTenantId;

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const [updatedModule] = await db
      .update(sampleModule)
      .set(updateData)
      .where(and(eq(sampleModule.id, id), eq(sampleModule.tenantId, tenantId)))
      .returning();

    if (!updatedModule) {
      return res.status(404).json({ error: 'Sample module not found' });
    }

    res.json(updatedModule);
  } catch (error) {
    console.error('Error updating sample module:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/sample-module/sample-module/{id}:
 *   delete:
 *     summary: Delete a sample module
 *     tags: [Sample Module]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sample module ID
 *     responses:
 *       204:
 *         description: Sample module deleted successfully
 *       404:
 *         description: Sample module not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/sample-module/:id', authorized('ADMIN','sample-module.delete'),  async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const result = await db
      .delete(sampleModule)
      .where(and(eq(sampleModule.id, id), eq(sampleModule.tenantId, tenantId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Sample module not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting sample module:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;