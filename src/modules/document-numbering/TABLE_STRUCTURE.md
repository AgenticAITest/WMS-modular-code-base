# Document Numbering - Table Structure

## Database Tables Created ✅

Three tables have been successfully created in your database:

1. **document_number_config** - Configuration table
2. **document_sequence_tracker** - Sequence tracking table
3. **document_number_history** - Audit trail table

---

## Table Relationships

```
┌─────────────────────────────────┐
│  document_number_config         │
│  (Configuration)                │
├─────────────────────────────────┤
│ • id (PK)                       │
│ • tenant_id (FK)                │
│ • document_type                 │
│ • period_format                 │
│ • prefix1_label                 │
│ • prefix1_default_value         │
│ • prefix1_required              │
│ • prefix2_label                 │
│ • prefix2_default_value         │
│ • prefix2_required              │
│ • sequence_length               │
│ • separator                     │
└──────────┬──────────────────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────────────────┐
│  document_sequence_tracker      │
│  (Current Sequences)            │
├─────────────────────────────────┤
│ • id (PK)                       │
│ • tenant_id (FK)                │
│ • config_id (FK)                │
│ • document_type                 │
│ • period                        │
│ • prefix1                       │
│ • prefix2                       │
│ • current_sequence              │
│ • last_generated_number         │
└──────────┬──────────────────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────────────────┐
│  document_number_history        │
│  (Audit Trail)                  │
├─────────────────────────────────┤
│ • id (PK)                       │
│ • tenant_id (FK)                │
│ • config_id (FK)                │
│ • tracker_id (FK)               │
│ • document_type                 │
│ • generated_number              │
│ • period                        │
│ • prefix1, prefix2              │
│ • sequence_number               │
│ • document_id                   │
│ • generated_by                  │
│ • is_voided                     │
└─────────────────────────────────┘
```

---

## Table Details

### 1. document_number_config

**Purpose:** Define how each document type should be numbered.

**Key Columns:**
- `document_type` - Unique code (e.g., 'PO', 'SO', 'INV')
- `period_format` - YYMM, YYYYMM, YYWW, YYYYWW
- `prefix1_label/prefix1_default_value/prefix1_required` - First optional prefix
- `prefix2_label/prefix2_default_value/prefix2_required` - Second optional prefix
- `sequence_length` - Number of digits (default: 4)
- `separator` - Separator character (default: '-')

**Unique Constraint:** `(tenant_id, document_type)` - One config per document type per tenant

**Example Row:**
| Field | Value |
|-------|-------|
| document_type | PO |
| period_format | YYMM |
| prefix1_label | Warehouse |
| prefix1_required | true |
| prefix2_label | Category |
| prefix2_required | false |
| sequence_length | 4 |
| separator | - |

---

### 2. document_sequence_tracker

**Purpose:** Track the current sequence for each unique combination.

**Key Columns:**
- `period` - Current period value (e.g., '0125')
- `prefix1/prefix2` - Actual prefix values used
- `current_sequence` - Current sequence number
- `last_generated_number` - Full formatted number

**Unique Constraint:** `(tenant_id, document_type, period, prefix1, prefix2)`

**Example Rows:**

| document_type | period | prefix1 | prefix2 | current_sequence | last_generated_number |
|--------------|--------|---------|---------|-----------------|----------------------|
| PO | 0125 | WH1 | LOCAL | 15 | PO-0125-WH1-LOCAL-0015 |
| PO | 0125 | WH1 | IMPORT | 8 | PO-0125-WH1-IMPORT-0008 |
| PO | 0125 | WH2 | LOCAL | 23 | PO-0125-WH2-LOCAL-0023 |
| PO | 0225 | WH1 | LOCAL | 1 | PO-0225-WH1-LOCAL-0001 |

**Note:** Each combination maintains its own independent sequence.

---

### 3. document_number_history

**Purpose:** Complete audit trail of all generated numbers.

**Key Columns:**
- `generated_number` - Full formatted document number
- `period/prefix1/prefix2/sequence_number` - Number components
- `document_id/document_table_name` - Link to actual document
- `generated_by/generated_at` - Who and when
- `is_voided/voided_at/voided_by/void_reason` - Voiding support

**Unique Constraint:** `(tenant_id, generated_number)` - Each number is globally unique

**Example Row:**
| Field | Value |
|-------|-------|
| generated_number | PO-0125-WH1-LOCAL-0001 |
| document_type | PO |
| period | 0125 |
| prefix1 | WH1 |
| prefix2 | LOCAL |
| sequence_number | 1 |
| document_id | abc-123-def |
| document_table_name | purchase_orders |
| is_voided | false |

---

## How It Works Together

### Step 1: Configuration
Admin creates a configuration for document type 'PO':
```sql
document_number_config:
  document_type: 'PO'
  period_format: 'YYMM'
  prefix1_required: true
  sequence_length: 4
```

### Step 2: First Number Generation
When generating `PO-0125-WH1-LOCAL-0001`:

1. **Check/Create Tracker:**
   ```sql
   document_sequence_tracker:
     period: '0125'
     prefix1: 'WH1'
     prefix2: 'LOCAL'
     current_sequence: 0 → 1
   ```

2. **Create History:**
   ```sql
   document_number_history:
     generated_number: 'PO-0125-WH1-LOCAL-0001'
     sequence_number: 1
   ```

### Step 3: Next Number (Same Combination)
Generate `PO-0125-WH1-LOCAL-0002`:

1. **Update Tracker:**
   ```sql
   document_sequence_tracker:
     current_sequence: 1 → 2
     last_generated_number: 'PO-0125-WH1-LOCAL-0002'
   ```

2. **Create History:**
   ```sql
   document_number_history:
     generated_number: 'PO-0125-WH1-LOCAL-0002'
     sequence_number: 2
   ```

### Step 4: Different Period (Auto Reset)
Generate `PO-0225-WH1-LOCAL-0001` (Feb 2025):

1. **Create New Tracker:**
   ```sql
   document_sequence_tracker:
     period: '0225'  ← New period
     prefix1: 'WH1'
     prefix2: 'LOCAL'
     current_sequence: 1  ← Resets to 1
   ```

2. **Create History:**
   ```sql
   document_number_history:
     generated_number: 'PO-0225-WH1-LOCAL-0001'
     sequence_number: 1
   ```

---

## Key Features

### ✅ Flexible Prefix Support
- **0 Prefixes:** `INV-0125-0001`
- **1 Prefix:** `SO-0125-NORTH-0001`
- **2 Prefixes:** `PO-0125-WH1-LOCAL-0001`

### ✅ Automatic Period Reset
Sequences reset when period changes:
- Jan 2025: `PO-0125-WH1-0001`, `PO-0125-WH1-0002`
- Feb 2025: `PO-0225-WH1-0001` (resets)

### ✅ Independent Sequences
Each combination has its own sequence:
- `PO-0125-WH1-LOCAL-0001`
- `PO-0125-WH1-IMPORT-0001` (different prefix2)
- `PO-0125-WH2-LOCAL-0001` (different prefix1)

### ✅ Complete Audit Trail
Every number is tracked in history with:
- Who generated it
- When it was generated
- What document it belongs to
- Whether it's been voided

### ✅ Multi-Tenant Safe
All tables include `tenant_id` for complete isolation.

---

## Next Steps

To use this system, you'll need to:

1. **Create API Routes** - CRUD operations for configurations
2. **Create Number Generator Service** - Function to generate numbers safely
3. **Create UI** - Admin interface to configure document types
4. **Integrate with Documents** - Call generator when creating documents

Would you like me to implement these components?
