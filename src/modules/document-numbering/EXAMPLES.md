# Document Numbering - Usage Examples

## Table Structure Summary

### 1. document_number_config
Defines how document numbers should be formatted.

### 2. document_sequence_tracker
Tracks the current sequence for each unique combination.

### 3. document_number_history
Audit trail of every generated number.

---

## Example Configurations

### Example 1: Purchase Orders with 2 Prefixes

**Configuration Record:**
```sql
INSERT INTO document_number_config (
  id, tenant_id, document_type, document_name, 
  period_format, 
  prefix1_label, prefix1_default_value, prefix1_required,
  prefix2_label, prefix2_default_value, prefix2_required,
  sequence_length, separator, is_active
) VALUES (
  gen_random_uuid(), 
  'your-tenant-id',
  'PO',
  'Purchase Order',
  'YYMM',
  'Warehouse', 'WH1', true,
  'Category', 'LOCAL', false,
  4, '-', true
);
```

**Generated Numbers:**
- `PO-0125-WH1-LOCAL-0001` (Jan 2025, Warehouse 1, Local)
- `PO-0125-WH1-LOCAL-0002` (same combination, sequence increments)
- `PO-0125-WH1-IMPORT-0001` (different prefix2)
- `PO-0125-WH2-LOCAL-0001` (different prefix1)
- `PO-0225-WH1-LOCAL-0001` (Feb 2025, sequence resets)

---

### Example 2: Sales Orders with 1 Prefix

**Configuration Record:**
```sql
INSERT INTO document_number_config (
  id, tenant_id, document_type, document_name, 
  period_format, 
  prefix1_label, prefix1_default_value, prefix1_required,
  prefix2_label, prefix2_default_value, prefix2_required,
  sequence_length, separator, is_active
) VALUES (
  gen_random_uuid(), 
  'your-tenant-id',
  'SO',
  'Sales Order',
  'YYYYMM',
  'Region', 'NORTH', true,
  NULL, NULL, false,  -- No prefix2
  5, '-', true
);
```

**Generated Numbers:**
- `SO-202501-NORTH-00001`
- `SO-202501-NORTH-00002`
- `SO-202501-SOUTH-00001` (different region)
- `SO-202502-NORTH-00001` (Feb 2025, sequence resets)

---

### Example 3: Invoices with No Prefixes

**Configuration Record:**
```sql
INSERT INTO document_number_config (
  id, tenant_id, document_type, document_name, 
  period_format, 
  prefix1_label, prefix1_default_value, prefix1_required,
  prefix2_label, prefix2_default_value, prefix2_required,
  sequence_length, separator, is_active
) VALUES (
  gen_random_uuid(), 
  'your-tenant-id',
  'INV',
  'Invoice',
  'YYMM',
  NULL, NULL, false,  -- No prefix1
  NULL, NULL, false,  -- No prefix2
  6, '-', true
);
```

**Generated Numbers:**
- `INV-0125-000001`
- `INV-0125-000002`
- `INV-0225-000001` (Feb 2025, sequence resets)

---

### Example 4: Goods Receipt Notes (Weekly)

**Configuration Record:**
```sql
INSERT INTO document_number_config (
  id, tenant_id, document_type, document_name, 
  period_format, 
  prefix1_label, prefix1_default_value, prefix1_required,
  prefix2_label, prefix2_default_value, prefix2_required,
  sequence_length, separator, is_active
) VALUES (
  gen_random_uuid(), 
  'your-tenant-id',
  'GRN',
  'Goods Receipt Note',
  'YYWW',  -- Week-based
  'Dock', 'D1', true,
  NULL, NULL, false,
  4, '-', true
);
```

**Generated Numbers:**
- `GRN-2501-D1-0001` (Week 1 of 2025)
- `GRN-2502-D1-0001` (Week 2 of 2025, sequence resets)
- `GRN-2502-D2-0001` (Week 2, different dock)

---

## Sequence Tracker Examples

When numbers are generated, tracker records are created:

