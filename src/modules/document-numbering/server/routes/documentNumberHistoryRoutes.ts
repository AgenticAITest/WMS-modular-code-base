import { db } from '@server/lib/db';
import { authenticated } from '@server/middleware/authMiddleware';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import express from 'express';
import { documentNumberHistory } from '../lib/db/schemas/documentNumbering';

const router = express.Router();
router.use(authenticated());

/**
 * @swagger
 * /api/modules/document-numbering/history:
 *   get:
 *     summary: Get document number generation history
 *     tags: [Document Numbering]
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
 *         name: documentType
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isVoided
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of document number history
 */
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const documentType = req.query.documentType as string;
    const period = req.query.period as string;
    const search = req.query.search as string;
    const isVoided = req.query.isVoided as string;
    const tenantId = req.user?.activeTenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    let conditions = [eq(documentNumberHistory.tenantId, tenantId)];

    if (documentType) {
      conditions.push(eq(documentNumberHistory.documentType, documentType));
    }

    if (period) {
      conditions.push(eq(documentNumberHistory.period, period));
    }

    if (search) {
      conditions.push(ilike(documentNumberHistory.generatedNumber, `%${search}%`));
    }

    if (isVoided !== undefined) {
      conditions.push(eq(documentNumberHistory.isVoided, isVoided === 'true'));
    }

    const filterCondition = and(...conditions);

    const totalResult = await db
      .select()
      .from(documentNumberHistory)
      .where(filterCondition);
    
    const total = { count: totalResult.length };

    const history = await db
      .select()
      .from(documentNumberHistory)
      .where(filterCondition)
      .orderBy(desc(documentNumberHistory.generatedAt))
      .limit(limit)
      .offset(offset);

    res.json({
      data: history,
      pagination: {
        page,
        limit,
        total: total?.count || 0,
        totalPages: Math.ceil((total?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/history/{id}:
 *   get:
 *     summary: Get a specific history record
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
 *         description: History record details
 *       404:
 *         description: History record not found
 */
router.get('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.activeTenantId;

    const [record] = await db
      .select()
      .from(documentNumberHistory)
      .where(
        and(
          eq(documentNumberHistory.id, id),
          eq(documentNumberHistory.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!record) {
      return res.status(404).json({ error: 'History record not found' });
    }

    res.json({ data: record });
  } catch (error) {
    console.error('Error fetching history record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/modules/document-numbering/history/{id}/void:
 *   post:
 *     summary: Mark a document number as voided
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voidReason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Document number voided successfully
 *       404:
 *         description: History record not found
 */
router.post('/history/:id/void', async (req, res) => {
  try {
    const { id } = req.params;
    const { voidReason } = req.body;
    const tenantId = req.user?.activeTenantId;
    const userId = null;

    const [record] = await db
      .select()
      .from(documentNumberHistory)
      .where(
        and(
          eq(documentNumberHistory.id, id),
          eq(documentNumberHistory.tenantId, tenantId!)
        )
      )
      .limit(1);

    if (!record) {
      return res.status(404).json({ error: 'History record not found' });
    }

    if (record.isVoided) {
      return res.status(400).json({ error: 'Document number is already voided' });
    }

    const [updated] = await db
      .update(documentNumberHistory)
      .set({
        isVoided: true,
        voidedAt: new Date(),
        voidedBy: userId as any,
        voidReason,
        updatedAt: new Date(),
      })
      .where(eq(documentNumberHistory.id, id))
      .returning();

    res.json({ 
      message: 'Document number voided successfully',
      data: updated 
    });
  } catch (error) {
    console.error('Error voiding document number:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
