# Mobile Engineering Specification: Vehicle Variant Master Screen

**Target URL:** `https://dev.defenceautolink.com/admin/variant`  
**Web Source Code:** `src/app/admin/variant/page.js`  
**Target Mobile Feature:** `csd-mobile/src/features/master/variants/VariantMasterScreen.tsx`  
**Role Permissions Checked:** `variant.create`, `variant.edit`, `variant.delete`, `variant.export`

---

## 1. Screen Overview & Business Context

The **Vehicle Variant Master** screen is the third tier in the automotive catalog hierarchy (`Brand -> Model -> Variant -> Price`). It manages specific trims, engine options, and fuel configurations of vehicle models (e.g. `ZXI Plus Petrol Manual`, `LXI CNG`, `Dual Tone ABS`) along with their baseline catalog prices.

In the mobile app, this screen enables:
1. Creating and updating specific vehicle trims linked directly to both parent Brand and parent Model.
2. Two-step cascading dependency: selecting Brand automatically limits available Models to those produced by that Brand.
3. Setting base ex-showroom prices that feed into the Quotation Generator, Deal Calculator, and Bulk Price Updater.

---

## 2. Top KPI Summary Cards

The screen features 4 metric counters populated dynamically from `GET /api/variants/stats` with a client-side fallback:

| KPI Card | Icon (`lucide-react-native`) | Display Value | Subtitle Text | Data Source |
| :--- | :--- | :--- | :--- | :--- |
| **Total Variants** | `Tags` | `{variantStats.total_variants} Trims` | Live Database Records | `variantStats.total_variants` (fallback: `totalVariants`) |
| **Active Trims** | `CheckCircle` | `{variantStats.active_trims} Trims` | Current Available Lineup | `variantStats.active_trims` |
| **Mapped Models** | `CarFront` | `{variantStats.mapped_models} Models` | Active Vehicle Models | `variantStats.mapped_models` |
| **Inactive Trims** | `XCircle` | `{variantStats.inactive_trims} Trims` | Archived or Discontinued | `variantStats.inactive_trims` |

### Fallback Rules:
- If `GET /api/variants/stats` fails:
  - `total_variants`: `serverPagination.total ?? variants.length`
  - `active_trims`: `variants.filter(v => v.status === "Active").length`
  - `inactive_trims`: `variants.filter(v => v.status === "Inactive").length`
  - `mapped_models`: Number of unique `model_id`s in current variant dataset.

---

## 3. Header Action Buttons & Permissions

| Button Label | Icon | Permission | Action Flow & Behavior |
| :--- | :--- | :--- | :--- |
| **Export CSV** | `FileDown` | `variant.export` | Triggers CSV export of all vehicle variants. Toast: `"Exporting vehicle variants as CSV..."`. |
| **Add Variant** | `PlusCircle` | `variant.create` | Opens the **Add Variant Modal / BottomSheet**. Resets `formData` to defaults: `{ brand_id: "", model_id: "", name: "", price: "", status: "Active" }`. |

---

## 4. Search, Filtering & Pagination Subsystems

### 4.1 Cascading Filter Toolbar
1. **Brand Filter Dropdown (`brandFilter`)**:
   - Populated from `GET /api/brands`.
   - When changed, resets `modelFilter = ""` and filters variants for that brand.
2. **Model Filter Dropdown (`modelFilter`)**:
   - Filtered conditionally: if a brand is selected, only models belonging to that brand are displayed (`m.brand_id === brandFilter`).
   - If no brand selected, displays all models from `GET /api/models`.
3. **Search Input (`searchTerm`)**:
   - Placeholder: `"Search variant, model..."`
   - Multi-field query: matches against Variant name, Model name, and Brand name. Debounce by 300ms on mobile.

### 4.2 Pagination
- Standard API query parameters: `page` (default `1`) and `per_page` (default `10`, options: `10, 20, 50, 100`).
- Server returns either `response.data.pagination` or `response.data.meta`.

---

## 5. Table / Mobile List Item Structure & Row Actions

In `csd-mobile`, render each variant trim as a structured card in a `FlatList`:

### Card Elements:
1. **Variant Trim Name**: Bold title text (`variant.name`).
2. **Brand & Model Lineage**:
   - Brand pill badge (`variant.brand?.name || "Brand"`).
   - Model name text (`variant.model?.name || "Model"`).
