# Mobile Engineering Specification: Brand Master Screen

**Target URL:** `https://dev.defenceautolink.com/admin/brand`  
**Web Source Code:** `src/app/admin/brand/page.js`  
**Target Mobile Feature:** `csd-mobile/src/features/master/brands/BrandMasterScreen.tsx`  
**Role Permissions Checked:** `brand.create`, `brand.edit`, `brand.delete`, `brand.export`

---

## 1. Screen Overview & Business Context

The **Brand Master** screen is the top of the automotive catalog hierarchy (`Brand -> Model -> Variant -> Price`). It manages vehicle Original Equipment Manufacturers (OEMs) such as Maruti Suzuki, Tata Motors, Hyundai, Royal Enfield, Honda, etc.

In the mobile app, this screen serves as the single source of truth for:
1. Adding new vehicle manufacturers with their official brand logos and supported vehicle categories (`2 Wheeler`, `4 Wheeler`, or both).
2. Modifying brand details, updating brand logos, or toggling Active/Inactive status.
3. Enabling cascading lookups across Lead Creation, Quotation Builders, Deal Converters, and Price Master screens.

---

## 2. Top KPI Summary Cards

The screen features 3 metric counters populated dynamically from `GET /api/brands/stats` with a client-side fallback to the loaded list:

| KPI Card | Icon (`lucide-react-native`) | Display Value | Subtitle Text | Data Source |
| :--- | :--- | :--- | :--- | :--- |
| **Total Brands** | `ShieldCheck` / `Layers` | `{brandStats.total_brands} Brands` | Live Database Records | `brandStats.total_brands` (fallback: `totalBrands`) |
| **4 Wheeler Brands** | `Car` | `{fourWheelerCount} Brands` | Car OEM Manufacturers | `brandStats.four_wheeler_brands` |
| **2 Wheeler Brands** | `Bike` | `{twoWheelerCount} Brands` | Bikes & Scooters | `brandStats.two_wheeler_brands` |

### Calculation & Fallback Rules:
- Primary source: `res.data.data` from `GET /api/brands/stats`.
- If the stats API fails or is not yet migrated, calculate:
  - `total_brands`: `serverPagination.total ?? brands.length`
  - `four_wheeler_brands`: `brands.filter(b => b.vehicle_type?.includes("4 Wheeler")).length`
  - `two_wheeler_brands`: `brands.filter(b => b.vehicle_type?.includes("2 Wheeler")).length`

---

## 3. Header Action Buttons & Permissions

| Button Label | Icon | Permission | Action Flow & Behavior |
| :--- | :--- | :--- | :--- |
| **Export CSV** | `FileDown` | `brand.export` | Triggers CSV export of all current brands. On mobile, can trigger Excel/CSV share sheet or can be omitted if mobile is manage-only. |
| **Add Brand** | `PlusCircle` | `brand.create` | Opens the **Add Brand Modal / BottomSheet**. Resets `formData` to defaults: `{ name: "", vehicle_type: ["4 Wheeler"], logo: null, status: "Active" }`. |

---

## 4. Search, Filtering & Pagination Subsystems

### 4.1 Filter Bar
1. **Search Input (`searchTerm`)**:
   - Placeholder: `"Search brand name..."`
   - Real-time client/server query string. When typed, triggers `fetchBrands({ search: searchTerm })`.
   - On mobile, debounce by 300ms.
2. **Vehicle Type Filter Dropdown (`typeFilter`)**:
   - Options:
     - `""`: `All Types`
     - `"4 Wheeler"`: `4 Wheeler`
     - `"2 Wheeler"`: `2 Wheeler`
   - Filters brands where `vehicle_type` array includes the selected option.

### 4.2 Pagination
- Standard API query parameters: `page` (default `1`) and `per_page` (default `10`, options: `10, 20, 50, 100`).
- Server returns either `response.data.pagination` or `response.data.meta` with keys `{ total, current_page, last_page, per_page }`.
- If backend returns a non-paginated flat array, fallback to client-side slicing:
  `filteredBrands.slice((currentPage - 1) * perPage, currentPage * perPage)`.

---

## 5. Table / Mobile List Item Structure & Row Actions

On web, data is displayed in a table. In mobile (`csd-mobile`), render as a `FlatList` with clean cards:

### Card Elements:
1. **Brand Logo / Initial Avatar**:
   - If `brand.logo` exists:
     - If URL starts with `http`: render directly.
     - If relative path: prepend `BASE_STORAGE_URL` (`API_URL.replace(/\/api\/?$/, "")`).
   - If no logo: Fallback box with brand's first initial letter (`brand.name.charAt(0)`), dark green background `#2A301E`, lime green text `#A3E635`.
2. **Brand Name**: Bold title text (`brand.name`).
3. **Vehicle Type Badges**:
   - `4 Wheeler`: Blue subtle badge with `Car` icon.
   - `2 Wheeler`: Yellow/Orange subtle badge with `Bike` icon.
4. **Status Indicator**:
   - `Active`: Green pill badge with glowing dot indicator.
   - `Inactive`: Gray pill badge.
