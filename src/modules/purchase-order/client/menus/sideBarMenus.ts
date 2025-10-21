import { Puzzle } from 'lucide-react';

export const purchaseOrderSidebarMenus = {
    id: 'purchase-order',
    title: 'Purchase Order',
    url: '/console/modules/purchase-order',
    icon: Puzzle, // TODO: Change to appropriate icon
    roles: 'ADMIN', 
    permissions: ['purchase-order.view'],
    items: [
      {
        id: "purchase-order-list",
        title: "Purchase Order List",
        url: "/console/modules/purchase-order",
        roles: "ADMIN",
        permissions: "purchase-order.view",
      },
    ],
  };