3. **Catalog Price**: Formatted currency string in Indian Rupees (e.g. `₹8,99,000`).
4. **Status Pill Indicator**:
   - `Active`: Green pill badge.
   - `Inactive`: Gray pill badge.
5. **Row Actions**:
   - **Edit Button** (`Pencil`, permission: `can("variant.edit")`): Opens Edit Variant Modal pre-filled with data.
   - **Delete Button** (`Trash2`, permission: `can("variant.delete")`): Opens Delete Confirmation Modal.

---

## 6. Modals & Forms Field-by-Field Breakdown

### 6.1 Modal 1: Add Variant Modal

- **Trigger**: "Add Variant" button in header.
- **Form State**: `formData`

| Field Label | Form Key / API Key | Component Type | Required | Default Value | Validation Rules & Error Messages | Source of Options | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Select Brand** | `brand_id` | `Select` / Picker | **YES** | `""` | `!brand_id` -> `"Please select a brand."` | Dynamic (`GET /api/brands`) | Parent OEM manufacturer. |
| **Select Model** | `model_id` | `Select` / Picker | **YES** | `""` | `!model_id` -> `"Please select a model."` | Dynamic (`GET /api/models`), filtered by `m.brand_id === formData.brand_id` | Child model under selected brand. Disabled until brand is picked. |
| **Variant Name** | `name` | `TextInput` | **YES** | `""` | `!name.trim()` -> `"Please enter a variant name."` | User input | Trim name (e.g. `ZXI+ AMT`, `Adventure Edition`, `Standard`). |
| **Price (₹)** | `price` | `NumberInput` / `TextInput` with numeric keypad | **YES** | `""` | `!price \|\| isNaN(price) \|\| price <= 0` -> `"Please enter a valid price."` | User input | Base catalog Ex-Showroom price. |
| **Status** | `status` | `Select` | **YES** | `"Active"` | One of `Active`, `Inactive`. | Static: `["Active", "Inactive"]` | Availability flag. |

- **Cascading Filter Implementation in Add Form**:
  ```javascript
  const availableModelsForAdd = formData.brand_id
    ? models.filter((m) => String(m.brand_id) === String(formData.brand_id))
    : models;
  ```
  When `formData.brand_id` changes, reset `formData.model_id = ""`.

- **Submission Handler (`handleAddSubmit`)**:
  - Request body:
    ```json
    {
      "brand_id": 1,
      "model_id": 12,
      "name": "ZXI Plus Dual Tone",
      "price": 1050000,
      "status": "Active"
    }
    ```
  - Calls `POST /api/variants`.
  - On success: Shows toast `"Variant \"{name}\" added successfully!"`, resets form, closes modal, refreshes variant list & stats.

---

### 6.2 Modal 2: Edit Variant Modal

- **Trigger**: Click `Edit` pencil icon on any variant card.
- **Pre-fill Data**:
  ```javascript
  {
    id: variant.id,
    brand_id: variant.brand_id || variant.brand?.id,
    model_id: variant.model_id || variant.model?.id,
    name: variant.name,
    price: variant.price || variant.ex_showroom_price || "",
    status: variant.status || "Active"
  }
  ```

| Field Label | Form Key / API Key | Component Type | Required | Default Value | Validation Rules | Source | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Select Brand** | `brand_id` | `Select` | **YES** | `editVariant.brand_id` | Required | Dynamic (`GET /brands`) | Switching brand updates available models |
| **Select Model** | `model_id` | `Select` | **YES** | `editVariant.model_id` | Required | Dynamic (`GET /models`), filtered by `brand_id` | Model trim belongs to |
| **Variant Name** | `name` | `TextInput` | **YES** | `editVariant.name` | Required, non-empty | User input | Trim name |
| **Price (₹)** | `price` | `NumberInput` | **YES** | `editVariant.price` | Valid positive number | User input | Catalog rate |
| **Status** | `status` | `Select` | **YES** | `editVariant.status` | Required | Static: `["Active", "Inactive"]` | Status switch |

- **Submission Handler (`handleEditSubmit`)**:
  - Calls `PUT /api/variants/{id}` with JSON body:
    ```json
    {
      "brand_id": 1,
      "model_id": 12,
      "name": "ZXI Plus Dual Tone Revised",
      "price": 1075000,
      "status": "Active"
    }
    ```
  - On success: Toast `"Variant \"{name}\" updated successfully!"`, refreshes list.

