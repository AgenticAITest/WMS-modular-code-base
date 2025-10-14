import express from 'express';
import { db } from '@server/lib/db';
import { productTypes, packageTypes, products } from '../lib/db/schemas/masterData';
import { authenticated, authorized } from '@server/middleware/authMiddleware';
import { eq, and, desc, count, ilike } from 'drizzle-orm';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import crypto from 'crypto';

const router = express.Router();
router.use(authenticated());
router.use(checkModuleAuthorization('master-data'));

// ================================================================================
// PRODUCT TYPES ROUTES
// ================================================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductType:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/modules/master-data/product-types:
 *   get:
 *     summary: Get all product types
 *     tags: [Master Data - Product Types]
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
 *         description: List of product types
 *       401:
 *         description: Unauthorized
 */
router.get('/product-types', authorized('ADMIN', 'master-data.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(productTypes.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(ilike(productTypes.name, `%${search}%`));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(productTypes)
      .where(and(...whereConditions));

    const data = await db
      .select()
      .from(productTypes)
      .where(and(...whereConditions))
      .orderBy(desc(productTypes.createdAt))
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
    console.error('Error fetching product types:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/product-types/{id}:
 *   get:
 *     summary: Get a product type by ID
 *     tags: [Master Data - Product Types]
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
 *         description: Product type found
 *       404:
 *         description: Product type not found
 */
router.get('/product-types/:id', authorized('ADMIN', 'master-data.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(productTypes)
      .where(and(eq(productTypes.id, id), eq(productTypes.tenantId, tenantId)));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching product type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/product-types:
 *   post:
 *     summary: Create a new product type
 *     tags: [Master Data - Product Types]
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
 *               category:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product type created successfully
 */
router.post('/product-types', authorized('ADMIN', 'master-data.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { name, description, category, isActive } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const [newRecord] = await db
      .insert(productTypes)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        name,
        description,
        category,
        isActive: isActive ?? true,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Product type created successfully',
    });
  } catch (error) {
    console.error('Error creating product type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/product-types/{id}:
 *   put:
 *     summary: Update a product type
 *     tags: [Master Data - Product Types]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product type updated successfully
 */
router.put('/product-types/:id', authorized('ADMIN', 'master-data.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const { name, description, category, isActive } = req.body;

    const [updated] = await db
      .update(productTypes)
      .set({ name, description, category, isActive })
      .where(and(eq(productTypes.id, id), eq(productTypes.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found',
      });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Product type updated successfully',
    });
  } catch (error) {
    console.error('Error updating product type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/product-types/{id}:
 *   delete:
 *     summary: Delete a product type
 *     tags: [Master Data - Product Types]
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
 *         description: Product type deleted successfully
 */
router.delete('/product-types/:id', authorized('ADMIN', 'master-data.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(productTypes)
      .where(and(eq(productTypes.id, id), eq(productTypes.tenantId, tenantId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Product type not found',
      });
    }

    res.json({
      success: true,
      message: 'Product type deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// ================================================================================
// PACKAGE TYPES ROUTES
// ================================================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     PackageType:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         unitsPerPackage:
 *           type: integer
 *         barcode:
 *           type: string
 *         dimensions:
 *           type: string
 *         weight:
 *           type: number
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/modules/master-data/package-types:
 *   get:
 *     summary: Get all package types
 *     tags: [Master Data - Package Types]
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
 *         description: List of package types
 */
router.get('/package-types', authorized('ADMIN', 'master-data.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(packageTypes.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(ilike(packageTypes.name, `%${search}%`));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(packageTypes)
      .where(and(...whereConditions));

    const data = await db
      .select()
      .from(packageTypes)
      .where(and(...whereConditions))
      .orderBy(desc(packageTypes.createdAt))
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
    console.error('Error fetching package types:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/package-types/{id}:
 *   get:
 *     summary: Get a package type by ID
 *     tags: [Master Data - Package Types]
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
 *         description: Package type found
 */
router.get('/package-types/:id', authorized('ADMIN', 'master-data.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(packageTypes)
      .where(and(eq(packageTypes.id, id), eq(packageTypes.tenantId, tenantId)));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Package type not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching package type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/package-types:
 *   post:
 *     summary: Create a new package type
 *     tags: [Master Data - Package Types]
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
 *               unitsPerPackage:
 *                 type: integer
 *               barcode:
 *                 type: string
 *               dimensions:
 *                 type: string
 *               weight:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Package type created successfully
 */
router.post('/package-types', authorized('ADMIN', 'master-data.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { name, description, unitsPerPackage, barcode, dimensions, weight, isActive } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const [newRecord] = await db
      .insert(packageTypes)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        name,
        description,
        unitsPerPackage,
        barcode,
        dimensions,
        weight,
        isActive: isActive ?? true,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Package type created successfully',
    });
  } catch (error) {
    console.error('Error creating package type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/package-types/{id}:
 *   put:
 *     summary: Update a package type
 *     tags: [Master Data - Package Types]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               unitsPerPackage:
 *                 type: integer
 *               barcode:
 *                 type: string
 *               dimensions:
 *                 type: string
 *               weight:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Package type updated successfully
 */
router.put('/package-types/:id', authorized('ADMIN', 'master-data.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const { name, description, unitsPerPackage, barcode, dimensions, weight, isActive } = req.body;

    const [updated] = await db
      .update(packageTypes)
      .set({ name, description, unitsPerPackage, barcode, dimensions, weight, isActive })
      .where(and(eq(packageTypes.id, id), eq(packageTypes.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Package type not found',
      });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Package type updated successfully',
    });
  } catch (error) {
    console.error('Error updating package type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/package-types/{id}:
 *   delete:
 *     summary: Delete a package type
 *     tags: [Master Data - Package Types]
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
 *         description: Package type deleted successfully
 */
router.delete('/package-types/:id', authorized('ADMIN', 'master-data.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(packageTypes)
      .where(and(eq(packageTypes.id, id), eq(packageTypes.tenantId, tenantId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Package type not found',
      });
    }

    res.json({
      success: true,
      message: 'Package type deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting package type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// ================================================================================
// PRODUCTS ROUTES
// ================================================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - sku
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         tenantId:
 *           type: string
 *           format: uuid
 *         inventoryTypeId:
 *           type: string
 *           format: uuid
 *         packageTypeId:
 *           type: string
 *           format: uuid
 *         sku:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         minimumStockLevel:
 *           type: integer
 *         reorderPoint:
 *           type: integer
 *         requiredTemperatureMin:
 *           type: number
 *         requiredTemperatureMax:
 *           type: number
 *         weight:
 *           type: number
 *         dimensions:
 *           type: string
 *         active:
 *           type: boolean
 *         hasExpiryDate:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/modules/master-data/products:
 *   get:
 *     summary: Get all products
 *     tags: [Master Data - Products]
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
 *         description: List of products
 */
router.get('/products', authorized('ADMIN', 'master-data.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    const whereConditions = [eq(products.tenantId, tenantId)];
    
    if (search) {
      whereConditions.push(ilike(products.name, `%${search}%`));
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(products)
      .where(and(...whereConditions));

    const data = await db
      .select()
      .from(products)
      .where(and(...whereConditions))
      .orderBy(desc(products.createdAt))
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
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Master Data - Products]
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
 *         description: Product found
 */
router.get('/products/:id', authorized('ADMIN', 'master-data.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [record] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Master Data - Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *             properties:
 *               sku:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               inventoryTypeId:
 *                 type: string
 *                 format: uuid
 *               packageTypeId:
 *                 type: string
 *                 format: uuid
 *               minimumStockLevel:
 *                 type: integer
 *               reorderPoint:
 *                 type: integer
 *               requiredTemperatureMin:
 *                 type: number
 *               requiredTemperatureMax:
 *                 type: number
 *               weight:
 *                 type: number
 *               dimensions:
 *                 type: string
 *               active:
 *                 type: boolean
 *               hasExpiryDate:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product created successfully
 */
router.post('/products', authorized('ADMIN', 'master-data.create'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const {
      sku,
      name,
      description,
      inventoryTypeId,
      packageTypeId,
      minimumStockLevel,
      reorderPoint,
      requiredTemperatureMin,
      requiredTemperatureMax,
      weight,
      dimensions,
      active,
      hasExpiryDate,
    } = req.body;

    if (!sku || !name) {
      return res.status(400).json({
        success: false,
        message: 'SKU and name are required',
      });
    }

    const [newRecord] = await db
      .insert(products)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        sku,
        name,
        description,
        inventoryTypeId,
        packageTypeId,
        minimumStockLevel,
        reorderPoint,
        requiredTemperatureMin,
        requiredTemperatureMax,
        weight,
        dimensions,
        active: active ?? true,
        hasExpiryDate: hasExpiryDate ?? false,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newRecord,
      message: 'Product created successfully',
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Master Data - Products]
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
 *             properties:
 *               sku:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               inventoryTypeId:
 *                 type: string
 *                 format: uuid
 *               packageTypeId:
 *                 type: string
 *                 format: uuid
 *               minimumStockLevel:
 *                 type: integer
 *               reorderPoint:
 *                 type: integer
 *               requiredTemperatureMin:
 *                 type: number
 *               requiredTemperatureMax:
 *                 type: number
 *               weight:
 *                 type: number
 *               dimensions:
 *                 type: string
 *               active:
 *                 type: boolean
 *               hasExpiryDate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product updated successfully
 */
router.put('/products/:id', authorized('ADMIN', 'master-data.edit'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;
    const {
      sku,
      name,
      description,
      inventoryTypeId,
      packageTypeId,
      minimumStockLevel,
      reorderPoint,
      requiredTemperatureMin,
      requiredTemperatureMax,
      weight,
      dimensions,
      active,
      hasExpiryDate,
    } = req.body;

    const [updated] = await db
      .update(products)
      .set({
        sku,
        name,
        description,
        inventoryTypeId,
        packageTypeId,
        minimumStockLevel,
        reorderPoint,
        requiredTemperatureMin,
        requiredTemperatureMax,
        weight,
        dimensions,
        active,
        hasExpiryDate,
      })
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: updated,
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @swagger
 * /api/modules/master-data/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Master Data - Products]
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
 *         description: Product deleted successfully
 */
router.delete('/products/:id', authorized('ADMIN', 'master-data.delete'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
