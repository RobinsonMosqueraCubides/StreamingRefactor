# Streaming Refactor - ERP de Streaming (Monorepo)

Este repositorio contiene una plataforma tipo ERP (Enterprise Resource Planning) orientada a la gestión integral de un negocio de reventa de cuentas de streaming.

## Estructura del Repositorio

- `/backend`: API REST asíncrona desarrollada en Python con FastAPI, SQLAlchemy 2.0 y PostgreSQL (Supabase) / SQLite de desarrollo.
- `/frontend`: Aplicación web responsive (Mobile First) desarrollada en React con Vite, TypeScript y Tailwind CSS v3.
- `/docs`: Documentación del proyecto, incluyendo la especificación de lógica de negocio y el plan de desarrollo.

---

## Requisitos Previos

- **Python 3.10+**
- **Node.js 18+** y **npm**
- Una base de datos PostgreSQL (ej. Supabase) para producción, o SQLite para desarrollo local.

---

## Guía de Inicialización del Proyecto

Sigue estos pasos para levantar el entorno de desarrollo completo en otro equipo:

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd StreamingRefactor
```

### 2. Configurar el Backend (FastAPI)

1. Ingresar al directorio del backend:
   ```bash
   cd backend
   ```
2. Crear un entorno virtual de Python:
   * **En Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   * **En macOS/Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
3. Instalar las dependencias del backend:
   ```bash
   pip install -r requirements.txt
   ```
4. Configurar las variables de entorno:
   - Copia el archivo de ejemplo:
     ```bash
     cp .env.example .env
     ```
   - Abre el archivo `.env` y define tu `DATABASE_URL`. Por defecto, está inicializado para usar **SQLite local** (`sqlite+aiosqlite:///./streaming_erp.db`) como fallback de desarrollo inmediato.
5. Aplicar las migraciones de la base de datos (creará todas las tablas y relaciones):
   ```bash
   alembic upgrade head
   ```
6. Poblar la base de datos con datos semilla (*plataformas iniciales y plantillas de WhatsApp*):
   ```bash
   python db/seed.py
   ```
7. Iniciar el servidor local de desarrollo:
   ```bash
   uvicorn main:app --reload
   ```
   *El backend estará disponible en `http://127.0.0.1:8000`. Puedes consultar la documentación interactiva de la API en `http://127.0.0.1:8000/docs`.*

---

### 3. Configurar el Frontend (React + Vite + Tailwind v3)

1. Desde la raíz del repositorio, ingresar al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instalar las dependencias de Node.js:
   ```bash
   npm install
   ```
3. Iniciar el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
   *El frontend se levantará en `http://localhost:5173`. Cuenta con diseño responsive con enfoque Mobile First.*

---

## Documentación de Soporte

- [Especificación de Lógica de Negocio](docs/logicaNegocio.md)
- [Plan de Desarrollo y Tareas](docs/planning.md)