5. **Row Actions**:
   - **Edit Button** (`Pencil`, permission: `can("brand.edit")`): Opens Edit Brand Modal pre-filled with brand data.
   - **Delete Button** (`Trash2`, permission: `can("brand.delete")`): Opens Delete Confirmation Modal.

---

## 6. Modals & Forms Field-by-Field Breakdown

### 6.1 Modal 1: Add Brand Modal

- **Trigger**: "Add Brand" button in header.
- **Form State**: `formData`

| Field Label | Form Key / API Key | Component Type | Required | Default Value | Validation Rules & Error Messages | Source of Options | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Brand Name** | `name` | `TextInput` | **YES** | `""` | `!name.trim()` -> `"Please enter a brand name."` | User Input | Name of the OEM (e.g. Maruti Suzuki, Royal Enfield) |
| **Vehicle Type** | `vehicle_type` | `CheckboxGroup` / Toggle Chips | **YES** | `["4 Wheeler"]` | Must select at least 1 category. Minimum length = 1. Cannot uncheck all. | Static: `["2 Wheeler", "4 Wheeler"]` | Enables filtering in vehicle selection dropdowns. Can select both! |
| **Brand Logo Image** | `logo` | `FilePicker` / `ImagePicker` | **YES** | `null` | Must be an image file (`image/png, image/jpeg, image/svg+xml`). Error: `"Brand logo image is required. Please upload a logo."` | Device Gallery / Camera | Brand logo shown across quotes, invoice banners, and deal cards. |
| **Status** | `status` | `Select` / Dropdown | **YES** | `"Active"` | Must be one of `Active`, `Inactive`. | Static: `["Active", "Inactive"]` | Inactive brands are hidden from sales executive lead creation forms. |

- **Submission Handler (`handleAddSubmit`)**:
  - Encodes payload as `multipart/form-data` using `FormData`:
    ```javascript
    const data = new FormData();
    data.append("name", formData.name.trim());
    data.append("status", formData.status);
    data.append("vehicle_type", JSON.stringify(formData.vehicle_type)); // Array serialized as JSON string
    data.append("logo", { uri, name, type });
    ```
  - Calls `POST /api/brands`.
  - On 200/201: Shows toast `"Brand {name} added successfully!"`, closes modal, refreshes brand list & stats.

---

### 6.2 Modal 2: Edit Brand Modal

- **Trigger**: Click `Edit` pencil icon on any brand card.
- **Pre-fill Data**:
  ```javascript
  {
    id: brand.id,
    name: brand.name,
    vehicle_type: Array.isArray(brand.vehicle_type) ? brand.vehicle_type : [brand.vehicle_type || "4 Wheeler"],
    logo: brand.logo,
    status: brand.status || "Active",
    newLogo: null
  }
  ```

| Field Label | Form Key / API Key | Component Type | Required | Default Value | Validation Rules | Source | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Brand Name** | `name` | `TextInput` | **YES** | `brand.name` | `!name.trim()` -> `"Please enter a brand name."` | Existing value | Editable |
| **Vehicle Type** | `vehicle_type` | `CheckboxGroup` | **YES** | Existing array | Must have >= 1 checked. | Static: `["2 Wheeler", "4 Wheeler"]` | Multi-select toggle |
| **Brand Logo Image** | `logo` (`newLogo`) | `ImagePicker` | **NO (Optional)** | `null` | Optional. If selected, replaces current logo image. | Device Gallery | If user doesn't pick a new image, existing image remains on server. |
| **Status** | `status` | `Select` | **YES** | `brand.status` | One of `Active`, `Inactive` | Static: `["Active", "Inactive"]` | Status switch |

- **Submission Handler (`handleEditSubmit`)**:
  - Uses Laravel multipart method spoofing `_method: "PUT"` with `POST`:
    ```javascript
    const data = new FormData();
    data.append("_method", "PUT"); // Crucial for PHP/Laravel multipart form handling
    data.append("name", editBrand.name.trim());
    data.append("status", editBrand.status);
    data.append("vehicle_type", JSON.stringify(editBrand.vehicle_type || []));
    if (editBrand.newLogo) {
      data.append("logo", editBrand.newLogo);
    }
    ```
  - Calls `POST /api/brands/{id}` with header `Accept: application/json`.
  - On success: Shows toast `"Brand {name} updated successfully!"`, refreshes list.

---

### 6.3 Modal 3: Delete Confirmation Modal

- **Trigger**: Click `Trash` icon on any brand card.
- **Target Record**: `deleteTarget` (`{ id, name }`).
- **Confirmation Message**: `"Are you sure you want to delete brand \"{deleteTarget.name}\"?"`
- **Buttons**:
  - `Cancel` -> Closes modal without action.
  - `Delete Brand` (`btn-danger`) -> Calls `DELETE /api/brands/{id}`.
- **On Success**: Toast `"Brand \"{name}\" deleted!"`, refreshes list & stats.

---

## 7. Integrated API Endpoints Specification

