# Mobile Engineering Specification: Vehicle Model Master Screen

**Target URL:** `https://dev.defenceautolink.com/admin/model`  
**Web Source Code:** `src/app/admin/model/page.js`  
**Target Mobile Feature:** `csd-mobile/src/features/master/models/ModelMasterScreen.tsx`  
**Role Permissions Checked:** `model.create`, `model.edit`, `model.delete`, `model.export`

---

## 1. Screen Overview & Business Context

The **Vehicle Model Master** screen is the second level in the automotive product hierarchy (`Brand -> Model -> Variant -> Price`). It manages vehicle model names mapped under specific OEM brands and vehicle segments (e.g. `Brezza` under `Maruti Suzuki` in `4 Wheeler`, `Classic 350` under `Royal Enfield` in `2 Wheeler`, `Nexon` under `Tata Motors`).

In the mobile app, this screen provides:
1. Registration and cataloging of vehicle models linked to parent brands.
2. Segment isolation (`2 Wheeler` vs. `4 Wheeler`) with intelligent cascading: selecting a segment filters available brands so users cannot accidentally map a car under a bike brand.
3. Live metric counters for inventory and catalog depth.

---

## 2. Top KPI Summary Cards

The screen features 3 metric counters populated dynamically from `GET /api/models/stats` with a client-side fallback:

| KPI Card | Icon (`lucide-react-native`) | Display Value | Subtitle Text | Data Source |
| :--- | :--- | :--- | :--- | :--- |
| **Total Models** | `CarFront` | `{modelStats.total_models} Models` | Live Database Records | `modelStats.total_models` (fallback: `totalModels`) |
| **4 Wheeler Models** | `Car` | `{modelStats.four_wheeler_models} Models` | Cars, SUVs & Sedans | `modelStats.four_wheeler_models` |
| **2 Wheeler Models** | `Bike` | `{modelStats.two_wheeler_models} Models` | Bikes & Scooters | `modelStats.two_wheeler_models` |

### Fallback Rules:
- If `GET /api/models/stats` fails:
  - `total_models`: `serverPagination.total ?? models.length`
  - `four_wheeler_models`: `models.filter(m => m.vehicle_segment === "4 Wheeler").length`
  - `two_wheeler_models`: `models.filter(m => m.vehicle_segment === "2 Wheeler").length`

---

## 3. Header Action Buttons & Permissions

| Button Label | Icon | Permission | Action Flow & Behavior |
| :--- | :--- | :--- | :--- |
| **Export CSV** | `FileDown` | `model.export` | Triggers CSV export of models catalog. Shows toast: `"Exporting model catalog as CSV..."`. |
| **Add Model** | `PlusCircle` | `model.create` | Opens the **Add Model Modal / BottomSheet**. Resets `formData` to defaults: `{ vehicle_segment: "4 Wheeler", brand_id: brands[0]?.id \|\| "", name: "", status: "Active" }`. |

---

## 4. Search, Filtering & Pagination Subsystems

### 4.1 Filter Bar
1. **Segment Filter Dropdown (`segmentFilter`)**:
   - Options:
     - `""`: `All Segments`
     - `"4 Wheeler"`: `4 Wheeler`
     - `"2 Wheeler"`: `2 Wheeler`
   - Trigger: Reloads models matching segment (`params.vehicle_segment`).
2. **Brand Filter Dropdown (`brandFilter`)**:
   - Options: `All Brands` + dynamically populated from `GET /api/brands`.
   - Trigger: Filters models for specific brand (`params.brand_id`).
3. **Search Input (`searchTerm`)**:
   - Placeholder: `"Search model name..."`
   - Query parameter: `params.search = searchTerm`. Debounce by 300ms on mobile.

### 4.2 Pagination
- Query parameters: `page` (default `1`) and `per_page` (default `10`, options: `10, 20, 50, 100`).
- Server returns pagination in `response.data.pagination` or `response.data.meta` with keys `{ total, current_page, last_page, per_page }`.

---

## 5. Table / Mobile List Item Structure & Row Actions

In `csd-mobile`, render each vehicle model as an interactive card in a `FlatList`:

### Card Elements:
1. **Model Name**: Bold title text (`item.name`).
2. **Brand Badge**: Secondary subtle badge showing parent OEM brand name (`item.brand?.name || "N/A"`).
3. **Segment Icon & Badge**:
   - `4 Wheeler`: Blue subtle badge with `Car` icon.
   - `2 Wheeler`: Yellow/Orange subtle badge with `Bike` icon.
4. **Status Pill Indicator**:
   - `Active`: Green pill with glowing dot indicator.
   - `Inactive`: Gray pill indicator.
