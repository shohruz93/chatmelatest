---
description: Repository Information Overview
alwaysApply: true
---

# ChatMe Repository Information

## Repository Summary

ChatMe is a real-time messaging and matching platform built with a full-stack architecture. It features an Angular frontend, a Node.js/Socket.IO real-time backend, and a PHP REST API connected to MySQL. The application enables user matching, messaging, friendship management, and advanced compatibility scoring.

## Repository Structure

```
ChatmeLast/
├── frontend/              # Angular 21 SPA
├── backend/
│   ├── api/              # PHP REST API
│   └── socket/           # Node.js Socket.IO server
├── database/             # MySQL schema definitions
└── .qodo/               # Qodo workflows and agents
```

### Main Repository Components

- **Frontend**: Angular 21 Single Page Application with real-time messaging UI
- **Socket Server**: Node.js/Express with Socket.IO for real-time communication, matchmaking, and presence management
- **API Server**: PHP REST API for user profiles, matching algorithms, messages, and admin functions
- **Database**: MySQL relational database for persistent storage

---

## Project 1: Frontend (Angular 21)

**Configuration File**: `frontend/package.json`, `frontend/angular.json`

### Language & Runtime

**Language**: TypeScript  
**Runtime Version**: Node.js (npm 11.5.2)  
**Angular Version**: 21.0.0  
**TypeScript Version**: 5.9.2  
**Build System**: Angular CLI (@angular/cli 21.0.0, @angular/build 21.0.0)  
**Package Manager**: npm

### Dependencies

**Main Dependencies**:
- `@angular/common`, `@angular/compiler`, `@angular/core`, `@angular/forms`, `@angular/platform-browser`, `@angular/router` (v21.0.0)
- `socket.io-client` (v4.8.1) - Real-time communication
- `firebase` (v12.6.0) - Authentication
- `rxjs` (7.8.0) - Reactive programming
- `country-list`, `world-countries` - Geographic data
- `tailwindcss` (4.1.17) - Styling
- `zone.js` (0.15.1)

**Development Dependencies**:
- `vitest` (4.0.8) - Unit testing
- `typescript` (5.9.2)
- `postcss`, `autoprefixer` - CSS processing

### Build & Installation

```bash
npm install
ng serve              # Development server (http://localhost:4200)
ng build              # Production build
ng build --watch      # Watch mode
npm test              # Run tests with Vitest
```

### Testing

**Framework**: Vitest  
**Test Location**: Tests follow Angular structure (`.spec.ts` files)  
**Test Configuration Files**: `tsconfig.spec.json`, Angular CLI test config  

**Run Command**:
```bash
npm test              # Unit tests via Vitest
ng test               # Angular test runner (Karma configured)
```

### Configuration

- **TypeScript**: Strict mode enabled, noImplicitOverride, noPropertyAccessFromIndexSignature
- **Angular Compiler**: strictTemplates, strictInjectionParameters enabled
- **Build Target**: ES2022
- **Development Server Port**: 4200
- **Code Style**: Prettier formatter configured with 100 char line width

---

## Project 2: Backend - Socket Server (Node.js)

**Configuration File**: `backend/socket/package.json`

### Language & Runtime

**Language**: JavaScript (Node.js)  
**Runtime**: Node.js  
**Package Manager**: npm  
**Build System**: Direct execution (no build step)

### Dependencies

**Main Dependencies**:
- `express` (4.18.2) - Web framework
- `socket.io` (4.7.2) - Real-time bidirectional communication
- `cors` (2.8.5) - Cross-Origin Resource Sharing
- `mysql2` (3.15.3) - MySQL database driver
- `jsonwebtoken` (9.0.2) - JWT authentication
- `dotenv` (16.3.1) - Environment configuration
- `node-fetch` (2.7.0) - HTTP requests to PHP API

**Development Dependencies**:
- `nodemon` (3.0.1) - Auto-reload during development

### Build & Installation

```bash
npm install
npm start              # Production: node server.js
npm run dev           # Development: nodemon server.js
```

### Entry Point

**Main File**: `backend/socket/server.js`

### Functionality

- Real-time user presence tracking (online/offline status)
- Matchmaking with compatibility scoring and filter relaxation
- Live messaging with instant delivery
- Message history retrieval from MySQL
- Typing indicators and read receipts
- Translation requests via external API
- Multi-room session management

**Configuration**: Environment variables via `.env` file (PORT defaults to 3001)

---

## Project 3: Backend - API (PHP)

**Entry Point**: `backend/api/public/index.php`

### Language & Runtime

**Language**: PHP  
**Package Manager**: Manual (no Composer detected)  
**Build System**: None (direct execution)

### Architecture

**Router**: Custom PHP router (`src/Router.php`) with method-based routing  
**Database**: MySQL connection via `Database` class  
**Controllers**: Object-oriented design

**Main Controllers**:
- `Auth.php` - Google OAuth authentication
- `Profile.php` - User profiles and ratings
- `User.php` - User data and random selection
- `MatchController.php` - Basic matching
- `AdvancedMatchController.php` - Advanced compatibility matching with scoring
- `Message.php` - Message CRUD and history
- `Conversation.php` - Conversation management and read status
- `Friendship.php` - Friend requests and management
- `AdminController.php` - Admin statistics and user management

### API Routes

**Auth**: POST `/auth/google`  
**Profile**: GET/POST `/profile`, POST `/profile/rating`  
**Matching**: GET `/match`, GET `/match/compatible`, GET/POST `/match/preferences`, POST `/match/history`, POST `/match/feedback`  
**Friends**: POST `/friend/request`, POST `/friend/accept`, GET `/friends`  
**Messages**: GET `/messages`, GET `/messages/room`, POST `/messages`  
**Conversations**: GET `/conversations`, POST `/conversations/read`  
**Admin**: GET `/admin/stats`, GET `/admin/users`, POST `/admin/users/ban`

**Server Port**: 8000 (as referenced in Socket server)

---

## Database (MySQL)

**Schema Location**: `database/schema.sql`, `database/schema_update.sql`

### Tables

- **users**: User profiles with Google OAuth integration (id, google_id, email, name, avatar, bio, created_at)
- **interests**: Interest catalog for matching
- **user_interests**: User-interest relationships (many-to-many)
- **friendships**: Friend connections with pending/accepted status
- **messages**: Direct messages with language tracking and timestamps
- **match_history**, **user_ratings**, **match_feedback** (likely, based on code references)

### Database Connection

Connected via MySQL2 from both Socket.io and PHP API servers

---

## Integration & Communication

- **Frontend ↔ Socket Server**: Socket.IO client connects to real-time server on port 3001
- **Socket Server ↔ PHP API**: Node.js makes HTTP requests to PHP API (`http://localhost:8000`)
- **Socket Server ↔ MySQL**: Direct database connections via mysql2
- **PHP API ↔ MySQL**: Database connections via PDO or custom Database class
- **Socket Server ↔ External**: Translation API calls to MyMemory service

---

## Development Workflow

1. Install dependencies: `npm install` (frontend and socket), manual setup for PHP
2. Start MySQL server
3. Start PHP API on port 8000
4. Start Socket.io server: `npm run dev` in `backend/socket/`
5. Start Angular frontend: `ng serve` in `frontend/`
6. Access application at `http://localhost:4200/`

---

## Key Scripts Summary

**Frontend**: `npm start` (ng serve), `npm run build`, `npm test`  
**Socket Server**: `npm run dev` (nodemon), `npm start` (production)  
**PHP API**: Direct execution via web server (Apache/Nginx)
