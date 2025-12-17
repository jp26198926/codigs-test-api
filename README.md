# Test API Server 🚀

A comprehensive, secure, and dynamic API testing server built with Node.js, Express, and MongoDB. Perfect for frontend developers who need a flexible backend for testing their applications.

## ✨ Features

- **🎨 Web Dashboard**: Beautiful, intuitive UI for managing collections and creating data
- **Dynamic Collection Creation**: Create any collection on-the-fly without predefined schemas
- **Full CRUD Operations**: GET, POST, PUT, PATCH, DELETE support
- **Advanced Querying**: Filtering, sorting, pagination, and full-text search
- **DDoS Protection**: Rate limiting, request size limits, and security headers
- **NoSQL Injection Prevention**: Automatic sanitization of MongoDB queries
- **Public Access**: No authentication required - perfect for testing
- **RESTful API**: Clean and intuitive API design
- **Built-in Templates**: Ready-to-use templates for common data types

## 🔒 Security Features

- **Helmet.js**: Secure HTTP headers with Content Security Policy
- **Rate Limiting**: 500 requests per 15 minutes (global), 100 requests per 15 minutes (write operations)
- **Request Size Limits**: 10kb max payload size
- **MongoDB Sanitization**: Protection against NoSQL injection attacks
- **HPP Protection**: HTTP Parameter Pollution prevention
- **CORS Enabled**: Cross-origin requests allowed
- **Input Validation**: Collection names and document IDs validated

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/test-api-server
NODE_ENV=development
```

### 3. Start MongoDB

If using local MongoDB:

```bash
mongod
```

Or use MongoDB Atlas cloud database.

### 4. Run the Server

Development mode with auto-reload:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will start on `http://localhost:3000`

### 5. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:3000
```

You'll see a beautiful web dashboard with:

- 📊 **Dashboard**: View all collections and statistics
- ➕ **Create Data**: Easy form to create documents with templates
- 📡 **API Endpoints**: Complete API reference
- 💡 **Examples**: Copy-paste ready code examples

## 📚 API Documentation

### Base URL

```
http://localhost:3000
```

### Endpoints

#### 1. List All Collections

```http
GET /collections
```

**Response:**

```json
{
  "count": 3,
  "collections": ["posts", "users", "comments"]
}
```

#### 2. Get All Documents

```http
GET /:collection
```

**Example:**

```bash
GET /posts
GET /users?_limit=10&_sort=-createdAt
GET /posts?title=Hello&_search=world
```

**Query Parameters:**

- `_limit`: Limit results (default: 100, max: 1000)
- `_skip` or `_offset`: Skip results for pagination
- `_sort`: Sort by field (prefix with `-` for descending)
- `_search`: Full-text search across all fields
- `field`: Exact match filter
- `field_gte`: Greater than or equal
- `field_lte`: Less than or equal
- `field_ne`: Not equal

**Response:**

```json
{
  "collection": "posts",
  "count": 10,
  "total": 100,
  "data": [...]
}
```

#### 3. Get Single Document

```http
GET /:collection/:id
```

**Example:**

```bash
GET /posts/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "Hello World",
  "content": "This is a test post",
  "createdAt": "2025-12-15T10:30:00.000Z",
  "updatedAt": "2025-12-15T10:30:00.000Z"
}
```

#### 4. Create Document

```http
POST /:collection
Content-Type: application/json
```

**Example:**

```bash
POST /posts
{
  "title": "My First Post",
  "content": "Hello world!",
  "author": "John Doe"
}
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "My First Post",
  "content": "Hello world!",
  "author": "John Doe",
  "createdAt": "2025-12-15T10:30:00.000Z",
  "updatedAt": "2025-12-15T10:30:00.000Z"
}
```

#### 5. Update Document (Full Replace)

```http
PUT /:collection/:id
Content-Type: application/json
```

**Example:**

```bash
PUT /posts/507f1f77bcf86cd799439011
{
  "title": "Updated Post",
  "content": "New content"
}
```

#### 6. Partial Update

```http
PATCH /:collection/:id
Content-Type: application/json
```

**Example:**

```bash
PATCH /posts/507f1f77bcf86cd799439011
{
  "title": "Only Update Title"
}
```

#### 7. Delete Document

```http
DELETE /:collection/:id
```

**Example:**

```bash
DELETE /posts/507f1f77bcf86cd799439011
```

**Response:**

```json
{
  "message": "Document deleted successfully",
  "deleted": {...}
}
```

#### 8. Delete All Documents in Collection

```http
DELETE /:collection
```

**Example:**

```bash
DELETE /posts
```

**Response:**

```json
{
  "message": "All documents deleted successfully",
  "deletedCount": 42
}
```

## 💡 Usage Examples

### Example 1: Blog System

**Create a post:**

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started",
    "content": "Welcome to my blog!",
    "author": "Jane"
  }'
```

