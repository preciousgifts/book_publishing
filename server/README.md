# PublishFlow AI Gateway API (Mission Phase 1)

PublishFlow AI Gateway is an Express Node.js application built with Prisma ORM connecting to a PostgreSQL database. It supports JWT-based dedicated authentication, input validation via Zod, and data structures for books, outlines, paragraphs, and progress.

## Prerequisites

- Node.js (v18+)
- PostgreSQL database instance (local or hosted, e.g., Supabase)

## Setup & Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables. Copy `.env.example` to `.env` and fill in the details:
   ```bash
   cp .env.example .env
   ```
   *Make sure to provide a valid `DATABASE_URL` for PostgreSQL and a secure `JWT_SECRET`.*

3. Set up the database and run migrations/generate Prisma client:
   ```bash
   # Generates Prisma client
   npm run prisma:generate

   # Applies schema migrations
   npm run prisma:migrate
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Health Check
- **`GET /api/health`**
  - **Description**: Access verification endpoint.
  - **Response**:
    ```json
    {
      "status": "online",
      "timestamp": "2026-08-01T00:11:36Z"
    }
    ```

### Authentication
- **`POST /api/auth/register`**
  - **Description**: Register a new user.
  - **Body Schema (JSON)**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword",
      "fullName": "John Doe"
    }
    ```
  - **Response (201 Created)**:
    ```json
    {
      "success": true,
      "data": {
        "token": "eyJhbGciOiJIUzI1NiIsIn...",
        "user": {
          "id": "uuid-string",
          "email": "user@example.com",
          "fullName": "John Doe"
        }
      }
    }
    ```

- **`POST /api/auth/login`**
  - **Description**: Authenticate an existing user.
  - **Body Schema (JSON)**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword"
    }
    ```
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "token": "eyJhbGciOiJIUzI1NiIsIn...",
        "user": {
          "id": "uuid-string",
          "email": "user@example.com",
          "fullName": "John Doe"
        }
      }
    }
    ```

- **`GET /api/auth/me`**
  - **Description**: Retrieve user profile info (Requires authentication).
  - **Headers**: `Authorization: Bearer <token>`
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "uuid-string",
        "email": "user@example.com",
        "fullName": "John Doe",
        "createdAt": "2026-08-01T00:11:36Z",
        "updatedAt": "2026-08-01T00:11:36Z"
      }
    }
    ```
