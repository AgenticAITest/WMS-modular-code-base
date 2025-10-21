import { db } from '@server/lib/db';
import { authenticated } from '@server/middleware/authMiddleware';
import { and, desc, eq } from 'drizzle-orm';
import express from 'express';
import { documentSequenceTracker } from '../lib/db/schemas/documentNumbering';

const router = express.Router();
router.use(authenticated());

/**
 * @swagger
 * /api/modules/document-numbering/trackers:
 *   get:
 *     summary: Get all sequence trackers
 *     tags: [Document Numbering]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: List of sequence trackers
 */
router.get('/trackers', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const documentType = req.query.documentType as string;
    const period = req.query.period as string;
    const tenantId = req.user?.activeTenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    let conditions = [eq(documentSequenceTracker.tenantId, tenantId)];

    if (documentType) {
      conditions.push(eq(documentSequenceTracker.documentType, documentType));
    }

    if (period) {
      conditions.push(eq(documentSequenceTracker.period, period));
    }

    const filterCondition = and(...conditions);

    const totalResult = await db
      .select()
      .from(documentSequenceTracker)
      .where(filterCondition);
    
    const total = { count: totalResult.length };

    const trackers = await db
      .select()
      .from(documentSequenceTracker)
      .where(filterCondition)
      .orderBy(
        desc(documentSequenceTracker.period),
        desc(documentSequenceTracker.lastGeneratedAt)
      )
      .limit(limit)
      .offset(offset);

    res.json({
      data: trackers,
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        totalPages: Math.ceil((total?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching trackers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/trackers/{id}:
 *   get:
 *     summary: Get a specific tracker
 *     tags: [Document Numbering]
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
 *         description: Tracker details
 *       404:
 *         description: Tracker not found
 */
router.get('/trackers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.activeTenantId;

    const [tracker] = await db
      .select()
      .from(documentSequenceTracker)
      .where(
        and(
          eq(documentSequenceTracker.id, id),
          eq(documentSequenceTracker.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!tracker) {
      return res.status(404).json({ error: 'Tracker not found' });
    }

    res.json({ data: tracker });
  } catch (error) {
    console.error('Error fetching tracker:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
