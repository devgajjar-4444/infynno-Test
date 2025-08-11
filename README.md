# Secure Task Workflow API

A secure, production-ready Node.js (Express) API for a task management system with role-based access control, file uploads, background email simulation, and comprehensive reporting.

## Features

- **JWT Authentication** with access and refresh tokens
- **Role-Based Access Control** (Admin, Manager, Employee)
- **Task Management** with CRUD operations and filtering
- **File Uploads** (PDF/JPG/PNG, max 3 per task)
- **Rate Limiting** (10 req/min for non-auth, 100 req/hour for auth)
- **Background Email Simulation** with queue system
- **Aggregated Reporting** (Admin only)
- **CSV Export** functionality
- **Comprehensive Logging** and error handling
- **Input Validation** using Joi
- **Unit Testing** with Jest and Supertest

## Prerequisites

- Node.js >= 16.0.0
- MongoDB (local or cloud instance)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd secure-task-workflow-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
  # Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://devgajjar4444:l5AHRrKeVMEVpt6N@cluster0.o8pwmjn.mongodb.net/
# JWT Configuration
JWT_ACCESS_SECRET=JWT_SECRET_TASK_INFYNNO
JWT_REFRESH_SECRET=JWT_REFRESH_SECRET_TASK_INFYNNO
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
AUTH_RATE_LIMIT_WINDOW_MS=3600000
AUTH_RATE_LIMIT_MAX_REQUESTS=100


4. **Create uploads directory**
   ```bash
   mkdir uploads
   ```

5. **Create Admin User** (Required for first setup)
   ```bash
   npm run create-admin
   ```
   This creates an admin user with:
   - Email: `admin@infynno.com`
   - Password: `Admin@!123`
   - Role: Admin (1)

6. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

7. **Import postman collection from `postman_collection.json`**

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "employee"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response includes:**
- `accessToken` (valid for 15 minutes)
- `refreshToken` (valid for 7 days)

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### Task Management Endpoints

#### Create Task (Manager/Admin only)
```http
POST /tasks
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

{
  "title": "Complete API Documentation",
  "description": "Write comprehensive API documentation",
  "priority": "high",
  "dueDate": "2024-12-31",
  "assignedTo": "user_id_here"
}
```

#### Get Tasks (with filtering)
```http
GET /tasks?status=pending&priority=high&page=1&limit=10
Authorization: Bearer <access_token>
```

#### Update Task
```http
PUT /tasks/:taskId
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "in_progress",
  "priority": "urgent"
}
```

#### Upload Attachments
```http
POST /tasks/:taskId/attachments
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: [PDF/JPG/PNG file]
```

### Report Endpoints (Admin only)

#### Task Summary Report
```http
GET /reports/task-summary?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <access_token>
```

#### User Performance Report
```http
GET /reports/user-performance
Authorization: Bearer <access_token>
```

### Email Simulation Endpoints (Admin only)

#### Process Email Queue
```http
POST /emails/process-queue
Authorization: Bearer <access_token>
```

#### Get Queue Status
```http
GET /emails/queue-status
Authorization: Bearer <access_token>
```

### Export Endpoints (Admin only)

#### Export Tasks to CSV
```http
GET /export/tasks?format=csv&status=completed
Authorization: Bearer <access_token>
```

## 🔐 Role-Based Access Control

### Role System
- **Admin (1)**: Full access to all endpoints
- **Manager (2)**: Can create, assign, and update tasks
- **Employee (3)**: Can view assigned tasks and update status

### Role Hierarchy
- Admin (1) > Manager (2) > Employee (3)

### Role Input
- Users can register with numeric roles: 2 (Manager) or 3 (Employee)
- Admin (1) can only be created via script: `npm run create-admin`
- String roles are also supported: 'admin', 'manager', 'employee'

### Admin (1)
- Full access to all endpoints
- User management (create, update, delete)
- System reports and analytics
- Email queue management
- Data export functionality

