# Development Best Practices

This document captures lessons learned and best practices for developing new features in this WMS application.

## Table of Contents
1. [UI Component Library Constraints](#ui-component-library-constraints)
2. [Null Safety & Runtime Validation](#null-safety--runtime-validation)
3. [Filter Implementation Pattern](#filter-implementation-pattern)
4. [Error Boundary Prevention](#error-boundary-prevention)
5. [Testing Checklist](#testing-checklist)
6. [Common Pitfalls](#common-pitfalls)

---

## UI Component Library Constraints

### Radix UI Select Component

**❌ WRONG:**
```typescript
<Select value={filter} onValueChange={setFilter}>
  <SelectContent>
    <SelectItem value="">All items</SelectItem>  // Error!
  </SelectContent>
</Select>
```

**✅ CORRECT:**
```typescript
const [filter, setFilter] = useState('all');  // Not ''

<Select value={filter} onValueChange={setFilter}>
  <SelectContent>
    <SelectItem value="all">All items</SelectItem>
  </SelectContent>
</Select>
```

**Why:** Radix UI's `<SelectItem />` component explicitly rejects empty strings as values.

**Error Message:** `Error: A <Select.Item /> must have a value prop that is not an empty string`

---

## Null Safety & Runtime Validation

### The TypeScript Trap

TypeScript interfaces provide compile-time type safety but **do NOT prevent runtime errors**.

**❌ WRONG:**
```typescript
interface AuditLog {
  status: string;  // TypeScript says non-null
}

const getStatusBadge = (status: string) => {
  return status.toLowerCase();  // Crashes if status is null!
}
```

**✅ CORRECT:**
```typescript
interface AuditLog {
  status: string | null;  // Be honest about reality
}

const getStatusBadge = (status: string | null) => {
  if (!status) {
    return 'unknown';  // Handle null case
  }
  return status.toLowerCase();
}
```

### Defensive Programming Checklist

Always add safety checks before:
- ✅ Calling methods: `.toLowerCase()`, `.toUpperCase()`, `.trim()`
- ✅ Array operations: `.map()`, `.filter()`, `.find()`
- ✅ Object access: `obj.property.nested`
- ✅ Date operations: `new Date(dateString)`
- ✅ JSON operations: `JSON.parse()`, `JSON.stringify()`

**Example:**
```typescript
// ❌ WRONG
data.map(item => item.name.toLowerCase())

// ✅ CORRECT
data?.map(item => item.name?.toLowerCase() || 'N/A') || []
```

---

## Filter Implementation Pattern

### The Standard Pattern for Dropdowns

```typescript
// 1. State initialization - use semantic value, not empty string
const [moduleFilter, setModuleFilter] = useState('all');
const [actionFilter, setActionFilter] = useState('all');
const [statusFilter, setStatusFilter] = useState('all');

// 2. Select component - use semantic value
<Select value={moduleFilter} onValueChange={setModuleFilter}>
  <SelectContent>
    <SelectItem value="all">All modules</SelectItem>
    {modules.map((module) => (
      <SelectItem key={module} value={module}>
        {module}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// 3. API call - check before adding to params
const params: any = { page, limit };
if (moduleFilter && moduleFilter !== 'all') {
  params.module = moduleFilter;
}
if (actionFilter && actionFilter !== 'all') {
  params.action = actionFilter;
}

// 4. Clear filters - reset to semantic value
const handleClearFilters = () => {
  setModuleFilter('all');
  setActionFilter('all');
  setStatusFilter('all');
};
```

### Why This Pattern Works

- Uses semantic values (`'all'`) instead of empty strings
- Compatible with Radix UI constraints
- Clear intent in code
- Easy to extend with additional filters

---

## Error Boundary Prevention

### Common Triggers to Avoid

1. **Method calls on null/undefined**
   ```typescript
   // ❌ BAD
   const name = user.name.toLowerCase();

   // ✅ GOOD
   const name = user?.name?.toLowerCase() || 'Unknown';
   ```

2. **Array operations without checks**
   ```typescript
   // ❌ BAD
   items.map(item => ...)

   // ✅ GOOD
   (items || []).map(item => ...)
   ```

3. **Date parsing without validation**
   ```typescript
   // ❌ BAD
   format(new Date(dateString), 'yyyy-MM-dd')

   // ✅ GOOD
   dateString ? format(new Date(dateString), 'yyyy-MM-dd') : 'N/A'
   ```

4. **JSON operations on invalid data**
   ```typescript
   // ❌ BAD
   JSON.stringify(circularObject)

   // ✅ GOOD
   try {
     return JSON.stringify(obj, null, 2);
   } catch {
     return 'Unable to display';
   }
   ```

---

## Testing Checklist

Before considering any page implementation "complete", test these scenarios:

### Data States
- [ ] **Empty data** - no records returned from API
- [ ] **Null values** - all nullable fields set to null
- [ ] **Large datasets** - pagination works correctly
- [ ] **Single record** - edge case for pagination

### User Interactions
- [ ] **All filter combinations** - test each dropdown
- [ ] **Clear all filters** - resets to default state
- [ ] **Search with special characters** - doesn't break
- [ ] **Rapid clicking** - debouncing works

### UI States
- [ ] **Loading state** - spinner shows while fetching
- [ ] **Error state** - graceful error messages
- [ ] **Empty state** - helpful message when no data
- [ ] **Browser console** - no warnings or errors

### Edge Cases
- [ ] **Long text** - truncation works, no overflow
- [ ] **Date edge cases** - invalid dates handled
- [ ] **Null status values** - doesn't crash
- [ ] **Network failures** - error handling works

---

## Common Pitfalls

### 1. Database Schema vs. Runtime Reality

**Pitfall:** Trusting that `NOT NULL` constraints mean data is never null.

**Reality:**
- Old records before constraints were added
- Failed/partial insertions
- Database migrations
- Legacy data

**Solution:** Always handle null in code, regardless of schema.

---

### 2. Empty String vs. Semantic Values

**Pitfall:** Using `value=""` for "All" options in dropdowns.

**Reality:** Many UI libraries reject empty strings.

**Solution:** Use semantic values like `"all"`, `"none"`, `"default"`.

---

### 3. TypeScript False Security

**Pitfall:** Assuming TypeScript prevents runtime errors.

**Reality:** TypeScript only checks at compile time. Runtime data can be anything.

**Solution:** Add runtime validation, null checks, and defensive programming.

---

### 4. Optimistic Rendering

**Pitfall:** Assuming API always returns expected data structure.

**Reality:** APIs can return null, empty arrays, or unexpected formats.

**Solution:** Always validate API responses before rendering.

```typescript
// ❌ BAD
setData(response.data);

// ✅ GOOD
setData(response.data?.data || []);
```

---

### 5. Cascading Method Calls

**Pitfall:** Chaining methods without null checks.

```typescript
// ❌ BAD - crashes if any step returns null
user.profile.address.city.toLowerCase();

// ✅ GOOD
user?.profile?.address?.city?.toLowerCase() || 'N/A';
```

---

## Case Study: Audit Log Implementation Issues

### Issue 1: Empty String in Select Component

**Error:** `Error: A <Select.Item /> must have a value prop that is not an empty string`

**Root Cause:** Used `value=""` for "All modules" option.

**Fix:** Changed to `value="all"` and updated filter logic to check `!== 'all'`.

**Lesson:** Always use semantic values in UI component libraries.

---

### Issue 2: Null Status Crash

**Error:** `TypeError: Cannot read property 'toLowerCase' of null`

**Root Cause:** Called `.toLowerCase()` on null status without checking.

**Impact:** Triggered React error boundary, crashed entire page.

**Fix:** Added null check before calling `.toLowerCase()`.

**Lesson:** Never trust TypeScript types - always add runtime null checks.

---

## Quick Reference: Safe Patterns

```typescript
// ✅ Safe string method calls
const name = value?.toLowerCase() || 'default';

// ✅ Safe array operations
const items = (data || []).map(item => ...);

// ✅ Safe object access
const city = user?.profile?.address?.city || 'Unknown';

// ✅ Safe date formatting
const date = dateStr ? format(new Date(dateStr), 'yyyy-MM-dd') : 'N/A';

// ✅ Safe filter implementation
const [filter, setFilter] = useState('all');
if (filter && filter !== 'all') params.filter = filter;

// ✅ Safe JSON operations
try {
  return JSON.stringify(data, null, 2);
} catch {
  return 'Unable to display';
}
```

---

## Contributing to This Document

If you encounter new patterns, pitfalls, or lessons learned:

1. Add them to the appropriate section
2. Include both ❌ wrong and ✅ correct examples
3. Explain **why** it matters
4. Provide real error messages when relevant

---

**Last Updated:** 2025-10-26
**Maintainer:** Development Team
