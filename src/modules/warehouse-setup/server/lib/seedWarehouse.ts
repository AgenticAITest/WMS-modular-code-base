import { db } from '@server/lib/db';
import { warehouses, warehouseConfigs, zones, aisles, shelves, bins } from './db/schemas/warehouseSetup';
import { v4 as uuidv4 } from 'uuid';

export async function seedWarehouseData(tenantId: string) {
  console.log('Starting warehouse data seeding...');

  const warehouseId = uuidv4();
  const [warehouse] = await db
    .insert(warehouses)
    .values({
      id: warehouseId,
      tenantId,
      name: 'Main Distribution Center',
      address: '123 Warehouse Blvd, Industrial Park, NY 10001',
      isActive: true,
    })
    .returning();
  console.log('✓ Created warehouse:', warehouse.name);

  const [config] = await db
    .insert(warehouseConfigs)
    .values({
      id: uuidv4(),
      warehouseId: warehouse.id,
      tenantId,
      pickingStrategy: 'FEFO',
      autoAssignBins: true,
      requireBatchTracking: true,
      requireExpiryTracking: true,
    })
    .returning();
  console.log('✓ Created warehouse config:', config.pickingStrategy);

  const receivingZoneId = uuidv4();
  const storageZoneId = uuidv4();
  const shippingZoneId = uuidv4();

  const zoneRecords = await db
    .insert(zones)
    .values([
      { id: receivingZoneId, warehouseId: warehouse.id, tenantId, name: 'Receiving Zone', description: 'Area for receiving incoming goods' },
      { id: storageZoneId, warehouseId: warehouse.id, tenantId, name: 'Main Storage Zone', description: 'Primary storage area' },
      { id: shippingZoneId, warehouseId: warehouse.id, tenantId, name: 'Shipping Zone', description: 'Area for outbound shipments' },
    ])
    .returning();
  console.log(`✓ Created ${zoneRecords.length} zones`);

  const aisleA1Id = uuidv4();
  const aisleA2Id = uuidv4();
  const aisleB1Id = uuidv4();

  const aisleRecords = await db
    .insert(aisles)
    .values([
      { id: aisleA1Id, zoneId: storageZoneId, tenantId, name: 'Aisle A-1', description: 'Fast-moving items' },
      { id: aisleA2Id, zoneId: storageZoneId, tenantId, name: 'Aisle A-2', description: 'Medium-moving items' },
      { id: aisleB1Id, zoneId: storageZoneId, tenantId, name: 'Aisle B-1', description: 'Bulk storage' },
    ])
    .returning();
  console.log(`✓ Created ${aisleRecords.length} aisles`);

  const shelfA1_1Id = uuidv4();
  const shelfA1_2Id = uuidv4();
  const shelfA2_1Id = uuidv4();
  const shelfB1_1Id = uuidv4();

  const shelfRecords = await db
    .insert(shelves)
    .values([
      { id: shelfA1_1Id, aisleId: aisleA1Id, tenantId, name: 'Shelf A1-01', description: 'Top shelf' },
      { id: shelfA1_2Id, aisleId: aisleA1Id, tenantId, name: 'Shelf A1-02', description: 'Middle shelf' },
      { id: shelfA2_1Id, aisleId: aisleA2Id, tenantId, name: 'Shelf A2-01', description: 'Top shelf' },
      { id: shelfB1_1Id, aisleId: aisleB1Id, tenantId, name: 'Shelf B1-01', description: 'Ground level' },
    ])
    .returning();
  console.log(`✓ Created ${shelfRecords.length} shelves`);

  const binData = [
    {
      id: uuidv4(),
      shelfId: shelfA1_1Id,
      tenantId,
      name: 'Bin A1-01-001',
      barcode: 'BIN-A1-01-001',
      maxWeight: 50.0,
      maxVolume: 2.5,
      category: 'Electronics',
      accessibilityScore: 90,
    },
    {
      id: uuidv4(),
      shelfId: shelfA1_1Id,
      tenantId,
      name: 'Bin A1-01-002',
      barcode: 'BIN-A1-01-002',
      maxWeight: 50.0,
      maxVolume: 2.5,
      category: 'Electronics',
      accessibilityScore: 85,
    },
    {
      id: uuidv4(),
      shelfId: shelfA1_2Id,
      tenantId,
      name: 'Bin A1-02-001',
      barcode: 'BIN-A1-02-001',
      maxWeight: 75.0,
      maxVolume: 3.0,
      category: 'General',
      accessibilityScore: 75,
    },
    {
      id: uuidv4(),
      shelfId: shelfA2_1Id,
      tenantId,
      name: 'Bin A2-01-001',
      barcode: 'BIN-A2-01-001',
      maxWeight: 100.0,
      maxVolume: 5.0,
      category: 'Bulk',
      requiredTemperature: 'Ambient',
      accessibilityScore: 70,
    },
    {
      id: uuidv4(),
      shelfId: shelfB1_1Id,
      tenantId,
      name: 'Bin B1-01-001',
      barcode: 'BIN-B1-01-001',
      maxWeight: 200.0,
      maxVolume: 10.0,
      category: 'Heavy Goods',
      accessibilityScore: 60,
    },
    {
      id: uuidv4(),
      shelfId: shelfB1_1Id,
      tenantId,
      name: 'Bin B1-01-002',
      barcode: 'BIN-B1-01-002',
      maxWeight: 200.0,
      maxVolume: 10.0,
      category: 'Heavy Goods',
      accessibilityScore: 55,
    },
  ] as const;

  const binRecords = await db
    .insert(bins)
    .values(binData as any)
    .returning();
  console.log(`✓ Created ${binRecords.length} bins`);

  console.log('\n✅ Warehouse data seeding completed successfully!');
  console.log(`   Warehouse: ${warehouse.name}`);
  console.log(`   └── Zones: ${zoneRecords.length}`);
  console.log(`       └── Aisles: ${aisleRecords.length}`);
  console.log(`           └── Shelves: ${shelfRecords.length}`);
  console.log(`               └── Bins: ${binRecords.length}`);

  return {
    warehouse,
    config,
    zones: zoneRecords,
    aisles: aisleRecords,
    shelves: shelfRecords,
    bins: binRecords,
  };
}
