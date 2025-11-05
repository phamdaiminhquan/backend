# Customer Module Frontend Integration Guide

This document provides integration guidance for the **Customer Module** so the frontend team can manage guest customers and connect them with the order and rewards systems.

---

## 1. Overview

| Item | Details |
|------|---------|
| Purpose | Manage walk-in (guest) customers who do not have a registered user account. |
| Key Features | Track repeat walk-in customers by name/phone, accumulate reward points, auto-migrate customers into full user accounts, support admin-driven manual merges. |
| Base URL | `{{API_BASE_URL}}/api/customers` (replace `{{API_BASE_URL}}` with your backend host; remove `/api` if the global prefix is disabled). |

**Core capabilities**
- Capture guest customer profiles (name, optional phone, optional avatar).
- Reuse existing walk-in records when the same customer returns.
- Award reward points to guests when their orders are marked as PAID.
- Automatically migrate a guest customer into a real user account when they register with the same phone number.
- Let admins manually merge a customer into an existing user account (two-step confirmation).

---

## 2. API Endpoints (`/api/customers`)

> All responses are JSON. Unless noted, success responses return HTTP 200.

### 2.1 `POST /api/customers`
Create a new guest customer.

| Aspect | Details |
|--------|---------|
| Description | Register a walk-in customer. Phone number is optional but must be unique across customers and users if provided. |
| Body | `CreateCustomerDto` |
| Success | Returns the newly created `CustomerResponseDto`. |
| Errors | `400 Bad Request` (validation failure, duplicate phone), `409 Conflict` (if business rule surfaces conflict), `500` (unexpected). |

**Request DTO**
```ts
interface CreateCustomerDto {
  name: string;            // required, max 255
  phoneNumber?: string;    // optional, max 20, unique if provided
  image?: string;          // optional, max 500, URL/path
}
```

**Response DTO (subset of `CustomerResponseDto`)**
```ts
interface CustomerResponseDto {
  id: number;
  name: string;
  phoneNumber: string | null;
  image: string | null;
  rewardPoints: number;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

**Example (curl)**
```bash
curl -X POST "{{API_BASE_URL}}/api/customers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyen Van A",
    "phoneNumber": "0901234567",
    "image": "https://cdn.example.com/avatars/a.jpg"
  }'
