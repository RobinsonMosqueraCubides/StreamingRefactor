# AI Model Context & Architecture Guide: Agaray Streaming ERP

> **Purpose:** This document is the single source of truth and comprehensive context file for any AI model, code agent, or developer working on the **StreamingRefactor (Agaray ERP)** monorepo. It details the domain logic, technical architecture, data model, coding conventions, development workflows, and inviolable engineering invariants.

---

## 1. System Overview & Problem Domain

**Agaray ERP** is a specialized Enterprise Resource Planning platform designed for managing a high-volume streaming account resale business (Netflix, Disney+, Max, Prime Video, Spotify, etc.).

### Core Problem It Solves
1. **Inventory Splitting (Parent Accounts & Profiles):** Purchasing wholesale accounts ("cuentas madre") from suppliers and fractioning them into individual profiles ("perfiles") to resell to end-users or retail resellers.
2. **Subscription Lifecycle & Renewal Cycles:** Managing recurring 30-day billing cycles, grace periods, imminent expiration alerts, and automatic service suspensions for overdue clients.
3. **Warranty & Outage Management:** Handling sudden streaming platform password resets, profile drops, or account outages. The system allows reassigning healthy profiles to affected clients, extending cut-off dates, logging supplier credits (`saldo_a_favor`), and bulk-notifying impacted customers.
4. **Financial Ledger & Cash Flow:** Double-entry tracking of incomes (`INGRESO`) and expenses (`EGRESO`), supplier balances, client partial payments, and net profit tracking across Colombian payment channels (Nequi, Bancolombia, Daviplata, NuBank, Cash).

---

## 2. Monorepo Architecture & Directory Structure

The repository is structured as a fullstack monorepo:

```
StreamingRefactor/
├── backend/                  # FastAPI asynchronous REST API
│   ├── alembic/              # Database migration scripts and versions
│   │   └── versions/         # Migration versions
│   ├── api/                  # API routers and dependency injection
│   │   ├── deps.py           # Dependency injection (Auth, DB session)
│   │   └── rutas/            # Route controllers grouped by domain
│   │       ├── actores.py    # Clients and Suppliers (Proveedores)
│   │       ├── auth.py       # Admin login & JWT generation
│   │       ├── catalogos.py  # Platforms, Combos, WhatsApp templates
│   │       ├── correos_propios.py # Custom domain email management
│   │       ├── finanzas.py   # Transactions, income/expense ledger, metrics
│   │       ├── garantias.py  # Client warranty and profile replacement
│   │       ├── garantias_proveedores.py # Supplier credit & replacement
│   │       ├── inventario.py # Parent accounts & profile management
│   │       ├── notas.py      # Operational notes
│   │       └── ventas.py     # Sales, orders, partial payments
│   ├── core/                 # App configuration and security settings
│   │   ├── config.py         # Pydantic Settings (.env management)
│   │   └── security.py       # Password hashing & JWT handlers
│   ├── db/                   # Database engine and SQLAlchemy models
│   │   ├── database.py       # Async engine & sessionmaker
│   │   ├── models.py         # Central SQLAlchemy 2.0 ORM models
│   │   └── seed.py           # Database seeder with sample domain data
│   ├── schemas/              # Pydantic validation & serialization models
│   ├── services/             # Domain business logic services
│   ├── tests/                # Pytest asynchronous test suite
│   ├── alembic.ini           # Alembic configuration
│   ├── main.py               # FastAPI entry point, CORS, and route mounting
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 18 + Vite SPA (Mobile-First)
│   ├── public/               # Static assets & SVG icons
│   ├── src/
│   │   ├── api/              # Axios instance and API service calls
│   │   ├── components/       # Reusable UI components (Modals, Cards, Navbars)
│   │   ├── context/          # React contexts (Auth, Theme)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── layouts/          # Layouts (MainLayout with Mobile Bottom Nav)
│   │   ├── pages/            # View pages (Dashboard, Ventas, Inventario, Clientes, Config)
│   │   ├── routes/           # React Router DOM configuration & PrivateRoute
│   │   ├── types/            # TypeScript domain interfaces and types
│   │   ├── App.tsx           # Main application setup
│   │   ├── index.css         # Tailwind directives & CSS variables
│   │   └── main.tsx          # Application root DOM mount
│   ├── index.html            # Vite HTML template with Google Fonts (Fira)
│   ├── package.json          # Node dependencies and scripts
│   ├── tailwind.config.js    # Tailwind configuration (dark mode, typography)
│   └── vite.config.ts        # Vite bundler configuration
└── docs/                     # Technical specifications, roadmap, and guides
    ├── AI_CONTEXT.md         # This AI context file
    ├── diagnostic_report.md  # Architectural & UI audit report
    ├── logicaNegocio.md      # Detailed business requirements specification
    ├── planning.md           # Multi-phase master project plan
    └── roadmap_frontend.md   # UI/UX design system & frontend roadmap
```

