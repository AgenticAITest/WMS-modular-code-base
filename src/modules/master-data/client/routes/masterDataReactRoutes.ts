import { RouteObject } from 'react-router';
import MasterDataList from '../pages/MasterDataList';
import MasterDataAdd from '../pages/MasterDataAdd';
// TODO: Import other pages when created
// import MasterDataView from '../pages/MasterDataView';
// import MasterDataEdit from '../pages/MasterDataEdit';

export const masterDataReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: MasterDataList },
      { path: 'add', Component: MasterDataAdd },
      // TODO: Uncomment when pages are created
      // { path: ':id', Component: MasterDataView },
      // { path: ':id/edit', Component: MasterDataEdit },
    ]
  };
};
