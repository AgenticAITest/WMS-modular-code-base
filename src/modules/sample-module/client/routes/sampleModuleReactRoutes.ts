import SampleModuleAdd from '../pages/SampleModuleAdd';
import SampleModuleDetail from '../pages/SampleModuleDetail';
import SampleModuleEdit from '../pages/SampleModuleEdit';
import SampleModuleList from '../pages/SampleModuleList';

export const sampleModuleReactRoutes = (basePath = "modules/sample-module") => ({
  path: basePath,
  children: [
    { index: true, Component: SampleModuleList },
    { path: "add", Component: SampleModuleAdd },
    { path: ":id", Component: SampleModuleDetail },
    { path: ":id/edit", Component: SampleModuleEdit },
  ]
});