```

**Example Response**
```json
{
  "id": 42,
  "name": "Nguyen Van A",
  "phoneNumber": "0901234567",
  "image": "https://cdn.example.com/avatars/a.jpg",
  "rewardPoints": 0,
  "createdAt": "2025-05-01T08:15:00.000Z",
  "updatedAt": "2025-05-01T08:15:00.000Z"
}
```

**Possible Errors**
- `400` – `"phoneNumber" must be shorter than or equal to 20 characters`
- `400` – `Phone number already exists for another customer`
- `400` – `Phone number already exists for a registered user`

---

### 2.2 `GET /api/customers`
List customers with pagination and optional search.

| Query Param | Type | Description |
|-------------|------|-------------|
| `page` | number | Page index (>=1). Default: 1. |
| `limit` | number | Page size (1-100). Default: 20. |
| `search` | string | Optional case-insensitive search across name and phone. |

**Response**
```ts
interface CustomerListResponse {
  data: CustomerResponseDto[];
  page: number;
  limit: number;
  total: number;
}
```

**Example (fetch)**
```ts
const res = await fetch(`${API_BASE_URL}/api/customers?page=1&limit=10&search=090`, {
  headers: { 'Accept': 'application/json' },
});
const payload: CustomerListResponse = await res.json();
```

**Example Response**
```json
{
  "data": [
    {
      "id": 42,
      "name": "Nguyen Van A",
      "phoneNumber": "0901234567",
      "image": null,
      "rewardPoints": 30,
      "createdAt": "2025-05-01T08:15:00.000Z",
      "updatedAt": "2025-05-12T11:20:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 3
}
```

**Errors**
- `400` – invalid pagination numbers (if validation fails).

---

### 2.3 `GET /api/customers/search`
Quick search endpoint for order creation/autocomplete.

| Query Param | Type | Description |
|-------------|------|-------------|
| `name` | string | Optional partial name search (case-insensitive). |
| `phone` | string | Optional exact phone lookup (trimmed). |

> At least one of `name` or `phone` should be provided.

**Response**
```ts
type CustomerSearchResponse = CustomerResponseDto[]; // limited to 20 results, ordered by newest
```

**Example**
```bash
curl "{{API_BASE_URL}}/api/customers/search?name=nguyen"
```

**Errors**
- `400` – if validation fails (e.g., extremely long query).

---

### 2.4 `GET /api/customers/:id`
Retrieve a customer with optional order summary.

| Path Param | Type | Description |
|------------|------|-------------|
| `id` | number | Customer ID. |

**Response**
```ts
interface CustomerWithOrdersResponse extends CustomerResponseDto {
  orders?: Array<{
    id: number;
    status: string;
    createdAt: string;
    paymentMethod: string | null;
    total: number; // computed client-side from order details
  }>;
}
```

**Example**
```ts
const response = await fetch(`${API_BASE_URL}/api/customers/42`);
if (response.status === 404) {
  // show "customer not found"
}
const detail: CustomerWithOrdersResponse = await response.json();
```

**Errors**
- `404 Not Found` – customer missing or soft-deleted.

---

### 2.5 `PATCH /api/customers/:id`
Update customer profile.

| Aspect | Details |
|--------|---------|
| Body | `UpdateCustomerDto` |
| Success | Returns updated `CustomerResponseDto`. |
| Errors | `404` (not found), `400` (validation), `400` (duplicate phone). |

**Request DTO**
```ts
interface UpdateCustomerDto {
  name?: string;
  phoneNumber?: string;
  image?: string;
}
```

**Example**
```bash
curl -X PATCH "{{API_BASE_URL}}/api/customers/42" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Nguyen Van Updated", "phoneNumber": "0905550000" }'
```

---

### 2.6 `DELETE /api/customers/:id`
Soft delete a customer.

| Result | Details |
|--------|---------|
| Success | HTTP 204 No Content. Customer `deletedAt` is populated. |
| Errors | `404 Not Found`. |

**Example**
```bash
curl -X DELETE "{{API_BASE_URL}}/api/customers/42"
```

---

### 2.7 `POST /api/customers/:id/merge-to-user`
Admin API to merge a customer into an existing user account.

| Aspect | Details |
|--------|---------|
| Description | Moves customer orders/rewards into a user account that shares the same phone number. |
| Body | `MergeToUserDto` |
| Response | `{ merged: boolean; message: string; userId?: number }` |
| Errors | `404` (customer not found), `400` (phone missing). |

**Two-step flow**
1. Call without `confirmMerge` (or with `false`) to test if a user exists; response will include `userId` and message requesting confirmation.
2. Call again with the same payload plus `"confirmMerge": true` to perform the merge.

**Request DTO**
```ts
interface MergeToUserDto {
  phone: string;        // phone of the target user
  confirmMerge?: boolean; // optional, default false
}
```

**Example (Step 1)**
```json
POST /api/customers/42/merge-to-user
{
  "phone": "0901234567"
}
```
**Response**
```json
{
  "merged": false,
  "message": "A user with this phone exists. Set confirmMerge=true to merge.",
  "userId": 18
}
```

**Example (Step 2)**
```json
POST /api/customers/42/merge-to-user
{
  "phone": "0901234567",
  "confirmMerge": true
}
```
**Response**
```json
{
  "merged": true,
  "message": "Customer merged into existing user and soft-deleted",
  "userId": 18
}
```

---

## 3. Integration With Orders

| Scenario | Payload Hints |
|----------|---------------|
| Existing customer | Pass `customerId` (from search/list). |
| Registered user order | Pass `userId`; must not include `customerId`. |
| Walk-in (named) | Omit `userId`; set `customerName`. Backend creates/reuses a guest customer record with `phoneNumber = null`. |
| Completely anonymous | Leave both `customerName` and IDs unset; order will use default `"Khach vang lai"` and no customer record. |

**XOR rule**: `userId` and `customerId` are mutually exclusive. Backend enforces this and throws `400` if both are provided.

**Example: walk-in order with name only**
```ts
await fetch(`${API_BASE_URL}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerName: 'Nguyen Walkin',
    paymentMethod: 'CASH',
    orderDetails: [
      { productId: 1, quantity: 2, unitPrice: 45000 }
    ]
  })
});
```

**Example: order for existing guest customer**
```ts
await fetch(`${API_BASE_URL}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 42,
    paymentMethod: 'BANK_TRANSFER',
    orderDetails: [
      { productId: 5, quantity: 1, unitPrice: 60000 }
    ]
  })
});
```

**Example: order for registered user**
```ts
await fetch(`${API_BASE_URL}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 18,
    paymentMethod: 'CASH',
    orderDetails: [
      { productId: 7, quantity: 3, unitPrice: 55000 }
    ]
  })
});
```

---

## 4. Reward Points for Customers

- Orders earn points **only when status transitions to `PAID`**.
- Points calculation: `earnedPoints = Math.floor(orderTotal / 1000)`.
- For guest customers, points accumulate on their `rewardPoints` column and a `reward_transactions` record is generated.
- When migrating/merging to a user, outstanding points and transactions move to the user account.
- Frontend display suggestions:
  - Show `rewardPoints` on customer detail pages.
  - Optionally list transactions by calling the rewards history endpoint (if exposed) using `customerId`.
  - When order status is updated in UI, refresh customer data to display new balance.

---

## 5. Customer-to-User Migration

### 5.1 Automatic migration
- Triggered when a new user registers with a phone number matching a non-deleted customer record.
- Backend moves:
  - All orders linked to the customer (`customerId`) to the new user (`userId`).
  - Reward points added to the user balance.
  - Reward transactions reassigned from `customerId` to `userId`.
  - Customer record is soft-deleted to avoid duplicates.
- Frontend impact: next time you fetch customers list, the migrated customer disappears; fetch users to see updated points.

### 5.2 Manual merge (admin)
- Start via `POST /api/customers/:id/merge-to-user`.
- Step 1: Provide phone number; backend checks for a user and returns a message plus `userId`.
- Step 2: Call again with `confirmMerge = true` to execute.
- Data transferred:
  - Orders (set `userId`, clear `customerId`).
  - Reward points (added to user, customer points reset to 0).
  - Reward transactions (userId updated, customerId cleared).
  - Customer soft-deleted so it no longer appears in lists.

---

## 6. DTO & Response TypeScript Definitions

```ts
export interface CreateCustomerDto {
  name: string;
  phoneNumber?: string;
  image?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  phoneNumber?: string;
  image?: string;
}

export interface CustomerResponseDto {
  id: number;
  name: string;
  phoneNumber: string | null;
  image: string | null;
  rewardPoints: number;
  createdAt: string;
  updatedAt: string;
  orders?: Array<{
    id: number;
    status: string;
    createdAt: string;
    paymentMethod: string | null;
    total: number;
  }>;
}

export interface CustomerListResponse {
  data: CustomerResponseDto[];
  page: number;
  limit: number;
  total: number;
}

export interface MergeToUserDto {
  phone: string;
  confirmMerge?: boolean;
}

export interface MergeToUserResponse {
  merged: boolean;
  message: string;
  userId?: number;
}
```

---

## 7. Frontend Implementation Suggestions

- **Customer search widget**: on order creation, provide combined search by phone/name (debounced). Display both registered users and guest customers distinctly.
- **Walk-in flow**: allow entering only a name; show preview of existing matches (case-insensitive) to avoid duplicates.
- **Profile page**: show customer info, reward points, and order history. Provide quick actions (edit, soft delete, merge).
- **Merge confirmation dialog**: display the target user name/ID fetched via phone, show summary of what will move, require explicit confirmation.
- **Error handling**: map backend messages to UI toasts/dialogs. For example, show `phone already exists` near the phone field.
- **Optimistic updates**: after creating or editing a customer, refresh lists or update cache to reflect the change immediately.
- **Permission checks**: ensure only authorized users (admins/staff) can access merge/delete actions if the backend restricts them.

---

## 8. Common Use Cases

1. **Create walk-in customer order**
   - `POST /api/customers` (optional if new) → store ID.
   - `POST /api/orders` with `customerId` or `customerName`.
   - Update order status → points awarded automatically.

2. **Create order for existing customer with phone**
   - Search via `GET /api/customers/search?phone=...`.
   - Use `customerId` in order payload.

3. **Search customers during order creation**
   - Query `/api/customers?search=` for paginated results or `/api/customers/search` for autocomplete.
   - Present matches with phone and reward points.

4. **View customer details with history**
   - `GET /api/customers/:id` and render orders table.
   - Provide actions to edit, delete, merge.

5. **Admin manual merge workflow**
   - Step 1: POST merge without `confirmMerge`.
   - Show returned user info and confirmation message.
   - Step 2: POST again with `confirmMerge = true`.
   - Refresh both customer and user data to reflect migration.

---

**Contact the backend team** if additional endpoints are needed (e.g., customer reward history listing) or if environment-specific headers are required.
