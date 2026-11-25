# Mobile Engineering Specification: Lead Source Master Screen

**Target URL:** `https://dev.defenceautolink.com/admin/lead-source`  
**Web Source Code:** `src/app/admin/lead-source/page.js`  
**Target Mobile Feature:** `csd-mobile/src/features/master/leadsources/LeadSourceMasterScreen.tsx`  
**Role Permissions:** Authorized Administrators & Sales Managers

---

## 1. Screen Overview & Business Context

The **Lead Source Master** screen manages lead acquisition channels and marketing origin points. In automotive sales operations, tracking where prospective defense buyers originate is critical for calculating marketing Return On Investment (ROI), channel attribution, and sales team lead distribution.

Common lead sources include:
- `Showroom Walk-in`
- `Canteen / Unit Camp Referral`
- `Defence AutoLink Website`
- `Facebook / Meta Ads`
- `Instagram Ads`
- `WhatsApp Campaign`
- `Existing Customer Reference`
- `Armed Forces Veteran Association`

In the mobile app, this screen manages the master channels that populate the **Lead Source** dropdown across:
1. Sales Executive Quick Lead Capture (`/admin/leads` Add Lead Modal).
2. Follow-Up Logging and Inquiry Tracking.
3. Deal Conversion and Commission Attribution.

---

## 2. Top KPI Summary Cards

The screen features metric counters populated dynamically from `GET /api/lead-sources/stats` with a client-side fallback:

| KPI Card | Icon (`lucide-react-native`) | Display Value | Subtitle Text | Data Source |
| :--- | :--- | :--- | :--- | :--- |
| **Total Channels** | `GitFork` / `Diagram3` | `{sourceStats.total_channels} Sources` | Live Database Records | `sourceStats.total_channels` (fallback: `totalSources`) |
| **Active Channels** | `CheckCircle` | `{sourceStats.active_channels} Active` | Enabled in Lead Forms | `sourceStats.active_channels` |
| **Top Acquisition Channel** | `Trophy` / `Award` | `{sourceStats.top_channel}` | Most Leads Generated | `sourceStats.top_channel` (default: `"Showroom Walk-in"`) |

### Fallback Rules:
- If `GET /api/lead-sources/stats` fails:
  - `total_channels`: `serverPagination.total ?? leadSources.length`
  - `active_channels`: `leadSources.filter(s => s.status === "Active").length`

---

## 3. Header Action Buttons & Actions

| Button Label | Icon (`lucide-react-native`) | Visual Style | Action & Behavior |
| :--- | :--- | :--- | :--- |
| **Export Excel** | `FileSpreadsheet` | Outline Button with Green Icon | Fetches complete dataset via `GET /api/lead-sources?all=true` and generates an `.xlsx` workbook using `xlsx` library with auto-sized columns. |
| **Add Lead Source** | `PlusCircle` | Primary Solid Button | Opens the **Add Lead Source Modal / BottomSheet**. Resets `formData` to `{ title: "", status: "Active" }`. |

---

## 4. Search & Pagination Subsystems

### 4.1 Search Bar (`searchTerm`)
- **Placeholder**: `"Search channel title..."`
- **Behavior**: Filters lead sources by `source.title`.
- **Query Parameter**: Triggers `fetchLeadSources({ search: searchTerm.trim() })`. Debounce by 300ms on mobile.
- Resets `currentPage = 1` whenever user types.

### 4.2 Pagination
- Standard API query parameters: `page` (default `1`) and `per_page` (default `10`, options: `10, 20, 50, 100`).
- Server returns either `response.data.pagination` or `response.data.meta` with keys `{ total, current_page, last_page, per_page }`.
- Fallback: If non-paginated flat array returned, client slices locally:
  `filteredSources.slice((currentPage - 1) * perPage, currentPage * perPage)`.

---

## 5. Mobile List Item Structure & Row Actions

In `csd-mobile`, render each channel as an interactive card in a `FlatList`:

### Card Elements:
1. **Source Title**: Bold title text (`source.title`).
2. **Status Indicator Pill**:
   - `Active`: Green pill badge with glowing dot indicator.
   - `Inactive`: Gray pill badge.
3. **Creation Date**: Formatted date string (e.g. `15 Jan 2025`).
4. **Row Actions**:
   - **Edit Button** (`Pencil`): Opens Edit Source Modal pre-filled with existing data.
   - **Delete Button** (`Trash2`): Opens Delete Confirmation Modal.

---

## 6. Modals & Forms Field-by-Field Breakdown

### 6.1 Modal 1: Add Lead Source Modal

- **Trigger**: "Add Lead Source" button in header.
- **Form State**: `formData` (`{ title: "", status: "Active" }`)

| Field Label | Form Key / API Key | Component Type | Required | Default Value | Validation Rules & Error Messages | Source of Options | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Title** | `title` | `TextInput` | **YES** | `""` | `!formData.title.trim()` -> `"Please enter a title."` | User input | Name of the channel (e.g. `Meta Ads`, `Army Unit Camp`, `Showroom Walk-in`). |
| **Status** | `status` | `Select` / Dropdown | **YES** | `"Active"` | Must be one of `Active`, `Inactive`. | Static: `["Active", "Inactive"]` | Inactive channels are hidden from sales executives during lead entry. |

- **Submission Handler (`handleAddSubmit`)**:
  - Request body:
    ```json
    {
      "title": "Meta Ads Campaign",
      "status": "Active"
    }
    ```
  - Calls `POST /api/lead-sources`.
  - On 200/201: Shows toast `"Lead source \"{title}\" added successfully!"`, resets form, closes modal, refreshes source list & stats.