5. **Row Actions**:
   - **Edit Button** (`Pencil`, permission: `can("model.edit")`): Opens Edit Model Modal pre-filled with existing data.
   - **Delete Button** (`Trash2`, permission: `can("model.delete")`): Opens Delete Confirmation Modal.

---

## 6. Modals & Forms Field-by-Field Breakdown

### 6.1 Cascading Helper Logic: Segment-to-Brand Matching

To prevent human error, the system validates that the selected OEM Brand actually supports the chosen vehicle segment before displaying it in the brand picker:

```javascript
const isBrandMatchingSegment = (brand, segment) => {
  if (!segment || !brand) return true;
  const vt = brand.vehicle_type || brand.vehicle_segment || brand.segment;
  if (!vt) return true;
  const segNormalized = String(segment).toLowerCase().trim();
  const segNum = segNormalized.includes("2") ? "2" : segNormalized.includes("4") ? "4" : "";

  if (Array.isArray(vt)) {
    return vt.some((t) => {
      const s = String(t).toLowerCase().trim();
      return s === segNormalized || (segNum && s.includes(segNum));
    });
  }

  if (typeof vt === "string") {
    const s = vt.toLowerCase().trim();
    return s === segNormalized || (segNum && s.includes(segNum));
  }

  return true;
};
```

When the user switches the **Vehicle Segment** radio button, if the currently selected `brand_id` does not match the new segment, `brand_id` is automatically reset to `""` (empty), forcing the user to pick a valid brand!

---

### 6.2 Modal 1: Add Model Modal

- **Trigger**: "Add Model" button in header.
- **Form State**: `formData`

| Field Label | Form Key / API Key | Component Type | Required | Default Value | Validation Rules & Error Messages | Source of Options | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Vehicle Segment** | `vehicle_segment` | `RadioGroup` / Toggle Tabs | **YES** | `"4 Wheeler"` | Must be `"2 Wheeler"` or `"4 Wheeler"`. | Static: `["2 Wheeler", "4 Wheeler"]` | Changes brand dropdown options dynamically. |
| **Select Brand** | `brand_id` | `Select` / Picker | **YES** | `""` | `!brand_id` -> `"Please select a brand."` | Dynamic from `GET /api/brands`, filtered by `isBrandMatchingSegment(b, vehicle_segment)` | Parent OEM brand. |
| **Model Name** | `name` | `TextInput` | **YES** | `""` | `!name.trim()` -> `"Please enter a model name."` | User input | Name of the vehicle line (e.g. Brezza, Safari, Classic 350). |
| **Status** | `status` | `Select` | **YES** | `"Active"` | One of `Active`, `Inactive`. | Static: `["Active", "Inactive"]` | Inactive models are hidden from sales quotations. |

- **Submission Handler (`handleAddSubmit`)**:
  - Payload:
    ```json
    {
      "name": "Brezza",
      "brand_id": 1,
      "vehicle_segment": "4 Wheeler",
      "status": "Active"
    }
    ```
  - Calls `POST /api/models`.
  - On 200/201: Shows toast `"Model \"{name}\" added successfully!"`, resets form, closes modal, refreshes model list & stats.

---

### 6.3 Modal 2: Edit Model Modal

- **Trigger**: Click `Edit` pencil icon on any model card.
- **Pre-fill Data**:
  ```javascript
  {
    id: item.id,
    name: item.name,
    brand_id: item.brand_id,
    vehicle_segment: item.vehicle_segment || "4 Wheeler",
    status: item.status || "Active"
  }
  ```

| Field Label | Form Key / API Key | Component Type | Required | Default Value | Validation Rules | Source | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Vehicle Segment** | `vehicle_segment` | `RadioGroup` | **YES** | `editModel.vehicle_segment` | `"2 Wheeler"` or `"4 Wheeler"` | Static | Changing segment resets brand if invalid |
| **Select Brand** | `brand_id` | `Select` | **YES** | `editModel.brand_id` | Required | Dynamic (`GET /brands`) | Filtered by segment |
| **Model Name** | `name` | `TextInput` | **YES** | `editModel.name` | Required, non-empty | User input | Name of the model |
| **Status** | `status` | `Select` | **YES** | `editModel.status` | Required | Static: `["Active", "Inactive"]` | Status switch |

- **Submission Handler (`handleEditSubmit`)**:
  - Calls `PUT /api/models/{id}` with JSON body:
    ```json
    {
      "name": "Brezza Facelift",
      "brand_id": 1,
      "vehicle_segment": "4 Wheeler",
      "status": "Active"
    }
    ```
  - On success: Toast `"Model \"{name}\" updated successfully!"`, refreshes list.

---

### 6.4 Modal 3: Delete Confirmation Modal