---

## 3. Technology Stack & Key Dependencies

### Backend
- **Runtime:** Python 3.10+
- **Framework:** FastAPI (fully asynchronous `async`/`await`)
- **ORM:** SQLAlchemy 2.0 with async engine (`sqlalchemy.ext.asyncio`, `Mapped`, `mapped_column`)
- **Validation:** Pydantic v2
- **Database:** PostgreSQL (Supabase in staging/production) with fallback to SQLite (`sqlite+aiosqlite:///./streaming_erp.db`) in local development
- **Migrations:** Alembic
- **Testing:** Pytest, pytest-asyncio, httpx

### Frontend
- **Runtime:** Node.js 18+, npm
- **Framework:** React 18 with TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS v3 with semantic design tokens and dark mode support
- **Icons & UI:** SVG sprite (`icons.svg`), Lucide React
- **HTTP Client:** Axios with bearer token interceptors
- **State & Routing:** React Router DOM v6, React Context API

### Target Deployments
- **Frontend:** Netlify (automated CI/CD from `/frontend`)
- **Backend:** Vercel or Render
- **Database:** Supabase PostgreSQL

---

## 4. Domain Entities & Database Schema

The database model is defined in `backend/db/models.py`. Key entities and relationships:

### Core Enums
- `TipoCliente`: `FINAL` (retail customer), `REVENDEDOR` (wholesale reseller).
- `EstadoCliente`: `ACTIVO`, `BANEADO` (blocked from new sales).
- `EstadoCuenta`: `ACTIVA`, `CAIDA` (down/compromised), `VENCIDA` (expired), `RENOVADA` (renewed), `CANCELADA`.
- `EstadoPago`: `PAGADO` (fully paid), `PENDIENTE` (unpaid), `DIAS_ESPERA` (within grace period), `PAGO_PARCIAL` (partially paid).
- `EntidadFinanciera`: `NEQUI`, `BANCOLOMBIA`, `DAVIPLATA`, `NU_BANK`, `EFECTIVO`.
- `TipoGarantiaProveedor`: `CAMBIO_CLAVE`, `CAMBIO_CUENTA`, `SALDO_A_FAVOR`.
- `TipoTransaccion`: `INGRESO`, `EGRESO`.

### Key Tables & Invariants
1. **`plataformas`**: Streaming service catalog (e.g., Netflix, Prime, Disney).
2. **`clientes`**: Buyers with `telefono` (unique for WhatsApp messaging), `tipo`, `estado`, and `dias_gracia_max` (default 3 days).
3. **`proveedores`**: Wholesalers who sell parent accounts. Tracks `saldo_a_favor` (credit balance to be subtracted from next wholesale purchase).
4. **`credenciales`**: Email and password pairs. Linked 1:1 or 1:N to `cuentas_madre` to enable central password rotation.
5. **`cuentas_madre`**: Purchased streaming accounts. Attributes: `proveedor_id`, `credencial_id`, `plataforma_id`, `max_perfiles`, `precio_compra`, `fecha_compra`, `fecha_vencimiento`, and `estado`.
6. **`perfiles`**: Splitted slots of a parent account. Unique constraint: `(cuenta_madre_id, nombre_perfil)`. Tracks `pin`, `correo_propio`, and `asignado` (boolean lock).
7. **`combos`**: Multi-platform subscription bundles (e.g., Disney+ & Star+ & Netflix).
8. **`ventas` & `detalles_venta`**: Sales headers and itemized profiles. Tracks `cliente_id`, `fecha_corte`, `monto_total`, and `estado_pago`.
9. **`pagos_venta`**: Partial or full payments for a sale. When sum of payments equals `monto_total`, the sale transitions to `PAGADO` and creates an `INGRESO` in `transacciones`.
10. **`transacciones`**: Master financial journal recording all `INGRESO` and `EGRESO` transactions with `monto`, `categoria`, and `entidad`.
11. **`garantias_clientes` & `garantias_proveedores`**: Audit log of profile swaps, grace day extensions, and supplier credit compensations.
12. **`plantillas_mensajes`**: Configurable WhatsApp notification message templates with placeholder variables (`[Nombre Cliente]`, `[Plataforma]`, `[Fecha Corte]`).

---

## 5. Critical Business Workflows (Use Cases)

