# Plan de Desarrollo Detallado: ERP de Streaming (Monorepo)

Este documento contiene la planificación estratégica y técnica para el desarrollo desde cero hasta producción del sistema ERP de Streaming. Está diseñado para que se pueda ejecutar ordenando "Comencemos con la tarea X", asegurando que el backend y frontend puedan desarrollarse de manera simultánea sin bloqueos, optimizando tokens y llamadas en la ejecución del Agente de IA.

---

## - [x] 🏗️ Fase 1: Configuración de la Infraestructura y Arquitectura Base
**Objetivo:** Establecer el esqueleto del proyecto Monorepo, inicializar los servicios base (Frontend y Backend) y desplegar el esquema de la base de datos en Supabase. Esta fase desbloquea el desarrollo en paralelo del resto de fases.

### - [x] Tarea 1.1: Inicialización del Monorepo
* **Objetivo:** Crear la estructura de carpetas y configuración para alojar Frontend y Backend en el mismo repositorio.
* **Descripción:** Configurar un entorno monorepo estándar. Crear la carpeta `/backend` y `/frontend`. Configurar gitignore y archivos de documentación base.
* **Archivos/Módulos a crear:** `.gitignore`, `README.md`, `backend/`, `frontend/`.
* **Tecnologías:** Git, Bash.
* **Dependencias:** Ninguna.
* **Resultado Esperado:** Repositorio con estructura base de monorepo.
* **Criterios de Terminación:** Las carpetas existen, el `.gitignore` ignora dependencias de JS y Python, y el proyecto está versionado.

### - [x] Tarea 1.2: Configuración Base del Backend (FastAPI + SQLAlchemy)
* **Objetivo:** Inicializar el proyecto FastAPI y la conexión a la base de datos PostgreSQL.
* **Descripción:** Crear entorno virtual de Python, instalar dependencias, configurar FastAPI, SQLAlchemy 2.0 async, y Pydantic. Configurar variables de entorno y el motor de conexión a Supabase. Configurar CORS.
* **Archivos/Módulos a crear:** `backend/requirements.txt`, `backend/main.py`, `backend/core/config.py`, `backend/db/database.py`.
* **Tecnologías:** Python, FastAPI, SQLAlchemy, Pydantic, Uvicorn.
* **Dependencias:** Tarea 1.1. Base de datos en Supabase creada por el usuario (requiere credenciales).
* **Resultado Esperado:** Servidor FastAPI corriendo localmente respondiendo a un endpoint de health check (`/health`) y conectado a la BD.
* **Criterios de Terminación:** El servidor arranca sin errores y el endpoint `/health` devuelve 200 OK.

### - [x] Tarea 1.3: Configuración Base del Frontend (React + Vite + Tailwind)
* **Objetivo:** Inicializar el proyecto Frontend con un enfoque Mobile First.
* **Descripción:** Usar Vite para inicializar un proyecto de React con TypeScript. Instalar Tailwind CSS y configurar el tema base. Configurar Axios o Fetch para consumir la API. Crear un Layout principal con Bottom Navigation para móviles.
* **Archivos/Módulos a crear:** `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.js`, `frontend/src/App.tsx`, `frontend/src/api/axios.ts`, `frontend/src/layouts/MainLayout.tsx`.
* **Tecnologías:** React, Vite, TypeScript, Tailwind CSS, Axios.
* **Dependencias:** Tarea 1.1.
* **Resultado Esperado:** App React renderizando una pantalla base con Bottom Navigation y estilos de Tailwind cargados.
* **Criterios de Terminación:** El comando `npm run dev` funciona y muestra el layout base de manera responsive en navegador.

