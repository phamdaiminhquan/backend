# Context System Guide for AI Agents

## Overview

This guide explains how to use and maintain the context documentation system for the Coffee Shop Revenue Management Backend. The context system provides a comprehensive, structured documentation of the entire codebase to facilitate AI-assisted development and maintenance.

---

## Context File Structure

### Entry Point: `context/main.json`

**Purpose**: The main.json file serves as the **single source of truth** and **entry point** for understanding the entire project structure.

**What it contains**:
- Project metadata (name, version, description, purpose)
- Complete technology stack
- Architecture overview with all modules
- Database schema summary
- Shared components (BaseEntity, enums)
- Environment variables guide
- Development guidelines
- Recent architectural changes
- **Links to all module-specific context files**

**How AI agents should use it**:
1. **Always read main.json first** when starting any task
2. Use the `architecture.modules` section to identify which module-specific context file to consult
3. Check `recentArchitecturalChanges` to understand recent patterns and conventions
4. Review `developmentGuidelines` before making code changes
5. Use `databaseSchema` to understand entity relationships at a high level

---

## Module-Specific Context Files

### 1. `context/category.json`

**When to update**:
- Adding/modifying Category entity fields
- Adding/modifying Category DTOs
- Adding/modifying Category endpoints
- Changing business rules for categories
- Adding relationships to/from Category entity

**What to document**:
- Entity structure with all fields and decorators
- DTO definitions with validators
- All API endpoints with request/response schemas
- Business rules and validation logic
- Relationships with other entities
- Dependencies and modules that use this module

### 2. `context/product.json`

**When to update**:
- Adding/modifying Product entity fields
- Adding/modifying Product DTOs
- Adding/modifying Product endpoints
- Changing ProductStatus enum
- Modifying soft delete behavior
- Adding/changing relationships (e.g., with Category)

**What to document**:
- Entity structure including relationship decorators
- Enum definitions (ProductStatus)
- DTO definitions with validators
- All API endpoints including query parameters
- Soft delete implementation details
- Foreign key relationships with @JoinColumn decorators
- Business rules (e.g., category must exist)

### 3. `context/order.json`

**When to update**:
- Adding/modifying Order or OrderDetail entities
- Adding/modifying Order DTOs
- Adding/modifying Order endpoints
- Changing OrderStatus or PaymentMethod enums
- Modifying order lifecycle logic
- Adding/changing relationships

**What to document**:
- Both Order and OrderDetail entity structures
- Enum definitions (OrderStatus, PaymentMethod)
- DTO definitions including nested DTOs
- All API endpoints
- Order lifecycle states and transitions
- Foreign key relationships with @JoinColumn decorators
- Cascade delete behavior
- Business rules (e.g., cancellation reason required)

### 4. `context/revenue.json`

**When to update**:
- Adding/modifying Revenue DTOs
- Adding/modifying Revenue endpoints
- Changing revenue calculation logic
- Adding new report types

**What to document**:
- DTO definitions for reports
- All API endpoints with query parameters
- Business logic for revenue calculations
- Data flow from input to output
- Business rules (e.g., only paid orders counted)
- Dependencies on Orders module

### 5. `context/overview.json`

**When to update**:
- Adding new modules
- Changing database type
- Adding new shared components
- Updating environment variables
- Adding new key features

**What to document**:
- High-level project overview
- All modules and their purposes
- Shared structure (enums, base entities)
- Environment variables
- Key features
- Technology stack

---

## How to Document Foreign Key Relationships

### Pattern for @ManyToOne Relationships

When documenting a ManyToOne relationship (e.g., Product → Category):

```json
{
  "name": "categoryId",
  "type": "number",
  "description": "Foreign key reference to Category",
  "decorator": "@Column({ type: 'int' })",
  "required": true
},
{
  "name": "category",
  "type": "Category",
  "description": "Category relationship (eager loaded)",
  "decorator": "@ManyToOne(() => Category, { eager: true })",
  "joinColumn": "@JoinColumn({ name: 'categoryId' })",
  "relationshipType": "ManyToOne",
  "targetEntity": "Category",
  "required": false
}
```

