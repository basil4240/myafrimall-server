# Myafrimall

A full-stack logistics and shipment tracking platform built as a technical assessment. It consists of a Flutter web frontend and a NestJS REST API backend, deployed together on AWS EC2 behind an Nginx reverse proxy.

**Live Demo:** http://34.206.153.20

---

## Test Credentials

Use these accounts to explore the application. All emails are pre-verified.

| Account      | Email                       | Password     | Notes                                   |
|--------------|-----------------------------|--------------|-----------------------------------------|
| Regular User | `john.doe@myafrimall.com`   | `John@1234`  | 8 shipments, 2 addresses, NGN 245,000   |
| Regular User | `jane.smith@myafrimall.com` | `Jane@1234`  | 8 shipments, 2 addresses, NGN 180,500   |
| Test Account | `test@myafrimall.com`       | `Test@1234`  | 8 shipments, 1 address, NGN 96,000      |
| Admin        | `admin@myafrimall.com`      | `Admin@1234` | 8 shipments, 1 address, NGN 500,000     |

> Every account has seeded shipments, addresses and a wallet balance, so any of them shows a populated dashboard.

---

## Project Structure

```
Myafrimall/
├── myafrimall-client/     # Flutter web app
├── myafrimall-server/     # NestJS REST API
├── nginx/                 # Nginx config (SPA routing + API proxy)
├── docker-compose.yml     # Full-stack local/production compose
└── .env                   # Shared environment variables
```

---

## Running Locally

### Prerequisites

- Docker Desktop (recommended - one command spins everything up)
- **Or** manually: Node.js 20+, Flutter 3.x, PostgreSQL 16

### Option A - Docker Compose (recommended)

```bash
# Clone the repo, then from the root:
cp .env.example .env
# Fill in DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, SMTP_* in .env

docker compose up --build
```

The app will be available at `http://localhost`. The API is proxied at `http://localhost/api`.

Migrations run automatically on startup. To seed test data:

```bash
docker compose exec api npx tsx prisma/seed/seed.ts
docker compose exec api npx tsx prisma/seed/seed-data.ts
```

### Option B - Manual (development)

**Backend**

```bash
cd myafrimall-server
npm install

# Copy and fill environment variables
cp ../.env.example .env
# Set DATABASE_URL=postgresql://postgres:<password>@localhost:5432/myafrimall

npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed/seed.ts
npx tsx prisma/seed/seed-data.ts

npm run start:dev      # http://localhost:3000
```

**Frontend**

```bash
cd myafrimall-client
flutter pub get

# The API base URL defaults to http://localhost:3000.
# Override it at build time with --dart-define=API_BASE_URL=<url>
flutter run -d chrome
```

---

# Backend - myafrimall-server

## Tech Stack

| Layer       | Technology                  |
|-------------|-----------------------------|
| Framework   | NestJS 11                   |
| Language    | TypeScript 5                |
| ORM         | Prisma 7 (driver adapters)  |
| Database    | PostgreSQL 16               |
| Auth        | JWT (access + refresh)      |
| Validation  | class-validator             |
| Mailer      | Nodemailer (Gmail SMTP)     |

## Architecture

The server follows NestJS's **modular architecture** - every domain is self-contained in its own module with a controller, service, and DTOs. Cross-cutting concerns live in a single shared `CommonModule`.

