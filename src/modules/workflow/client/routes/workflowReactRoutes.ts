import { RouteObject } from 'react-router';
import WorkflowList from '../pages/WorkflowList';
import WorkflowAdd from '../pages/WorkflowAdd';
// TODO: Import other pages when created
// import WorkflowView from '../pages/WorkflowView';
// import WorkflowEdit from '../pages/WorkflowEdit';

export const workflowReactRoutes = (basePath: string): RouteObject => {
  return {
    path: basePath,
    children: [
      { index: true, Component: WorkflowList },
      { path: 'add', Component: WorkflowAdd },
      // TODO: Uncomment when pages are created
      // { path: ':id', Component: WorkflowView },
      // { path: ':id/edit', Component: WorkflowEdit },
    ]
  };
};
