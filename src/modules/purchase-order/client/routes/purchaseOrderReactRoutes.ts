import { RouteObject } from 'react-router';
import PurchaseOrderCreate from '../pages/PurchaseOrderCreate';

export const purchaseOrderReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: PurchaseOrderCreate },
      { path: 'create', Component: PurchaseOrderCreate },
      { path: 'approve', Component: () => <div>Approve Purchase Order - Coming Soon</div> },
      { path: 'receive', Component: () => <div>Receive - Coming Soon</div> },
      { path: 'putaway', Component: () => <div>Putaway - Coming Soon</div> },
    ]
  };
};