### - [x] Tarea 1.4: Modelado de Datos y Migraciones (Alembic)
* **Objetivo:** Traducir el modelo de datos (DDL) a modelos de SQLAlchemy y aplicar migraciones.
* **Descripción:** Configurar Alembic. Crear los modelos SQLAlchemy correspondientes al DDL definido (Plataformas, Clientes, Proveedores, Cuentas, Perfiles, etc.) + Tabla de `plantillas_mensajes` para WhatsApp. Generar y aplicar la primera migración hacia Supabase.
* **Archivos/Módulos a crear:** `backend/alembic.ini`, `backend/db/models.py`, `backend/alembic/versions/`.
* **Tecnologías:** Python, SQLAlchemy 2.0, Alembic.
* **Dependencias:** Tarea 1.2.
* **Resultado Esperado:** Base de datos en Supabase con todas las tablas, enums y relaciones creadas.
* **Criterios de Terminación:** La base de datos refleja exactamente el DDL solicitado sin errores de clave foránea.

#### Resumen Fase 1:
* **Riesgos:** Errores de conexión con Supabase por configuraciones de IP o credenciales mal pasadas.
* **Buenas Prácticas:** Usar `.env` estrictamente para credenciales. Separar modelos en `models.py` desde el principio.
* **Pruebas sugeridas:** Verificar inserción manual directa en Supabase SQL Editor para comprobar Constraints.

---

## - [x] 🛠️ Fase 2: Backend Core (API REST de Entidades Base)
**Objetivo:** Desarrollar los endpoints y lógica de negocio (Controladores/Servicios) para las entidades maestras.
*Nota: Desde aquí, Frontend (Fase 3) puede desarrollarse en paralelo usando Mocks o esperando a estas APIs.*

### - [x] Tarea 2.1: CRUD de Catálogos (Plataformas, Combos y Plantillas WhatsApp)
* **Objetivo:** Endpoints para crear y listar plataformas de streaming, combos y editar las plantillas de WhatsApp (Opción A).
* **Descripción:** Implementar esquemas Pydantic y rutas de FastAPI para `Plataformas`, `Combos` y `Plantillas`.
* **Archivos/Módulos a crear:** `backend/schemas/catalogo_schemas.py`, `backend/api/rutas/catalogos.py`, `backend/services/catalogo_service.py`.
* **Tecnologías:** FastAPI, SQLAlchemy.
* **Dependencias:** Tarea 1.4.
* **Resultado Esperado:** Endpoints GET, POST, PUT, DELETE expuestos.
* **Criterios de Terminación:** Peticiones HTTP a `/api/plataformas`, `/api/combos` y `/api/plantillas` responden datos en formato JSON correctamente estructurado.

### - [x] Tarea 2.2: CRUD de Actores (Proveedores y Clientes)
* **Objetivo:** Gestión de los usuarios del sistema (UC-09 parcial).
* **Descripción:** Crear endpoints para registrar clientes (verificando celular único) y proveedores. Incluir endpoint para cambiar el `estado_cliente` a `BANEADO` (UC-09).
* **Archivos/Módulos a crear:** `backend/schemas/actor_schemas.py`, `backend/api/rutas/actores.py`, `backend/services/actor_service.py`.
* **Tecnologías:** FastAPI, SQLAlchemy.
* **Dependencias:** Tarea 1.4.
* **Criterios de Terminación:** Creación de clientes y proveedores exitosa, y actualización de estado a BANEADO funcionando.

### - [x] Tarea 2.3: Gestión de Inventario (Cuentas Madre, Credenciales y Perfiles) (UC-01)
* **Objetivo:** Automatizar la creación de perfiles fragmentados al registrar una cuenta madre.
* **Descripción:**
  * **Subtarea 2.3.1:** Endpoint para registro de Credenciales.
  * **Subtarea 2.3.2:** Endpoint POST `/api/cuentas_madre`. Al registrar, calcular perfiles y generar en bloque (Bulk Insert) en la tabla `perfiles` con `asignado=FALSE`.
  * **Subtarea 2.3.3:** Disparar un registro de egreso contable en `transacciones` correspondiente al costo de la cuenta (UC-01).
