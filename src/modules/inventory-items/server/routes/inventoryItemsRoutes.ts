import express from 'express';
import { db } from '@server/lib/db'; // Adjust import path as needed
import { inventoryItems } from '../lib/db/schemas/inventoryItems';
import { authenticated, authorized } from '@server/middleware/authMiddleware'; // Adjust import path as needed
import { eq, and, desc, count, ilike } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('inventory-items'));

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryItems:
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
 * /api/modules/inventory-items/inventory-items:
 *   get:
 *     summary: Get all Inventory Items records
 *     tags: [Inventory Items]
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
 *         description: List of Inventory Items records
 *       401:
 *         description: Unauthorized
 */
router.get('/inventory-items', authorized('ADMIN','inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(inventoryItems.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(ilike(inventoryItems.name, `%${search}%`));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(inventoryItems)
      .where(and(...whereConditions));

    // Get paginated data
    const data = await db
      .select()
      .from(inventoryItems)
      .where(and(...whereConditions))
      .orderBy(desc(inventoryItems.createdAt))
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
    console.error('Error fetching inventory items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/inventory-items:
 *   post:
 *     summary: Create a new Inventory Items
 *     tags: [Inventory Items]
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
 *         description: Inventory Items created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/inventory-items', authorized('ADMIN','inventory-items.create'), async (req, res) => {
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
      .insert(inventoryItems)
      .values({
        tenantId,
        name,
        description,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Inventory Items created successfully',
    });
  } catch (error) {
    console.error('Error creating inventory items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/inventory-items/inventory-items/{id}:
 *   get:
 *     summary: Get a Inventory Items by ID
 *     tags: [Inventory Items]
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
 *         description: Inventory Items found
 *       404:
 *         description: Inventory Items not found
 *       401:
 *         description: Unauthorized
 */
router.get('/inventory-items/:id', authorized('ADMIN','inventory-items.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.id, id),
        eq(inventoryItems.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Inventory Items not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
