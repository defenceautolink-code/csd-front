# Mobile Engineering Specification: Expense Category Master Screen

**Target URL:** `https://dev.defenceautolink.com/admin/expense-master`  
**Web Source Code:** `src/app/admin/expense-master/page.js`  
**API Service Code:** `src/services/expenseApi.js`  
**Target Mobile Feature:** `csd-mobile/src/features/master/expenses/ExpenseMasterScreen.tsx`  
**Role Permissions:** Authorized Administrators & Accounts Personnel

---

## 1. Screen Overview & Business Context

The **Expense Category Master** screen manages master expense ledger accounts and categorization titles. These master categories are referenced across:
1. Daily Deal Invoicing and Delivery Charges.
2. Deal Expense Logging (RTO expenses, temporary registration fees, transit insurance, transport/logistic fees).
3. Corporate Office Operations (office rent, staff salaries, electricity, showroom upkeep, software subscriptions).

In the mobile app, this screen allows accounting and managerial staff to define, edit, and delete standardized expense categories to ensure uniform financial reporting across the dealership.

---

## 2. Header Actions & Navigation

| Button Label | Icon (`lucide-react-native`) | Visual Style | Action & Behavior |
| :--- | :--- | :--- | :--- |
| **Add Expense Category** | `PlusCircle` | Primary Solid Button | Opens the **Add Expense Category Modal / BottomSheet**. Resets form inputs: `titleInput = ""` and `descInput = ""`. |

---

## 3. Search & Pagination Subsystems

### 3.1 Search Bar (`searchTerm`)
- **Input Placeholder**: `"Search expense title..."`
- **Behavior**: Searches across category `title`, `name`, and `description`.
- **Query Parameter**: Triggers `loadData({ search: searchTerm })`. Resets `currentPage = 1`.
- **Clear Button (`X`)**: Visible when `searchTerm` is non-empty, clears the search text with one tap.

### 3.2 Pagination
- Standard API query parameters: `page` (default `1`) and `per_page` (default `10`, options: `10, 20, 50, 100`).
- Server returns either `res.pagination` or `res.meta`.
- Fallback: If backend returns a raw flat array, the client slices the array locally:
  `filteredCategories.slice((currentPage - 1) * perPage, currentPage * perPage)`.

---

## 4. Mobile List Item Structure & Row Actions

In `csd-mobile`, render each expense category as a clean card in a `FlatList`:

### Card Elements:
1. **Category Tag Icon Box**:
   - Icon: `Tag` or `Receipt`
   - Background: Light olive tint `rgba(88, 99, 42, 0.1)`, icon color `#58632A`.
2. **Expense Title**: Bold title text (`category.title`).
3. **Description**:
   - If present: Secondary text (`category.description`).
   - If empty: Italic muted placeholder text `"No description"`.
4. **Row Actions**:
   - **Edit Button** (`Pencil`): Opens Edit Category Modal pre-filled with existing title and description.
   - **Delete Button** (`Trash2`): Opens Delete Confirmation Modal.

---

## 5. Modals & Forms Field-by-Field Breakdown

### 5.1 Modal 1: Add Expense Category Modal

- **Trigger**: "Add Expense Category" button in header.
- **Form State**: `titleInput`, `descInput`, `isSubmitting`

| Field Label | Form Key / API Key | Component Type | Required | Default Value | Validation Rules & Error Messages | Source | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Expense Title** | `name` (or `title`) | `TextInput` | **YES** | `""` | `!titleInput.trim()` -> `"Please enter an expense title."` | User input | Name of the ledger category (e.g. `Office Rent`, `RTO Registration`, `Fuel Allowance`). |
| **Description** | `description` | `TextArea` / Multi-line `TextInput` | **NO (Optional)** | `""` | Optional. If left blank, falls back to `"desc"` to satisfy backend DB column constraints. | User input | Detailed notes regarding what expenses qualify under this category. |

- **Submission Handler (`handleAddSubmit`)**:
  - Request payload:
    ```json
    {
      "name": "Staff Refreshments",
      "description": "Daily snacks and tea for showroom employees",
      "status": 1
    }
    ```
  - Calls `expenseApi.createCategory(data)`.
  - On success: Shows toast `"Expense Category \"{title}\" added successfully!"`, resets form, closes modal, refreshes category list.

---

### 5.2 Modal 2: Edit Expense Category Modal

- **Trigger**: Click `Edit` pencil icon on any category card.
- **Pre-fill Data**:
  ```javascript
  {
    id: category.id,
    title: category.title,
    description: category.description || "",
    status: category.status
  }
  ```

| Field Label | Form Key / API Key | Component Type | Required | Default Value | Validation Rules | Source | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Expense Title** | `name` | `TextInput` | **YES** | `editItem.title` | `!editItem.title.trim()` -> `"Please enter a category title."` | Existing value | Editable category name |
| **Description** | `description` | `TextArea` | **NO (Optional)** | `editItem.description` | Optional | Existing value | Editable note |

