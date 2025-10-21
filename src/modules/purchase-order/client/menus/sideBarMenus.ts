import { ShoppingCart } from 'lucide-react';

export const purchaseOrderSidebarMenus = {
    id: 'purchase-order',
    title: 'Purchase Order',
    url: '/console/modules/purchase-order',
    icon: ShoppingCart,
    roles: 'ADMIN', 
    permissions: ['purchase-order.view'],
    items: [
      {
        id: "purchase-order-create",
        title: "Create Purchase Order",
        url: "/console/modules/purchase-order/create",
        roles: "ADMIN",
        permissions: "purchase-order.create",
      },
      {
        id: "purchase-order-approve",
        title: "Approve Purchase Order",
        url: "/console/modules/purchase-order/approve",
        roles: "ADMIN",
        permissions: "purchase-order.edit",
      },
      {
        id: "purchase-order-receive",
        title: "Receive",
        url: "/console/modules/purchase-order/receive",
        roles: "ADMIN",
        permissions: "purchase-order.edit",
      },
      {
        id: "purchase-order-putaway",
        title: "Putaway",
        url: "/console/modules/purchase-order/putaway",
        roles: "ADMIN",
        permissions: "purchase-order.edit",
      },
    ],
  };