```sql
-- For PO-0125-WH1-LOCAL-0001
INSERT INTO document_sequence_tracker (
  id, tenant_id, config_id, document_type,
  period, prefix1, prefix2,
  current_sequence, last_generated_number, last_generated_at
) VALUES (
  gen_random_uuid(),
  'your-tenant-id',
  'config-id',
  'PO',
  '0125',
  'WH1',
  'LOCAL',
  1,
  'PO-0125-WH1-LOCAL-0001',
  NOW()
);

-- For SO-202501-NORTH-00001
INSERT INTO document_sequence_tracker (
  id, tenant_id, config_id, document_type,
  period, prefix1, prefix2,
  current_sequence, last_generated_number, last_generated_at
) VALUES (
  gen_random_uuid(),
  'your-tenant-id',
  'config-id',
  'SO',
  '202501',
  'NORTH',
  NULL,  -- No prefix2
  1,
  'SO-202501-NORTH-00001',
  NOW()
);

-- For INV-0125-000001
INSERT INTO document_sequence_tracker (
  id, tenant_id, config_id, document_type,
  period, prefix1, prefix2,
  current_sequence, last_generated_number, last_generated_at
) VALUES (
  gen_random_uuid(),
  'your-tenant-id',
  'config-id',
  'INV',
  '0125',
  NULL,  -- No prefix1
  NULL,  -- No prefix2
  1,
  'INV-0125-000001',
  NOW()
);
```

---

## History Records

Every generated number creates a history record:

```sql
INSERT INTO document_number_history (
  id, tenant_id, config_id, tracker_id,
  document_type, generated_number,
  period, prefix1, prefix2, sequence_number,
  document_id, document_table_name,
  generated_by, generated_at
) VALUES (
  gen_random_uuid(),
  'your-tenant-id',
  'config-id',
  'tracker-id',
  'PO',
  'PO-0125-WH1-LOCAL-0001',
  '0125',
  'WH1',
  'LOCAL',
  1,
  'actual-purchase-order-id',
  'purchase_orders',
  'user-id',
  NOW()
);
```

---

## Period Format Options

| Period Format | Example Value | Use Case |
|---------------|---------------|----------|
| `YYMM` | `0125` | Jan 2025 - Compact monthly |
| `YYYYMM` | `202501` | Jan 2025 - Full year monthly |
| `YYWW` | `2501` | Week 1 of 2025 - Compact weekly |
| `YYYYWW` | `202501` | Week 1 of 2025 - Full year weekly |

---

## Flexibility Examples

### Dynamic Prefix Values
Users can generate numbers with different prefix values:

```typescript
// Same config, different warehouse
generateNumber({ type: 'PO', prefix1: 'WH1', prefix2: 'LOCAL' })
// → PO-0125-WH1-LOCAL-0001

generateNumber({ type: 'PO', prefix1: 'WH2', prefix2: 'LOCAL' })
// → PO-0125-WH2-LOCAL-0001

generateNumber({ type: 'PO', prefix1: 'WH1', prefix2: 'IMPORT' })
// → PO-0125-WH1-IMPORT-0001
```

### Optional Prefixes
If prefixes are not required, users can omit them:

```typescript
// Config allows optional prefix2
generateNumber({ type: 'PO', prefix1: 'WH1', prefix2: 'LOCAL' })
// → PO-0125-WH1-LOCAL-0001

generateNumber({ type: 'PO', prefix1: 'WH1' })  // No prefix2
// → PO-0125-WH1-0001
```

---

## Key Features Demonstrated

✅ **Automatic Reset** - Sequences reset when period changes  
✅ **Unique Combinations** - Each (type, period, prefix1, prefix2) has its own sequence  
✅ **Flexible Prefixes** - Support 0, 1, or 2 prefixes  
✅ **Multiple Formats** - Different period formats for different needs  
✅ **Audit Trail** - Every number tracked in history  
✅ **No Duplicates** - Period in number ensures global uniqueness
