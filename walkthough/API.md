# API T07 - Registration and Seat Conflict Handling

Base path: `/api/v1`

Authentication: HTTP Basic (current project setup), all endpoints require authenticated user.

## Student Endpoints

### 1) List published workshops

- Method: `GET`
- Path: `/workshops`
- Auth: authenticated user
- Response: `200 OK`
- Notes:
  - Returns all `PUBLISHED` workshops.
  - Includes registration metadata: `activeSeats`, `remainingSeats`, `registrable`.

### 2) Get workshop detail

- Method: `GET`
- Path: `/workshops/{workshopId}`
- Auth: authenticated user
- Response: `200 OK`, `404 Not Found`

### 3) Create registration

- Method: `POST`
- Path: `/registrations`
- Auth: `ROLE_STUDENT`
- Request body:

```json
{
  "workshopId": "34000000-0000-0000-0000-000000000001"
}
```

- Response: `200 OK`
- Error cases:
  - `400 Bad Request`: workshop not published, window closed, paid workshop, missing workshopId
  - `404 Not Found`: workshop not found
  - `409 Conflict`: full workshop, duplicate active registration, time overlap
- Business behavior:
  - Uses DB transaction + pessimistic lock on workshop row.
  - Creates registration with status `CONFIRMED`.
  - Returns `qrToken` and `qrPayload` string for frontend QR rendering.

### 4) List my registrations

- Method: `GET`
- Path: `/registrations/me`
- Auth: `ROLE_STUDENT`
- Response: `200 OK`

### 5) Get my registration detail

- Method: `GET`
- Path: `/registrations/{registrationId}`
- Auth: `ROLE_STUDENT`
- Response: `200 OK`, `404 Not Found`

### 6) Cancel my registration

- Method: `DELETE`
- Path: `/registrations/{registrationId}`
- Auth: `ROLE_STUDENT`
- Response: `200 OK`
- Error cases:
  - `400 Bad Request`: registration not active or workshop already started
  - `404 Not Found`: registration not owned by current student or not found
- Rule:
  - Student can cancel only active registration before workshop start.

## Organizer Endpoints

### 7) List registrations by workshop

- Method: `GET`
- Path: `/organizer/workshops/{workshopId}/registrations`
- Auth: `ROLE_ORGANIZER` or `ROLE_ADMIN`
- Query params:
  - `status` (optional): if omitted, default returns active statuses
  - `page` (optional, default `0`)
  - `size` (optional, default `20`)
- Response: `200 OK`, `404 Not Found`

### 8) Registration summary by workshop

- Method: `GET`
- Path: `/organizer/workshops/{workshopId}/registrations/summary`
- Auth: `ROLE_ORGANIZER` or `ROLE_ADMIN`
- Response: `200 OK`, `404 Not Found`
- Returns:
  - `capacity`
  - `confirmedCount`
  - `pendingPaymentCount`
  - `activeCount`
  - `remainingSeats`

## Response Shape Highlights

- `RegistrationResponse` includes:
  - `id`, `workshopId`, `workshopTitle`, `status`
  - `qrToken`, `qrPayload`
  - `createdAt`, `confirmedAt`, `cancelledAt`
  - `workshopStartTime`, `workshopEndTime`

- `OrganizerRegistrationListResponse` includes:
  - `items`
  - pagination metadata: `page`, `size`, `totalElements`, `totalPages`
