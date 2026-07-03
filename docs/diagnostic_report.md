# 🔍 Reporte de Diagnóstico — Auditoría de Código StreamingRefactor

**Fecha:** 2026-07-03  
**Auditor:** Principal Software Engineer & Auditor de Seguridad  
**Alcance:** Fullstack — Backend (FastAPI/Python) + Frontend (React/TypeScript)  
**Modo:** Solo lectura — sin modificaciones al código fuente

---

## 📋 Resumen Ejecutivo

El proyecto **StreamingRefactor** es un ERP monorepo para gestión de reventa de cuentas de streaming, con un backend FastAPI + SQLAlchemy 2.0 y un frontend React 19 + Vite + TypeScript + Tailwind CSS v3.

Se identificaron **39 hallazgos** distribuidos así:

| Severidad | Backend | Frontend | Total |
|-----------|---------|----------|-------|
| 🔴 CRÍTICO | 4 | 3 | **7** |
| 🟠 ALTO | 6 | 5 | **11** |
| 🟡 MEDIO | 9 | 6 | **15** |
| 🔵 BAJO | 4 | 2 | **6** |
| **Total** | **23** | **16** | **39** |

> [!CAUTION]
> Se encontraron **7 hallazgos críticos** que incluyen: ausencia total de autenticación, uso de `float` para valores monetarios, CORS wildcard con credentials, base de datos SQLite versionada en git, y credenciales de streaming expuestas en el DOM.

---

## 🔴 ERRORES CRÍTICOS

### B-01 · Sin Autenticación/Autorización en NINGÚN Endpoint
- **Severidad:** 🔴 CRÍTICO
- **Categoría:** Seguridad
- **Ubicación:** Todos los archivos en [api/rutas/](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/api/rutas)
- **Causa raíz:** No existe ningún middleware de autenticación, dependencia de seguridad, ni verificación de tokens. Cada endpoint CRUD (clientes, proveedores, cuentas, ventas, pagos, garantías) es completamente abierto.
- **Impacto:** Cualquier persona con acceso de red puede crear, leer, actualizar y eliminar **todos los datos del negocio**, incluyendo registros financieros, datos personales de clientes (teléfonos) y credenciales de plataformas.
- **Fix sugerido:** Implementar autenticación JWT con RBAC (Role-Based Access Control) usando `fastapi.security.OAuth2PasswordBearer` + middleware de inyección de dependencias.

---

### B-02 · `float` Usado para TODOS los Valores Monetarios
- **Severidad:** 🔴 CRÍTICO
- **Categoría:** Integridad de Datos / Bug de Lógica
- **Ubicación:** [models.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/db/models.py) — líneas 76, 105, 143, 155, 172, 187, 201, 233; todos los `schemas/*.py` y `services/*.py`
- **Causa raíz:** Todos los campos monetarios (`precio_compra`, `monto_total`, `precio_aplicado`, `monto`, `precio_combo`, `saldo_a_favor`) están tipados como Python `float`. Aunque la columna DB es `Numeric(12,2)`, SQLAlchemy mapea a `float` en Python.
- **Impacto:** Errores de precisión de punto flotante en cálculos financieros. Ejemplo: `0.1 + 0.2 = 0.30000000000000004`. En un ERP financiero esto causa discrepancias en facturación, pagos y auditorías.
- **Fix sugerido:** Cambiar `Mapped[float]` → `Mapped[Decimal]` en modelos, usar `condecimal` o `Field(decimal_places=2)` en Pydantic schemas, y serializar correctamente.

---