- **UC-01 (Purchase & Splitting):** When a `cuenta_madre` is registered, the system automatically creates `max_perfiles` rows in `perfiles` with `asignado = FALSE` and logs an `EGRESO` in `transacciones`.
- **UC-02 (Sale & Atomic Allocation):** When selling a single profile or whole account, the backend queries the next available profile (`asignado = FALSE`) with an explicit row lock (`FOR UPDATE`), flags it as `asignado = TRUE`, and creates the sale record.
- **UC-04 (Client Warranty Swap):** If a customer's profile goes down, the warranty endpoint marks the faulty profile as free or defective, assigns an available substitute profile, optionally adds compensatory days to the sale's `fecha_corte`, and logs the warranty incident.
- **UC-05 (Supplier Outage & Balance Credit):** If a supplier fails to replace an account and issues a refund, the amount is added to `proveedores.saldo_a_favor`. On the next purchase from this supplier, the payable amount is automatically decremented by this credit.
- **UC-08 (Overdue Account Suspension):** When `today > (fecha_corte + dias_gracia_max)`, sales in `PENDIENTE` or `DIAS_ESPERA` transition to `VENCIDA`, releasing their assigned profiles (`asignado = FALSE`) back into inventory.
- **UC-12 (Partial Payments & Ledger):** Clients can pay in installments. Each installment is logged in `pagos_venta`. Once cumulative payments reach `monto_total`, the sale status turns `PAGADO` and posts to the global financial ledger.

---

## 6. Architecture & Implementation Patterns

### Backend Patterns
1. **Asynchronous SQLAlchemy 2.0:**
   - Always use `async with get_db() as db:` or dependency `db: AsyncSession = Depends(get_db)`.
   - Never use 1.x syntax like `db.query(Model)`. Always use 2.0 syntax: `select(Model).where(...)`.
   - Use `selectinload` or `joinedload` for eager loading to prevent `MissingGreenlet` errors.
2. **Atomic Inventory Transactions:**
   - Always wrap profile allocations in atomic DB transactions.
   - Use `with_for_update()` on select queries when acquiring unassigned profiles.
3. **Pydantic v2 Integration:**
   - Models must use `from_attributes = True` inside `model_config` (replacing `orm_mode = True`).
   - Use `model_validate()` instead of `from_orm()`.

### Frontend Patterns
1. **Strict Mobile-First Design (375px Base):**
   - Resellers frequently operate the system from their smartphones in the field.
   - Views must be designed first for mobile screens (`375px` - `414px`) using card lists, bottom navigation bars, full-width inputs, and touch-friendly actions.
   - Scale progressively using `md:` and `lg:` Tailwind breakpoints for desktop data tables and analytics dashboards.
2. **Currency Standardization:**
   - All monetary figures are in Colombian Pesos (**COP**).
   - Format values with Colombian currency notation (e.g., `$ 15.000` or `$ 15.000 COP`). Never display default USD signs without COP context.
3. **WhatsApp Link Builders:**
   - Customer communications are initiated via WhatsApp Web / API click-to-chat links: `https://wa.me/{phone}?text={encoded_message}`.
   - Templates stored in `plantillas_mensajes` must be formatted dynamically.

---

## 7. Developer & Execution Commands

### Backend Commands (from `/backend` directory)
```powershell
# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install / update backend dependencies
pip install -r requirements.txt

# Run database migrations to latest revision
alembic upgrade head

# Generate a new migration after editing models.py
alembic revision --autogenerate -m "describe_changes"

# Seed the database with initial demo catalog
python -m db.seed

# Start the development server (auto-reload on port 8000)
uvicorn main:app --reload --port 8000

# Run automated tests
pytest
```

### Frontend Commands (from `/frontend` directory)
```bash
# Install dependencies
npm install

# Start Vite development server (port 5173)
npm run dev

# Type check and build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 8. Golden Rules & Invariants for AI Models

When generating code or proposing modifications to this repository, any AI model **MUST** adhere to the following non-negotiable rules:

1. **Async DB Operations Only:** Never introduce synchronous database calls or `Session` objects into the backend. Always use `AsyncSession` and SQLAlchemy 2.0 async paradigms.
2. **Alembic Migrations Required:** Any modification to `backend/db/models.py` (adding tables, altering columns, modifying enums) **must** be accompanied by an Alembic migration script. Never assume manual database edits.
3. **Mobile-First Invariant:** Never produce desktop-only UI components, unscrollable wide tables, or tiny clickable elements. All modals, forms, and lists must look and feel native on a `375px` mobile screen before desktop enhancements are applied.
4. **COP Currency Invariant:** All calculations, schemas, and display logic must operate in Colombian Pesos (COP). Floating point rounding errors in financial operations must be avoided by using `Numeric(12, 2)` / `Decimal`.
5. **Inventory Race Condition Prevention:** Never assign a `perfil` to a customer without locking the record or verifying that `asignado == False` within the exact same database transaction.
6. **No Leaking Secrets:** Do not commit `.env` files, production database connection strings, or JWT secret keys. Keep configuration in `backend/core/config.py` sourced from environment variables.
7. **Single Admin User Authentication:** The system relies on a single administrator user (`agaray`) configured via environment variables and JWT token headers. Respect the auth interceptors in frontend API requests.
