import { RouteObject } from 'react-router';
import AuditLog from '../pages/AuditLog';

export const reportsReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { path: 'audit-log', Component: AuditLog },
    ]
  };
};