```
src/
├── main.ts                     # Bootstrap: CORS, global ValidationPipe, port
├── app.module.ts               # Root module - imports all feature modules
│
├── common/                     # @Global() shared infrastructure
│   ├── common.module.ts        # Exports PrismaService, JWT, guards, helpers globally
│   ├── config/
│   │   ├── app.config.ts       # Port, environment
│   │   ├── jwt.config.ts       # Access/refresh token secrets and TTLs
│   │   └── smtp.config.ts      # Mail transport settings
│   ├── guards/
│   │   └── access-token.guard.ts  # JWT Bearer guard (applied per-route or globally)
│   ├── decorators/
│   │   └── active-user.decorator.ts  # Extracts typed user from JWT payload
│   ├── services/
│   │   ├── prisma.service.ts   # PrismaClient with PrismaPg driver adapter (Prisma 7)
│   │   ├── helper.service.ts   # JWT generation/verification, OTP generation
│   │   ├── hashing.service.ts  # Abstract hashing interface
│   │   ├── bcrypt.service.ts   # Bcrypt implementation of HashingService
│   │   └── mail.service.ts     # Nodemailer - OTP emails
│   └── interfaces/
│       └── active-user-data.interface.ts
│
├── auth/                       # Registration, login, OTP, password reset
│   ├── auth.module.ts
│   ├── auth.controller.ts      # POST /auth/*
│   ├── auth.service.ts
│   └── dto/                    # register, login, verify-otp, forgot-password, reset-password, refresh
│
├── user/                       # Authenticated user profile management
│   ├── user.module.ts
│   ├── user.controller.ts      # GET/PATCH /user/profile, PATCH /user/password
│   ├── user.service.ts
│   └── dto/
│
├── shipments/                  # Shipment CRUD and tracking
│   ├── shipments.module.ts
│   ├── shipments.controller.ts # GET/POST/PATCH/DELETE /shipments
│   ├── shipments.service.ts
│   └── dto/                    # create-shipment, update-shipment, paginate-shipments
│
├── dashboard/                  # Dashboard summary data
│   ├── dashboard.module.ts
│   ├── dashboard.controller.ts # GET /dashboard
│   └── dashboard.service.ts    # Aggregates wallet balance, stats, recent shipments
│
└── addresses/                  # Saved delivery addresses
    ├── addresses.module.ts
    ├── addresses.controller.ts # GET/POST/PATCH/DELETE /addresses
    ├── addresses.service.ts
    └── dto/
```

## Key Design Patterns

### Global CommonModule

`CommonModule` is decorated with `@Global()` so every feature module gets `PrismaService`, `HelperService`, `MailService`, `AccessTokenGuard`, and `JwtModule` without importing them individually. This avoids boilerplate while keeping concerns separate.

### Driver Adapter Pattern (Prisma 7)

Prisma 7 dropped the datasource `url` field from `schema.prisma`. The database URL is injected at runtime via `PrismaPg`:

```ts
// prisma.service.ts
const adapter = new PrismaPg(process.env.DATABASE_URL);
super({ adapter });
```

The CLI uses `prisma.config.ts` for migrations. This cleanly separates the ORM runtime from schema management.

### Config Namespacing

Every config domain (jwt, smtp, app) is a typed `registerAs` config factory. Services inject them with `@Inject(jwtConfig.KEY)` instead of loose `process.env` strings, enabling full type safety and easy testing.

### DTO Validation

All request bodies are validated by `class-validator` decorators on DTOs. The global `ValidationPipe` with `whitelist: true` strips any undeclared fields before they reach services.

### OTP Flow

Both email verification and password reset use a short-lived, single-use 6-digit OTP stored in the `OtpToken` table with a 10-minute TTL. The same `createAndSendOtp` private method handles both flows, distinguished by an `OtpType` enum.

## API Endpoints