**Key elements to document**:
- The foreign key field (e.g., `categoryId`)
- The relationship property (e.g., `category`)
- The `@ManyToOne` decorator with options
- The `@JoinColumn` decorator specifying the column name
- Whether the relationship is eager or lazy loaded
- The target entity

### Pattern for @OneToMany Relationships

When documenting a OneToMany relationship (e.g., Order → OrderDetails):

```json
{
  "name": "orderDetails",
  "type": "OrderDetail[]",
  "description": "Order line items",
  "decorator": "@OneToMany(() => OrderDetail, (detail) => detail.order, { cascade: true })",
  "relationshipType": "OneToMany",
  "targetEntity": "OrderDetail",
  "inverseSide": "order",
  "cascadeOptions": ["insert", "update"],
  "required": false
}
```

**Key elements to document**:
- The relationship property (e.g., `orderDetails`)
- The `@OneToMany` decorator with inverse side reference
- Cascade options (if any)
- The target entity
- The inverse side property name

### Pattern for Cascade Delete

When documenting cascade delete behavior:

```json
{
  "name": "order",
  "type": "Order",
  "description": "Order relationship with cascade delete",
  "decorator": "@ManyToOne(() => Order, (order) => order.orderDetails, { onDelete: 'CASCADE' })",
  "joinColumn": "@JoinColumn({ name: 'orderId' })",
  "relationshipType": "ManyToOne",
  "targetEntity": "Order",
  "cascadeDelete": true,
  "required": false
}
```

---

## Step-by-Step Update Process

### When Adding a New Entity

1. **Read main.json** to understand the project structure
2. **Determine which module** the entity belongs to
3. **Update the module-specific context file** (e.g., product.json):
   - Add entity definition with all fields
   - Document all decorators (@Column, @ManyToOne, @OneToMany, @JoinColumn)
   - Document relationships with other entities
   - Add any new enums
4. **Update main.json**:
   - Add entity to `databaseSchema.entities`
   - List relationships
5. **Update overview.json** if it's a new module

### When Adding a Foreign Key Relationship

1. **Identify the entities involved** (e.g., Product and Category)
2. **Update the source entity's context file** (e.g., product.json):
   - Add the foreign key field (e.g., `categoryId`)
   - Add the relationship property (e.g., `category`)
   - Document the `@ManyToOne` decorator
   - Document the `@JoinColumn` decorator
   - Specify eager/lazy loading
3. **Update the target entity's context file** (e.g., category.json):
   - Add to `usedBy` array if not already present
4. **Update main.json**:
   - Add relationship to `databaseSchema.entities[].relationships`

### When Adding a New Endpoint

1. **Read the module-specific context file** (e.g., product.json)
2. **Add endpoint documentation**:
   - HTTP method
   - Path
   - Description
   - Request body (if applicable)
   - Response body
   - Query parameters (if applicable)
   - Path parameters (if applicable)
   - Status codes
   - Validation rules
   - Possible errors
3. **Update main.json**:
   - Increment endpoint count in `architecture.modules[].endpoints`

### When Adding a New DTO

1. **Read the module-specific context file**
2. **Add DTO documentation**:
   - Path to DTO file
   - All fields with types
   - All validators
   - Required/optional status
   - Default values
   - Swagger decorators (if applicable)
3. **Document nested DTOs** separately (e.g., CreateOrderDetailDto)

### When Modifying Business Rules

1. **Read the module-specific context file**
2. **Update the `businessRules` array**:
   - Add new rules
   - Update existing rules
   - Remove obsolete rules
3. **Update related endpoint documentation** to reflect validation changes

---

## AI Agent Workflow

### Starting a New Task

```
1. Read context/main.json
   ↓
2. Identify relevant module(s) from architecture.modules
   ↓
3. Read module-specific context file(s)
   ↓
4. Review developmentGuidelines in main.json
   ↓
5. Check recentArchitecturalChanges for patterns
   ↓
6. Proceed with implementation
   ↓
7. Update context files as changes are made
```

### Determining Which Context Files to Update

**Use this decision tree**:

