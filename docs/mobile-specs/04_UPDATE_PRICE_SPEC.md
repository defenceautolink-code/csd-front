# Mobile Engineering Specification: Vehicle Price Master & Bulk Updater

**Target URL:** `https://dev.defenceautolink.com/admin/update-price`  
**Web Source Code:** `src/app/admin/update-price/page.js`  
**API Service Code:** `src/services/priceMasterApi.js`  
**Target Mobile Feature:** `csd-mobile/src/features/master/pricing/UpdatePriceScreen.tsx`  
**Role Permissions:** Authorized Administrators & Pricing Managers

---

## 1. Screen Overview & Business Context

The **Vehicle Price Master & Bulk Updater** screen is a high-speed pricing revision console. Automotive OEMs periodically revise vehicle ex-showroom prices (e.g. annual manufacturer price hikes of 2%, seasonal discount reductions, or revised trim rates).

In the mobile app, this screen provides:
1. **Inline Price Editing**: Sales/Pricing managers can view the current catalog price, see the archived `Previous Price`, and type a revised rate directly into an editable numeric box.
2. **Bulk Pricing Toolbar**: Select multiple vehicle variants across models, enter a revised ex-showroom amount, and update all selected variants in a single tap.
3. **Automated Price History Archiving**: The backend and frontend automatically archive the existing rate into `previous_price` when a new `ex_showroom_price` is committed.
4. **Resilient Fallback Engine**: If the dedicated bulk backend endpoint (`/variants/bulk-update-prices`) is unreachable or returns 404, the app transparently falls back to batched individual `PUT /variants/{id}` updates without failing the user experience.

---

## 2. Header Actions & Quick Navigation

| Button Label | Icon (`lucide-react-native`) | Visual Style | Action & Behavior |
| :--- | :--- | :--- | :--- |
| **Send Quotation** | `FileSpreadsheet` | Outline Button | Navigates to the Quotation Generator screen (`/admin/quotation`) prepped for customer billing. |
| **Export Price Sheet** | `FileDown` | Primary Solid Button | Exports the active filtered list of variants, including Brand, Model, Variant, Previous Price, Revised Price, and Status as a downloadable CSV. |

---

## 3. Search & 3-Tier Cascading Filter Toolbar

The filter toolbar enables drill-down from hundreds of vehicle trims down to a specific variant:

```
[ Search Input ] -> [ Select Brand ] -> [ Select Model ] -> [ Select Variant ] -> [ Reset Filters ]
```

### 3.1 Cascading Filter Rules:
1. **Search Input (`searchTerm`)**:
   - Searches across `variant.name`, `model.name`, and `brand.name`.
   - Real-time client-side / memory filtering.
2. **Brand Filter Dropdown (`selectedBrandId`)**:
   - Lists all OEM Brands from `api.get("/brands")`.
   - When changed: Resets `selectedModelId = ""` and `selectedVariantId = ""`. Resets pagination to Page 1.
3. **Model Filter Dropdown (`selectedModelId`)**:
   - Filtered dynamically: `models.filter(m => String(m.brand_id) === String(selectedBrandId))`.
   - If no brand selected, lists all models.
   - Disabled if selected brand has 0 models.
   - When changed: Resets `selectedVariantId = ""`.
4. **Variant Filter Dropdown (`selectedVariantId`)**:
   - Filtered dynamically based on both `selectedBrandId` and `selectedModelId`.
   - Disabled if selected model has 0 variants.
5. **Reset / Clear Filter Button (`handleClearFilters`)**:
   - Appears only when any filter or search term is active.
   - Resets search, brand, model, and variant filters to blank and returns to Page 1.
6. **Total Variants Pill**: Displays live counter of matching records (e.g. `120 Variants`).

---

## 4. Docked / Floating Bulk Action Toolbar

When one or more variant cards/checkboxes are selected (`selectedIds.length > 0`), a high-visibility floating action banner appears:

### UI Components in Bulk Bar:
1. **Selection Counter Badge**:
   - Icon: `CheckCircle2`
   - Label: `"{selectedIds.length} Selected"`
