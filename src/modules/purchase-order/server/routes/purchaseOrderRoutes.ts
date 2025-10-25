import express from 'express';
import { db } from '@server/lib/db';
import { purchaseOrders, purchaseOrderItems } from '../lib/db/schemas/purchaseOrder';
import { suppliers, supplierLocations, products } from '@modules/master-data/server/lib/db/schemas/masterData';
import { inventoryItems } from '@modules/inventory-items/server/lib/db/schemas/inventoryItems';
import { warehouses } from '@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup';
import { user } from '@server/lib/db/schema/system';
import { documentNumberConfig, generatedDocuments, documentNumberHistory } from '@modules/document-numbering/server/lib/db/schemas/documentNumbering';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike, or, sql, sum, inArray } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { PODocumentGenerator } from '../services/poDocumentGenerator';
import { logAudit, getClientIp } from '@server/services/auditService';
import fs from 'fs/promises';
import path from 'path';

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
 *         - deliveryMethod
 *         - warehouseId
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
 *           description: Optional for delivery mode, required for pickup mode
 *         deliveryMethod:
 *           type: string
 *           enum: [delivery, pickup]
 *           default: delivery
 *           description: Delivery method - 'delivery' (supplier delivers) or 'pickup' (tenant picks up)
 *         warehouseId:
 *           type: string
 *           format: uuid
 *           description: Destination warehouse (required for both delivery and pickup)
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
 * /api/modules/purchase-order/preview-html:
 *   post:
 *     summary: Generate HTML preview for purchase order (without saving)
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
 *               - orderDate
 *               - deliveryMethod
 *               - warehouseId
 *               - items
 *             properties:
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               supplierLocationId:
 *                 type: string
 *                 format: uuid
 *               orderDate:
 *                 type: string
 *                 format: date
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *               deliveryMethod:
 *                 type: string
 *                 enum: [delivery, pickup]
 *               warehouseId:
 *                 type: string
 *                 format: uuid
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
 *                       type: number
 *                     unitCost:
 *                       type: number
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: HTML preview generated successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/preview-html', authorized('ADMIN', 'purchase-order.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const userId = req.user!.id;
    const {
      supplierId,
      supplierLocationId,
      orderDate,
      expectedDeliveryDate,
      deliveryMethod,
      warehouseId,
      notes,
      items
    } = req.body;

    console.log('[Preview HTML] Request:', { supplierId, warehouseId, itemsCount: items?.length });
    console.log('[Preview HTML] Schema checks:', {
      suppliers: typeof suppliers,
      suppliersName: typeof suppliers?.name,
      warehouses: typeof warehouses,
      user: typeof user
    });

    // Fetch preview number
    let previewNumber = 'PREVIEW-GENERATING';
    try {
      const previewResponse = await axios.post(
        'http://localhost:5000/api/modules/document-numbering/preview',
        { documentType: 'PO' },
        { headers: { Authorization: req.headers.authorization } }
      );
      previewNumber = previewResponse.data.previewNumber || 'PREVIEW-0001';
    } catch (error) {
      console.error('Error fetching preview number:', error);
    }

    // Fetch supplier info
    console.log('[Preview HTML] Fetching supplier...');
    let supplierData;
    try {
      const results = await db
        .select()
        .from(suppliers)
        .where(and(
          eq(suppliers.id, supplierId),
          eq(suppliers.tenantId, tenantId)
        ))
        .limit(1);
      supplierData = results[0];
    } catch (err) {
      console.error('[Preview HTML] ERROR fetching supplier:', err);
      throw err;
    }

    if (!supplierData) {
      console.error('[Preview HTML] Supplier not found');
      return res.status(404).json({ error: 'Supplier not found' });
    }
    console.log('[Preview HTML] Supplier fetched');

    // Fetch supplier location if provided
    let locationData = null;
    if (supplierLocationId) {
      console.log('[Preview HTML] Fetching supplier location...');
      try {
        const results = await db
          .select()
          .from(supplierLocations)
          .where(and(
            eq(supplierLocations.id, supplierLocationId),
            eq(supplierLocations.supplierId, supplierId),
            eq(supplierLocations.tenantId, tenantId)
          ))
          .limit(1);
        locationData = results[0];
      } catch (err) {
        console.error('[Preview HTML] ERROR fetching supplier location:', err);
        throw err;
      }
      console.log('[Preview HTML] Supplier location fetched');
    }

    // Fetch warehouse info
    console.log('[Preview HTML] Fetching warehouse...');
    let warehouseData;
    try {
      const results = await db
        .select()
        .from(warehouses)
        .where(and(
          eq(warehouses.id, warehouseId),
          eq(warehouses.tenantId, tenantId)
        ))
        .limit(1);
      warehouseData = results[0];
    } catch (err) {
      console.error('[Preview HTML] ERROR fetching warehouse:', err);
      throw err;
    }
    console.log('[Preview HTML] Warehouse fetched');

    // Fetch user info
    console.log('[Preview HTML] Fetching user...');
    let userData;
    try {
      const results = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      userData = results[0];
    } catch (err) {
      console.error('[Preview HTML] ERROR fetching user:', err);
      throw err;
    }
    console.log('[Preview HTML] User fetched');

    // Fetch product details for all items
    console.log('[Preview HTML] Fetching products...');
    const productIds = items.map((item: any) => item.productId).filter(Boolean);
    
    let productDetails: any[] = [];
    if (productIds.length > 0) {
      try {
        productDetails = await db
          .select()
          .from(products)
          .where(and(
            eq(products.tenantId, tenantId),
            inArray(products.id, productIds)
          ));
      } catch (err) {
        console.error('[Preview HTML] ERROR fetching products:', err);
        throw err;
      }
    }
    console.log('[Preview HTML] Products fetched:', productDetails.length);

    const productMap = new Map(productDetails.map(p => [p.id, p]));

    // Build item data with product details
    const itemsWithDetails = items.map((item: any) => {
      const product = productMap.get(item.productId);
      const totalCost = item.orderedQuantity * item.unitCost;
      return {
        productSku: product?.sku || 'N/A',
        productName: product?.name || 'Unknown Product',
        orderedQuantity: item.orderedQuantity,
        unitCost: item.unitCost.toString(),
        totalCost: totalCost.toString(),
        notes: item.notes || null
      };
    });

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.orderedQuantity * item.unitCost);
    }, 0);

    // Build PO data for HTML generation
    const poData = {
      id: 'preview',
      tenantId,
      orderNumber: previewNumber,
      orderDate,
      expectedDeliveryDate: expectedDeliveryDate || null,
      deliveryMethod: deliveryMethod || 'delivery',
      totalAmount: totalAmount.toString(),
      notes: notes || null,
      supplierName: supplierData.name,
      supplierEmail: supplierData.email,
      supplierPhone: supplierData.phone,
      locationAddress: locationData?.address || null,
      locationCity: locationData?.city || null,
      locationState: locationData?.state || null,
      locationPostalCode: locationData?.postalCode || null,
      locationCountry: locationData?.country || null,
      warehouseName: warehouseData?.name || null,
      warehouseAddress: warehouseData?.address || null,
      warehouseCity: null, // Warehouse table doesn't have city field
      createdByName: userData?.fullname || null,
      items: itemsWithDetails
    };

    // Generate HTML using the same generator
    const htmlContent = PODocumentGenerator.generateHTML(poData);

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (error) {
    console.error('Error generating HTML preview:', error);
    res.status(500).json({ error: 'Failed to generate HTML preview' });
  }
});

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

    // Build search condition with proper parameterization to prevent SQL injection
    const searchPattern = search ? `%${search}%` : null;

    // Use CTE (Common Table Expression) in a single SQL statement
    // This solves the connection pooling issue with temp views
    const query = searchPattern
      ? sql`
        WITH tenant_products AS (
          SELECT id, sku, name, minimum_stock_level
          FROM products
          WHERE tenant_id = ${tenantId}
            AND (sku ILIKE ${searchPattern} OR name ILIKE ${searchPattern})
        ),
        tenant_inventory AS (
          SELECT product_id, SUM(available_quantity) AS available_quantity
          FROM inventory_items
          WHERE tenant_id = ${tenantId}
          GROUP BY product_id
        )
        SELECT 
          p.id as product_id,
          p.sku,
          p.name,
          p.minimum_stock_level,
          COALESCE(i.available_quantity, 0) as total_available_stock
        FROM tenant_products p
        LEFT JOIN tenant_inventory i ON i.product_id = p.id
        ORDER BY p.sku
        LIMIT ${limit}
        OFFSET ${offset}
      `
      : sql`
        WITH tenant_products AS (
          SELECT id, sku, name, minimum_stock_level
          FROM products
          WHERE tenant_id = ${tenantId}
        ),
        tenant_inventory AS (
          SELECT product_id, SUM(available_quantity) AS available_quantity
          FROM inventory_items
          WHERE tenant_id = ${tenantId}
          GROUP BY product_id
        )
        SELECT 
          p.id as product_id,
          p.sku,
          p.name,
          p.minimum_stock_level,
          COALESCE(i.available_quantity, 0) as total_available_stock
        FROM tenant_products p
        LEFT JOIN tenant_inventory i ON i.product_id = p.id
        ORDER BY p.sku
        LIMIT ${limit}
        OFFSET ${offset}
      `;

    // Get total count with the same CTE pattern
    const countQuery = searchPattern
      ? sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE tenant_id = ${tenantId}
          AND (sku ILIKE ${searchPattern} OR name ILIKE ${searchPattern})
      `
      : sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE tenant_id = ${tenantId}
      `;

    const countResult = await db.execute<{ count: string }>(countQuery);
    const totalCount = parseInt(countResult[0].count);

    const data = await db.execute<{
      product_id: string;
      sku: string;
      name: string;
      minimum_stock_level: number;
      total_available_stock: number;
    }>(query);

    // Transform raw result to match expected format
    const formattedData = data.map(row => ({
      productId: row.product_id,
      sku: row.sku,
      name: row.name,
      minimumStockLevel: row.minimum_stock_level,
      totalAvailableStock: row.total_available_stock,
    }));

    console.log(`✅ Products query returned ${formattedData.length} products for tenant ${tenantId}`);

    res.json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
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

