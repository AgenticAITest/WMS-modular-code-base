import express from 'express';
import { db } from '@server/lib/db';
import { purchaseOrders, purchaseOrderItems } from '../lib/db/schemas/purchaseOrder';
import { suppliers, supplierLocations, products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { inventoryItems } from '@modules/inventory-items/server/lib/db/schemas/inventoryItems';
import { warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { user } from '@server/lib/db/schema/system';
import { documentNumberConfig } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, or, sql, sum } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { PODocumentGenerator } from '../services/poDocumentGenerator';

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
 *     summary: Get inventory items with stock information for PO creation
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
 *         description: List of inventory items with stock information
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

    // Build WHERE conditions for products
    const whereConditions = [eq(products.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(products.sku, `%${search}%`),
          ilike(products.name, `%${search}%`)
        )!
      );
    }

    // Get total count of all products for the tenant
    const [totalResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(and(...whereConditions));

    // Get ALL products with their stock information (LEFT JOIN to show 0 stock for products without inventory)
    const data = await db
      .select({
        productId: products.id,
        sku: products.sku,
        name: products.name,
        minimumStockLevel: products.minimumStockLevel,
        totalAvailableStock: sql<number>`COALESCE(SUM(${inventoryItems.availableQuantity}), 0)`,
      })
      .from(products)
      .leftJoin(inventoryItems, and(
        eq(inventoryItems.productId, products.id),
        eq(inventoryItems.tenantId, tenantId)
      ))
      .where(and(...whereConditions))
      .groupBy(products.id, products.sku, products.name, products.minimumStockLevel)
      .orderBy(products.sku)
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: data,
      pagination: {
        page,
        limit,
        total: totalResult.count || 0,
        totalPages: Math.ceil((totalResult.count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching products with stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
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
        warehouseId: purchaseOrders.warehouseId,
        warehouseName: warehouses.name,
        warehouseAddress: warehouses.address,
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
      .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
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
 *               - supplierId
 *             properties:
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               supplierLocationId:
 *                 type: string
 *                 format: uuid
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
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
      supplierId, 
      supplierLocationId,
      warehouseId,
      expectedDeliveryDate,
      notes,
      items = []
    } = req.body;

    // Validation
    if (!supplierId) {
      return res.status(400).json({
        success: false,
        message: 'Supplier is required',
      });
    }

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: 'Delivery warehouse is required',
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required',
      });
    }

    // Fetch document numbering configuration to get default prefix
    const [docConfig] = await db
      .select()
      .from(documentNumberConfig)
      .where(
        and(
          eq(documentNumberConfig.tenantId, tenantId),
          eq(documentNumberConfig.documentType, 'PO'),
          eq(documentNumberConfig.isActive, true)
        )
      )
      .limit(1);

    if (!docConfig) {
      return res.status(500).json({
        success: false,
        message: 'Document numbering configuration not found for PO',
      });
    }

    // Generate PO number via document numbering service with dynamic prefix
    let orderNumber: string;
    let documentHistoryId: string;
    
    try {
      const generatePayload: any = {
        documentType: 'PO',
        documentTableName: 'purchase_orders',
      };

      // Add prefix1 if configured
      if (docConfig.prefix1DefaultValue) {
        generatePayload.prefix1 = docConfig.prefix1DefaultValue;
      }

      // Add prefix2 if configured
      if (docConfig.prefix2DefaultValue) {
        generatePayload.prefix2 = docConfig.prefix2DefaultValue;
      }

      const docNumberResponse = await axios.post(
        'http://localhost:5000/api/modules/document-numbering/generate',
        generatePayload,
        {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
      
      orderNumber = docNumberResponse.data.documentNumber;
      documentHistoryId = docNumberResponse.data.historyId;
    } catch (error: any) {
      console.error('Error generating PO number:', error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate PO number',
      });
    }

    // Get user ID
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.username, username));

    // Calculate total amount from items
    const totalAmount = items.reduce((sum: number, item: any) => {
      const itemTotal = item.unitCost && item.orderedQuantity 
        ? parseFloat(item.unitCost) * parseInt(item.orderedQuantity)
        : 0;
      return sum + itemTotal;
    }, 0);

    const orderId = uuidv4();
    const orderDate = new Date().toISOString().split('T')[0];

    // Create purchase order with status pending and workflowState approve
    const [newOrder] = await db
      .insert(purchaseOrders)
      .values({
        id: orderId,
        tenantId,
        orderNumber,
        supplierId,
        supplierLocationId: supplierLocationId || null,
        warehouseId: warehouseId || null,
        status: 'pending',
        workflowState: 'approve',
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || null,
        totalAmount: totalAmount.toFixed(2),
        notes: notes || null,
        createdBy: currentUser?.id || null,
      })
      .returning();

    // Update document history with the actual document ID
    try {
      await axios.put(
        `http://localhost:5000/api/modules/document-numbering/history/${documentHistoryId}`,
        {
          documentId: orderId,
        },
        {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
    } catch (error) {
      console.error('Error updating document history:', error);
    }

    // Create items
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

    // Fetch the complete PO with supplier, warehouse and items for response
    const [completeOrder] = await db
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
        locationState: supplierLocations.state,
        locationPostalCode: supplierLocations.postalCode,
        locationCountry: supplierLocations.country,
        warehouseId: purchaseOrders.warehouseId,
        warehouseName: warehouses.name,
        warehouseAddress: warehouses.address,
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
      .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
      .leftJoin(user, eq(purchaseOrders.createdBy, user.id))
      .where(eq(purchaseOrders.id, orderId));

    const orderItems = await db
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
      })
      .from(purchaseOrderItems)
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, orderId));

    let documentInfo = null;
    try {
      const result = await PODocumentGenerator.generateAndSave(
        {
          id: completeOrder.id || orderId,
          tenantId: completeOrder.tenantId || tenantId,
          orderNumber: completeOrder.orderNumber || orderNumber,
          orderDate: completeOrder.orderDate || new Date().toISOString().split('T')[0],
          expectedDeliveryDate: completeOrder.expectedDeliveryDate,
          totalAmount: completeOrder.totalAmount || '0.00',
          notes: completeOrder.notes,
          supplierName: completeOrder.supplierName || 'N/A',
          supplierEmail: completeOrder.supplierEmail,
          supplierPhone: completeOrder.supplierPhone,
          locationAddress: completeOrder.locationAddress,
          locationCity: completeOrder.locationCity,
          locationState: completeOrder.locationState,
          locationPostalCode: completeOrder.locationPostalCode,
          locationCountry: completeOrder.locationCountry,
          warehouseName: completeOrder.warehouseName || 'N/A',
          warehouseAddress: completeOrder.warehouseAddress || 'N/A',
          createdByName: completeOrder.createdByName,
          items: orderItems.map(item => ({
            productSku: item.productSku || 'N/A',
            productName: item.productName || 'N/A',
            orderedQuantity: item.orderedQuantity,
            unitCost: item.unitCost || '0.00',
            totalCost: item.totalCost || '0.00',
            notes: item.notes
          }))
        },
        currentUser?.id || ''
      );
      documentInfo = result;
      console.log('[PO Document Generated]', result);
    } catch (docError) {
      console.error('Error generating PO document:', docError);
    }

    res.status(201).json({
      success: true,
      data: {
        ...completeOrder,
        items: orderItems,
        document: documentInfo
      },
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
    const userId = req.user!.id;
    const { id } = req.params;
    const updateData = req.body;

    const [existingOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.tenantId, tenantId)
      ));

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

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

    const isApproved = updateData.status === 'approved' && existingOrder.status !== 'approved';

    if (isApproved) {
      try {
        const [completeOrder] = await db
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
            locationState: supplierLocations.state,
            locationPostalCode: supplierLocations.postalCode,
            locationCountry: supplierLocations.country,
            warehouseId: purchaseOrders.warehouseId,
            warehouseName: warehouses.name,
            warehouseAddress: warehouses.address,
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
          .leftJoin(warehouses, eq(purchaseOrders.warehouseId, warehouses.id))
          .leftJoin(user, eq(purchaseOrders.createdBy, user.id))
          .where(eq(purchaseOrders.id, id));

        const orderItems = await db
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
          })
          .from(purchaseOrderItems)
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(eq(purchaseOrderItems.purchaseOrderId, id));

        await PODocumentGenerator.regenerateDocument(
          {
            id: completeOrder.id || id,
            tenantId: completeOrder.tenantId || tenantId,
            orderNumber: completeOrder.orderNumber || '',
            orderDate: completeOrder.orderDate || new Date().toISOString().split('T')[0],
            expectedDeliveryDate: completeOrder.expectedDeliveryDate,
            totalAmount: completeOrder.totalAmount || '0.00',
            notes: completeOrder.notes,
            supplierName: completeOrder.supplierName || 'N/A',
            supplierEmail: completeOrder.supplierEmail,
            supplierPhone: completeOrder.supplierPhone,
            locationAddress: completeOrder.locationAddress,
            locationCity: completeOrder.locationCity,
            locationState: completeOrder.locationState,
            locationPostalCode: completeOrder.locationPostalCode,
            locationCountry: completeOrder.locationCountry,
            warehouseName: completeOrder.warehouseName || 'N/A',
            warehouseAddress: completeOrder.warehouseAddress || 'N/A',
            createdByName: completeOrder.createdByName,
            items: orderItems.map(item => ({
              productSku: item.productSku || 'N/A',
              productName: item.productName || 'N/A',
              orderedQuantity: item.orderedQuantity,
              unitCost: item.unitCost || '0.00',
              totalCost: item.totalCost || '0.00',
              notes: item.notes
            }))
          },
          userId
        );
        console.log('[PO Document Regenerated on Approval]', id);
      } catch (docError) {
        console.error('Error regenerating PO document on approval:', docError);
      }
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
