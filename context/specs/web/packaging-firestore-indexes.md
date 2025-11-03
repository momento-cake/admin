# Firestore Indexes Setup Guide - Packaging Feature

**Quick Reference for Firestore Index Configuration**

---

## Why Indexes Matter

Firestore composite indexes are required for efficient querying. Without these indexes:
- Queries will be slow (1-10+ seconds)
- Some queries may fail with index requirement errors
- UI will feel unresponsive when loading data

With indexes:
- Queries complete in < 100ms
- UI feels fast and responsive
- Supports pagination and filtering

---

## Index Summary

| Index # | Collection | Purpose | Fields |
|---------|-----------|---------|--------|
| 1 | packaging | List all active items | isActive, name |
| 2 | packaging | Filter by stock status | isActive, currentStock, minStock |
| 3 | packaging | Filter by supplier | isActive, supplierId, name |
| 4 | packaging | Price range queries | isActive, currentPrice, name |
| 5 | packaging_stock_history | Get stock movements | packagingId, createdAt |
| 6 | packaging_stock_history | Filter by type | packagingId, type, createdAt |
| 7 | packaging_stock_history | Supplier purchases | supplierId, type, createdAt |
| 8 | packaging_price_history | Get price history | packagingId, createdAt |
| 9 | packaging_price_history | Compare prices | supplierId, packagingId, createdAt |

**Total: 9 indexes required**

---

## Deployment Methods

### Method 1: Firebase CLI (Recommended)

**Step 1: Create firestore.indexes.json**

```bash
touch firestore.indexes.json
```

**Step 2: Add index configuration**

See complete JSON below in "Complete firestore.indexes.json"

**Step 3: Deploy**

```bash
firebase deploy --only firestore:indexes
```

**Step 4: Verify (wait 5-10 minutes for build)**

```bash
firebase firestore:indexes
```

---

### Method 2: Firebase Console (Manual)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. For each index below, fill in:
   - Collection ID
   - Fields and order (ascending/descending)
6. Click Create
7. Wait for index to build (usually 5-10 minutes)

---

## Complete firestore.indexes.json

Copy this entire file to your project root:

