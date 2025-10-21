import express from 'express';
import { db } from '@server/lib/db';
import { purchaseOrders, purchaseOrderItems } from '../lib/db/schemas/purchaseOrder';
import { suppliers, supplierLocations, products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { inventoryItems } from '@modules/inventory-items/server/lib/db/schemas/inventoryItems';
import { user } from '@server/lib/db/schema/system';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, or, sql, sum } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('purchase-order'));

/**
 * @swagger
 * components:
 *   schemas:
 *     PurchaseOrder:
 *       type: object
 *       required:
 *         - orderNumber
 *         - supplierId
 *         - orderDate
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         orderNumber:
 *           type: string
 *         supplierId:
 *           type: string
 *           format: uuid
 *         supplierLocationId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [pending, approved, received, completed]
 *         workflowState:
 *           type: string
 *           enum: [create, approve, receive, putaway, complete]
 *         orderDate:
 *           type: string
 *           format: date
 *         expectedDeliveryDate:
 *           type: string
 *           format: date
 *         totalAmount:
 *           type: number
 *         notes:
 *           type: string
 *         createdBy:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PurchaseOrderItem:
 *       type: object
 *       required:
 *         - purchaseOrderId
 *         - productId
 *         - orderedQuantity
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         purchaseOrderId:
 *           type: string
 *           format: uuid
 *         productId:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         orderedQuantity:
 *           type: integer
 *         receivedQuantity:
 *           type: integer
 *         unitCost:
 *           type: number
 *         totalCost:
 *           type: number
 *         expectedExpiryDate:
 *           type: string
 *           format: date
 *         notes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ==================== HELPER ENDPOINTS ====================

/**
 * @swagger
 * /api/modules/purchase-order/products-with-stock:
 *   get:
 *     summary: Get all products with aggregated stock information for PO creation
 *     tags: [Purchase Orders]
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
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of products with stock information
 *       401:
 *         description: Unauthorized
 */
