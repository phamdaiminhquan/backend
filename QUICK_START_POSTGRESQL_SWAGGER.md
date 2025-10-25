# Quick Start Guide - PostgreSQL + Swagger

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

---

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure PostgreSQL

#### Option A: Use Existing PostgreSQL Instance
1. Ensure PostgreSQL is running
2. Note your connection details (host, port, username, password)

#### Option B: Install PostgreSQL (if needed)
- **Windows**: Download from https://www.postgresql.org/download/windows/
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql`

### 3. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:
```env
# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_NAME=coffee_shop

# Environment
NODE_ENV=development

# Application Port
PORT=3000
```

### 4. Create Database (Optional)

The application will auto-create tables, but you can manually create the database:

```sql
CREATE DATABASE coffee_shop;
```

Or let TypeORM handle it automatically on first run.

---

## Running the Application

### Development Mode (with hot reload)
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

### Standard Mode
```bash
npm run start
```

---

## Accessing the Application

### API Endpoints
**Base URL**: http://localhost:3000

### Swagger Documentation
**Swagger UI**: http://localhost:3000/api

The Swagger UI provides:
- ✅ Interactive API testing
- ✅ Complete endpoint documentation
- ✅ Request/response schemas
- ✅ Example values
- ✅ Try it out functionality

---

## Available Endpoints

### Categories (5 endpoints)
- `POST /categories` - Create a new category
- `GET /categories` - Get all categories
- `GET /categories/:id` - Get a category by ID
- `PATCH /categories/:id` - Update a category
- `DELETE /categories/:id` - Delete a category

### Products (5 endpoints)
- `POST /products` - Create a new product
- `GET /products` - Get all products (optional: ?categoryId=1)
- `GET /products/:id` - Get a product by ID
- `PATCH /products/:id` - Update a product
- `DELETE /products/:id` - Soft delete a product

### Orders (5 endpoints)
- `POST /orders` - Create a new order with order details
- `GET /orders` - Get all orders (optional: ?customerName=Nguyen)
- `GET /orders/:id` - Get an order by ID
- `PATCH /orders/:id` - Update order status
- `DELETE /orders/:id` - Delete an order

### Revenue (2 endpoints)
- `GET /revenue/daily` - Get daily revenue report (optional: ?date=2024-01-15)
- `GET /revenue/range` - Get revenue range (?startDate=2024-01-01&endDate=2024-01-31)

**Total**: 17 endpoints

---

## Testing with Swagger

### 1. Open Swagger UI
Navigate to: http://localhost:3000/api

### 2. Explore Endpoints
- Click on any endpoint to expand it
- View request/response schemas
- See example values

### 3. Try It Out
1. Click "Try it out" button
2. Fill in the request body or parameters
3. Click "Execute"
4. View the response

### Example: Create a Category
1. Expand `POST /categories`
2. Click "Try it out"
3. Edit the request body:
   ```json
   {
     "name": "Coffee",
     "description": "All types of coffee beverages"
   }
   ```
4. Click "Execute"
5. View the response with the created category

---

## Database Schema

The following tables will be auto-created:

### category
- id (primary key)
- name (varchar)
- description (text, nullable)
- createdAt, updatedAt
- createdBy, updatedBy (nullable)
- deletedAt (nullable)

### product
- id (primary key)
- name (varchar)
- description (text, nullable)
- price (decimal)
- image (varchar, nullable)
- status (enum: active/inactive)
- categoryId (foreign key)
- createdAt, updatedAt
- createdBy, updatedBy (nullable)
- deletedAt (nullable)

### order
- id (primary key)
- customerName (varchar, default: 'Khách vãng lai')
- userId (int, nullable)
- paymentMethod (enum: cash/bank_transfer)
- status (enum: pending_payment/paid/cancelled)
- cancellationReason (text, nullable)
- createdAt, updatedAt
- createdBy, updatedBy (nullable)

### order_detail
- id (primary key)
- orderId (foreign key)
- productId (foreign key)
- quantity (int)
- unitPrice (decimal)
- subtotal (decimal)
- createdAt
- createdBy, updatedBy (nullable)
- deletedAt (nullable)

---

## Common Tasks

### Create a Complete Order Flow

1. **Create a Category**
   ```
   POST /categories
   {
     "name": "Coffee",
     "description": "Coffee beverages"
   }
   ```

2. **Create a Product**
   ```
   POST /products
   {
     "name": "Cappuccino",
     "description": "Italian coffee drink",
     "price": 45000,
     "categoryId": 1,
     "status": "active"
   }
   ```

3. **Create an Order**
   ```
   POST /orders
   {
     "customerName": "Nguyễn Văn A",
     "paymentMethod": "cash",
     "orderDetails": [
       {
         "productId": 1,
         "quantity": 2,
         "unitPrice": 45000
       }
     ]
   }
   ```

4. **Update Order Status to Paid**
   ```
   PATCH /orders/1
   {
     "status": "paid"
   }
   ```

5. **Get Daily Revenue**
   ```
   GET /revenue/daily?date=2024-01-15
   ```

---

## Troubleshooting

### Database Connection Error
**Problem**: Cannot connect to PostgreSQL

**Solutions**:
1. Ensure PostgreSQL is running
2. Check credentials in `.env` file
3. Verify database exists
4. Check firewall settings

### Port Already in Use
**Problem**: Port 3000 is already in use

**Solution**: Change PORT in `.env` file
```env
PORT=3001
```

### Build Errors
**Problem**: TypeScript compilation errors

**Solution**: 
```bash
npm install
npm run build
```

### Swagger Not Loading
**Problem**: /api endpoint returns 404

**Solution**: Ensure application is running and navigate to correct URL:
http://localhost:3000/api

---

## Development Tips

### Hot Reload
Use `npm run start:dev` for automatic restart on file changes

### Database Synchronization
- Enabled in development mode
- Tables auto-created/updated
- Disable in production (use migrations)

### Validation
- Global validation pipe enabled
- All DTOs validated automatically
- Check Swagger for required fields

### Soft Delete
- Products use soft delete (deletedAt field)
- Deleted products not shown in queries
- Data preserved for analytics

---

## Next Steps

1. ✅ Explore Swagger documentation
2. ✅ Test all endpoints
3. ✅ Create sample data
4. ✅ Review context files in `context/` directory
5. ✅ Check `MIGRATION_AND_SWAGGER_SUMMARY.md` for details

---

## Documentation Files

- `MIGRATION_AND_SWAGGER_SUMMARY.md` - Detailed changes summary
- `QUICK_REFERENCE.md` - Quick reference for developers
- `REFACTORING_SUMMARY.md` - Previous refactoring details
- `context/main.json` - Comprehensive project overview
- `context/overview.json` - Architecture overview
- `context/category.json` - Category module documentation
- `context/product.json` - Product module documentation
- `context/order.json` - Order module documentation
- `context/revenue.json` - Revenue module documentation

---

## Support

For issues or questions:
1. Check Swagger documentation at /api
2. Review context files in `context/` directory
3. Check console logs for errors
4. Verify PostgreSQL connection

---

**Happy Coding! 🚀**