| Method | Path                        | Auth | Description                       |
|--------|-----------------------------|------|-----------------------------------|
| POST   | `/auth/register`            | -    | Register new user                 |
| POST   | `/auth/login`               | -    | Login, returns JWT pair           |
| POST   | `/auth/verify-otp`          | -    | Verify registration OTP           |
| POST   | `/auth/resend-otp`          | -    | Resend verification OTP           |
| POST   | `/auth/forgot-password`     | -    | Send password reset OTP           |
| POST   | `/auth/reset-password`      | -    | Reset password with OTP           |
| POST   | `/auth/refresh`             | -    | Refresh JWT access token          |
| GET    | `/user/profile`             | JWT  | Get authenticated user profile    |
| PATCH  | `/user/profile`             | JWT  | Update profile                    |
| PATCH  | `/user/password`            | JWT  | Change password                   |
| GET    | `/dashboard`                | JWT  | Stats, wallet balance, shipments  |
| GET    | `/shipments`                | JWT  | Paginated shipment list           |
| POST   | `/shipments`                | JWT  | Create shipment                   |
| PATCH  | `/shipments/:id`            | JWT  | Update shipment                   |
| DELETE | `/shipments/:id`            | JWT  | Delete shipment                   |
| GET    | `/addresses`                | JWT  | List saved addresses              |
| POST   | `/addresses`                | JWT  | Save new address                  |
| PATCH  | `/addresses/:id`            | JWT  | Update address                    |
| DELETE | `/addresses/:id`            | JWT  | Delete address                    |

## Database Schema

```
User          - core identity, linked to all other entities
OtpToken      - time-limited OTP records (registration + password reset)
Shipment      - shipment records with status lifecycle
Address       - saved delivery addresses per user
Wallet        - one-to-one wallet per user with balance
```

Enums: `ShipmentStatus` (PENDING / IN_TRANSIT / DELAYED / PAID / CANCELLED), `ServiceType` (STANDARD / EXPRESS / ECONOMY), `OtpType` (REGISTRATION / PASSWORD_RESET).

---

# Frontend - myafrimall-client

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Framework      | Flutter 3 (Web target)            |
| Language       | Dart 3                            |
| State          | Provider (ChangeNotifier)         |
| Navigation     | GoRouter 14 (declarative)         |
| HTTP           | Dio 5 (interceptors)              |
| Storage        | flutter_secure_storage (web: localStorage) |
| Charts         | fl_chart                          |
| Fonts          | Google Fonts (DM Sans)            |

## Architecture

The frontend follows a **feature-first** folder structure. Each feature is a self-contained vertical slice - its own models, repository, provider, and UI - with shared infrastructure in `core/`.

```
lib/
├── main.dart                   # App entry - DioClient init, auth check, MultiProvider
│
├── core/
│   ├── constants/              # AppColors, AppSpacing, AppRadius, AppTextStyles, AppBreakpoints
│   ├── network/
│   │   ├── dio_client.dart     # Singleton Dio instance - auth header + token refresh interceptor
│   │   ├── app_exception.dart  # Typed error model from DioException
│   │   └── app_storage.dart    # Token persistence (flutter_secure_storage)
│   ├── theme/
│   │   ├── app_theme.dart      # Light and dark MaterialTheme definitions
│   │   └── theme_provider.dart # ThemeMode state (persisted)
│   └── widgets/               # Shared UI: Skeleton loaders, AppToast, AppSheet
│
├── features/
│   ├── auth/                   # Login, Signup, OTP, Forgot/Reset Password
│   │   ├── data/
│   │   │   ├── models/         # AuthUser model
│   │   │   └── repositories/   # AuthRepository - all /auth/* calls
│   │   ├── providers/          # AuthProvider - currentUser, login, logout, checkAuthStatus
│   │   └── presentation/
│   │       ├── pages/          # LoginPage, SignupPage, OtpPage, ForgotPasswordPage, ResetPasswordPage
│   │       └── widgets/        # AuthLayout (two-panel), OtpInput, UnverifiedEmailDialog
│   │
│   ├── dashboard/              # Main shell, overview stats, recent shipments
│   │   ├── data/repositories/  # DashboardRepository - GET /dashboard
│   │   ├── providers/          # DashboardProvider - stats, recentShipments, wallet
│   │   └── presentation/
│   │       ├── pages/          # DashboardPage, DashboardShell (ShellRoute wrapper)
│   │       └── widgets/        # AppSidebar, DashboardBanner, BalanceCard,
│   │                           #   OverviewSection, StatCard, RecentShipmentsSection,
│   │                           #   ShipmentItem, GrowthChart
│   │
│   ├── shipments/              # Full shipment list, create, filter
│   │   ├── data/
│   │   │   ├── models/         # Shipment model, ShipmentStatus enum
│   │   │   └── repositories/   # ShipmentsRepository - CRUD
│   │   ├── providers/          # ShipmentsProvider - paginated list, filters
│   │   └── presentation/
│   │       ├── pages/          # ShipmentsPage
│   │       └── widgets/        # ShipmentListItem, ShipmentStatusBadge,
│   │                           #   ShipmentFilterTabs, ShipmentFormContent
│   │
│   ├── addresses/              # Saved address book
│   │   ├── data/
│   │   │   ├── models/         # Address model
│   │   │   └── repositories/   # AddressesRepository
│   │   ├── providers/          # AddressesProvider
│   │   └── presentation/       # AddressesPage, AddressCard, AddressFormContent
│   │
│   ├── profile/                # User profile view
│   │   └── presentation/pages/ # ProfilePage - avatar/initials, name, email, phone
│   │
│   ├── wallet/                 # Wallet page
│   ├── notifications/          # Notifications page
│   ├── services/               # Services page
│   ├── invite/                 # Invite page
│   └── help/                   # Help & support page
│
└── router/
    ├── app_router.dart         # GoRouter config - ShellRoute, auth redirect, named routes
    └── route_names.dart        # Typed route path constants
```

