import { RouteObject } from 'react-router';
import PurchaseOrderCreate from '../pages/PurchaseOrderCreate';
import { ApprovePOPage, ReceivePOPage, PutawayPOPage } from '../pages/PurchaseOrderPlaceholder';

export const purchaseOrderReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: PurchaseOrderCreate },
      { path: 'create', Component: PurchaseOrderCreate },
      { path: 'approve', Component: ApprovePOPage },
      { path: 'receive', Component: ReceivePOPage },
      { path: 'putaway', Component: PutawayPOPage },
    ]
  };
};
