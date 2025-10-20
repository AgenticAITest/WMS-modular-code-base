import { db } from ".";
import { productTypes, packageTypes, products } from "@modules/master-data/server/lib/db/schemas/masterData";
import { inventoryItems } from "@modules/inventory-items/server/lib/db/schemas/inventoryItems";
import { tenant } from "./schema/system";
import { bins } from "@modules/warehouse-setup/server/lib/db/schemas/warehouseSetup";
import { sql } from "drizzle-orm";

async function seedMasterDataAndInventory() {
  console.log("Starting master data and inventory seeding...");

  // Get the first tenant
  const tenantsResult = await db.select({ id: tenant.id }).from(tenant).limit(1);
  if (tenantsResult.length === 0) {
    throw new Error("No tenant found! Please run the main seed script first.");
  }
  const tenantId = tenantsResult[0].id;
  console.log("Using tenant ID:", tenantId);

  // Get some bins for inventory
  const binsResult = await db.select({ id: bins.id }).from(bins).limit(10);
  const binIds = binsResult.map((bin) => bin.id);
  console.log(`Found ${binIds.length} bins for inventory items`);

  // Clear existing data
  console.log("Clearing existing master data and inventory...");
  await db.delete(inventoryItems);
  await db.delete(products);
  await db.delete(packageTypes);
  await db.delete(productTypes);

  // Seed Product Types
  console.log("Seeding product types...");
  const productTypeData = [
    {
      id: crypto.randomUUID(),
      tenantId,
      name: "Electronics",
      description: "Electronic items and components",
      category: "Technology",
      isActive: true,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      name: "Perishables",
      description: "Food and perishable goods",
      category: "Food",
      isActive: true,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      name: "Clothing",
      description: "Apparel and textile products",
      category: "Fashion",
      isActive: true,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      name: "Industrial Parts",
      description: "Machine parts and industrial components",
      category: "Manufacturing",
      isActive: true,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      name: "Pharmaceuticals",
      description: "Medical and pharmaceutical products",
      category: "Healthcare",
      isActive: true,
    },
  ];

  await db.insert(productTypes).values(productTypeData);
  console.log(`✓ Seeded ${productTypeData.length} product types`);

  // Seed Package Types
  console.log("Seeding package types...");
  const packageTypeData = [
    {
      id: crypto.randomUUID(),
      tenantId,
      name: "Carton Box",
      description: "Standard carton box for shipping",
      unitsPerPackage: 24,
      barcode: "PKG-CARTON-001",
      dimensions: "40x30x30 cm",
      weight: "0.500",
      isActive: true,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      name: "Pallet",
      description: "Standard wooden pallet",
      unitsPerPackage: 100,
      barcode: "PKG-PALLET-001",
      dimensions: "120x100x15 cm",
      weight: "25.000",
      isActive: true,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      name: "Small Box",
      description: "Small packaging box",
      unitsPerPackage: 12,
      barcode: "PKG-SMALL-001",
      dimensions: "20x15x10 cm",
      weight: "0.200",
      isActive: true,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      name: "Bulk Container",
      description: "Large bulk storage container",
      unitsPerPackage: 500,
      barcode: "PKG-BULK-001",
      dimensions: "200x100x100 cm",
      weight: "50.000",
      isActive: true,
    },
  ];

  await db.insert(packageTypes).values(packageTypeData);
  console.log(`✓ Seeded ${packageTypeData.length} package types`);

  // Seed Products
  console.log("Seeding products...");
  const productData = [
    {
      id: crypto.randomUUID(),
      tenantId,
      inventoryTypeId: productTypeData[0].id, // Electronics
      packageTypeId: packageTypeData[2].id, // Small Box
      sku: "ELEC-LAP-001",
      name: "Laptop Computer",
      description: "15-inch business laptop with SSD",
      minimumStockLevel: 10,
      reorderPoint: 15,
      requiredTemperatureMin: "15.00",
      requiredTemperatureMax: "25.00",
      weight: "2.500",
      dimensions: "35x25x2 cm",
      active: true,
      hasExpiryDate: false,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      inventoryTypeId: productTypeData[0].id, // Electronics
      packageTypeId: packageTypeData[2].id, // Small Box
      sku: "ELEC-MON-002",
      name: "LED Monitor 24\"",
      description: "24-inch LED monitor with HDMI",
      minimumStockLevel: 20,
      reorderPoint: 30,
      requiredTemperatureMin: "10.00",
      requiredTemperatureMax: "30.00",
      weight: "4.200",
      dimensions: "60x45x10 cm",
      active: true,
      hasExpiryDate: false,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      inventoryTypeId: productTypeData[1].id, // Perishables
      packageTypeId: packageTypeData[0].id, // Carton Box
      sku: "FOOD-APP-003",
      name: "Fresh Apples - Gala",
      description: "Fresh Gala apples, premium quality",
      minimumStockLevel: 50,
      reorderPoint: 100,
      requiredTemperatureMin: "1.00",
      requiredTemperatureMax: "4.00",
      weight: "0.150",
      dimensions: "8x8x9 cm",
      active: true,
      hasExpiryDate: true,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      inventoryTypeId: productTypeData[1].id, // Perishables
      packageTypeId: packageTypeData[0].id, // Carton Box
      sku: "FOOD-MLK-004",
      name: "Whole Milk - 1L",
      description: "Fresh whole milk, pasteurized",
      minimumStockLevel: 100,
      reorderPoint: 200,
      requiredTemperatureMin: "2.00",
      requiredTemperatureMax: "6.00",
      weight: "1.050",
      dimensions: "10x10x25 cm",
      active: true,
      hasExpiryDate: true,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      inventoryTypeId: productTypeData[2].id, // Clothing
      packageTypeId: packageTypeData[1].id, // Pallet
      sku: "CLTH-TSH-005",
      name: "Cotton T-Shirt - Blue",
      description: "100% cotton t-shirt, size M",
      minimumStockLevel: 200,
      reorderPoint: 300,
      weight: "0.180",
      dimensions: "30x25x2 cm",
      active: true,
      hasExpiryDate: false,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      inventoryTypeId: productTypeData[3].id, // Industrial Parts
      packageTypeId: packageTypeData[0].id, // Carton Box
      sku: "INDL-BRG-006",
      name: "Ball Bearing - 6205",
      description: "Deep groove ball bearing 6205",
      minimumStockLevel: 500,
      reorderPoint: 1000,
      weight: "0.130",
      dimensions: "5x5x2 cm",
      active: true,
      hasExpiryDate: false,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      inventoryTypeId: productTypeData[4].id, // Pharmaceuticals
      packageTypeId: packageTypeData[2].id, // Small Box
      sku: "PHRM-ASP-007",
      name: "Aspirin 500mg - 100 Tablets",
      description: "Pain relief medication, 500mg tablets",
      minimumStockLevel: 50,
      reorderPoint: 100,
      requiredTemperatureMin: "15.00",
      requiredTemperatureMax: "25.00",
      weight: "0.150",
      dimensions: "12x8x3 cm",
      active: true,
      hasExpiryDate: true,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      inventoryTypeId: productTypeData[0].id, // Electronics
      packageTypeId: packageTypeData[2].id, // Small Box
      sku: "ELEC-KBD-008",
      name: "Wireless Keyboard",
      description: "Ergonomic wireless keyboard with USB receiver",
      minimumStockLevel: 30,
      reorderPoint: 50,
      weight: "0.650",
      dimensions: "45x15x3 cm",
      active: true,
      hasExpiryDate: false,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      inventoryTypeId: productTypeData[3].id, // Industrial Parts
      packageTypeId: packageTypeData[3].id, // Bulk Container
      sku: "INDL-BLT-009",
      name: "Steel Bolts M8x50mm",
      description: "Galvanized steel bolts, M8 size, 50mm length",
      minimumStockLevel: 5000,
      reorderPoint: 10000,
      weight: "0.025",
      dimensions: "5x1x1 cm",
      active: true,
      hasExpiryDate: false,
    },
    {
      id: crypto.randomUUID(),
      tenantId,
      inventoryTypeId: productTypeData[1].id, // Perishables
      packageTypeId: packageTypeData[0].id, // Carton Box
      sku: "FOOD-CHE-010",
      name: "Cheddar Cheese Block - 500g",
      description: "Aged cheddar cheese, 500g block",
      minimumStockLevel: 40,
      reorderPoint: 80,
      requiredTemperatureMin: "2.00",
      requiredTemperatureMax: "8.00",
      weight: "0.520",
      dimensions: "15x10x5 cm",
      active: true,
      hasExpiryDate: true,
    },
  ];

  await db.insert(products).values(productData);
  console.log(`✓ Seeded ${productData.length} products`);

  // Seed Inventory Items
  console.log("Seeding inventory items...");
  
  // Helper function to get random date in the future (for expiry)
  const getRandomFutureDate = (daysMin: number, daysMax: number) => {
    const today = new Date();
    const days = Math.floor(Math.random() * (daysMax - daysMin) + daysMin);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    return futureDate.toISOString().split('T')[0];
  };

  // Helper function to get random past date (for received)
  const getRandomPastDate = (daysMin: number, daysMax: number) => {
    const today = new Date();
    const days = Math.floor(Math.random() * (daysMax - daysMin) + daysMin);
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - days);
    return pastDate.toISOString().split('T')[0];
  };

  const inventoryItemData: any[] = [];
  
  // Create multiple inventory items for each product across different bins
  productData.forEach((product, productIndex) => {
    const itemsPerProduct = Math.min(3, binIds.length); // 3 items per product or less if not enough bins
    
    for (let i = 0; i < itemsPerProduct; i++) {
      const binIndex = (productIndex * itemsPerProduct + i) % binIds.length;
      const hasExpiry = product.hasExpiryDate;
      
      inventoryItemData.push({
        id: crypto.randomUUID(),
        tenantId,
        productId: product.id,
        binId: binIds[binIndex],
        availableQuantity: Math.floor(Math.random() * 500) + 50,
        reservedQuantity: Math.floor(Math.random() * 50),
        expiryDate: hasExpiry ? getRandomFutureDate(30, 365) : null,
        batchNumber: hasExpiry ? `BATCH-${product.sku.substring(0, 8)}-${String(i + 1).padStart(3, '0')}` : null,
        lotNumber: `LOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`,
        receivedDate: getRandomPastDate(1, 90),
        costPerUnit: (Math.random() * 1000 + 10).toFixed(2),
      });
    }
  });

  await db.insert(inventoryItems).values(inventoryItemData);
  console.log(`✓ Seeded ${inventoryItemData.length} inventory items`);

  console.log("\n=== Seeding Summary ===");
  console.log(`Product Types: ${productTypeData.length}`);
  console.log(`Package Types: ${packageTypeData.length}`);
  console.log(`Products: ${productData.length}`);
  console.log(`Inventory Items: ${inventoryItemData.length}`);
  console.log("======================\n");
}

async function main() {
  try {
    await seedMasterDataAndInventory();
    console.log("✓ Master data and inventory seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
}

main();
