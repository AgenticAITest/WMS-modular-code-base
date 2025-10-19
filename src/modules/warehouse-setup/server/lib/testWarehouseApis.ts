import { seedWarehouseData } from './seedWarehouse';

async function testWarehouseApis() {
  console.log('='.repeat(60));
  console.log('WAREHOUSE API TESTING SCRIPT');
  console.log('='.repeat(60));
  console.log('\nNote: This script only seeds the database.');
  console.log('To test the APIs:');
  console.log('1. Make sure server is running');
  console.log('2. Visit /api-docs to see Swagger documentation');
  console.log('3. Authenticate first to get a token');
  console.log('4. Test the following endpoints:');
  console.log('   - GET /api/modules/warehouse-setup/warehouses');
  console.log('   - GET /api/modules/warehouse-setup/zones?warehouseId=<id>');
  console.log('   - GET /api/modules/warehouse-setup/aisles?zoneId=<id>');
  console.log('   - GET /api/modules/warehouse-setup/shelves?aisleId=<id>');
  console.log('   - GET /api/modules/warehouse-setup/bins?shelfId=<id>');
  console.log('   - POST, PUT, DELETE operations for all entities');
  console.log('\n' + '='.repeat(60));

  const testTenantId = '4f8db800-fc72-4e89-a8f9-acdfc07d95e6';
  
  console.log(`\nSeeding warehouse data for tenant: ${testTenantId}\n`);
  
  try {
    const result = await seedWarehouseData(testTenantId);
    
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Warehouse ID: ${result.warehouse.id}`);
    console.log(`Warehouse Name: ${result.warehouse.name}`);
    console.log(`\nHierarchy Created:`);
    console.log(`  └── 1 Warehouse`);
    console.log(`      ├── 1 Config (${result.config.pickingStrategy} strategy)`);
    console.log(`      └── ${result.zones.length} Zones`);
    console.log(`          └── ${result.aisles.length} Aisles`);
    console.log(`              └── ${result.shelves.length} Shelves`);
    console.log(`                  └── ${result.bins.length} Bins`);
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nYou can now test the APIs using /api-docs or any API client.');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

testWarehouseApis();
