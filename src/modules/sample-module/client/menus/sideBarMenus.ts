import { Puzzle } from 'lucide-react';

export const sampleModuleSidebarMenus = {
  id: "sample-module",
  title: "Sample Module",
  url: "/console/modules/sample-module",
  icon: Puzzle,
  roles: "ADMIN",
  permissions: "sample-module.view",
  items: [
    {
      id: "list",
      title: "Item List",
      url: "/console/modules/sample-module",
      roles: "ADMIN",
      permissions: "sample-module.view",
    },
  ],
};