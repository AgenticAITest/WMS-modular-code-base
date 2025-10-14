import express from 'express';
import { db } from '../../lib/db';
import { moduleAuthorization, ModuleAuthorization } from '../../lib/db/schema/module';
import { moduleRegistry } from '../../lib/db/schema/module';
import { eq, and, desc } from 'drizzle-orm';
import { authenticated, authorized, hasPermissions } from '../../middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
router.use(authenticated());

/**
 * @swagger
 * components:
 *   schemas:
 *     ModuleAuthorization:
 *       type: object
 *       required:
 *         - moduleId
 *         - moduleName
 *         - isEnabled
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the module authorization
 *         moduleId:
 *           type: string
 *           maxLength: 255
 *           description: ID of the module
 *         moduleName:
 *           type: string
 *           maxLength: 255
 *           description: Name of the module
 *         tenantId:
 *           type: string
 *           format: uuid
 *           description: ID of the tenant
 *         isEnabled:
 *           type: boolean
 *           description: Whether the module is enabled for the tenant
 *         enabledAt:
 *           type: string
 *           format: date-time
 *           description: When the module was enabled
 *         enabledBy:
 *           type: string
 *           description: Who enabled the module
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
 * /api/system/module-authorization:
 *   get:
 *     summary: Get all module authorizations for the current tenant
 *     tags: [Module Authorization]
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
 *         description: List of module authorizations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ModuleAuthorization'
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
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const tenantId = req.user!.activeTenantId;

    const authorizations = await db
      .select()
      .from(moduleAuthorization)
      .where(eq(moduleAuthorization.tenantId, tenantId))
      .orderBy(desc(moduleAuthorization.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: moduleAuthorization.id })
      .from(moduleAuthorization)
      .where(eq(moduleAuthorization.tenantId, tenantId));

    const total = totalCount.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: authorizations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching module authorizations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/system/module-authorization/registered-modules:
 *   get:
 *     summary: Get list of registered modules that can be authorized
 *     tags: [Module Authorization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of registered modules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   moduleId:
 *                     type: string
 *                   moduleName:
 *                     type: string
 *                   description:
 *                     type: string
 *                   version:
 *                     type: string
 *                   category:
 *                     type: string
 *                   isAuthorized:
 *                     type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/registered-modules', hasPermissions('system.module.view'), async (req, res) => {
  try {
    const tenantId = req.user!.activeTenantId;

    // Get existing authorizations
    const existingAuths = await db
      .select()
      .from(moduleAuthorization)
      .where(eq(moduleAuthorization.tenantId, tenantId));

    const authMap = new Map(existingAuths.map((auth: ModuleAuthorization) => [auth.moduleId, auth]));

    // Get registered modules from database
    const registeredModulesFromDB = await db
      .select()
      .from(moduleRegistry)
      .where(eq(moduleRegistry.isActive, true))
      .orderBy(desc(moduleRegistry.createdAt));

    // Map to include authorization status
    const registeredModules = registeredModulesFromDB.map(module => ({
      moduleId: module.moduleId,
      moduleName: module.moduleName,
      description: module.description || '',
      version: module.version,
      category: module.category,
      isAuthorized: authMap.has(module.moduleId) ? authMap.get(module.moduleId)?.isEnabled || false : false
    }));

    res.json(registeredModules);
  } catch (error) {
    console.error('Error fetching registered modules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/system/module-authorization/{id}:
 *   get:
 *     summary: Get a module authorization by ID
 *     tags: [Module Authorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Module authorization ID
 *     responses:
 *       200:
 *         description: Module authorization details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModuleAuthorization'
 *       404:
 *         description: Module authorization not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/:id', hasPermissions('system.modules.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.activeTenantId;

    const authorization = await db
      .select()
      .from(moduleAuthorization)
      .where(and(eq(moduleAuthorization.id, id), eq(moduleAuthorization.tenantId, tenantId)))
      .limit(1);

    if (authorization.length === 0) {
      return res.status(404).json({ error: 'Module authorization not found' });
    }

    res.json(authorization[0]);
  } catch (error) {
    console.error('Error fetching module authorization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/system/module-authorization:
 *   post:
 *     summary: Create or update a module authorization
 *     tags: [Module Authorization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moduleId
 *               - moduleName
 *               - isEnabled
 *             properties:
 *               moduleId:
 *                 type: string
 *                 maxLength: 255
 *               moduleName:
 *                 type: string
 *                 maxLength: 255
 *               isEnabled:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Module authorization created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModuleAuthorization'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/', hasPermissions('system.module.manage'), async (req, res) => {
  try {
    const { moduleId, moduleName, isEnabled } = req.body;
    const tenantId = req.user!.activeTenantId;
    const username = req.user!.username;

    if (!moduleId || !moduleName || typeof isEnabled !== 'boolean') {
      return res.status(400).json({ error: 'moduleId, moduleName, and isEnabled are required' });
    }

    // Check if authorization already exists
    const existingAuth = await db
      .select()
      .from(moduleAuthorization)
      .where(and(
        eq(moduleAuthorization.moduleId, moduleId),
        eq(moduleAuthorization.tenantId, tenantId)
      ))
      .limit(1);

    let result;

    if (existingAuth.length > 0) {
      // Update existing authorization
      const updateData: any = {
        isEnabled,
        updatedAt: new Date(),
      };

      if (isEnabled) {
        updateData.enabledAt = new Date();
        updateData.enabledBy = username;
      } else {
        updateData.enabledAt = null;
        updateData.enabledBy = null;
      }

      [result] = await db
        .update(moduleAuthorization)
        .set(updateData)
        .where(and(
          eq(moduleAuthorization.moduleId, moduleId),
          eq(moduleAuthorization.tenantId, tenantId)
        ))
        .returning();
    } else {
      // Create new authorization
      const newAuth = {
        id: uuidv4(),
        moduleId,
        moduleName,
        tenantId,
        isEnabled,
        enabledAt: isEnabled ? new Date() : null,
        enabledBy: isEnabled ? username : null,
      };

      [result] = await db
        .insert(moduleAuthorization)
        .values(newAuth)
        .returning();
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating/updating module authorization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/system/module-authorization/toggle/{moduleId}:
 *   patch:
 *     summary: Toggle module authorization for the current tenant
 *     tags: [Module Authorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID to toggle
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moduleName
 *               - isEnabled
 *             properties:
 *               moduleName:
 *                 type: string
 *               isEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Module authorization toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModuleAuthorization'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Server error
 */