* **Archivos/Módulos a crear:** `backend/schemas/inventario_schemas.py`, `backend/api/rutas/inventario.py`, `backend/services/inventario_service.py`.
* **Tecnologías:** FastAPI, SQLAlchemy (Bulk operations).
* **Dependencias:** Tarea 2.1 y 2.2.
* **Criterios de Terminación:** Al crear 1 cuenta madre con `max_perfiles=5`, aparecen automáticamente 5 perfiles en BD y 1 transacción de tipo EGRESO.

#### Resumen Fase 2:
* **Riesgos:** Problemas de concurrencia al crear la cuenta y los perfiles.
* **Buenas Prácticas:** Usar transacciones SQL (`db.commit()` solo al final) para asegurar atomicidad.
* **Pruebas sugeridas:** Pruebas unitarias de los servicios (pytest). Prueba de Rollback si falla la creación de perfiles.

---

## - [x] 📱 Fase 3: Frontend Core (Mobile First UX)
**Objetivo:** Interfaz gráfica para gestionar los catálogos e inventario consumiendo la API de la Fase 2.

### - [x] Tarea 3.1: Enrutamiento y Componentes UI Base
* **Objetivo:** Configurar React Router y la librería de componentes genéricos (Tailwind).
* **Descripción:** Configurar rutas (`/`, `/clientes`, `/inventario`, `/ventas`, `/configuracion`). Crear componentes reutilizables: `Card`, `Button`, `Modal`, `Input`, `Select`, `BottomNav`.
* **Archivos/Módulos a crear:** `frontend/src/routes/`, `frontend/src/components/ui/`.
* **Tecnologías:** React Router DOM, Tailwind CSS, Lucide React (iconos).
* **Dependencias:** Tarea 1.3.

### - [x] Tarea 3.2: Vistas de Gestión de Actores y Configuración
* **Objetivo:** Pantallas para listar, crear y banear clientes/proveedores, y configurar plantillas.
* **Descripción:** Listado en formato Cards (para móvil) con función de búsqueda. Formularios modales para crear/editar. Pantalla de configuración para que el Administrador edite las plantillas base de WhatsApp (Opción A).
* **Archivos/Módulos a crear:** `frontend/src/pages/ClientesPage.tsx`, `frontend/src/pages/ConfiguracionPage.tsx`, `frontend/src/components/clientes/`.
* **Tecnologías:** React, Axios, React Query (opcional para manejo de estado).
* **Dependencias:** Tarea 3.1 (UI), Tarea 2.1 y 2.2 (API).

### - [x] Tarea 3.3: Vistas de Inventario
* **Objetivo:** Visualización de Cuentas Madre y disponibilidad de Perfiles.
* **Descripción:** Una vista que liste las Cuentas Madre. Al expandir/tocar una, muestra sus perfiles y el estado (Asignado/Libre). Formulario para registrar Nueva Cuenta Madre.
* **Archivos/Módulos a crear:** `frontend/src/pages/InventarioPage.tsx`, `frontend/src/components/inventario/`.
* **Dependencias:** Tarea 3.1 (UI), Tarea 2.3 (API).

#### Resumen Fase 3:
* **Riesgos:** Interfaz saturada en pantallas pequeñas.
* **Buenas Prácticas:** Aplicar `padding`, `gap` amplios para áreas táctiles (touch targets) en móvil.
* **Pruebas sugeridas:** Visualizar la interfaz en herramientas de desarrollo del navegador en modo iPhone SE.

---

## - [x] 💰 Fase 4: Lógica de Ventas y Financiera (Fullstack)
**Objetivo:** El corazón del ERP. Vender, asignar perfiles automáticamente y cobrar.