### Manager (2)
- Create, assign, and update tasks
- View all tasks and reports
- Upload and manage task attachments
- Cannot access user management or system reports

### Employee (3)
- View assigned tasks
- Update task status and add comments
- Upload attachments to assigned tasks
- Cannot create or assign tasks

## 📁 Project Structure

```
secure-task-workflow-api/
├── config/                 # Configuration files
│   └── database.js        # Database connection
├── constants/              # Application constants
│   └── index.js           # RBAC, status codes, etc.
├── controllers/            # Business logic
│   ├── authController.js  # Authentication logic
│   ├── taskController.js  # Task management logic
│   └── reportController.js # Reporting logic
├── middlewares/            # Express middlewares
│   ├── auth.js            # JWT authentication
│   ├── errorHandler.js    # Error handling
│   ├── rateLimit.js       # Rate limiting
│   ├── upload.js          # File upload handling
│   └── validation.js      # Input validation
├── models/                 # Mongoose models
│   ├── User.js            # User schema
│   ├── Task.js            # Task schema
│   └── Email.js           # Email job schema
├── routes/                 # API routes
│   ├── auth.js            # Authentication routes
│   ├── tasks.js           # Task management routes
│   ├── reports.js         # Reporting routes
│   ├── emails.js          # Email simulation routes
│   └── export.js          # Export routes
├── services/               # Business services
│   └── emailService.js    # Email queue service
├── utils/                  # Utility functions
│   ├── logger.js          # Logging utility
│   └── validation.js      # Joi validation schemas
├── tests/                  # Test files
│   ├── setup.js           # Jest setup
│   └── auth.test.js       # Authentication tests
├── uploads/                # File upload directory
├── logs/                   # Application logs
├── .env.example           # Environment variables template
├── jest.config.js         # Jest configuration
├── package.json           # Dependencies and scripts
├── server.js              # Application entry point
└── README.md              # This file
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_ACCESS_SECRET` | JWT access token secret | - |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | - |
| `JWT_ACCESS_EXPIRES_IN` | Access token expiry | 15m |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | 7d |
| `MAX_FILE_SIZE` | Maximum file size in bytes | 5242880 (5MB) |
| `UPLOAD_PATH` | File upload directory | ./uploads |

## 📊 Rate Limiting

- **Non-authenticated routes**: 10 requests per minute per IP
- **Authenticated routes**: 100 requests per hour per user
- **File uploads**: 5 requests per 5 minutes per user
- **Authentication attempts**: 5 attempts per 15 minutes per IP

## 📝 Logging

The application logs to both console and files:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs
- `logs/access.log` - HTTP access logs

Log levels: ERROR, WARN, INFO, DEBUG

## 🚨 Error Handling

Custom error classes with consistent response format:
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

## 🔒 Security Features

- **Helmet.js** for security headers
- **CORS** configuration
- **Rate limiting** to prevent abuse
- **Input validation** with Joi
- **JWT token** authentication
- **Role-based** access control
- **File type** validation
- **SQL injection** protection (MongoDB)

## 📦 Dependencies

### Production
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT handling
- `bcryptjs` - Password hashing
- `joi` - Input validation
- `multer` - File uploads
- `express-rate-limit` - Rate limiting
- `helmet` - Security headers
- `cors` - CORS middleware

### Development
- `nodemon` - Auto-reload during development
- `jest` - Testing framework
- `supertest` - HTTP testing
- `mongodb-memory-server` - In-memory MongoDB for testing

## 🧪 Testing

The project includes comprehensive unit tests:
- Authentication endpoints
- Input validation
- Error handling
- Role-based access control

Run tests with:
```bash
npm test
```

## 📤 Postman Collection

Import the included `postman_collection.json` file into Postman for easy API testing.

## 🚀 Deployment

1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set strong JWT secrets
4. Configure proper CORS origins
5. Set up reverse proxy (nginx) if needed
6. Use PM2 or similar process manager

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository.
