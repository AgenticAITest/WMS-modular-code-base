import express from 'express';
import { db } from '@server/lib/db'; // Adjust import path as needed
import { warehouseSetup } from '../lib/db/schemas/warehouseSetup';
import { authenticated, authorized } from '@server/middleware/authMiddleware'; // Adjust import path as needed
import { eq, and, desc, count, ilike } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('warehouse-setup'));

/**
 * @swagger
 * components:
 *   schemas:
 *     WarehouseSetup:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouse-setup:
 *   get:
 *     summary: Get all Warehouse Setup records
 *     tags: [Warehouse Setup]
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
 *     responses:
 *       200:
 *         description: List of Warehouse Setup records
 *       401:
 *         description: Unauthorized
 */
router.get('/warehouse-setup', authorized('ADMIN','warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(warehouseSetup.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(ilike(warehouseSetup.name, `%${search}%`));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(warehouseSetup)
      .where(and(...whereConditions));

    // Get paginated data
    const data = await db
      .select()
      .from(warehouseSetup)
      .where(and(...whereConditions))
      .orderBy(desc(warehouseSetup.createdAt))
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
    console.error('Error fetching warehouse setup:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouse-setup:
 *   post:
 *     summary: Create a new Warehouse Setup
 *     tags: [Warehouse Setup]
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
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Warehouse Setup created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/warehouse-setup', authorized('ADMIN','warehouse-setup.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const [newRecord] = await db
      .insert(warehouseSetup)
      .values({
        tenantId,
        name,
        description,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Warehouse Setup created successfully',
    });
  } catch (error) {
    console.error('Error creating warehouse setup:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/warehouse-setup/warehouse-setup/{id}:
 *   get:
 *     summary: Get a Warehouse Setup by ID
 *     tags: [Warehouse Setup]
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
 *         description: Warehouse Setup found
 *       404:
 *         description: Warehouse Setup not found
 *       401:
 *         description: Unauthorized
 */
router.get('/warehouse-setup/:id', authorized('ADMIN','warehouse-setup.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(warehouseSetup)
      .where(and(
        eq(warehouseSetup.id, id),
        eq(warehouseSetup.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse Setup not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching warehouse setup:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
