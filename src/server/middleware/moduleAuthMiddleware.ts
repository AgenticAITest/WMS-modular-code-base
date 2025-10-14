import { Request, Response, NextFunction } from 'express';
import { db } from '../lib/db';
import { moduleAuthorization } from '../lib/db/schema/module';
import { eq, and } from 'drizzle-orm';

/**
 * Middleware to check if a tenant has access to a specific module
 */
export const checkModuleAuthorization = (moduleId: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
      }

      const tenantId = req.user.activeTenantId;

      // Check if the module is authorized for this tenant
      const authorization = await db
        .select()
        .from(moduleAuthorization)
        .where(and(
          eq(moduleAuthorization.moduleId, moduleId),
          eq(moduleAuthorization.tenantId, tenantId),
          eq(moduleAuthorization.isEnabled, true)
        ))
        .limit(1);

      if (authorization.length === 0) {
        return res.status(403).json({ 
          message: 'Access denied. This module is not authorized for your tenant.',
          moduleId,
          tenantId
        });
      }

      // Module is authorized, continue to the next middleware
      next();
    } catch (error) {
      console.error('Error checking module authorization:', error);
      return res.status(500).json({ message: 'Internal server error during authorization check.' });
    }
  };
};

/**
 * Helper function to check if a module is authorized for a tenant
 */
export const isModuleAuthorized = async (moduleId: string, tenantId: string): Promise<boolean> => {
  try {
    const authorization = await db
      .select()
      .from(moduleAuthorization)
      .where(and(
        eq(moduleAuthorization.moduleId, moduleId),
        eq(moduleAuthorization.tenantId, tenantId),
        eq(moduleAuthorization.isEnabled, true)
      ))
      .limit(1);

    return authorization.length > 0;
  } catch (error) {
    console.error('Error checking module authorization:', error);
    return false;
  }
};

/**
 * Helper function to get all authorized modules for a tenant
 */
export const getAuthorizedModules = async (tenantId: string): Promise<string[]> => {
  try {
    const authorizations = await db
      .select({ moduleId: moduleAuthorization.moduleId })
      .from(moduleAuthorization)
      .where(and(
        eq(moduleAuthorization.tenantId, tenantId),
        eq(moduleAuthorization.isEnabled, true)
      ));

    return authorizations.map(auth => auth.moduleId);
  } catch (error) {
    console.error('Error getting authorized modules:', error);
    return [];
  }
};