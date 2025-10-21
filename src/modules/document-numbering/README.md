# Document Numbering Module

## Overview

This module provides a standardized document numbering system for all document types in the application. It supports flexible numbering formats with auto-increment sequences, user-defined prefixes, and period-based organization.

## Features

- ✅ **Flexible Format Configuration** - Configure number format per document type
- ✅ **Period-Based Numbering** - Always includes period (YYMM, YYYYMM, etc.) to ensure uniqueness
- ✅ **Optional Prefixes** - Support for 0, 1, or 2 user-defined prefixes
- ✅ **Auto-Increment Sequences** - Automatic sequence generation with padding
- ✅ **Audit Trail** - Complete history of all generated numbers
- ✅ **Multi-Tenant Support** - Full tenant isolation
- ✅ **Voiding Support** - Mark numbers as voided without reuse

## Database Schema

### 1. document_number_config
Configuration for each document type's numbering format.

**Key Fields:**
- `documentType` - Document type code (e.g., 'PO', 'SO', 'INV')
- `periodFormat` - Period format: 'YYMM' (0125), 'YYYYMM' (202501), 'YYWW' (week-based)
- `prefix1Label/prefix1DefaultValue/prefix1Required` - First optional prefix
- `prefix2Label/prefix2DefaultValue/prefix2Required` - Second optional prefix
- `sequenceLength` - Number of digits for sequence (default: 4)
- `separator` - Separator character (default: '-')

**Example Configuration:**
```json
{
  "documentType": "PO",
  "documentName": "Purchase Order",
  "periodFormat": "YYMM",
  "prefix1Label": "Warehouse",
  "prefix1DefaultValue": "WH1",
  "prefix1Required": false,
  "prefix2Label": "Category",
  "prefix2DefaultValue": "LOCAL",
  "prefix2Required": false,
  "sequenceLength": 4,
  "separator": "-"
}
```

**Generated Numbers:**
- `PO-0125-WH1-LOCAL-0001` (with both prefixes)
- `PO-0125-WH1-0001` (with only prefix1)
- `PO-0125-0001` (no prefixes)

### 2. document_sequence_tracker
Tracks current sequence for each document type, period, and prefix combination.

**Key Fields:**
- `period` - Current period (e.g., '0125' for Jan 2025)
- `prefix1/prefix2` - Actual prefix values used
- `currentSequence` - Current sequence number
- `lastGeneratedNumber` - Last generated full number

**Unique Constraint:**
One tracker per combination of: `(tenantId, documentType, period, prefix1, prefix2)`

### 3. document_number_history
Audit trail of all generated document numbers.

**Key Fields:**
- `generatedNumber` - Full formatted number
- `documentId/documentTableName` - Reference to actual document
- `generatedBy/generatedAt` - Who and when
- `isVoided/voidedAt/voidedBy` - Voiding support

## Numbering Format Examples

### Example 1: Purchase Orders (2 prefixes)
**Config:**
- Type: `PO`
- Period: `YYMM` (0125)
- Prefix1: Warehouse code (WH1, WH2)
- Prefix2: Category (LOCAL, IMPORT)
- Sequence: 4 digits

**Numbers:**
- `PO-0125-WH1-LOCAL-0001`
- `PO-0125-WH1-LOCAL-0002`
- `PO-0125-WH1-IMPORT-0001`
- `PO-0125-WH2-LOCAL-0001`
- `PO-0225-WH1-LOCAL-0001` (Feb 2025, sequence resets)

### Example 2: Sales Orders (1 prefix)
**Config:**
- Type: `SO`
- Period: `YYYYMM` (202501)
- Prefix1: Sales region (NORTH, SOUTH)
- Prefix2: Not used
- Sequence: 5 digits

**Numbers:**
- `SO-202501-NORTH-00001`
- `SO-202501-SOUTH-00001`

### Example 3: Invoices (no prefixes)
**Config:**
- Type: `INV`
- Period: `YYMM` (0125)
- Prefix1: Not used
- Prefix2: Not used
- Sequence: 6 digits

**Numbers:**
- `INV-0125-000001`
- `INV-0125-000002`

## Period Formats

| Format | Example | Description |
|--------|---------|-------------|
| `YYMM` | `0125` | Year (2 digits) + Month (Jan 2025) |
| `YYYYMM` | `202501` | Year (4 digits) + Month |
| `YYWW` | `2553` | Year (2 digits) + Week number |
| `YYYYWW` | `202553` | Year (4 digits) + Week number |

## How It Works

### 1. Configuration Setup
```typescript
// Admin configures document type
{
  documentType: 'PO',
  periodFormat: 'YYMM',
  prefix1Label: 'Warehouse',
  prefix1Required: true,
  prefix2Label: 'Category',
  prefix2Required: false,
  sequenceLength: 4
}
```

### 2. Number Generation
When a document is created:
1. Get current period (e.g., '0125')
2. Get/create sequence tracker for (type, period, prefix1, prefix2)
3. Increment sequence
4. Format: `{type}-{period}-{prefix1}-{prefix2}-{sequence}`
5. Save to history table
6. Return formatted number

### 3. Sequence Reset
Sequences automatically reset when the period changes:
- Jan 2025: `PO-0125-WH1-0001`, `PO-0125-WH1-0002`
- Feb 2025: `PO-0225-WH1-0001` (resets to 0001)

## Benefits

1. **Uniqueness Guaranteed** - Period in every number ensures no duplicates
2. **Flexible Prefixes** - Use 0, 1, or 2 prefixes as needed
3. **Self-Documenting** - Numbers show document type and creation period
4. **Easy Reporting** - Filter/group by period from the number itself
5. **Audit-Ready** - Complete history of all generated numbers
6. **Multi-Tenant Safe** - Full tenant isolation

## Usage Example

```typescript
// When creating a purchase order
const documentNumber = await generateDocumentNumber({
  documentType: 'PO',
  prefix1: 'WH1',      // Optional
  prefix2: 'LOCAL',    // Optional
  documentId: purchaseOrderId,
  generatedBy: userId
});

// Returns: 'PO-0125-WH1-LOCAL-0001'
```

## Notes

- **Concurrent Safety**: Use database transactions and locks when generating sequences
- **Voiding**: Mark voided numbers in history; don't delete or reuse them
- **Validation**: Ensure required prefixes are provided when generating numbers
- **Migration**: Existing documents can be re-numbered or kept with their original numbers