### - [x] Tarea 4.1: Algoritmo de Venta y Asignación (UC-02, UC-07, UC-10) - Backend
* **Objetivo:** Procesar una venta (separada o combo), buscar perfiles libres y calcular montos (El monto final de venta, debe ser editable durante el proceso de venta, en cualquiera de los casos, tanto para el cliente normal como para el revendedor).
* **Descripción:** 
  * **Subtarea 4.1.1 (Algoritmo Asignación):** Buscar `perfiles` libres por plataforma usando bloqueo pesimista (`SELECT FOR UPDATE SKIP LOCKED` para evitar colisiones). Si es Venta Mayorista, marcar asignación pero enlazar a Revendedor.
  * **Subtarea 4.1.2 (Prorrateo):** Si es un Combo, calcular fecha de corte unificada, la fecha de corte debe ser editable durante el proceso de venta .
  * **Subtarea 4.1.3:** Crear registro en `ventas` y múltiples en `detalles_venta`.
* **Archivos/Módulos:** `backend/services/ventas_service.py`, `backend/api/rutas/ventas.py`.
* **Dependencias:** Fase 2.

### - [x] Tarea 4.2: Gestión de Pagos (UC-12) y Gastos (UC-11) - Backend
* **Objetivo:** Registrar abonos a ventas y generar transacciones de egreso manuales.
* **Descripción:** Endpoint para añadir pago a una venta. Si la suma de pagos >= monto total, cambiar estado de venta a `PAGADO` e insertar en `transacciones` como `INGRESO`. Endpoint para registrar EGRESOS manuales.
* **Archivos/Módulos:** `backend/services/finanzas_service.py`.
* **Dependencias:** Tarea 4.1.

### - [x] Tarea 4.3: Interfaz de Ventas y Financiera - Frontend
* **Objetivo:** Pantalla ágil para vender (Mobile First) y Dashboard financiero.
* **Descripción:** 
  * **Punto de Venta (POS):** Selector de Cliente -> Selector de Plataforma/Combo -> Botón "Vender y Asignar Automático". Modal de éxito con el PIN y email asignados. Botón dinámico hacia WhatsApp para enviar datos, consumiendo las plantillas de base de datos.
  * **Panel Financiero:** Gráficos (Recharts) o tarjetas resumen con Ingresos Totales, Egresos, Cuentas por Cobrar.
* **Archivos/Módulos:** `frontend/src/pages/VentasPage.tsx`, `frontend/src/pages/DashboardPage.tsx`.
* **Dependencias:** Tareas 4.1 y 4.2.

#### Resumen Fase 4:
* **Riesgos:** Race conditions (dos empleados vendiendo el mismo perfil a la vez).
* **Buenas Prácticas:** Imprescindible `FOR UPDATE` en SQLAlchemy al seleccionar el perfil libre.

---

## - [ ] ⚙️ Fase 5: Garantías, Casos Especiales y Tareas Programadas (Fullstack)
**Objetivo:** Manejar excepciones del negocio (caídas) y automatizaciones.

### - [x] Tarea 5.1: Garantías de Clientes (UC-04) - Backend y Frontend
* **Objetivo:** Reasignar perfiles cuando una cuenta cae.
* **Descripción (Backend):** Endpoint que reciba un `detalle_venta_id`, libere el perfil viejo, busque uno nuevo, actualice `garantias_clientes` y opcionalmente extienda `fecha_corte`.
* **Descripción (Frontend):** Botón "Reportar Caída" en el detalle de la venta de un cliente, abre un flujo para reasignar y notificar vía WhatsApp.

### - [ ] Tarea 5.2: Garantías de Proveedor (UC-05) y Seguridad (UC-06) - Backend
* **Objetivo:** Añadir saldo a favor e informes de cambio de contraseña.
* **Descripción:** Endpoint para marcar una Cuenta Madre como CAIDA, generar saldo a favor en el Proveedor, y devolver la lista de clientes afectados para notificarles masivamente por WhatsApp.