---

### 6.2 Modal 2: Edit Lead Source Modal

- **Trigger**: Click `Edit` pencil icon on any lead source card.
- **Pre-fill Data**:
  ```javascript
  {
    id: source.id,
    title: source.title,
    status: source.status || "Active"
  }
  ```

| Field Label | Form Key / API Key | Component Type | Required | Default Value | Validation Rules | Source | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Title** | `title` | `TextInput` | **YES** | `editSource.title` | `!editSource.title.trim()` -> `"Please enter a title."` | Existing value | Channel name |
| **Status** | `status` | `Select` | **YES** | `editSource.status` | Must be `Active` or `Inactive` | Static | Active/Inactive switch |

- **Submission Handler (`handleEditSubmit`)**:
  - Calls `PUT /api/lead-sources/{id}` with JSON body:
    ```json
    {
      "title": "Meta & Instagram Ads",
      "status": "Active"
    }
    ```
  - On success: Shows toast `"Lead source updated successfully!"`, closes modal, refreshes list.

---

### 6.3 Modal 3: Delete Confirmation Modal

- **Trigger**: Click `Trash` icon on any lead source card.
- **Target Record**: `deleteTarget` (`{ id, title }`).
- **Confirmation Message**: `"Are you sure you want to delete lead source \"{deleteTarget.title}\"?"`
- **Buttons**:
  - `Cancel` -> Dismisses modal without action.
  - `Delete Source` (`btn-danger`) -> Calls `DELETE /api/lead-sources/{id}`.
- **On Success**: Shows toast `"Lead source \"{deleteTarget.title}\" deleted!"`, refreshes list & stats.

---

## 7. Integrated API Endpoints Specification

### 7.1 `GET /api/lead-sources`
- **Purpose**: Retrieve paginated list of lead sources.
- **Query Parameters**:
  - `page`: Integer (default: 1)
  - `per_page`: Integer (default: 10)
  - `search`: String (optional search query)
  - `all`: Boolean (optional `true` when exporting all records)
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": [
      {
        "id": 1,
        "title": "Showroom Walk-in",
        "status": "Active",
        "created_at": "2025-01-01T10:00:00Z"
      },
      {
        "id": 2,
        "title": "CSD Canteen Referral",
        "status": "Active",
        "created_at": "2025-01-02T11:30:00Z"
      }
    ],
    "pagination": {
      "total": 12,
      "current_page": 1,
      "last_page": 2,
      "per_page": 10
    }
  }
  ```

---

### 7.2 `GET /api/lead-sources/stats`
- **Purpose**: Retrieve lead channel metrics.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": {
      "total_channels": 12,
      "active_channels": 11,
      "top_channel": "Showroom Walk-in"
    }
  }
  ```

---

### 7.3 `POST /api/lead-sources`
- **Purpose**: Create a new lead channel.
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "title": "Defence Expo 2025",
    "status": "Active"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "status": true,
    "message": "Lead source created successfully.",
    "data": {
      "id": 13,
      "title": "Defence Expo 2025",
      "status": "Active"
    }
  }
  ```
- **Error Response (422 Unprocessable Content)**:
  ```json
  {
    "status": false,
    "message": "The title field is required.",
    "errors": {
      "title": ["The title has already been taken."]
    }
  }
  ```

---

### 7.4 `PUT /api/lead-sources/{id}`
- **Purpose**: Update an existing lead source.
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Request Body (JSON)**:
  ```json
  {
    "title": "Defence Expo & CSD Fair",
    "status": "Active"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Lead source updated successfully."
  }
  ```

---

### 7.5 `DELETE /api/lead-sources/{id}`
- **Purpose**: Delete a lead source.
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Lead source deleted successfully."
  }
  ```
- **Error Response (400 Bad Request / 409 Conflict)**:
  ```json
  {
    "status": false,
    "message": "Cannot delete lead source because existing customer leads are associated with it."
  }
  ```

---

## 8. Static vs. Dynamic Values Dictionary

| Field / Concept | Static or Dynamic | Source / Location | Options / Allowed Values | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Status** | **Static** | Hardcoded in `LeadSourcePage.js` (Lines 54, 469-471, 542-544) | `["Active", "Inactive"]` | Dropdown in Add/Edit forms. Only Active sources show in Lead Capture. |
| **Lead Sources Directory** | **Dynamic** | Fetched from DB via `GET /api/lead-sources` | Array of Lead Source objects `{ id, title, status }` | Drives the list view and Add Lead modal dropdown. |
| **Channel Stats** | **Dynamic** | Fetched from DB via `GET /api/lead-sources/stats` | `{ total_channels, active_channels, top_channel }` | Drives top metric cards. |

---

## 9. Mobile Implementation Checklist for `csd-mobile`

1. **BottomSheet Modal**: Implement Add and Edit forms in a bottom sheet with `snapPoints={['40%']}`.
2. **Share Sheet for Export**: On mobile, instead of downloading an Excel file directly to a browser folder, use `expo-sharing` or `react-native-share` to open the native OS share sheet (WhatsApp, Email, AirDrop, Save to Files).
3. **Optimistic Updates**: When creating or editing a lead source, immediately insert or update the record in React Query's cache so the UI updates with zero latency.
4. **Haptic Feedback**:
   - Success vibration when saving.
   - Warning haptic when opening the Delete dialog.
