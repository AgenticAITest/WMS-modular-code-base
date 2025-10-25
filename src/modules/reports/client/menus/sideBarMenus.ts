import { Puzzle } from 'lucide-react';

export const reportsSidebarMenus = {
    id: 'reports',
    title: 'Reports',
    url: '/console/modules/reports',
    icon: Puzzle, // TODO: Change to appropriate icon
    roles: 'ADMIN', 
    permissions: ['reports.view'],
    items: [
      {
        id: "reports-list",
        title: "Reports List",
        url: "/console/modules/reports",
        roles: "ADMIN",
        permissions: "reports.view",
      },
    ],
  };