router.patch('/toggle/:moduleId', hasPermissions('system.module.manage'), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { moduleName, isEnabled } = req.body;
    const tenantId = req.user!.activeTenantId;
    const username = req.user!.username;

    if (!moduleName || typeof isEnabled !== 'boolean') {
      return res.status(400).json({ error: 'moduleName and isEnabled are required' });
    }

    // Check if authorization already exists
    const existingAuth = await db
      .select()
      .from(moduleAuthorization)
      .where(and(
        eq(moduleAuthorization.moduleId, moduleId),
        eq(moduleAuthorization.tenantId, tenantId)
      ))
      .limit(1);

    let result;

    if (existingAuth.length > 0) {
      // Update existing authorization
      const updateData: any = {
        isEnabled,
        updatedAt: new Date(),
      };

      if (isEnabled) {
        updateData.enabledAt = new Date();
        updateData.enabledBy = username;
      } else {
        updateData.enabledAt = null;
        updateData.enabledBy = null;
      }

      [result] = await db
        .update(moduleAuthorization)
        .set(updateData)
        .where(and(
          eq(moduleAuthorization.moduleId, moduleId),
          eq(moduleAuthorization.tenantId, tenantId)
        ))
        .returning();
    } else {
      // Create new authorization
      const newAuth = {
        id: uuidv4(),
        moduleId,
        moduleName,
        tenantId,
        isEnabled,
        enabledAt: isEnabled ? new Date() : null,
        enabledBy: isEnabled ? username : null,
      };

      [result] = await db
        .insert(moduleAuthorization)
        .values(newAuth)
        .returning();
    }

    res.json(result);
  } catch (error) {
    console.error('Error toggling module authorization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



export default router;