## Key Design Patterns

### Feature-first Vertical Slices

Each feature owns its data layer (models + repository), state layer (Provider), and UI layer (pages + widgets). Adding a new feature never requires touching another feature's files.

### Provider State Management

State is managed via `ChangeNotifier` providers registered globally in `main.dart`. The `AuthProvider` is initialised before `runApp` to perform a silent auth check (`checkAuthStatus`) so the router can redirect correctly on first load.

### Dio Interceptor - Auto Token Refresh

`DioClient` registers an error interceptor that catches 401 responses, silently attempts a token refresh, retries the original request with the new token, and only triggers a force-logout if the refresh also fails. This is transparent to all repositories.

```
Request → add Bearer header
       ↓
    401?  → try POST /auth/refresh
              ↓ success → retry original request
              ↓ fail    → emit onForceLogout stream
```

### Declarative Navigation with Auth Guard

`AppRouter` uses GoRouter's `redirect` callback to protect all dashboard routes. If `AuthProvider.isAuthenticated` is false, the user is redirected to `/login`. The router listens to `AuthProvider` via `refreshListenable` so route guards re-evaluate automatically when the auth state changes.

### Responsive Design

Three breakpoints are defined in `AppBreakpoints` (mobile < 600, tablet < 1024, desktop ≥ 1024). `LayoutBuilder` is used inside widgets (rather than `MediaQuery`) to respond to the widget's own available width - making layouts reusable at any nesting depth.

### Theming

`AppTheme` defines separate `ThemeData` objects for light and dark modes. All colours, spacing, radius, and typography values are centralised in the `core/constants/` barrel, so no literal values appear in widget files.

---

## Deployment

The production environment runs three Docker Compose services:

| Service | Image              | Role                                          |
|---------|--------------------|-----------------------------------------------|
| `db`    | postgres:16-alpine | PostgreSQL database                           |
| `api`   | Custom (NestJS)    | REST API - runs migrations then starts server |
| `nginx` | nginx:alpine       | Serves Flutter web SPA + proxies `/api/` to `api:3000` |

**Entrypoint** (`entrypoint.sh`): runs `prisma migrate deploy` before starting the Node process, ensuring the schema is always up to date on restart.

**Flutter web** is built locally with `flutter build web` and served as static files by Nginx. SPA routing is handled with `try_files $uri $uri/ /index.html`.

**Infrastructure:** AWS EC2 t3.small, Ubuntu 22.04, Elastic IP `34.206.153.20`, security group open on ports 22 and 80.
