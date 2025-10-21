import { RouteObject } from 'react-router';
import PurchaseOrderList from '../pages/PurchaseOrderList';
import PurchaseOrderAdd from '../pages/PurchaseOrderAdd';
// TODO: Import other pages when created
// import PurchaseOrderView from '../pages/PurchaseOrderView';
// import PurchaseOrderEdit from '../pages/PurchaseOrderEdit';

export const purchaseOrderReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: PurchaseOrderList },
      { path: 'add', Component: PurchaseOrderAdd },
      // TODO: Uncomment when pages are created
      // { path: ':id', Component: PurchaseOrderView },
      // { path: ':id/edit', Component: PurchaseOrderEdit },
    ]
  };
};