/**
 * @swagger
 * /api/modules/purchase-order/preview:
 *   post:
 *     summary: Generate PO HTML preview without saving
 *     description: Generates HTML preview of purchase order for confirmation modal
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
 *               - warehouseId
 *               - items
 *             properties:
 *               supplierId:
 *                 type: string
 *               supplierLocationId:
 *                 type: string
 *               deliveryMethod:
 *                 type: string
 *                 enum: [delivery, pickup]
 *               warehouseId:
 *                 type: string
 *               expectedDeliveryDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: HTML preview generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 html:
 *                   type: string
 */
router.post('/preview', authorized('ADMIN', 'purchase-order.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const username = req.user!.username;
    const {
      supplierId,
      supplierLocationId,
      deliveryMethod = 'delivery',
      warehouseId,
      expectedDeliveryDate,
      notes,
      items = []
    } = req.body;

    // Validation
    if (!supplierId || !warehouseId || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for preview'
      });
    }

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => {
      const itemTotal = item.unitCost && item.orderedQuantity
        ? parseFloat(item.unitCost) * parseInt(item.orderedQuantity)
        : 0;
      return sum + itemTotal;
    }, 0);

    // Get preview number with fallback
    let orderNumber = 'PREVIEW-GENERATING';
    try {
      const docNumberResponse = await axios.post(
        'http://localhost:5000/api/modules/document-numbering/preview',
        {
          documentType: 'PO'
        },
        {
          headers: {
            Authorization: req.headers.authorization,
          },
        }
      );
      orderNumber = docNumberResponse.data.previewNumber;
    } catch (error) {
      console.error('Error fetching preview number:', error);
      orderNumber = `PREVIEW-${Date.now()}`;
    }
    const orderDate = new Date().toISOString().split('T')[0];

    // Fetch supplier info
    const [supplier] = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        email: suppliers.email,
        phone: suppliers.phone
      })
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.tenantId, tenantId)))
      .limit(1);

    // Fetch supplier location if provided
    let supplierLocation = null;
    if (supplierLocationId) {
      const [location] = await db
        .select({
          id: supplierLocations.id,
          address: supplierLocations.address,
          city: supplierLocations.city,
          state: supplierLocations.state,
          postalCode: supplierLocations.postalCode,
          country: supplierLocations.country
        })
        .from(supplierLocations)
        .where(and(
          eq(supplierLocations.id, supplierLocationId),
          eq(supplierLocations.supplierId, supplierId)
        ))
        .limit(1);
      supplierLocation = location;
    }

    // Fetch warehouse info
    const [warehouse] = await db
      .select({
        id: warehouses.id,
        name: warehouses.name,
        address: warehouses.address
      })
      .from(warehouses)
      .where(and(eq(warehouses.id, warehouseId), eq(warehouses.tenantId, tenantId)))
      .limit(1);

    // Fetch user info
    const [currentUser] = await db
      .select({
        id: user.id,
        fullname: user.fullname
      })
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    // Fetch product details for items
    const itemsWithDetails = await Promise.all(
      items.map(async (item: any) => {
        const [product] = await db
          .select({
            id: products.id,
            sku: products.sku,
            name: products.name
          })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        return {
          productSku: product?.sku ?? 'N/A',
          productName: product?.name ?? 'N/A',
          orderedQuantity: item.orderedQuantity ?? 0,
          unitCost: item.unitCost?.toString() ?? '0.00',
          totalCost: item.unitCost && item.orderedQuantity
            ? (parseFloat(item.unitCost) * parseInt(item.orderedQuantity)).toFixed(2)
            : '0.00',
          notes: item.notes?.toString() ?? null
        };
      })
    );

    // Generate preview HTML
    const previewHTML = PODocumentGenerator.generatePreview({
      id: 'preview-' + Date.now(), // Temporary ID for preview
      tenantId,
      orderNumber,
      orderDate,
      expectedDeliveryDate: expectedDeliveryDate ?? null,
      deliveryMethod,
      totalAmount: totalAmount.toFixed(2),
      notes: notes ?? null,
      supplierName: supplier?.name || 'N/A',
      supplierEmail: supplier?.email ?? null,
      supplierPhone: supplier?.phone ?? null,
      locationAddress: supplierLocation?.address ?? null,
      locationCity: supplierLocation?.city ?? null,
      locationState: supplierLocation?.state ?? null,
      locationPostalCode: supplierLocation?.postalCode ?? null,
      locationCountry: supplierLocation?.country ?? null,
      warehouseName: warehouse?.name || 'N/A',
      warehouseAddress: warehouse?.address ?? null,
      warehouseCity: null,
      createdByName: currentUser?.fullname ?? null,
      items: itemsWithDetails
    });

    res.json({
      success: true,
      html: previewHTML
    });
  } catch (error: any) {
    console.error('Error generating PO preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PO preview',
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
      // For pending status, also filter by workflowState='approve' to show only unapproved POs
      if (statusFilter === 'pending') {
        whereConditions.push(eq(purchaseOrders.workflowState, 'approve'));
      }
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
        deliveryMethod: purchaseOrders.deliveryMethod,
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
        deliveryMethod: purchaseOrders.deliveryMethod,
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
      deliveryMethod = 'delivery',
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

    if (!deliveryMethod || !['delivery', 'pickup'].includes(deliveryMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Delivery method must be either "delivery" or "pickup"',
      });
    }

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: 'Destination warehouse is required',
      });
    }

    if (deliveryMethod === 'pickup' && !supplierLocationId) {
      return res.status(400).json({
        success: false,
        message: 'Supplier location is required for pickup mode',
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

    // Use transaction to ensure atomicity - if any step fails, rollback everything
    const result = await db.transaction(async (tx) => {
      // Create purchase order with status pending and workflowState approve
      const [newOrder] = await tx
        .insert(purchaseOrders)
        .values({
          id: orderId,
          tenantId,
          orderNumber,
          supplierId,
          supplierLocationId: supplierLocationId || null,
          deliveryMethod,
          warehouseId,
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
        throw new Error('Failed to update document history');
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

      await tx.insert(purchaseOrderItems).values(itemsToInsert);

      // Fetch the complete PO with supplier, warehouse and items for response
      const [completeOrder] = await tx
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
          deliveryMethod: purchaseOrders.deliveryMethod,
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

      const orderItems = await tx
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

      // Generate document - if this fails, transaction will rollback
      const documentInfo = await PODocumentGenerator.generateAndSave(
        {
          id: completeOrder.id || orderId,
          tenantId: completeOrder.tenantId || tenantId,
          orderNumber: completeOrder.orderNumber || orderNumber,
          orderDate: completeOrder.orderDate || new Date().toISOString().split('T')[0],
          expectedDeliveryDate: completeOrder.expectedDeliveryDate,
          deliveryMethod: completeOrder.deliveryMethod || 'delivery',
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
          warehouseCity: null, // Warehouse table doesn't have city field
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

      console.log('[PO Document Generated]', documentInfo);

      return {
        completeOrder,
        orderItems,
        documentInfo
      };
    });

    // Log audit trail
    await logAudit({
      tenantId,
      userId: currentUser?.id,
      module: 'purchase-order',
      action: 'create',
      resourceType: 'purchase_order',
      resourceId: orderId,
      description: `Created purchase order ${orderNumber} for supplier ${result.completeOrder.supplierName} with ${items.length} item(s)`,
      changedFields: {
        orderNumber,
        supplierId,
        supplierName: result.completeOrder.supplierName,
        warehouseId,
        warehouseName: result.completeOrder.warehouseName,
        deliveryMethod,
        totalAmount: totalAmount.toFixed(2),
        itemCount: items.length,
        status: 'pending',
        workflowState: 'approve'
      },
      ipAddress: getClientIp(req),
    });

    res.status(201).json({
      success: true,
      data: {
        ...result.completeOrder,
        items: result.orderItems,
        document: result.documentInfo
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

    // Only allow editing if PO is still unapproved
    if (existingOrder.status !== 'pending' || existingOrder.workflowState !== 'approve') {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit purchase order: only unapproved purchase orders can be edited',
      });
    }

    // Validate deliveryMethod if it's being updated
    if (updateData.deliveryMethod && !['delivery', 'pickup'].includes(updateData.deliveryMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Delivery method must be either "delivery" or "pickup"',
      });
    }

    // Validate pickup mode requirements
    const finalDeliveryMethod = updateData.deliveryMethod || existingOrder.deliveryMethod;
    const finalSupplierLocationId = updateData.supplierLocationId !== undefined 
      ? updateData.supplierLocationId 
      : existingOrder.supplierLocationId;

    if (finalDeliveryMethod === 'pickup' && !finalSupplierLocationId) {
      return res.status(400).json({
        success: false,
        message: 'Supplier location is required for pickup mode',
      });
    }

    // Validate warehouseId requirement
    if (updateData.warehouseId === null || updateData.warehouseId === '') {
      return res.status(400).json({
        success: false,
        message: 'Warehouse is required',
      });
    }

    delete updateData.id;
    delete updateData.tenantId;
    delete updateData.createdAt;
    delete updateData.createdBy;

    // Track changed fields for audit log
    const changedFields: any = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== existingOrder[key as keyof typeof existingOrder]) {
        changedFields[key] = {
          from: existingOrder[key as keyof typeof existingOrder],
          to: updateData[key]
        };
      }
    });

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
            deliveryMethod: purchaseOrders.deliveryMethod,
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
            deliveryMethod: completeOrder.deliveryMethod || 'delivery',
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
            warehouseCity: null, // Warehouse table doesn't have city field
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

    // Log audit trail
    if (Object.keys(changedFields).length > 0) {
      await logAudit({
        tenantId,
        userId,
        module: 'purchase-order',
        action: 'update',
        resourceType: 'purchase_order',
        resourceId: id,
        description: `Updated unapproved purchase order ${existingOrder.orderNumber}`,
        changedFields,
        ipAddress: getClientIp(req),
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
    const userId = req.user!.id;
    const { id } = req.params;

    // Fetch existing order first to check if it's unapproved
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

    // Only allow deleting if PO is still unapproved
    if (existingOrder.status !== 'pending' || existingOrder.workflowState !== 'approve') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete purchase order: only unapproved purchase orders can be deleted',
      });
    }

    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // 1. Find and delete generated document files from filesystem
      const [generatedDoc] = await tx
        .select()
        .from(generatedDocuments)
        .where(and(
          eq(generatedDocuments.tenantId, tenantId),
          eq(generatedDocuments.referenceType, 'purchase_order'),
          eq(generatedDocuments.referenceId, id)
        ));

      if (generatedDoc) {
        // Delete physical file from filesystem
        try {
          const files = generatedDoc.files as any;
          if (files?.html?.path) {
            const filePath = path.join(process.cwd(), 'storage', 'purchase-order', files.html.path.replace('storage/purchase-order/', ''));
            await fs.unlink(filePath);
            console.log(`Deleted file: ${filePath}`);
          }
        } catch (fileError) {
          console.error('Error deleting physical file:', fileError);
          // Continue with database deletion even if file deletion fails
        }

        // Delete generated document record
        await tx
          .delete(generatedDocuments)
          .where(eq(generatedDocuments.id, generatedDoc.id));
      }

      // 2. Delete document number history
      await tx
        .delete(documentNumberHistory)
        .where(and(
          eq(documentNumberHistory.tenantId, tenantId),
          eq(documentNumberHistory.documentId, id)
        ));

      // 3. Delete purchase order items (should cascade, but explicit is better)
      await tx
        .delete(purchaseOrderItems)
        .where(and(
          eq(purchaseOrderItems.purchaseOrderId, id),
          eq(purchaseOrderItems.tenantId, tenantId)
        ));

      // 4. Delete purchase order
      await tx
        .delete(purchaseOrders)
        .where(and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.tenantId, tenantId)
        ));
    });

    // Log audit trail
    await logAudit({
      tenantId,
      userId,
      module: 'purchase-order',
      action: 'delete',
      resourceType: 'purchase_order',
      resourceId: id,
      description: `Deleted unapproved purchase order ${existingOrder.orderNumber}`,
      ipAddress: getClientIp(req),
    });

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
