# Shared Tails - Collaborative Writing Server

Minimal backend server for collaborative book writing application. Built with Node.js and Express.

## Features

- JWT-based authentication (register/login)
- CRUD operations for books
- User-specific content management
- In-memory storage (ready for DB migration)

## Tech Stack

- Node.js
- Express.js
- JWT (JSON Web Tokens)
- bcryptjs (password hashing)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment (Optional)

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` to set your own JWT secret:

```
PORT=3000
JWT_SECRET=your-super-secret-key-here
```

### 3. Start Server

```bash
npm start
```

For development with auto-reload (Node 18+):

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## API Endpoints

### Authentication

#### Register New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "password": "pass123"}'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo123"}'
```

Response includes token:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "demo"
  }
}
```

#### Get Current User Info
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Books (CRUD)

All book endpoints require authentication. Include the token in Authorization header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

#### Get All User's Books
```bash
curl http://localhost:3000/api/books \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Create New Book
```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "My First Book",
    "description": "A story about adventures",
    "content": "Chapter 1: The Beginning..."
  }'
```

#### Get Specific Book
```bash
curl http://localhost:3000/api/books/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Update Book
```bash
curl -X PUT http://localhost:3000/api/books/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Updated Title",
    "content": "New content here..."
  }'
```

#### Delete Book
```bash
curl -X DELETE http://localhost:3000/api/books/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Testing Workflow

### Complete Test Scenario

1. **Login with demo user:**
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"
```

2. **Create a book:**
```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "The Adventure Begins",
    "description": "An epic tale",
    "content": "It was a dark and stormy night..."
  }'
```

3. **Get all books:**
```bash
curl http://localhost:3000/api/books \
  -H "Authorization: Bearer $TOKEN"
```

4. **Update the book:**
```bash
curl -X PUT http://localhost:3000/api/books/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "It was a bright and sunny morning..."}'
```

5. **Delete the book:**
```bash
curl -X DELETE http://localhost:3000/api/books/1 \
  -H "Authorization: Bearer $TOKEN"
```

## Demo Credentials

Pre-configured test user:
- Username: `demo`
- Password: `demo123`

## Project Structure

```
shared-tails/
├── server.js           # Main server file with all routes
├── package.json        # Dependencies and scripts
├── .env.example        # Environment variables template
├── .env               # Your local config (not in git)
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Deployment Workflow

### 1. On Development Machine

```bash
# Make changes to code
git add .
git commit -m "Add new feature"
git push origin main
```

### 2. On Ubuntu Server

```bash
# Pull latest changes
cd /path/to/shared-tails
git pull origin main

# Install dependencies (if package.json changed)
npm install

# Restart server (using PM2 or systemd)
pm2 restart shared-tails
# or
sudo systemctl restart shared-tails
```

## Next Steps

- [ ] Add database integration (PostgreSQL/MongoDB)
- [ ] Implement chapters as separate entities
- [ ] Add collaborative editing features
- [ ] Implement real-time updates (WebSocket)
- [ ] Add user roles and permissions
- [ ] Implement book sharing functionality

## License

ISC
