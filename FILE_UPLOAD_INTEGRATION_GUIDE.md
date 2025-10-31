# File Upload Module - Integration Guide

## 📚 Overview

This guide provides comprehensive documentation for the **File Upload Module** that enables secure image uploads for product images in the Coffee Shop Revenue Management Backend.

---

## 🎯 Features

✅ **Secure File Upload**
- Validates file extensions (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`)
- Validates MIME types to prevent malicious files
- File size limit: 5MB per image
- Filename sanitization to prevent path traversal attacks
- Unique filename generation using timestamp + random string

✅ **Database Tracking**
- All uploaded files tracked in `file_uploads` table
- Stores metadata: original filename, saved filename, filepath, filesize, MIME type
- Soft delete support
- Audit fields (createdBy, uploadedBy, timestamps)

✅ **Static File Serving**
- Uploaded images accessible via public URL
- Example: `http://localhost:3000/uploads/1234567890-abc123-cappuccino.jpg`

✅ **RESTful API**
- POST `/upload/image` - Upload single image
- GET `/upload/images` - Get all uploaded images
- GET `/upload/image/:id` - Get specific image metadata
- DELETE `/upload/image/:id` - Delete image and database record

✅ **Swagger Documentation**
- All endpoints documented with examples
- Interactive testing available at `http://localhost:3000/api`

---

## 📁 Module Structure

```
src/upload/
├── config/
│   └── multer.config.ts          # Multer configuration for file handling
├── dto/
│   └── upload-response.dto.ts    # Response DTO for upload operations
├── entities/
│   └── file-upload.entity.ts     # FileUpload entity (extends BaseEntity)
├── utils/
│   └── file-validation.util.ts   # File validation utilities
├── upload.controller.ts           # Upload endpoints controller
├── upload.service.ts              # Upload business logic
└── upload.module.ts               # Upload module definition
```

---

## 🔧 API Endpoints

### 1. Upload Image

**POST** `/upload/image`

Upload a single image file.

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- Allowed formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Max size: 5MB

**Response (201):**
```json
{
  "id": 1,
  "originalFilename": "cappuccino.jpg",
  "savedFilename": "1234567890-abc123-cappuccino.jpg",
  "filepath": "uploads/1234567890-abc123-cappuccino.jpg",
  "url": "http://localhost:3000/uploads/1234567890-abc123-cappuccino.jpg",
  "filesize": 245678,
  "mimetype": "image/jpeg",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid file type, size, or missing file
- `413` - File size exceeds 5MB
- `500` - Failed to save file

---

### 2. Get All Images

**GET** `/upload/images`

Get list of all uploaded images (ordered by newest first).

**Response (200):**
```json
[
  {
    "id": 1,
    "originalFilename": "cappuccino.jpg",
    "savedFilename": "1234567890-abc123-cappuccino.jpg",
    "filepath": "uploads/1234567890-abc123-cappuccino.jpg",
    "url": "http://localhost:3000/uploads/1234567890-abc123-cappuccino.jpg",
    "filesize": 245678,
    "mimetype": "image/jpeg",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 3. Get Image by ID

**GET** `/upload/image/:id`

Get specific image metadata by ID.

**Response (200):**
```json
{
  "id": 1,
  "originalFilename": "cappuccino.jpg",
  "savedFilename": "1234567890-abc123-cappuccino.jpg",
  "filepath": "uploads/1234567890-abc123-cappuccino.jpg",
  "url": "http://localhost:3000/uploads/1234567890-abc123-cappuccino.jpg",
  "filesize": 245678,
  "mimetype": "image/jpeg",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Response:**
- `404` - Image not found

---

### 4. Delete Image

**DELETE** `/upload/image/:id`

Delete image file from disk and soft-delete database record.

**Response (200):**
```json
{
  "message": "Image deleted successfully"
}
```

**Error Response:**
- `404` - Image not found

---

## 🔐 Security Features

### 1. File Extension Validation
Only allows image extensions: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

### 2. MIME Type Validation
Validates actual file MIME type to prevent malicious files disguised with image extensions:
- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/gif`
- `image/webp`

### 3. File Size Limit
Maximum 5MB per image to prevent disk space abuse.

### 4. Filename Sanitization
- Removes path separators (`/`, `\`)
- Removes parent directory references (`..`)
- Replaces special characters with underscores
- Prevents path traversal attacks

### 5. Unique Filename Generation
Format: `{timestamp}-{random}-{originalname}.{ext}`
- Example: `1234567890-abc123-cappuccino.jpg`
- Prevents filename conflicts
- Preserves original filename for reference

---

## 💾 Database Schema

### FileUpload Entity

Extends `BaseEntity` (includes: id, createdAt, updatedAt, createdBy, updatedBy, deletedAt)

| Field | Type | Description |
|-------|------|-------------|
| id | number | Auto-generated primary key |
| originalFilename | string | Original filename from user |
| savedFilename | string | Unique filename on server |
| filepath | string | Relative path to file |
| filesize | number | File size in bytes |
| mimetype | string | Validated MIME type |
| uploadedBy | number | User ID (optional) |
| createdAt | Date | Upload timestamp |
| updatedAt | Date | Last update timestamp |
| deletedAt | Date | Soft delete timestamp |

---

## 🔗 Integration with Products Module

### Workflow: Upload Image → Create Product

**Step 1: Upload Image**
```typescript
// Frontend code
const formData = new FormData();
formData.append('file', imageFile);

const uploadResponse = await fetch('http://localhost:3000/upload/image', {
  method: 'POST',
  body: formData,
});

const uploadData = await uploadResponse.json();
// uploadData.filepath = "uploads/1234567890-abc123-cappuccino.jpg"
// uploadData.url = "http://localhost:3000/uploads/1234567890-abc123-cappuccino.jpg"
```

**Step 2: Create Product with Image Path**
```typescript
const product = await apiService.createProduct({
  name: 'Cappuccino',
  description: 'Classic Italian coffee',
  price: 45000,
  categoryId: 1,
  image: uploadData.filepath,  // or uploadData.url
  status: ProductStatus.ACTIVE,
});
```

### Recommended Approach

**Option 1: Store Relative Path** (Recommended)
```typescript
image: uploadData.filepath  // "uploads/1234567890-abc123-cappuccino.jpg"
```
- More flexible (can change base URL without updating database)
- Construct full URL in frontend: `${baseUrl}/${product.image}`

**Option 2: Store Full URL**
```typescript
image: uploadData.url  // "http://localhost:3000/uploads/1234567890-abc123-cappuccino.jpg"
```
- Simpler for frontend (no URL construction needed)
- Less flexible (hardcoded base URL)

---

## 📖 Frontend Integration Examples

### Example 1: Upload Image with React

```typescript
import React, { useState } from 'react';

export const ImageUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3000/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      setUploadedImage(data);
      alert('Image uploaded successfully!');
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload Image'}
      </button>
      
      {uploadedImage && (
        <div>
          <p>Image uploaded!</p>
          <img src={uploadedImage.url} alt={uploadedImage.originalFilename} />
          <p>File path: {uploadedImage.filepath}</p>
        </div>
      )}
    </div>
  );
};
```

### Example 2: Complete Product Creation with Image

```typescript
export const CreateProductForm: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: 0,
    categoryId: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Step 1: Upload image
      let imagePath = '';
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadResponse = await fetch('http://localhost:3000/upload/image', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResponse.json();
        imagePath = uploadData.filepath;
      }

      // Step 2: Create product
      const response = await fetch('http://localhost:3000/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productData,
          image: imagePath,
          status: 'active',
        }),
      });

      const product = await response.json();
      alert('Product created successfully!');
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
      <button type="submit">Create Product</button>
    </form>
  );
};
```

---

## ⚠️ Error Handling

### Common Errors

**1. Invalid File Type (400)**
```json
{
  "statusCode": 400,
  "message": "Invalid file extension. Allowed extensions: .jpg, .jpeg, .png, .gif, .webp",
  "error": "Bad Request"
}
```

**2. File Too Large (400)**
```json
{
  "statusCode": 400,
  "message": "File size exceeds maximum allowed size of 5MB",
  "error": "Bad Request"
}
```

**3. No File Provided (400)**
```json
{
  "statusCode": 400,
  "message": "No file provided",
  "error": "Bad Request"
}
```

**4. File Not Found (404)**
```json
{
  "statusCode": 404,
  "message": "File with ID 1 not found",
  "error": "Not Found"
}
```

---

## ✅ Testing

### Test with Swagger UI
1. Navigate to `http://localhost:3000/api`
2. Find the **upload** section
3. Click on `POST /upload/image`
4. Click "Try it out"
5. Choose a file
6. Click "Execute"

### Test with cURL
```bash
curl -X POST http://localhost:3000/upload/image \
  -F "file=@/path/to/image.jpg"
```

### Test with Postman
1. Create new POST request to `http://localhost:3000/upload/image`
2. Go to "Body" tab
3. Select "form-data"
4. Add key "file" with type "File"
5. Choose your image file
6. Send request

---

## 🎯 Best Practices

1. **Always validate file on frontend** before uploading to improve UX
2. **Store relative path** in Product.image field for flexibility
3. **Handle upload errors gracefully** with user-friendly messages
4. **Show upload progress** for better UX (use XMLHttpRequest or axios)
5. **Compress images** on frontend before upload to reduce file size
6. **Delete old images** when updating product image to save disk space

---

## 📊 Configuration

### Environment Variables

Add to `.env` file:
```env
BASE_URL=http://localhost:3000
```

### File Upload Limits

Modify in `src/upload/utils/file-validation.util.ts`:
```typescript
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
```

### Allowed File Types

Modify in `src/upload/utils/file-validation.util.ts`:
```typescript
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
```

---

**Last Updated**: 2025-10-25
**Module Version**: 1.0.0