- **Trigger**: Click `Trash` icon on any model card.
- **Target Record**: `deleteTarget` (`{ id, name }`).
- **Confirmation Message**: `"Are you sure you want to delete model \"{deleteTarget.name}\"?"`
- **Buttons**:
  - `Cancel` -> Dismisses modal.
  - `Delete Model` (`btn-danger`) -> Calls `DELETE /api/models/{id}`.
- **On Success**: Toast `"Model \"{name}\" deleted!"`, refreshes list & stats.

---

## 7. Integrated API Endpoints Specification

### 7.1 `GET /api/models`
- **Purpose**: Retrieve paginated list of vehicle models with brand relation.
- **Query Parameters**:
  - `page`: Integer (default: 1)
  - `per_page`: Integer (default: 10)
  - `search`: String (model name search)
  - `brand_id`: Integer/ID (filter by parent brand)
  - `vehicle_segment`: String (`"4 Wheeler"` or `"2 Wheeler"`)
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": [
      {
        "id": 12,
        "name": "Brezza",
        "brand_id": 1,
        "vehicle_segment": "4 Wheeler",
        "status": "Active",
        "brand": {
          "id": 1,
          "name": "Maruti Suzuki",
          "vehicle_type": ["4 Wheeler"]
        },
        "created_at": "2025-01-15T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "current_page": 1,
      "last_page": 5,
      "per_page": 10
    }
  }
  ```

---

### 7.2 `GET /api/models/stats`
- **Purpose**: Retrieve model inventory counters.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": {
      "total_models": 45,
      "four_wheeler_models": 35,
      "two_wheeler_models": 10,
      "active_models": 42
    }
  }
  ```

---

### 7.3 `GET /api/brands`
- **Purpose**: Populates brand dropdown in filters and Add/Edit modals.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": [
      { "id": 1, "name": "Maruti Suzuki", "vehicle_type": ["4 Wheeler"] },
      { "id": 2, "name": "Royal Enfield", "vehicle_type": ["2 Wheeler"] }
    ]
  }
  ```

---

### 7.4 `POST /api/models`
- **Purpose**: Create a new vehicle model.
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "name": "Nexon",
    "brand_id": 3,
    "vehicle_segment": "4 Wheeler",
    "status": "Active"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "status": true,
    "message": "Model created successfully.",
    "data": { "id": 46, "name": "Nexon", "brand_id": 3, "vehicle_segment": "4 Wheeler", "status": "Active" }
  }
  ```
- **Error Response (422 Unprocessable Content)**:
  ```json
  {
    "status": false,
    "message": "The brand id field is required.",
    "errors": {
      "brand_id": ["The brand id field is required."],
      "name": ["The model name has already been taken for this brand."]
    }
  }
  ```

---

### 7.5 `PUT /api/models/{id}`
- **Purpose**: Update an existing vehicle model.
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "name": "Nexon EV",
    "brand_id": 3,
    "vehicle_segment": "4 Wheeler",
    "status": "Active"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Model updated successfully."
  }
  ```

---

### 7.6 `DELETE /api/models/{id}`
- **Purpose**: Delete a model.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Model deleted successfully."
  }
  ```
- **Error Response (400 Bad Request / 409 Conflict)**:
  ```json
  {
    "status": false,
    "message": "Cannot delete model because it has associated variants."
  }
  ```

---

## 8. Static vs. Dynamic Values Dictionary

| Field / Concept | Static or Dynamic | Source / Location | Options / Allowed Values | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Vehicle Segment** | **Static** | Hardcoded in `ModelPage.js` (Lines 85, 559-601, 715-757) | `["2 Wheeler", "4 Wheeler"]` | Radio button selection in Add/Edit forms. Filters available brands. |
| **Status** | **Static** | Hardcoded in `ModelPage.js` (Lines 653-655, 809-811) | `["Active", "Inactive"]` | Controls model availability in quotation and deal creation. |
| **Brands Dropdown** | **Dynamic** | Fetched from DB via `GET /api/brands` | Array of Brand objects `{ id, name, vehicle_type }` | Populates the brand picker, dynamically filtered by `isBrandMatchingSegment`. |
| **Model Stats** | **Dynamic** | Fetched from DB via `GET /api/models/stats` | `{ total_models, four_wheeler_models, two_wheeler_models, active_models }` | Populates 3 top stat cards. |

---

## 9. Mobile Implementation Checklist for `csd-mobile`

1. **Segment Tabs**: In mobile, render `2 Wheeler` vs `4 Wheeler` as top segmented control chips for instant switching.
2. **Cascading Reset Warning**: If user changes the Segment while a Brand is selected that doesn't manufacture that segment, reset the brand picker to placeholder and display an informative helper note.
3. **Empty States**: If no models are returned for a filter, display a dedicated illustration or icon with a clear "Add Model" call-to-action button.
4. **Haptics**: Add light impact haptics when switching between segments and heavy feedback on delete confirmation.
