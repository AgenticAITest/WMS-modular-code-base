import { db } from '../db';
import { auditLogs } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

interface AuditLogParams {
  tenantId: string;
  userId?: string | null;
  module: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changedFields?: any;
  description?: string;
  previousState?: string;
  newState?: string;
  batchId?: string;
  status?: 'success' | 'failure';
  errorMessage?: string;
  ipAddress?: string;
}

export class AuditService {
  static async log(params: AuditLogParams) {
    try {
      await db.insert(auditLogs).values({
        id: uuidv4(),
        tenantId: params.tenantId,
        userId: params.userId || null,
        module: params.module,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        changedFields: params.changedFields || null,
        description: params.description || null,
        previousState: params.previousState || null,
        newState: params.newState || null,
        batchId: params.batchId || null,
        status: params.status || 'success',
        errorMessage: params.errorMessage || null,
        ipAddress: params.ipAddress || null,
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  static async logCreate(params: Omit<AuditLogParams, 'action' | 'previousState'>) {
    return this.log({
      ...params,
      action: 'create',
    });
  }

  static async logUpdate(params: Omit<AuditLogParams, 'action'>) {
    return this.log({
      ...params,
      action: 'update',
    });
  }

  static async logDelete(params: Omit<AuditLogParams, 'action' | 'newState'>) {
    return this.log({
      ...params,
      action: 'delete',
    });
  }

  static async logStateChange(params: Omit<AuditLogParams, 'action'> & { previousState: string; newState: string }) {
    return this.log({
      ...params,
      action: 'state_change',
    });
  }

  static async logBulkOperation(params: Omit<AuditLogParams, 'batchId'> & { itemCount: number }) {
    const batchId = uuidv4();
    const { itemCount, ...restParams } = params;
    
    return this.log({
      ...restParams,
      batchId,
      description: `${params.description || params.action} (${itemCount} items)`,
    });
  }
}

export function getClientIp(req: any): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
  }
  return req.socket?.remoteAddress;
}
