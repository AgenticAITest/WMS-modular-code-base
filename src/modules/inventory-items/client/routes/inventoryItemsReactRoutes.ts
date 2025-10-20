import { RouteObject } from 'react-router';
import InventoryItemsList from '../pages/InventoryItemsList';
import InventoryItemsAdd from '../pages/InventoryItemsAdd';
// TODO: Import other pages when created
// import InventoryItemsView from '../pages/InventoryItemsView';
// import InventoryItemsEdit from '../pages/InventoryItemsEdit';

export const inventoryItemsReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: InventoryItemsList },
      { path: 'add', Component: InventoryItemsAdd },
      // TODO: Uncomment when pages are created
      // { path: ':id', Component: InventoryItemsView },
      // { path: ':id/edit', Component: InventoryItemsEdit },
    ]
  };
};
