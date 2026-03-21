# Shared Tales - Collaborative Writing Server

Minimal backend server for collaborative book writing application. Built with Node.js and Express.

## Features

- JWT-based authentication (register/login)
- CRUD operations for books
- User-specific content management
- In-memory storage (ready for DB migration)

## Tech Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- JWT (JSON Web Tokens)
- bcryptjs (password hashing)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
# or
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

### 3. Build the Project

```bash
pnpm run build
# or
npm run build
```

### 4. Start Server

For production:

```bash
pnpm start
# or
npm start
```

For development with auto-reload:

```bash
pnpm run dev
# or
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
shared-tales/
├── server.ts           # Main server file with all routes
├── db/
│   └── index.ts       # Database connection pool
├── types/
│   ├── index.ts       # TypeScript type definitions
│   └── bcryptjs.d.ts  # bcryptjs type declarations
├── dist/              # Compiled JavaScript files (generated)
├── tsconfig.json      # TypeScript configuration
├── package.json       # Dependencies and scripts
├── .env.example       # Environment variables template
├── .env               # Your local config (not in git)
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Deployment Workflow

### 1. On Development Machine

```bash
# Make changes to code
pnpm run build  # Build TypeScript to JavaScript
git add .
git commit -m "Add new feature"
git push origin main
```

### 2. On Ubuntu Server

```bash
# Pull latest changes
cd /path/to/shared-tales
git pull origin main

# Install dependencies (if package.json changed)
pnpm install

# Build TypeScript
pnpm run build

# Restart server (using PM2 or systemd)
pm2 restart shared-tales
# or
sudo systemctl restart shared-tales
```

## TypeScript Development

This project is written in TypeScript for better type safety and developer experience.

### Available Scripts

- `pnpm run build` - Compile TypeScript to JavaScript
- `pnpm run dev` - Run development server with auto-reload (using tsx)
- `pnpm run dev:node` - Run development server with ts-node
- `pnpm start` - Run production server from compiled files
- `pnpm run lint` - Check code with ESLint
- `pnpm run lint:fix` - Fix ESLint errors automatically
- `pnpm run format` - Format code with Prettier
- `pnpm run typecheck` - Check TypeScript types without compilation
- `pnpm run check` - Run all checks (typecheck + lint + format check)

### Type Definitions

All type definitions are located in the `types/` directory:

- `types/index.ts` - Main application types (User, Book, Request types, etc.)
- `types/bcryptjs.d.ts` - bcryptjs module type declarations

### Code Quality

The project uses strict TypeScript settings and ESLint/Prettier for code quality:

- **No `any` types allowed** - all code must be fully typed
- **Strict null checks** - all nullable values must be checked
- **ESLint** - enforces code style and best practices
- **Prettier** - automatic code formatting

## Next Steps

- [x] Add database integration (PostgreSQL)
- [x] Migrate to TypeScript
- [ ] Implement chapters as separate entities
- [ ] Add collaborative editing features
- [ ] Implement real-time updates (WebSocket)
- [ ] Add user roles and permissions
- [ ] Implement book sharing functionality

## License

ISC