- **Adding/modifying Category entity/DTOs/endpoints** → Update `category.json`
- **Adding/modifying Product entity/DTOs/endpoints** → Update `product.json`
- **Adding/modifying Order/OrderDetail entities/DTOs/endpoints** → Update `order.json`
- **Adding/modifying Revenue DTOs/endpoints** → Update `revenue.json`
- **Adding new module** → Create new context file + update `main.json` and `overview.json`
- **Changing database type** → Update `main.json` and `overview.json`
- **Adding shared component** → Update `main.json`
- **Adding enum** → Update relevant module context file + `main.json`
- **Changing environment variables** → Update `main.json` and `overview.json`
- **Any architectural change** → Update `main.json` `recentArchitecturalChanges` section

---

## Consistency Guidelines

### Field Documentation Format

Always use this structure for entity fields:

```json
{
  "name": "fieldName",
  "type": "TypeScript type",
  "description": "Clear description of purpose",
  "decorator": "Full TypeORM decorator with options",
  "required": true/false,
  "default": "default value if applicable"
}
```

### Relationship Documentation Format

Always include these properties for relationships:

```json
{
  "name": "relationshipPropertyName",
  "type": "RelatedEntity or RelatedEntity[]",
  "description": "Description including loading strategy",
  "decorator": "Full @ManyToOne/@OneToMany decorator",
  "joinColumn": "@JoinColumn decorator if applicable",
  "relationshipType": "ManyToOne/OneToMany/ManyToMany",
  "targetEntity": "EntityName",
  "required": false
}
```

### Endpoint Documentation Format

Always use this structure for endpoints:

```json
{
  "method": "HTTP method",
  "path": "/path/with/:params",
  "description": "Clear description",
  "requestBody": "DTO name if applicable",
  "responseBody": "Response type",
  "queryParameters": [...],
  "parameters": [...],
  "statusCode": 200,
  "validation": "Validation rules",
  "errors": ["Possible error responses"]
}
```

---

## Validation Checklist

Before considering context updates complete, verify:

- [ ] All entity fields are documented with decorators
- [ ] All relationships include @JoinColumn documentation where applicable
- [ ] All DTOs are documented with validators
- [ ] All endpoints are documented with request/response schemas
- [ ] Business rules are up-to-date
- [ ] Dependencies and usedBy arrays are accurate
- [ ] Enum values are documented
- [ ] main.json reflects all modules and recent changes
- [ ] File paths are correct and up-to-date
- [ ] Relationship types (ManyToOne, OneToMany) are clearly specified

---

## Example: Complete Update Flow

**Scenario**: Adding a @JoinColumn decorator to Product → Category relationship

**Steps**:

1. **Read context/main.json**
   - Identify that Product module context is at `context/product.json`

2. **Read context/product.json**
   - Find the `category` field in entity.fields

3. **Update context/product.json**
   - Add `joinColumn` property to the `category` field:
   ```json
   {
     "name": "category",
     "type": "Category",
     "description": "Category relationship (eager loaded)",
     "decorator": "@ManyToOne(() => Category, { eager: true })",
     "joinColumn": "@JoinColumn({ name: 'categoryId' })",
     "relationshipType": "ManyToOne",
     "targetEntity": "Category",
     "required": false
   }
   ```

4. **Update context/main.json**
   - Add to `recentArchitecturalChanges`:
   ```json
   {
     "change": "Foreign Key Relationships with @JoinColumn",
     "date": "2025-10-25",
     "description": "Added explicit @JoinColumn decorators to all ManyToOne relationships",
     "impact": [
       "Product entity: Added @JoinColumn for category relationship",
       "OrderDetail entity: Added @JoinColumn for order and product relationships",
       "Improved database schema clarity and control"
     ]
   }
   ```

5. **Verify consistency**
   - Check that all similar relationships follow the same pattern
   - Ensure documentation is clear and complete

---

## Summary

The context system is designed to be:
- **Comprehensive**: Documents all aspects of the codebase
- **Structured**: Consistent format across all files
- **Hierarchical**: main.json → module-specific files
- **Maintainable**: Clear guidelines for updates
- **AI-friendly**: Easy for AI agents to parse and understand

By following this guide, AI agents can:
- Quickly understand the entire project structure
- Know exactly which context files to update
- Maintain consistency across documentation
- Preserve institutional knowledge
- Facilitate smooth development and maintenance

---

**Last Updated**: 2025-10-25