**Create a user:**

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com"
  }'
```

**Create a comment:**

```bash
curl -X POST http://localhost:3000/comments \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "507f1f77bcf86cd799439011",
    "text": "Great post!",
    "author": "John"
  }'
```

### Example 2: E-commerce System

**Create products:**

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "price": 999.99,
    "category": "Electronics",
    "inStock": true
  }'
```

**Filter products by price:**

```bash
curl "http://localhost:3000/products?price_gte=500&price_lte=1500&_sort=-price"
```

### Example 3: Task Management

**Create tasks:**

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project",
    "status": "pending",
    "priority": "high"
  }'
```

**Get pending tasks:**

```bash
curl "http://localhost:3000/tasks?status=pending&_sort=-priority"
```

## 🔧 Advanced Features

### Pagination

```bash
# Get first 10 items
GET /posts?_limit=10

# Get next 10 items
GET /posts?_limit=10&_skip=10
```

### Sorting

```bash
# Sort ascending
GET /posts?_sort=title

# Sort descending
GET /posts?_sort=-createdAt
```

### Full-Text Search

```bash
GET /posts?_search=javascript tutorial
```

### Filtering

```bash
# Exact match
GET /users?role=admin

# Greater than or equal
GET /products?price_gte=100

# Less than or equal
GET /products?price_lte=500

# Not equal
GET /posts?status_ne=draft
```

## 🛡️ Rate Limits

- **Global**: 500 requests per 15 minutes per IP
- **Write Operations** (POST, PUT, PATCH, DELETE): 100 requests per 15 minutes per IP

## ⚠️ Important Notes

1. **Collection Names**: Must be alphanumeric with dashes or underscores (1-50 characters)
2. **Request Size**: Maximum 10kb per request
3. **Query Limit**: Maximum 1000 documents per request
4. **Public API**: No authentication - anyone can read/write
5. **Auto Timestamps**: All documents automatically get `createdAt` and `updatedAt` fields
6. **Security**: CSP allows inline scripts for the dashboard UI functionality

## 🐛 Error Handling

The API returns appropriate HTTP status codes:

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

Example error response:

```json
{
  "error": "Invalid collection name"
}
```

## 📝 Development

### Project Structure

```
test-api/
├── server.js          # Main application file
├── package.json       # Dependencies and scripts
├── .env              # Environment variables (create from .env.example)
├── .env.example      # Example environment variables
├── .gitignore        # Git ignore rules
└── README.md         # Documentation
```

### Tech Stack

- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM for MongoDB
- **Helmet**: Security headers
- **Express Rate Limit**: DDoS protection
- **Express Mongo Sanitize**: NoSQL injection prevention
- **CORS**: Cross-origin resource sharing
- **Compression**: Response compression

## 🤝 Contributing

This is an open testing API server. Feel free to use and modify as needed.

## 📄 License

MIT License - Free to use for any purpose.

## 🆘 Support

For issues or questions:

1. Check the API documentation at `http://localhost:3000/`
2. Verify MongoDB is running
3. Check environment variables in `.env`
4. Review server logs for error messages

---

**Happy Testing! 🎉**