```json
{
  "indexes": [
    {
      "collectionGroup": "packaging",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "name",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "currentStock",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "minStock",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "supplierId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "name",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "currentPrice",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "name",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging_stock_history",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "packagingId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging_stock_history",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "packagingId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "type",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging_stock_history",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "supplierId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "type",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging_price_history",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "packagingId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging_price_history",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "supplierId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "packagingId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## Individual Index Specifications

### Index 1: List Active Packaging

**Query**: Show all active packaging items sorted by name

```typescript
query(
  collection(db, 'packaging'),
  where('isActive', '==', true),
  orderBy('name')
)
```

**Index Fields**:
- `isActive` (Ascending)
- `name` (Ascending)

**Used by**: `fetchPackaging()`

---

### Index 2: Stock Status Filter

**Query**: Filter packaging by stock status (low/critical/good)

```typescript
query(
  collection(db, 'packaging'),
  where('isActive', '==', true),
  where('currentStock', '<', minStockThreshold),
  orderBy('currentStock', 'desc')
)
```

**Index Fields**:
- `isActive` (Ascending)
- `currentStock` (Descending)
- `minStock` (Ascending)

**Used by**: PackagingList component filters

---

### Index 3: Supplier Filter

**Query**: Find all packaging items from a specific supplier

```typescript
query(
  collection(db, 'packaging'),
  where('isActive', '==', true),
  where('supplierId', '==', supplierId),
  orderBy('name')
)
```

**Index Fields**:
- `isActive` (Ascending)
- `supplierId` (Ascending)
- `name` (Ascending)

**Used by**: Supplier-based filtering

---

### Index 4: Price Range

**Query**: Filter by price range (future enhancement)

```typescript
query(
  collection(db, 'packaging'),
  where('isActive', '==', true),
  where('currentPrice', '>=', minPrice),
  where('currentPrice', '<=', maxPrice)
)
```

**Index Fields**:
- `isActive` (Ascending)
- `currentPrice` (Ascending)
- `name` (Ascending)

**Used by**: Price-based sorting

---

### Index 5: Stock History by Package

**Query**: Get all stock movements for a packaging item

```typescript
query(
  collection(db, 'packaging_stock_history'),
  where('packagingId', '==', packageId),
  orderBy('createdAt', 'desc'),
  limit(20)
)
```

**Index Fields**:
- `packagingId` (Ascending)
- `createdAt` (Descending)

**Used by**: `fetchStockHistory()`

---

### Index 6: Stock Movements by Type

**Query**: Filter stock history by movement type

```typescript
query(
  collection(db, 'packaging_stock_history'),
  where('packagingId', '==', packageId),
  where('type', '==', 'purchase'),
  orderBy('createdAt', 'desc')
)
```

**Index Fields**:
- `packagingId` (Ascending)
- `type` (Ascending)
- `createdAt` (Descending)

**Used by**: Stock history filtering

---

### Index 7: Supplier Purchases

**Query**: Get all purchases from a specific supplier

```typescript
query(
  collection(db, 'packaging_stock_history'),
  where('supplierId', '==', supplierId),
  where('type', '==', 'purchase'),
  orderBy('createdAt', 'desc')
)
```

**Index Fields**:
- `supplierId` (Ascending)
- `type` (Ascending)
- `createdAt` (Descending)

**Used by**: Supplier purchase history

---

### Index 8: Price History by Package

**Query**: Get pricing trends for an item

```typescript
query(
  collection(db, 'packaging_price_history'),
  where('packagingId', '==', packageId),
  orderBy('createdAt', 'desc'),
  limit(20)
)
```

**Index Fields**:
- `packagingId` (Ascending)
- `createdAt` (Descending)

**Used by**: `fetchPriceHistory()`

---

### Index 9: Compare Supplier Prices

**Query**: Compare prices from different suppliers

```typescript
query(
  collection(db, 'packaging_price_history'),
  where('supplierId', '==', supplierId),
  where('packagingId', '==', packageId),
  orderBy('createdAt', 'desc')
)
```

**Index Fields**:
- `supplierId` (Ascending)
- `packagingId` (Ascending)
- `createdAt` (Descending)

**Used by**: Price comparison

---

## Verification Checklist

After deploying indexes:

- [ ] All 9 indexes show status "Enabled" in Firebase Console
- [ ] No "Index Building" status (should be instant or take max 10 minutes)
- [ ] Test `fetchPackaging()` - should return results < 100ms
- [ ] Test stock history query - should return results < 100ms
- [ ] Check Firestore Dashboard for query performance
- [ ] Monitor read counts (should be minimal with indexes)

---

## Troubleshooting

### Indexes Not Appearing

**Problem**: Created indexes but they don't show in Firebase Console

**Solution**:
1. Wait 5-10 minutes for build to complete
2. Refresh Firebase Console page
3. Check if all required fields match specification exactly
4. Verify project ID is correct

### Queries Still Slow

**Problem**: Queries running but still slow (> 500ms)

**Possible causes**:
- Index still building (wait 10+ minutes)
- Index not created correctly (compare with specification)
- Too much data being scanned (verify where clauses)
- Network latency (check region)

**Solution**:
1. Verify all 9 indexes are created and "Enabled"
2. Check Firestore Dashboard → Operations metrics
3. Look for slow query warnings
4. Delete and recreate problematic index

### Index Creation Failed

**Problem**: Error when deploying indexes via CLI

**Solution**:
```bash
# Check Firebase CLI version
firebase --version

# Update Firebase CLI
npm install -g firebase-tools@latest

# Re-run deployment
firebase deploy --only firestore:indexes
```

---

## Cost Considerations

### Index Storage Cost

Firestore indexes consume storage:
- Each index ≈ 0.5-1 KB per document
- 1000 documents × 9 indexes ≈ 5-10 MB
- Cost: Minimal (typically < $0.01/month)

### Query Cost

With proper indexes:
- Queries read only necessary documents
- Significantly reduces Firestore costs
- Estimated savings: 50-80% vs unindexed queries

**Bottom line**: Creating indexes is essential for both performance AND cost efficiency.

---

## References

- [Firestore Indexes Documentation](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Composite Indexes Guide](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Query Performance Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- Master Plan: `context/specs/0_master/packaging-management-feature.md`