router.get('/products-with-stock', authorized('ADMIN', 'purchase-order.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(products.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(products.sku, `%${search}%`),
          ilike(products.name, `%${search}%`)
        )!
      );
    }

    // Get total count of products
    const [totalResult] = await db
      .select({ count: count() })
      .from(products)
      .where(and(...whereConditions));

    // Get products with aggregated stock
    const data = await db
      .select({
        productId: products.id,
        sku: products.sku,
        name: products.name,
        minimumStockLevel: products.minimumStockLevel,
        totalAvailableStock: sql<number>`COALESCE(SUM(${inventoryItems.availableQuantity}), 0)`,
      })
      .from(products)
      .leftJoin(
        inventoryItems,
        and(
          eq(products.id, inventoryItems.productId),
          eq(inventoryItems.tenantId, tenantId)
        )
      )
      .where(and(...whereConditions))
      .groupBy(products.id, products.sku, products.name, products.minimumStockLevel)
      .orderBy(products.name)
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
    console.error('Error fetching products with stock:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// ==================== PURCHASE ORDERS CRUD ====================

/**
 * @swagger
 * /api/modules/purchase-order/orders:
 *   get:
 *     summary: Get all purchase orders
 *     tags: [Purchase Orders]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, received, completed]
 *     responses:
 *       200:
 *         description: List of purchase orders
 *       401:
 *         description: Unauthorized
 */
router.get('/orders', authorized('ADMIN', 'purchase-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const statusFilter = req.query.status as string;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(purchaseOrders.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(purchaseOrders.orderNumber, `%${search}%`),
          ilike(purchaseOrders.notes, `%${search}%`)
        )!
      );
    }

    if (statusFilter) {
      whereConditions.push(eq(purchaseOrders.status, statusFilter as any));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(purchaseOrders)
      .where(and(...whereConditions));

    // Get paginated data with relations
    const data = await db
      .select({
        id: purchaseOrders.id,
        tenantId: purchaseOrders.tenantId,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        supplierLocationId: purchaseOrders.supplierLocationId,
        status: purchaseOrders.status,
        workflowState: purchaseOrders.workflowState,
        orderDate: purchaseOrders.orderDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        createdBy: purchaseOrders.createdBy,
        createdByName: user.fullname,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(user, eq(purchaseOrders.createdBy, user.id))
      .where(and(...whereConditions))
      .orderBy(desc(purchaseOrders.createdAt))
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
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders/{id}:
 *   get:
 *     summary: Get a purchase order by ID
 *     tags: [Purchase Orders]
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
 *         description: Purchase order found
 *       404:
 *         description: Purchase order not found
 *       401:
 *         description: Unauthorized
 */
router.get('/orders/:id', authorized('ADMIN', 'purchase-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select({
        id: purchaseOrders.id,
        tenantId: purchaseOrders.tenantId,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        supplierEmail: suppliers.email,
        supplierPhone: suppliers.phone,
        supplierLocationId: purchaseOrders.supplierLocationId,
        locationAddress: supplierLocations.address,
        locationCity: supplierLocations.city,
        status: purchaseOrders.status,
        workflowState: purchaseOrders.workflowState,
        orderDate: purchaseOrders.orderDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        createdBy: purchaseOrders.createdBy,
        createdByName: user.fullname,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .leftJoin(supplierLocations, eq(purchaseOrders.supplierLocationId, supplierLocations.id))
      .leftJoin(user, eq(purchaseOrders.createdBy, user.id))
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Get items for this purchase order
    const items = await db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        productId: purchaseOrderItems.productId,
        productName: products.name,
        productSku: products.sku,
        orderedQuantity: purchaseOrderItems.orderedQuantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitCost: purchaseOrderItems.unitCost,
        totalCost: purchaseOrderItems.totalCost,
        expectedExpiryDate: purchaseOrderItems.expectedExpiryDate,
        notes: purchaseOrderItems.notes,
        createdAt: purchaseOrderItems.createdAt,
        updatedAt: purchaseOrderItems.updatedAt,
      })
      .from(purchaseOrderItems)
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    res.json({
      success: true,
      data: {
        ...record,
        items,
      },
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders:
 *   post:
 *     summary: Create a new purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderNumber
 *               - supplierId
 *               - orderDate
 *             properties:
 *               orderNumber:
 *                 type: string
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               supplierLocationId:
 *                 type: string
 *                 format: uuid
 *               status:
 *                 type: string
 *                 enum: [pending, approved, received, completed]
 *               workflowState:
 *                 type: string
 *                 enum: [create, approve, receive, putaway, complete]
 *               orderDate:
 *                 type: string
 *                 format: date
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *               totalAmount:
 *                 type: number
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     orderedQuantity:
 *                       type: integer
 *                     unitCost:
 *                       type: number
 *                     expectedExpiryDate:
 *                       type: string
 *                       format: date
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Purchase order created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/orders', authorized('ADMIN', 'purchase-order.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const username = req.user!.username;
    const { 
      orderNumber, 
      supplierId, 
      supplierLocationId,
      status = 'pending',
      workflowState = 'create',
      orderDate, 
      expectedDeliveryDate,
      totalAmount,
      notes,
      items = []
    } = req.body;

    // Validation
    if (!orderNumber || !supplierId || !orderDate) {
      return res.status(400).json({
        success: false,
        message: 'Order number, supplier, and order date are required',
      });
    }

    // Check if order number already exists
    const [existingOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.orderNumber, orderNumber));

    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: 'Order number already exists',
      });
    }

    // Get user ID
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.username, username));

    // Create purchase order
    const [newOrder] = await db
      .insert(purchaseOrders)
      .values({
        id: uuidv4(),
        tenantId,
        orderNumber,
        supplierId,
        supplierLocationId: supplierLocationId || null,
        status,
        workflowState,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || null,
        totalAmount: totalAmount || null,
        notes: notes || null,
        createdBy: currentUser?.id || null,
      })
      .returning();

    // Create items if provided
    if (items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        id: uuidv4(),
        purchaseOrderId: newOrder.id,
        productId: item.productId,
        tenantId,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: 0,
        unitCost: item.unitCost || null,
        totalCost: item.unitCost && item.orderedQuantity 
          ? (parseFloat(item.unitCost) * parseInt(item.orderedQuantity)).toFixed(2)
          : null,
        expectedExpiryDate: item.expectedExpiryDate || null,
        notes: item.notes || null,
      }));

      await db.insert(purchaseOrderItems).values(itemsToInsert);
    }

    res.status(201).json({
      success: true,
      data: newOrder,
      message: 'Purchase order created successfully',
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders/{id}:
 *   put:
 *     summary: Update a purchase order
 *     tags: [Purchase Orders]
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
 *         description: Purchase order updated successfully
 *       404:
 *         description: Purchase order not found
 *       401:
 *         description: Unauthorized
 */
router.put('/orders/:id', authorized('ADMIN', 'purchase-order.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.tenantId;
    delete updateData.createdAt;
    delete updateData.createdBy;

    const [updatedOrder] = await db
      .update(purchaseOrders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      ))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Purchase order updated successfully',
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/orders/{id}:
 *   delete:
 *     summary: Delete a purchase order
 *     tags: [Purchase Orders]
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
 *         description: Purchase order deleted successfully
 *       404:
 *         description: Purchase order not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/orders/:id', authorized('ADMIN', 'purchase-order.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const result = await db
      .delete(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// ==================== PURCHASE ORDER ITEMS CRUD ====================

/**
 * @swagger
 * /api/modules/purchase-order/items:
 *   get:
 *     summary: Get all purchase order items
 *     tags: [Purchase Order Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: purchaseOrderId
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
 *           default: 10
 *     responses:
 *       200:
 *         description: List of purchase order items
 *       401:
 *         description: Unauthorized
 */
router.get('/items', authorized('ADMIN', 'purchase-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const purchaseOrderId = req.query.purchaseOrderId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(purchaseOrderItems.tenantId, tenantId)];
    
    if (purchaseOrderId) {
      whereConditions.push(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(purchaseOrderItems)
      .where(and(...whereConditions));

    // Get paginated data
    const data = await db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        orderNumber: purchaseOrders.orderNumber,
        productId: purchaseOrderItems.productId,
        productName: products.name,
        productSku: products.sku,
        orderedQuantity: purchaseOrderItems.orderedQuantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitCost: purchaseOrderItems.unitCost,
        totalCost: purchaseOrderItems.totalCost,
        expectedExpiryDate: purchaseOrderItems.expectedExpiryDate,
        notes: purchaseOrderItems.notes,
        createdAt: purchaseOrderItems.createdAt,
        updatedAt: purchaseOrderItems.updatedAt,
      })
      .from(purchaseOrderItems)
      .leftJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(and(...whereConditions))
      .orderBy(desc(purchaseOrderItems.createdAt))
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
    console.error('Error fetching purchase order items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/items/{id}:
 *   get:
 *     summary: Get a purchase order item by ID
 *     tags: [Purchase Order Items]
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
 *         description: Purchase order item found
 *       404:
 *         description: Purchase order item not found
 *       401:
 *         description: Unauthorized
 */
router.get('/items/:id', authorized('ADMIN', 'purchase-order.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        orderNumber: purchaseOrders.orderNumber,
        productId: purchaseOrderItems.productId,
        productName: products.name,
        productSku: products.sku,
        orderedQuantity: purchaseOrderItems.orderedQuantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitCost: purchaseOrderItems.unitCost,
        totalCost: purchaseOrderItems.totalCost,
        expectedExpiryDate: purchaseOrderItems.expectedExpiryDate,
        notes: purchaseOrderItems.notes,
        createdAt: purchaseOrderItems.createdAt,
        updatedAt: purchaseOrderItems.updatedAt,
      })
      .from(purchaseOrderItems)
      .leftJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(and(
        eq(purchaseOrderItems.id, id),
        eq(purchaseOrderItems.tenantId, tenantId)
      ));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order item not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching purchase order item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/items:
 *   post:
 *     summary: Create a new purchase order item
 *     tags: [Purchase Order Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purchaseOrderId
 *               - productId
 *               - orderedQuantity
 *             properties:
 *               purchaseOrderId:
 *                 type: string
 *                 format: uuid
 *               productId:
 *                 type: string
 *                 format: uuid
 *               orderedQuantity:
 *                 type: integer
 *               unitCost:
 *                 type: number
 *               expectedExpiryDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Purchase order item created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/items', authorized('ADMIN', 'purchase-order.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { 
      purchaseOrderId, 
      productId, 
      orderedQuantity,
      unitCost,
      expectedExpiryDate,
      notes
    } = req.body;

    // Validation
    if (!purchaseOrderId || !productId || !orderedQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Purchase order, product, and ordered quantity are required',
      });
    }

    // Verify purchase order belongs to tenant
    const [order] = await db
      .select()
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, purchaseOrderId),
        eq(purchaseOrders.tenantId, tenantId)
      ));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    const totalCost = unitCost && orderedQuantity 
      ? (parseFloat(unitCost) * parseInt(orderedQuantity)).toFixed(2)
      : null;

    const [newItem] = await db
      .insert(purchaseOrderItems)
      .values({
        id: uuidv4(),
        purchaseOrderId,
        productId,
        tenantId,
        orderedQuantity,
        receivedQuantity: 0,
        unitCost: unitCost || null,
        totalCost,
        expectedExpiryDate: expectedExpiryDate || null,
        notes: notes || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newItem,
      message: 'Purchase order item created successfully',
    });
  } catch (error) {
    console.error('Error creating purchase order item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/items/{id}:
 *   put:
 *     summary: Update a purchase order item
 *     tags: [Purchase Order Items]
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
 *         description: Purchase order item updated successfully
 *       404:
 *         description: Purchase order item not found
 *       401:
 *         description: Unauthorized
 */
router.put('/items/:id', authorized('ADMIN', 'purchase-order.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.tenantId;
    delete updateData.createdAt;
    delete updateData.purchaseOrderId;

    // Recalculate total cost if unit cost or quantity changed
    if (updateData.unitCost !== undefined || updateData.orderedQuantity !== undefined) {
      const [currentItem] = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.id, id));

      if (currentItem) {
        const unitCost = updateData.unitCost !== undefined ? updateData.unitCost : currentItem.unitCost;
        const quantity = updateData.orderedQuantity !== undefined ? updateData.orderedQuantity : currentItem.orderedQuantity;
        
        if (unitCost && quantity) {
          updateData.totalCost = (parseFloat(unitCost) * parseInt(quantity)).toFixed(2);
        }
      }
    }

    const [updatedItem] = await db
      .update(purchaseOrderItems)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(purchaseOrderItems.id, id),
        eq(purchaseOrderItems.tenantId, tenantId)
      ))
      .returning();

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order item not found',
      });
    }

    res.json({
      success: true,
      data: updatedItem,
      message: 'Purchase order item updated successfully',
    });
  } catch (error) {
    console.error('Error updating purchase order item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/purchase-order/items/{id}:
 *   delete:
 *     summary: Delete a purchase order item
 *     tags: [Purchase Order Items]
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
 *         description: Purchase order item deleted successfully
 *       404:
 *         description: Purchase order item not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/items/:id', authorized('ADMIN', 'purchase-order.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const result = await db
      .delete(purchaseOrderItems)
      .where(and(
        eq(purchaseOrderItems.id, id),
        eq(purchaseOrderItems.tenantId, tenantId)
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order item not found',
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting purchase order item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
