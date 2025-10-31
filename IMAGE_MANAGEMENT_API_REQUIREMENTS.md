# Image Management API Requirements

This document describes the backend APIs needed to support the Image Management module, reusable image picker, and product image display. It builds on the existing upload API (POST /upload/image) and adds list/query and delete endpoints.

## Conventions
- Base URL: `${GLOBAL_CONFIG.apiBaseUrl}`
- Authentication: Same as existing Coffee API (e.g., Bearer token) if applicable
- Content type: JSON unless otherwise specified
- Timestamps: ISO 8601 strings

## Data Model

UploadedImage
- id: number
- originalFilename: string
- savedFilename: string
- filepath: string  // relative path, e.g., "uploads/123-abc.jpg"
- url: string       // absolute URL (optional, server convenience)
- filesize: number  // bytes
- mimetype: string  // e.g., image/jpeg
- createdAt: string
- width?: number    // optional if available
- height?: number   // optional if available

## Endpoints

### 1) POST /upload/image (existing)
Upload a single image using multipart/form-data.

- Request (multipart/form-data)
  - field: file (File)
- Response 200
  - UploadedImage
- Errors
  - 400: invalid file type or size

### 2) GET /upload/images
List uploaded images with optional pagination, search, and filtering.

- Query params
  - page?: number (default: 1)
  - limit?: number (default: 24)
  - search?: string (matches originalFilename, savedFilename, filepath)
  - dateFrom?: string (ISO date, inclusive)
  - dateTo?: string (ISO date, inclusive)
  - sort?: string (default: "createdAt:desc")
- Response 200
```
{
  "data": UploadedImage[],
  "page": number,
  "limit": number,
  "total": number
}
```
- Notes
  - If pagination is not implemented yet, return an array (existing behavior). Frontend already supports client-side pagination; server-side pagination is preferred.

### 3) GET /upload/image/:id
Get a single image by id.
- Response 200: UploadedImage
- Errors
  - 404: not found

### 4) DELETE /upload/image/:id
Delete an image by id.
- Behavior
  - Reject deletion if the image is referenced by any entity (e.g., products.image)
- Errors
  - 404: not found
  - 409: conflict (in use by: ["product:123", ...])
- Response 200
```
{ "message": "deleted" }
```

### 5) GET /upload/images/unused (optional)
List images that are not referenced by any entities.
- Query
  - Same as list endpoint (page, limit, search)
- Response 200
```
{ data: UploadedImage[], page, limit, total }
```

### 6) PATCH /upload/image/:id (optional)
Update image metadata (e.g., original filename label).
- Request
```
{ originalFilename?: string }
```
- Response 200: UploadedImage

## Reference Usage in Frontend

- Display URL construction:
  - If `imagePath.startsWith("http")` use directly
  - Else use `${GLOBAL_CONFIG.apiBaseUrl}/${imagePath}`

- Product entity stores `image` as relative `filepath` (recommended).

## Error Responses
- 400 Bad Request: invalid inputs
- 401 Unauthorized: missing/invalid auth
- 404 Not Found: resource missing
- 409 Conflict: deletion blocked due to reference usage
- 500 Internal Server Error

Example error response
```
{
  "statusCode": 409,
  "message": "Image is referenced by 3 products",
  "details": { "productIds": [1, 2, 3] }
}
```

## Notes / Implementation Suggestions
- Store images under a predictable root, e.g., `uploads/` and serve statically.
- Persist dimensions (width, height) during upload if you need them.
- Consider soft-delete vs. hard-delete depending on business rules.
- Track references (e.g., when a product.image is set to a filepath, add a reference; on change/remove, decrement).
- Rate-limit and validate MIME types and max size (<= 5MB) server-side.
- CORS: ensure GETs are accessible by the frontend origin.