---

### 6.3 Modal 3: Delete Confirmation Modal

- **Trigger**: Click `Trash` icon on any variant card.
- **Target Record**: `deleteTarget` (`{ id, name }`).
- **Confirmation Message**: `"Are you sure you want to delete variant \"{deleteTarget.name}\"?"`
- **Buttons**:
  - `Cancel` -> Dismisses modal.
  - `Delete Variant` (`btn-danger`) -> Calls `DELETE /api/variants/{id}`.
- **On Success**: Toast `"Variant \"{name}\" deleted!"`, refreshes list & stats.

---

## 7. Integrated API Endpoints Specification

### 7.1 `GET /api/variants`
- **Purpose**: Retrieve paginated list of vehicle variants with Brand and Model objects.
- **Query Parameters**:
  - `page`: Integer (default: 1)
  - `per_page`: Integer (default: 10)
  - `search`: String (query across variant/model/brand)
  - `brand_id`: Integer/ID (filter by parent brand)
  - `model_id`: Integer/ID (filter by parent model)
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": [
      {
        "id": 101,
        "name": "ZXI Plus Petrol",
        "brand_id": 1,
        "model_id": 12,
        "price": 950000,
        "ex_showroom_price": 950000,
        "status": "Active",
        "brand": { "id": 1, "name": "Maruti Suzuki" },
        "model": { "id": 12, "name": "Brezza" },
        "created_at": "2025-01-15T14:00:00Z"
      }
    ],
    "pagination": {
      "total": 120,
      "current_page": 1,
      "last_page": 12,
      "per_page": 10
    }
  }
  ```

---

### 7.2 `GET /api/variants/stats`
- **Purpose**: Retrieve variant inventory summary stats.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": {
      "total_variants": 120,
      "active_trims": 115,
      "mapped_models": 45,
      "inactive_trims": 5
    }
  }
  ```

---

### 7.3 `POST /api/variants`
- **Purpose**: Create a new vehicle variant.
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "brand_id": 1,
    "model_id": 12,
    "name": "VXI CNG",
    "price": 875000,
    "status": "Active"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "status": true,
    "message": "Variant created successfully.",
    "data": { "id": 121, "name": "VXI CNG", "price": 875000, "status": "Active" }
  }
  ```

---

### 7.4 `PUT /api/variants/{id}`
- **Purpose**: Update an existing vehicle variant.
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "brand_id": 1,
    "model_id": 12,
    "name": "VXI CNG Updated",
    "price": 880000,
    "status": "Active"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Variant updated successfully."
  }
  ```

---

### 7.5 `DELETE /api/variants/{id}`
- **Purpose**: Delete a variant.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Variant deleted successfully."
  }
  ```

---

## 8. Static vs. Dynamic Values Dictionary

| Field / Concept | Static or Dynamic | Source / Location | Options / Allowed Values | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Status** | **Static** | Hardcoded in `VariantPage.js` (Lines 67, 184, 225) | `["Active", "Inactive"]` | Flags variant active state in quotations and deals. |
| **Brands Dropdown** | **Dynamic** | Fetched from DB via `GET /api/brands` | Array of Brand objects `{ id, name }` | Top-level filter and parent selector. |
| **Models Dropdown** | **Dynamic** | Fetched from DB via `GET /api/models` | Array of Model objects `{ id, name, brand_id }` | Dynamically filtered based on selected `brand_id`. |
| **Variant Stats** | **Dynamic** | Fetched from DB via `GET /api/variants/stats` | `{ total_variants, active_trims, mapped_models, inactive_trims }` | Populates top KPI counters. |

---

## 9. Mobile Implementation Checklist for `csd-mobile`

1. **Two-Stage Cascading Picker**: In the Add/Edit form, make the Model dropdown appear disabled or with helper placeholder `"First select a Brand"` until a brand is selected.
2. **Numeric Input Handling**: Use `keyboardType="numeric"` or `"decimal-pad"` with clean currency formatting (`formatIndianCurrency(val)`).
3. **Optimistic UI Updates**: When updating price or status, update the local React Query cache immediately so user sees instant feedback.