- **Submission Handler (`handleEditSubmit`)**:
  - Request payload:
    ```json
    {
      "name": "Staff Refreshments & Food",
      "description": "Monthly pantry expenses and employee refreshments",
      "status": 1
    }
    ```
  - Calls `expenseApi.updateCategory(editItem.id, data)`.
  - On success: Shows toast `"Expense category updated successfully!"`, closes modal, refreshes list.

---

### 5.3 Modal 3: Delete Confirmation Modal

- **Trigger**: Click `Trash` icon on any category card.
- **Target Record**: `deleteTarget` (`{ id, title }`).
- **Confirmation Message**:
  - Main text: `"Are you sure you want to delete expense category:"`
  - Highlighted Box: `"\"{deleteTarget.title}\""` in danger red font.
- **Buttons**:
  - `Cancel` -> Dismisses modal without changes.
  - `Delete Category` (`btn-danger`) -> Calls `expenseApi.deleteCategory(deleteTarget.id)`.
- **On Success**: Shows toast `"Category \"{deleteTarget.title}\" deleted successfully!"`, refreshes list.

---

## 6. Integrated API Endpoints Specification

### 6.1 `GET /api/expense-categories`
- **Service Method**: `expenseApi.getCategories(params)`
- **Query Parameters**:
  - `page`: Integer (default: 1)
  - `per_page`: Integer (default: 10)
  - `search`: String (optional search filter)
  - `status`: Integer (optional, `1` for Active, `0` for Inactive)
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "data": [
      {
        "id": 1,
        "name": "Office Rent",
        "description": "Monthly corporate office lease",
        "status": 1,
        "created_at": "2025-01-10T08:00:00Z"
      },
      {
        "id": 2,
        "name": "RTO Passing Fees",
        "description": "Government registration fee per vehicle",
        "status": 1,
        "created_at": "2025-01-10T08:15:00Z"
      }
    ],
    "pagination": {
      "total": 18,
      "current_page": 1,
      "last_page": 2,
      "per_page": 10
    }
  }
  ```

---

### 6.2 `POST /api/expense-categories`
- **Service Method**: `expenseApi.createCategory(data)`
- **Request Body (JSON)**:
  ```json
  {
    "name": "Electricity & Utilities",
    "description": "Monthly power and internet bills",
    "status": 1
  }
  ```
- **Backend Sanitization Note**: In `expenseApi.js`, `description` defaults to `"desc"` if omitted by user to satisfy non-null DB column definitions:
  ```javascript
  const cleanDesc = (data.description ? String(data.description).trim() : "") || "desc";
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "status": true,
    "message": "Expense Category added successfully!",
    "data": {
      "id": 19,
      "name": "Electricity & Utilities",
      "description": "Monthly power and internet bills",
      "status": 1
    }
  }
  ```
- **Error Response (422 Unprocessable Content)**:
  ```json
  {
    "status": false,
    "message": "The name field is required.",
    "errors": {
      "name": ["The category name has already been taken."]
    }
  }
  ```

---

### 6.3 `PUT /api/expense-categories/{id}`
- **Service Method**: `expenseApi.updateCategory(id, data)`
- **Request Body (JSON)**:
  ```json
  {
    "name": "Electricity & Power",
    "description": "Power bills and generator diesel costs",
    "status": 1
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Expense category updated successfully."
  }
  ```

---

### 6.4 `DELETE /api/expense-categories/{id}`
- **Service Method**: `expenseApi.deleteCategory(id)`
- **Success Response (200 OK)**:
  ```json
  {
    "status": true,
    "message": "Expense category deleted successfully."
  }
  ```

---

### 6.5 `PATCH /api/expense-categories/{id}/toggle-status` (Service Utility)
- **Service Method**: `expenseApi.toggleCategoryStatus(id)`
- **Purpose**: Quick toggling between Active (1) and Inactive (0) without editing title text.

---

## 7. Static vs. Dynamic Values Dictionary

| Field / Concept | Static or Dynamic | Source / Location | Options / Allowed Values | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Status Mapping** | **Static Adapter** | Handled in `loadData()` mapper (Line 49) | `status: c.status === 1 \|\| c.status === "Active" ? "Active" : "Inactive"` | Translates backend integer `1/0` to UI badge strings `"Active" / "Inactive"`. |
| **Fallback Description** | **Static Default** | `expenseApi.js` (Lines 31, 46) | `"desc"` | Sent to backend when description input is empty. |
| **Expense Categories** | **Dynamic** | Fetched via `GET /api/expense-categories` | Array of Category objects `{ id, name, description, status }` | Master ledger category directory. |

---

## 8. Mobile Implementation Checklist for `csd-mobile`

1. **Bottom Sheet Modal**: In mobile, implement Add and Edit forms inside `@gorhom/bottom-sheet` with `snapPoints={['50%']}` for fast, tactile entry.
2. **Keyboard Focus**: Auto-focus the "Expense Title" input when bottom sheet opens (`autoFocus={true}`).
3. **Empty State UI**: When `filteredCategories.length === 0`, display a stylized empty state icon (`FolderX`) with a prominent "Add Category" button.
4. **Haptic Feedback**:
   - Light impact on typing completion.
   - Success notification haptic when category is saved.