### B-03 · CORS Wildcard `"*"` con `allow_credentials=True`
- **Severidad:** 🔴 CRÍTICO
- **Categoría:** Seguridad
- **Ubicación:** [config.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/core/config.py#L14) línea 14, [main.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/main.py#L22-L29) líneas 22-29
- **Causa raíz:** `BACKEND_CORS_ORIGINS` tiene valor por defecto `["*"]`, permitiendo peticiones desde **cualquier origen** con credenciales.
- **Impacto:** Vulnerabilidad severa de CSRF. Cualquier sitio web malicioso puede realizar operaciones autenticadas en nombre del usuario.
- **Fix sugerido:** Restringir a orígenes específicos: `["http://localhost:5173"]` para dev, dominio de producción para prod.

---

### B-04 · Base de Datos SQLite Versionada en Git
- **Severidad:** 🔴 CRÍTICO
- **Categoría:** Seguridad / Datos Sensibles
- **Ubicación:** `backend/streaming_erp.db` — confirmado trackeado con `git ls-files`
- **Causa raíz:** El archivo `.gitignore` no incluye `*.db`. La BD contiene datos de negocio potencialmente sensibles.
- **Impacto:** Teléfonos de clientes, datos de proveedores, credenciales de streaming, registros financieros — todo expuesto a cualquiera con acceso al repositorio.
- **Fix sugerido:** Agregar `*.db` a `.gitignore` y ejecutar `git rm --cached backend/streaming_erp.db`.

---

### F-01 · Credenciales de Streaming Expuestas en Texto Plano en el DOM
- **Severidad:** 🔴 CRÍTICO
- **Categoría:** Seguridad
- **Ubicación:** [VentasPage.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/pages/VentasPage.tsx) — líneas 562, 580, 602-614, 1125-1126, 1225, 1245-1246
- **Causa raíz:** Emails y contraseñas de cuentas de streaming se renderizan directamente en el DOM en texto plano, con clase `.select-all` y se embeben en URLs de WhatsApp (`wa.me`).
- **Impacto:** Cualquier extensión de navegador, grabación de pantalla, o shoulder-surfing expone TODAS las credenciales.
- **Fix sugerido:** Generar mensajes de WhatsApp desde un endpoint backend dedicado. Enmascarar contraseñas en la UI con opción de revelar.

---

### F-02 · Componentes "God Object" (1447 y 1169 líneas)
- **Severidad:** 🔴 CRÍTICO
- **Categoría:** Calidad de Código / SOLID (SRP)
- **Ubicación:** [VentasPage.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/pages/VentasPage.tsx) (1447 líneas, ~50 `useState`), [InventarioPage.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/pages/InventarioPage.tsx) (1169 líneas, ~40 `useState`)
- **Causa raíz:** Un solo componente maneja: fetch de datos, gestión de estado, UI, formularios, lógica de negocio, modales, carrito, generación de mensajes WhatsApp, historial, etc.
- **Impacto:** Inmantenible, imposible de testear, re-renderiza todo el componente ante cualquier cambio de estado.
- **Fix sugerido:** Descomponer en 10-15 componentes especializados con custom hooks (`useCart`, `useSalesHistory`, `useWarrantyModal`, etc.).

---

### F-03 · Sin Manejo de Errores en Llamadas API
- **Severidad:** 🔴 CRÍTICO
- **Categoría:** Bug / UX
- **Ubicación:** Múltiples páginas — `ClientesPage`, `DashboardPage`, `InventarioPage`, `VentasPage`
- **Causa raíz:** La mayoría de llamadas API no tienen `try/catch` consistentes. Los errores no se limpian tras recuperación, y el estado `error` persiste entre tabs.
- **Impacto:** Errores silenciosos, pantallas en blanco, estados inconsistentes. Una vez ocurre un error, persiste hasta que se remonta el componente.
- **Fix sugerido:** Implementar un hook `useApi` genérico con manejo de errores, loading states, y limpieza automática. O migrar a TanStack Query.

---

## 🟠 HALLAZGOS DE SEVERIDAD ALTA

### B-05 · `echo=True` en Motor de Base de Datos
- **Severidad:** 🟠 ALTO
- **Categoría:** Rendimiento / Seguridad
- **Ubicación:** [database.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/db/database.py#L17) línea 17
- **Descripción:** Loguea CADA sentencia SQL a stdout. Degradación de rendimiento y exposición potencial de datos sensibles en logs de producción.
- **Fix:** `echo=settings.DEBUG` con variable de entorno configurable.

---

### B-06 · Sin Gestión de Transacciones — Riesgo de Inconsistencia
- **Severidad:** 🟠 ALTO
- **Categoría:** Bug / Integridad de Datos
- **Ubicación:** Todos los `services/*.py`, especialmente [ventas_service.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/services/ventas_service.py#L28-L153) y [finanzas_service.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/services/finanzas_service.py#L7-L50)
- **Descripción:** Operaciones multi-paso (crear Venta → crear DetalleVenta → crear PagoVenta → crear Transaccion) usan `flush()` + `commit()` sin bloque transaccional explícito. Si falla un paso intermedio, los datos parciales quedan committeados.
- **Fix:** Envolver operaciones multi-paso en `async with db.begin():`.

---

### B-07 · Contraseñas de Streaming Almacenadas y Expuestas en Texto Plano
- **Severidad:** 🟠 ALTO
- **Categoría:** Seguridad
- **Ubicación:** [models.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/db/models.py#L91) línea 91, endpoints de inventario
- **Descripción:** El modelo `Credencial` almacena passwords de plataformas de streaming en texto plano y los retorna en respuestas API sin redacción.
- **Fix:** Encriptar en reposo con `cryptography.fernet`, enmascarar en respuestas API.

---

### B-08 · Sin Validación de Input Más Allá de Tipos Pydantic
- **Severidad:** 🟠 ALTO
- **Categoría:** Seguridad / Integridad
- **Ubicación:** Todos los `schemas/*.py`
- **Descripción:** No hay validadores para: formato de teléfono, formato de email, montos negativos, longitudes de string vs constraints de BD, rangos de fechas (`fecha_vencimiento > fecha_compra`).
- **Fix:** Agregar `@field_validator` y `Field()` constraints en schemas Pydantic.

---

### B-09 · Sin Paginación en Endpoints de Listado
- **Severidad:** 🟠 ALTO
- **Categoría:** Rendimiento
- **Ubicación:** Todos los `services/*.py` — funciones `get_*` usan `select()` sin `.limit()` ni `.offset()`
- **Descripción:** Todos los endpoints de listado retornan TODOS los registros. A medida que crezcan los datos, causará problemas de memoria y rendimiento.
- **Fix:** Agregar parámetros `skip: int = 0, limit: int = 100` con `.offset(skip).limit(limit)`.

---

### B-10 · Patrones N+1 en Consultas
- **Severidad:** 🟠 ALTO
- **Categoría:** Rendimiento
- **Ubicación:** [inventario_service.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/services/inventario_service.py), [ventas_service.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/services/ventas_service.py)
- **Descripción:** `get_cuentas_madre` carga `perfiles` con `selectinload` pero no carga `proveedor`, `credencial`, ni `plataforma`. El frontend accede a estas relaciones, disparando queries separadas por registro.
- **Fix:** Agregar `selectinload()` para todas las relaciones necesarias.

---

### F-04 · Sin Autenticación en Frontend
- **Severidad:** 🟠 ALTO
- **Categoría:** Seguridad
- **Ubicación:** [axios.ts](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/api/axios.ts), [routes/index.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/routes/index.tsx)
- **Descripción:** No hay login, tokens, interceptores para 401/403, ni rutas protegidas. La aplicación completa es accesible sin autenticación.
- **Fix:** Implementar flujo de auth con JWT, interceptores Axios, y route guards.

---

### F-05 · Memory Leaks — Sin Cleanup en `useEffect`
- **Severidad:** 🟠 ALTO
- **Categoría:** Bug
- **Ubicación:** Componentes con `useEffect` + llamadas API, `setTimeout` sin cleanup en InventarioPage y VentasPage
- **Descripción:** No se usa `AbortController` ni cleanup en `useEffect`. `setTimeout` sin limpiar al desmontar. Si el usuario navega antes de completar la petición, se intenta actualizar estado de componente desmontado.
- **Fix:** Usar `AbortController` en cleanup de `useEffect`, limpiar `setTimeout` con `clearTimeout` en return del effect.

---

### F-06 · Sin Error Boundaries
- **Severidad:** 🟠 ALTO
- **Categoría:** Best Practice
- **Ubicación:** [App.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/App.tsx), [main.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/main.tsx)
- **Descripción:** No hay React Error Boundaries. Un error no capturado en cualquier componente crashea toda la app con pantalla blanca.
- **Fix:** Agregar Error Boundary a nivel de layout y de ruta.

---

### F-07 · Sin Estado Global / Data Fetching Library
- **Severidad:** 🟠 ALTO
- **Categoría:** Arquitectura
- **Ubicación:** Todas las páginas
- **Descripción:** No hay Context API (más allá de routing), ni Zustand, Redux, ni React Query. Cada página gestiona su estado independientemente. No hay caché de datos — cada montaje dispara nuevas llamadas API. `VentasPage` dispara 6 llamadas API en paralelo al montar.
- **Fix:** Implementar TanStack Query para server state y Zustand para client state.

---

### F-08 · Tipos Duplicados e Inconsistentes
- **Severidad:** 🟠 ALTO
- **Categoría:** Calidad de Código
- **Ubicación:** [ClientesPage.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/pages/ClientesPage.tsx), [InventarioPage.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/pages/InventarioPage.tsx), [VentasPage.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/pages/VentasPage.tsx)
- **Descripción:** Interfaces como `Cliente`, `Proveedor`, `Plataforma`, `CuentaMadre` están **redefinidas en cada archivo de página** con shapes ligeramente diferentes. `Proveedor` en ClientesPage tiene `saldo_a_favor`, en VentasPage no.
- **Fix:** Crear directorio `src/types/` con interfaces compartidas que reflejen exactamente los schemas del backend.

---

## 🟡 HALLAZGOS DE SEVERIDAD MEDIA

### B-11 · Dependencias No Pinneadas
- **Ubicación:** [requirements.txt](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/requirements.txt)
- **Descripción:** Usa `>=` (ej. `fastapi>=0.110.0`). `pip install` podría instalar versiones futuras incompatibles.
- **Fix:** Pinnear versiones exactas o usar `pip-compile` / `poetry.lock`.

### B-12 · Archivos `__init__.py` Faltantes
- **Ubicación:** `api/`, `api/rutas/`, `core/`, `db/`, `schemas/`, `services/`
- **Descripción:** Sin `__init__.py` en ningún paquete. Afecta tooling, IDE support, y puede causar ambigüedad de imports.

### B-13 · Patrón de Error Handling Duplicado
- **Ubicación:** Todos los `services/*.py`
- **Descripción:** El patrón `scalar_one_or_none() → if not → raise HTTPException(404)` está repetido docenas de veces.
- **Fix:** Crear helper genérico `get_or_404(db, Model, id)`.

### B-14 · Servicios Lanzan HTTPException (Violación de Capas)
- **Ubicación:** Todos los `services/*.py`
- **Descripción:** La capa de servicios lanza `HTTPException` directamente, acoplando lógica de negocio al framework HTTP. Viola SRP y dificulta reutilización.
- **Fix:** Crear excepciones de dominio (`NotFoundError`, `BusinessRuleError`) y manejarlas con exception handlers de FastAPI.

### B-15 · `Transaccion.tipo` y `GarantiaProveedor.tipo_garantia` Usan String en Lugar de Enum
- **Ubicación:** [models.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/db/models.py#L199) línea 199, línea 232
- **Descripción:** Inconsistente con el resto de modelos que usan Enums propios. Existe `ResolucionProveedor` pero no se usa.
- **Fix:** Usar enums existentes o crear nuevos.

### B-16 · Health Check Retorna 200 Aunque la BD Esté Caída
- **Ubicación:** [main.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/main.py#L60-L75) líneas 60-75
- **Descripción:** Retorna `{"status": "ok"}` con HTTP 200 incluso cuando `db_status = "disconnected"`.
- **Fix:** Retornar HTTP 503 cuando la BD no esté disponible.

### B-17 · `func.now()` como Default de Columna
- **Ubicación:** [models.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/db/models.py) líneas 189, 204, 234
- **Descripción:** `default=func.now()` puede evaluarse en tiempo de carga del schema en lugar de en inserción.
- **Fix:** Usar `server_default=func.now()` para defaults a nivel de BD.

### B-18 · Placeholder URL en `alembic.ini`
- **Ubicación:** [alembic.ini](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/alembic.ini#L89) línea 89
- **Descripción:** `sqlalchemy.url = driver://user:pass@localhost/dbname` — placeholder confuso aunque se override en `env.py`.

### B-19 · Sin Versionado de API
- **Ubicación:** [config.py](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/backend/core/config.py#L8) línea 8
- **Descripción:** `API_V1_STR = "/api"` sin prefijo de versión (`/api/v1`). Cambios breaking serán difíciles de gestionar.

---

### F-09 · Sin Validación de Formularios
- **Ubicación:** Todos los formularios en páginas
- **Descripción:** Formularios permiten envío sin validación client-side. Datos inválidos van directo al backend.
- **Fix:** Integrar `react-hook-form` + `zod` para validación.

### F-10 · Uso Extensivo de `any` (~50+ instancias)
- **Ubicación:** Todas las páginas — `ClientesPage` (4), `InventarioPage` (11+), `VentasPage` (20+), `ConfiguracionPage` (2)
- **Descripción:** Uso generalizado de `any` que anula completamente la seguridad de tipos de TypeScript.
- **Fix:** Habilitar `"strict": true` en tsconfig y eliminar todos los `any`.

### F-11 · Sin Memoización — Renders Innecesarios
- **Ubicación:** [DashboardPage.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/pages/DashboardPage.tsx) (cálculos en cada render), [VentasPage.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/pages/VentasPage.tsx) (filtros en cada render)
- **Descripción:** Funciones como `calculateIngresos()`, `calculateEgresos()` y múltiples `.filter()` se ejecutan en cada render sin `useMemo`.
- **Fix:** Envolver cálculos costosos en `useMemo()`.

### F-12 · Sin Accesibilidad (a11y)
- **Ubicación:** [Modal.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/components/ui/Modal.tsx), todas las páginas
- **Descripción:** Sin `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap en modales. Sin `role="tab"`/`role="tablist"` en tabs. Labels no funcionales (`id` opcional y rara vez proporcionado).

### F-13 · Clases Tailwind No Estándar
- **Ubicación:** Múltiples archivos
- **Descripción:** Clases como `text-slate-450`, `text-slate-550`, `bg-slate-955`, `border-slate-850` **no existen** en Tailwind CSS v3 estándar y no están definidas en `tailwind.config.js`. Se ignoran silenciosamente → **sin estilo aplicado**.
- **Fix:** Usar clases estándar de Tailwind o extender el tema en `tailwind.config.js`.

### F-14 · CSS Muerto del Template de Vite
- **Ubicación:** [App.css](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/App.css) (185 líneas)
- **Descripción:** Contiene estilos del scaffold de Vite (`.counter`, `.hero`, `#center`, `#next-steps`) completamente sin usar. La app usa Tailwind exclusivamente.
- **Fix:** Eliminar contenido de `App.css`.

---

## 🔵 HALLAZGOS DE SEVERIDAD BAJA

### B-20 · Sin Framework de Logging
- **Descripción:** Solo `print()` en `seed.py`. Sin logging estructurado, tracking de errores, ni request/response logging.

### B-21 · Sin Tests
- **Descripción:** No existe directorio `tests/`. Cero cobertura. Sin unit tests, integration tests, ni API tests.

### B-22 · Sin Documentación de API
- **Descripción:** Aunque FastAPI genera docs automáticos, no hay docstrings en endpoints, ni respuestas de error documentadas en los schemas de OpenAPI.

### B-23 · `__pycache__` en Raíz del Backend
- **Descripción:** Directorio `__pycache__` existe en raíz del backend aunque `.gitignore` lo excluye. No es un problema de git pero indica falta de limpieza.

### F-15 · Sin Code Splitting / Lazy Loading
- **Ubicación:** [routes/index.tsx](file:///c:/Users/rcubides/Documents/git/StreamingRefactor/frontend/src/routes/index.tsx)
- **Descripción:** Todas las rutas se importan eagerly. Sin `React.lazy()` ni `Suspense`.

### F-16 · Sin `.env.example` en Frontend
- **Descripción:** `VITE_API_URL` se referencia en `axios.ts` pero no existe documentación de variables de entorno requeridas.

---

## 📊 Opciones de Mejora / Refactorización

### 🏗️ Arquitectura Backend

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| R-01 | Crear capa de excepciones de dominio (`exceptions.py`) | Alto | Bajo |
| R-02 | Implementar Repository Pattern para desacoplar servicios de SQLAlchemy | Alto | Medio |
| R-03 | Agregar middleware de autenticación JWT | Crítico | Medio |
| R-04 | Migrar `float` → `Decimal` en todos los modelos y schemas | Crítico | Medio |
| R-05 | Implementar paginación genérica en endpoints de listado | Alto | Bajo |
| R-06 | Crear helper `get_or_404()` para eliminar duplicación | Medio | Bajo |
| R-07 | Agregar `__init__.py` con exports explícitos en cada paquete | Bajo | Bajo |
| R-08 | Crear enum `TipoTransaccion` y usar `ResolucionProveedor` existente | Medio | Bajo |
| R-09 | Implementar logging estructurado con `structlog` o `loguru` | Medio | Bajo |
| R-10 | Agregar tests con `pytest` + `httpx` AsyncClient | Alto | Alto |

### 🎨 Arquitectura Frontend

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| R-11 | Descomponer `VentasPage` en 10-15 componentes + hooks | Crítico | Alto |
| R-12 | Descomponer `InventarioPage` en componentes + hooks | Crítico | Alto |
| R-13 | Crear `src/types/` con interfaces compartidas | Alto | Bajo |
| R-14 | Implementar TanStack Query para data fetching | Alto | Medio |
| R-15 | Crear API service layer (`src/services/*.ts`) | Alto | Medio |
| R-16 | Habilitar TypeScript strict mode y eliminar `any` | Alto | Medio |
| R-17 | Agregar Error Boundaries | Alto | Bajo |
| R-18 | Implementar `React.lazy()` para code splitting | Medio | Bajo |
| R-19 | Agregar validación con `react-hook-form` + `zod` | Medio | Medio |
| R-20 | Limpiar clases Tailwind inválidas y App.css muerto | Bajo | Bajo |

---

## 🗺️ Plan de Acción Sugerido

### Fase 0 — Emergencia de Seguridad (Sprint 1 · ~3 días)
- [ ] **B-04:** Remover `streaming_erp.db` de git y agregar `*.db` a `.gitignore`
- [ ] **B-03:** Restringir CORS a orígenes específicos (eliminar wildcard `*`)
- [ ] **B-05:** Cambiar `echo=True` → `echo=False` en `database.py`
- [ ] **F-16:** Agregar `.env.example` en frontend con `VITE_API_URL`

### Fase 1 — Fundamentos de Seguridad (Sprint 2 · ~5 días)
- [ ] **B-01 + F-04:** Implementar autenticación JWT (backend + frontend)
  - Backend: middleware FastAPI, endpoint `/auth/login`, dependencia `get_current_user`
  - Frontend: interceptor Axios, route guards, login page
- [ ] **B-07:** Encriptar credenciales de streaming en reposo
- [ ] **F-01:** Mover generación de mensajes WhatsApp al backend

### Fase 2 — Integridad de Datos (Sprint 3 · ~5 días)
- [ ] **B-02:** Migrar `float` → `Decimal` en modelos, schemas y servicios
- [ ] **B-06:** Envolver operaciones multi-paso en transacciones explícitas
- [ ] **B-08:** Agregar validadores Pydantic en schemas
- [ ] **B-15 + B-17:** Corregir enums inconsistentes y defaults de columnas
- [ ] **B-16:** Corregir health check para retornar 503 en fallo de BD

### Fase 3 — Refactorización Frontend (Sprint 4-5 · ~10 días)
- [ ] **F-02 + F-08:** Crear `src/types/` con interfaces compartidas
- [ ] **F-10:** Habilitar TypeScript `strict: true` y eliminar `any`
- [ ] **F-02:** Descomponer `VentasPage` en componentes atómicos:
  - `POSCart`, `ClienteSearchDropdown`, `CuentaSelector`, `SalesHistory`, `SaleDetailRow`, `WarrantyModal`, `RenewalModal`, `PaymentModal`, `WhatsAppMessageBuilder`
- [ ] **F-02:** Descomponer `InventarioPage` en componentes:
  - `CuentaAccordion`, `CuentaForm`, `ProveedorManager`, `PlataformaManager`, `WarrantyProvModal`, `RenewalCuentaModal`
- [ ] **F-07:** Implementar TanStack Query + custom hooks de data fetching
- [ ] **F-06:** Agregar Error Boundaries

### Fase 4 — Rendimiento y Calidad (Sprint 6 · ~5 días)
- [ ] **B-09 + B-10:** Agregar paginación y optimizar queries con `selectinload`
- [ ] **B-13 + B-14:** Crear `get_or_404()` helper y excepciones de dominio
- [ ] **F-11:** Agregar `useMemo` en cálculos costosos
- [ ] **F-15:** Code splitting con `React.lazy()`
- [ ] **F-09:** Integrar `react-hook-form` + `zod`
- [ ] **F-13 + F-14:** Limpiar CSS muerto y clases Tailwind inválidas

### Fase 5 — Calidad a Largo Plazo (Sprint 7+ · Continuo)
- [ ] **B-21:** Implementar tests (pytest + httpx)
- [ ] **B-20 + B-09:** Agregar logging estructurado
- [ ] **F-12:** Mejorar accesibilidad (a11y)
- [ ] **B-11:** Pinnear dependencias con lockfile
- [ ] **B-19:** Implementar versionado de API (`/api/v1`)
- [ ] **B-12:** Agregar `__init__.py` en todos los paquetes

---

## 📎 Matriz de Riesgo

```
IMPACTO
  ↑
  █  B-01 B-02     │  B-06 B-07    │              │
  █  B-03 B-04     │  B-08 B-09    │              │
  █  F-01 F-02     │  F-04 F-05    │              │
ALTO F-03          │  F-07 F-08    │              │
  █                │               │              │
  ├────────────────┼───────────────┼──────────────┤
  █  B-05          │  B-13 B-14    │  B-11        │
  █                │  B-15 B-16    │  B-12        │
MEDIO              │  F-09 F-10    │  F-14        │
  █                │  F-11 F-12    │              │
  █                │  F-13         │              │
  ├────────────────┼───────────────┼──────────────┤
  █                │  B-17 B-18    │  B-20 B-22   │
BAJO               │               │  B-23 F-15   │
  █                │               │  F-16        │
  ├────────────────┼───────────────┼──────────────┤
                 ALTA            MEDIA           BAJA
                          PROBABILIDAD →
```

---

> [!IMPORTANT]
> **Prioridad inmediata:** Las Fases 0 y 1 (Seguridad) deben ejecutarse antes de cualquier despliegue a producción. Los hallazgos B-01 a B-04 y F-01 representan riesgo de exposición de datos sensibles de clientes y credenciales de plataformas.

---

*Fin del reporte de diagnóstico. Documento generado sin modificación alguna al código fuente.*
