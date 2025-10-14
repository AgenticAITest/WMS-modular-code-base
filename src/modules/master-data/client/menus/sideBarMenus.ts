import { Puzzle } from 'lucide-react';

export const masterDataSidebarMenus = {
    id: 'master-data',
    title: 'Master Data',
    url: '/console/modules/master-data',
    icon: Puzzle, // TODO: Change to appropriate icon
    roles: 'ADMIN', 
    permissions: ['master-data.view'],
    items: [
      {
        id: "master-data-list",
        title: "Master Data List",
        url: "/console/modules/master-data",
        roles: "ADMIN",
        permissions: "master-data.view",
      },
    ],
  };