2. **Quick Price Input Box (`quickAdjustValue`)**:
   - Currency prefix: `₹`
   - Numeric input with keyboard type `numeric`.
   - Placeholder: `"Enter price"`
   - Enter key listener: Triggers `handleBulkUpdate()`.
3. **Save Button (`handleBulkUpdate`)**:
   - Label: `"Save ({selectedIds.length})"`
   - Loading State: Shows spinner with text `"Saving..."`.
   - Auto-applies `quickAdjustValue` to all selected variants if entered, then dispatches the batch payload.
4. **Deselect All Button (`X`)**:
   - Clears `selectedIds = []` and resets `quickAdjustValue = ""`.

---

## 5. Table / Mobile List Item Structure & Inline Editing

In `csd-mobile`, render each vehicle variant as a structured pricing card:

### Card Structure:
1. **Checkbox Selector**:
   - Position: Left margin.
   - Toggles variant ID into/out of `selectedIds`.
2. **Row Number & Lineage**:
   - Brand pill badge (e.g. `Maruti Suzuki`).
   - Model name in bold (e.g. `Brezza`).
   - Variant Trim name with fuel type badge (e.g. `ZXI+ AT` `Petrol`).
3. **Previous Price Display**:
   - If `variant.previous_price` exists and `> 0`: Displays formatted currency `₹8,99,000` in muted monospace font.
   - If null/empty: Displays `-`.
4. **Revised Ex-Showroom (Inline Editable Input)**:
   - Currency adornment: `₹`.
   - Controlled numeric input tied to `revisedPrices[variant.id]`.
   - **Visual State Highlighting**:
     - If the typed value differs from the stored database price (`diff !== 0`), highlight the input field with a vibrant yellow/amber border and background (`bg-warning-subtle`).
5. **Row Save Action Button (`handleSaveSingleRow`)**:
   - Appears on the right side of each card.
   - If price has changed: Renders as solid Amber/Warning button with icon `Save` and label `"Save"`.
   - If price is unchanged: Renders as subtle outline button.
   - Disabled when saving or when bulk save is in progress.

---

## 6. Price Update Workflows & Handlers

### 6.1 Single Row Save (`handleSaveSingleRow(variant)`)
- **Validation**:
  ```javascript
  const newPriceVal = revisedPrices[variant.id];
  if (newPriceVal === "" || isNaN(newPriceVal) || Number(newPriceVal) <= 0) {
    showToast("Please enter a valid revised ex-showroom price.", "error");
    return;
  }
  ```
- **Execution**:
  - Sets `savingRowId = variant.id`.
  - Calls `priceMasterApi.updateSingleVariantPrice(variant.id, numPrice, additionalData)`.
  - Backend updates `price` and moves the old price to `previous_price`.
- **State Update**:
  - Updates local state so `previous_price` reflects old rate, `price` and `ex_showroom_price` reflect the new rate.
  - Toast: `"Price for \"{variant.name}\" revised to ₹{numPrice} successfully!"`.

---

### 6.2 Bulk Update Selected Variants (`handleBulkUpdate()`)
- **Validation**:
  - Ensures `selectedIds.length > 0`.
  - Validates that every selected variant has a positive revised price.
- **Payload Construction**:
  ```javascript
  const itemsToUpdate = selectedIds.map((id) => ({
    id: id,
    revised_price: Number(workingPrices[id])
  }));
  ```
- **Execution**:
  - Calls `priceMasterApi.bulkUpdatePrices({ variants: itemsToUpdate })`.
  - On success: Merges updated rates into local state, clears `selectedIds`, clears `quickAdjustValue`.
  - Toast: `"{count} Variant prices updated successfully!"`.

---

## 7. Integrated API Endpoints Specification