### 7.1 `GET /api/brands`
- **Purpose**: Retrieve paginated list of automotive brands with optional filters.
- **Query Parameters**:
  - `page`: Integer (default: 1)
  - `per_page`: Integer (default: 10)
  - `search`: String (optional search query)
  - `vehicle_type`: String (optional, e.g. `"4 Wheeler"` or `"2 Wheeler"`)
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": [
      {
        "id": 1,
        "name": "Maruti Suzuki",
        "vehicle_type": ["4 Wheeler"],
        "logo": "brands/maruti_logo.png",
        "status": "Active",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 24,
      "current_page": 1,
      "last_page": 3,
      "per_page": 10
    }
  }
  ```

---

### 7.2 `GET /api/brands/stats`
- **Purpose**: Retrieve top KPI counters for brands.
- **Query Parameters**: None.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": {
      "total_brands": 24,
      "four_wheeler_brands": 18,
      "two_wheeler_brands": 6,
      "active_brands": 22
    }
  }
  ```

---

### 7.3 `POST /api/brands`
- **Purpose**: Create a new brand record with logo upload.
- **Headers**: `Content-Type: multipart/form-data`, `Accept: application/json`
- **Request Body (FormData)**:
  - `name`: String (Required)
  - `vehicle_type`: String (JSON stringified array, e.g. `'["4 Wheeler"]'` or `'["2 Wheeler","4 Wheeler"]'`)
  - `logo`: File / Blob binary (Required)
  - `status`: String (`"Active"` or `"Inactive"`)
- **Success Response (201 Created)**:
  ```json
  {
    "status": true,
    "message": "Brand created successfully.",
    "data": {
      "id": 25,
      "name": "Mahindra",
      "vehicle_type": ["4 Wheeler"],
      "logo": "brands/mahindra_logo.png",
      "status": "Active"
    }
  }
  ```
- **Error Response (422 Unprocessable Content)**:
  ```json
  {
    "status": false,
    "message": "The logo field is required.",
    "errors": {
      "logo": ["The logo field is required."],
      "name": ["The brand name has already been taken."]
    }
  }
  ```

---

### 7.4 `POST /api/brands/{id}` (Method Spoofed `PUT`)
- **Purpose**: Update an existing brand record with optional logo replacement.
- **Headers**: `Content-Type: multipart/form-data`, `Accept: application/json`
- **Request Body (FormData)**:
  - `_method`: `"PUT"` (Required for Laravel to parse multipart PUT payloads)
  - `name`: String (Required)
  - `vehicle_type`: String (JSON stringified array)
  - `logo`: File / Blob binary (Optional)
  - `status`: String (`"Active"` or `"Inactive"`)
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Brand updated successfully.",
    "data": {
      "id": 1,
      "name": "Maruti Suzuki India Ltd",
      "status": "Active"
    }
  }
  ```

---

### 7.5 `DELETE /api/brands/{id}`
- **Purpose**: Remove a brand record.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Brand deleted successfully."
  }
  ```
- **Error Response (400 Bad Request / 409 Conflict)**:
  ```json
  {
    "status": false,
    "message": "Cannot delete brand because it has associated vehicle models."
  }
  ```

---

## 8. Static vs. Dynamic Values Dictionary

| Field / Concept | Static or Dynamic | Source / Location | Options / Allowed Values | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Vehicle Types** | **Static** | Hardcoded in `BrandPage.js` (Lines 63, 107-136, 598-622) | `["2 Wheeler", "4 Wheeler"]` | Checkboxes in Add/Edit forms. Multi-select: Brand can manufacture both. |
| **Status** | **Static** | Hardcoded in `BrandPage.js` (Lines 662-666, 798-801) | `["Active", "Inactive"]` | Controls whether brand appears in quotation & lead dropdowns. |
| **Brand Directory** | **Dynamic** | Fetched from DB via `GET /api/brands` | Array of Brand objects `{ id, name, vehicle_type, logo, status }` | Drives the list view and downstream Model dropdowns. |
| **Brand Stats** | **Dynamic** | Fetched from DB via `GET /api/brands/stats` | `{ total_brands, four_wheeler_brands, two_wheeler_brands, active_brands }` | Drives the 3 top stat cards. |

---

## 9. Mobile Implementation Checklist for `csd-mobile`

1. **State Management**: Use React Query (`useQuery`, `useMutation`) for caching `GET /api/brands` and `GET /api/brands/stats`.
2. **Image Picker**: Use `react-native-image-picker` or `expo-image-picker` with compression (`quality: 0.8`) and MIME type validation (`image/jpeg, image/png, image/webp`).
3. **Multipart Upload**: In React Native, format files as `{ uri, name: "logo.png", type: "image/png" }`.
4. **Method Spoofing**: Remember to add `data.append("_method", "PUT")` when editing, because React Native standard fetch with `PUT` cannot stream multipart binaries reliably to PHP Laravel backend.
5. **Haptics & Feedback**:
   - Trigger `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` when opening the Add/Edit modal.
   - Trigger `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` upon successful save.
6. **Permission Checks**: Wrap buttons with `can("brand.create")`, `can("brand.edit")`, `can("brand.delete")`.
