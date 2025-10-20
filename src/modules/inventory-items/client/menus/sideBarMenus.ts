import { Puzzle } from 'lucide-react';

export const inventoryItemsSidebarMenus = {
    id: 'inventory-items',
    title: 'Inventory Items',
    url: '/console/modules/inventory-items',
    icon: Puzzle, // TODO: Change to appropriate icon
    roles: 'ADMIN', 
    permissions: ['inventory-items.view'],
    items: [
      {
        id: "inventory-items-list",
        title: "Inventory Items List",
        url: "/console/modules/inventory-items",
        roles: "ADMIN",
        permissions: "inventory-items.view",
      },
    ],
  };