### - [ ] Tarea 5.3: Cron Jobs Automáticos (UC-03, UC-08) - Backend
* **Objetivo:** Tareas programadas en segundo plano.
* **Descripción:** Implementar `APScheduler` o `Celery` (o FastAPI Background Tasks si es un solo nodo) para:
  * 1. Alertar renovaciones (próximos 2 días).
  * 2. Suspender cuentas morosas (fecha actual > fecha corte + días de gracia) y liberar sus perfiles.
* **Archivos/Módulos:** `backend/tasks/cron_jobs.py`.

---

## ✅ Decisiones de Negocio Acordadas
Basado en las definiciones del Product Owner, el alcance queda cerrado con los siguientes parámetros:

1. **Autenticación del Administrador:** Existirá un único usuario administrador. Se implementará un sistema de Login. Las credenciales serán fijas (`user: agaray`) y por seguridad la contraseña se almacenará en las **variables de entorno (`.env`)** del Backend, devolviendo un JWT tras el acceso.
2. **Método de Notificación (WhatsApp):** El Frontend generará botones dinámicos con el formato `wa.me/NúmeroDeTeléfono?text=TuMensajeCodificado`. **(Opción A elegida):** Los mensajes base (cobro, corte y cambio de credenciales) estarán guardados en una tabla de la Base de Datos para que el Administrador pueda editarlos desde una ventana de Configuración. Todos empezarán por "Hola [Nombre Cliente]".
3. **Manejo de Moneda:** Todo el sistema y el formateo en el Frontend se manejará exclusivamente en pesos colombianos (**COP**).
4. **Combos vs Plataformas Múltiples:** El sistema soporta ventas mixtas; un cliente puede adquirir plataformas individuales separadas y combos en una misma transacción (venta).

---

## 💡 Recomendaciones Arquitectónicas
### 1. Cambio de API REST a API HATEOAS / GraphQL (Parcial)
* **Problema:** En móviles, optimizar la carga de red es crucial. Consultar una venta con sus detalles, cliente y perfiles puede requerir muchas llamadas o payloads muy pesados si la API REST no es flexible.
* **Propuesta:** Usar parámetros `?include=detalles,perfiles` en FastAPI, o implementar GraphQL para las vistas complejas.
* **Ventajas:** Optimiza la red, el frontend pide solo lo que necesita. Ahorra tokens en el procesamiento.
* **Desventajas:** Aumenta la complejidad del tipado y la configuración en el backend.
* **Decisión:** Mantener REST pero con inclusión relaciones controlada por Pydantic (Lazy Loading optimizado).

### 2. Uso de Supabase Auth
* **Problema:** No hay tabla de Administradores ni gestión de sesiones en el DDL propuesto.
* **Propuesta:** En lugar de crear tablas propias para credenciales administrativas, integrar **Supabase Auth**.
* **Ventajas:** Extremadamente seguro, ahorra tiempo de desarrollo, manejo de reset de passwords y JWT automático.
* **Desventajas:** Ligeramente acoplado a la plataforma Supabase.

### 3. Sobre las tareas en segundo plano (Cron Jobs)
* **Problema:** Usar `BackgroundTasks` genéricos en FastAPI en un entorno serverless (Vercel/Render) es peligroso porque el proceso se duerme o reinicia y las tareas se pierden o se ejecutan múltiples veces.
* **Propuesta:** No ejecutar cron jobs dentro de FastAPI. Exponer un endpoint seguro (ej. POST `/api/cron/suspend-morosos` protegido por API Key) y usar **GitHub Actions Cron**, **Supabase Cron (pg_cron)** o **Cron-job.org** para llamar al endpoint a una hora específica.
* **Ventajas:** Garantiza ejecución precisa, sin consumir recursos continuos de servidor, arquitectura 100% compatible con despliegues Serverless.

---
**¿Estás listo para iniciar? Solo indícame: "Comencemos con la Tarea 1.1"**
