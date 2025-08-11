# Secure Task Workflow API Documentation

## 📚 API Documentation

This project includes comprehensive (Swagger) documentation for all API endpoints.

### 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm run dev
   ```

3. **Access API Documentation**
   - **Interactive UI**: http://localhost:3000/api-docs
   - **JSON Format**: http://localhost:3000/api-docs.json  
   - **YAML Format**: http://localhost:3000/api-docs.yaml

## 📖 Documentation Features

### **Complete API Coverage**
- ✅ **Authentication** - User registration, login, profile management
- ✅ **Task Management** - CRUD operations, assignments, comments, attachments
- ✅ **Reports** - Task summaries, user performance analytics
- ✅ **Email Simulation** - Background email processing and queue management
- ✅ **Data Export** - CSV and JSON export functionality

### **Professional Documentation Standards**
- 📝 Detailed endpoint descriptions with examples
- 🔐 Security scheme definitions (JWT Bearer tokens)
- 📊 Complete request/response schemas
- 🏷️ Organized by functional tags
- 🎯 Role-based access control documentation
- 📋 Comprehensive parameter validation
- 🚨 Error response specifications

### **Interactive Features**
- 🧪 **Try It Out** - Test endpoints directly from the UI
- 🔍 **Schema Explorer** - Browse all data models
- 📱 **Responsive Design** - Works on desktop and mobile
- 🎨 **Custom Styling** - Professional appearance
- 🔎 **Search & Filter** - Find endpoints quickly

## 🏗️ API Architecture

### **Authentication & Authorization**
```
POST /api/auth/register     - Register new user
POST /api/auth/login        - User login
POST /api/auth/refresh      - Refresh access token
POST /api/auth/logout       - User logout
GET  /api/auth/profile      - Get user profile
PUT  /api/auth/profile      - Update user profile
PUT  /api/auth/change-password - Change password
GET  /api/auth/users        - Get all users (Admin only)
```

### **Task Management**
```
GET    /api/tasks           - Get tasks with filtering
POST   /api/tasks           - Create new task (Manager/Admin)
GET    /api/tasks/{id}      - Get task by ID
PUT    /api/tasks/{id}      - Update task
DELETE /api/tasks/{id}      - Delete task (Manager/Admin)
POST   /api/tasks/{id}/assign - Assign task (Manager/Admin)
POST   /api/tasks/{id}/comments - Add comment
POST   /api/tasks/{id}/attachments - Upload attachments
```

### **Reports & Analytics**
```
GET /api/reports/task-summary     - Task summary report (Admin)
GET /api/reports/user-performance - User performance report (Admin)
```

### **Email Simulation**
```
POST /api/emails/simulate-email-processing - Simulate email processing (Admin)
POST /api/emails/process-manual           - Process manual email (Admin)
```

### **Data Export**
```
GET /api/export/tasks   - Export tasks (Admin)
GET /api/export/users   - Export users (Admin)  
GET /api/export/reports - Export reports (Admin)
```

## 🔒 Security & Access Control

### **Role-Based Access Control (RBAC)**
- **Employee (Role: 1)** - View assigned tasks, update task status, add comments
- **Manager (Role: 2)** - All Employee permissions + create/assign tasks, manage team
- **Admin (Role: 3)** - All permissions + user management, reports, exports

### **Authentication**
- JWT Bearer tokens with access and refresh token rotation
- Password requirements: 8+ chars, uppercase, lowercase, digit, special character
- Rate limiting: 10 req/min (non-auth), 100 req/hour (auth)

### **File Upload Security**
- Supported formats: PDF, JPG, PNG only
- Maximum 3 attachments per task
- File size limit: 5MB per file
- Secure file storage with validation

## 📊 Request/Response Examples

### **Create Task Example**
```json
POST /api/tasks
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Develop JWT-based authentication system with role-based access control",
  "assignedTo": "507f1f77bcf86cd799439011",
  "priority": "high",
  "dueDate": "2024-02-15T10:00:00.000Z",
  "estimatedHours": 40,
  "tags": ["backend", "security", "authentication"]
}
```

### **Response Example**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Implement user authentication",
    "description": "Develop JWT-based authentication system",
    "status": "pending",
    "priority": "high",
    "assignedTo": {
      "id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "email": "john.doe@company.com"
    },
    "createdBy": {
      "id": "507f1f77bcf86cd799439013", 
      "name": "Manager Smith",
      "email": "manager@company.com"
    },
    "dueDate": "2024-02-15T10:00:00.000Z",
    "estimatedHours": 40,
    "tags": ["backend", "security", "authentication"],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## 🛠️ Development

### **File Structure**
```
docs/
├── swagger.yaml          # Complete OpenAPI specification
├── swagger-ui.js         # Swagger UI configuration
└── README.md            # This documentation
```

### **Updating Documentation**
1. Edit `docs/swagger.yaml` for API changes
2. Restart server to see updates
3. Documentation auto-updates on server restart

### **Custom Swagger UI**
The Swagger UI includes custom styling and configuration:
- Hidden topbar for cleaner look
- Custom colors matching API theme
- Enhanced request/response display
- Integrated authentication testing

## 🚦 Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request - Validation Error |
| 401  | Unauthorized - Invalid/Missing Token |
| 403  | Forbidden - Insufficient Permissions |
| 404  | Not Found |
| 409  | Conflict - Resource Already Exists |
| 429  | Rate Limit Exceeded |
| 500  | Internal Server Error |

## 🧪 Testing with Swagger UI

1. **Authenticate**: Use `/api/auth/login` to get JWT token
2. **Authorize**: Click "Authorize" button and enter `Bearer <token>`
3. **Test Endpoints**: Use "Try it out" on any endpoint
4. **View Responses**: See real API responses with data

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- MongoDB ObjectIds follow pattern: `^[0-9a-fA-F]{24}$`
- Pagination uses `page` and `limit` parameters
- Search supports partial matching in title/description
- Soft delete implemented for tasks (Admin can restore)

---

**🎯 Ready to explore your API!** Visit http://localhost:3000/api-docs to get started.
