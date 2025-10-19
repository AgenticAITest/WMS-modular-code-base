import { RouteObject } from 'react-router';
import WarehouseSetupList from '../pages/WarehouseSetupList';
import WarehouseSetupAdd from '../pages/WarehouseSetupAdd';
import WarehouseSetupManagement from '../pages/WarehouseSetupManagement';
// TODO: Import other pages when created
// import WarehouseSetupView from '../pages/WarehouseSetupView';
// import WarehouseSetupEdit from '../pages/WarehouseSetupEdit';

export const warehouseSetupReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: WarehouseSetupList },
      { path: 'add', Component: WarehouseSetupAdd },
      { path: 'management', Component: WarehouseSetupManagement },
      // TODO: Uncomment when pages are created
      // { path: ':id', Component: WarehouseSetupView },
      // { path: ':id/edit', Component: WarehouseSetupEdit },
    ]
  };
};