### 7.1 `GET /api/variants` (with fallback to `GET /api/price-master`)
- **Service Method**: `priceMasterApi.getVariants({ per_page: 100 })`
- **Query Parameters**: `per_page: 100`, optional `brand_id`, `model_id`, `search`.
- **Resilient Fallback**: If `GET /api/variants` fails (e.g. 404/500), automatically calls `GET /api/price-master`, navigates the nested tree `brands_master[].models[].variants[]`, and flattens into an identical variant array!
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": [
      {
        "id": 101,
        "name": "ZXI Plus Dual Tone",
        "brand_id": 1,
        "model_id": 12,
        "price": 950000,
        "ex_showroom_price": 950000,
        "previous_price": 930000,
        "fuel_type": "Petrol",
        "status": "Active",
        "brand": { "id": 1, "name": "Maruti Suzuki" },
        "model": { "id": 12, "name": "Brezza" }
      }
    ]
  }
  ```

---

### 7.2 `GET /api/brands`
- **Purpose**: Populates brand dropdown for cascading filters.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": [{ "id": 1, "name": "Maruti Suzuki" }, { "id": 2, "name": "Tata Motors" }]
  }
  ```

---

### 7.3 `GET /api/models`
- **Purpose**: Populates model dropdown for cascading filters.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": [{ "id": 12, "name": "Brezza", "brand_id": 1 }, { "id": 15, "name": "Nexon", "brand_id": 2 }]
  }
  ```

---

### 7.4 `POST /api/variants/bulk-update-prices` (Bulk Update Endpoint)
- **Service Method**: `priceMasterApi.bulkUpdatePrices(payload)`
- **Request Body (JSON)**:
  ```json
  {
    "variants": [
      { "id": 101, "revised_price": 975000 },
      { "id": 102, "revised_price": 995000 }
    ]
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "2 Variant prices updated successfully!",
    "data": [
      {
        "id": 101,
        "price": 975000,
        "ex_showroom_price": 975000,
        "previous_price": 950000,
        "on_road_price": 1092000
      },
      {
        "id": 102,
        "price": 995000,
        "ex_showroom_price": 995000,
        "previous_price": 970000,
        "on_road_price": 1114000
      }
    ]
  }
  ```
- **Transparent 404 Fallback in Service**:
  If `POST /variants/bulk-update-prices` returns 404 (endpoint not yet migrated in backend), `priceMasterApi.bulkUpdatePrices` catches the error and executes parallel `Promise.all` requests using individual `PUT /api/variants/{id}`:
  ```javascript
  await Promise.all(
    payload.variants.map((v) =>
      api.put(`/variants/${v.id}`, {
        price: v.revised_price,
        ex_showroom_price: v.revised_price,
      })
    )
  );
  ```

---

### 7.5 Single Variant Update
- **Service Method**: `priceMasterApi.updateSingleVariantPrice(variantId, revisedPrice, additionalData)`
- **Behavior**: Calls `POST /api/variants/bulk-update-prices` with a single item array:
  ```json
  {
    "variants": [{ "id": 101, "revised_price": 975000 }]
  }
  ```
  If bulk fails, falls back to `PUT /api/variants/{id}` with `{ price, ex_showroom_price, status }`.

---

## 8. Static vs. Dynamic Values Dictionary

| Field / Concept | Static or Dynamic | Source / Location | Options / Allowed Values | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Currency Formatter** | **Static Utility** | `formatCurrency(val)` in `UpdatePricePage.js` | Indian numbering format `₹xx,xx,xxx` | Renders Indian rupee standard formatting. |
| **PerPage Options** | **Static Array** | `Pagination.js` | `[10, 15, 25, 50, 100]` | Number of variant cards rendered per page. |
| **Variants Catalog** | **Dynamic** | Fetched via `priceMasterApi.getVariants` | Array of Variant objects with Brand and Model | Core pricing data register. |
| **Brands & Models** | **Dynamic** | Fetched from `/brands` and `/models` | Array of Brand and Model objects | Cascading dropdown options. |

---

## 9. Mobile Implementation Checklist for `csd-mobile`

1. **Keypad Optimization**: When tapping the "Revised Ex-Showroom" input, pop the numeric keypad immediately (`keyboardType="number-pad"`), with an accessory "Done" button on iOS.
2. **Keyboard Avoiding View**: Use `KeyboardAvoidingView` or `react-native-keyboard-controller` so that typing does not hide the floating bulk action bar.
3. **Change Detection Animation**: Use `react-native-reanimated` to smoothly transition card background color to amber when the user modifies a price.
4. **Haptic Feedback**:
   - Light haptic on checkbox toggle.
   - Medium haptic on single save.
   - Success notification haptic on bulk update.
