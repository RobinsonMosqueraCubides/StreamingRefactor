
## 1. Alcance del Proyecto
El sistema es una plataforma tipo ERP (Enterprise Resource Planning) orientada a la gestión integral de un negocio de reventa de cuentas de streaming. 
* **Objetivo Principal:** Automatizar el control de inventario (cuentas madre y perfiles fragmentados), gestionar el ciclo de vida de las suscripciones (renovaciones cada 30 días), controlar estrictamente las garantías (caídas de cuentas) y ofrecer un panel financiero exacto de ingresos y egresos.
* **Estructura del Repositorio:** Todo el código fuente debe estar consolidado en un único repositorio (**Monorepo**). Esto para poder ser publicado en Netflily.

```python
markdown_content = """# Especificación del Proyecto y Arquitectura: ERP de Streaming (Monorepo)

Este documento define el alcance, la arquitectura tecnológica y los requerimientos funcionales para el desarrollo del sistema de gestión de reventa de servicios de streaming. Está diseñado para que un Agente de IA pueda configurar e implementar el proyecto completo.

---

## 2. Stack Tecnológico y Despliegue

La elección de herramientas garantiza que la base de datos sea escalable y la aplicación responda rápidamente:

* **Backend:** Python con **FastAPI** (modo asíncrono para alto rendimiento).
* **ORM y Base de Datos:** **SQLAlchemy 2.0** (o SQLModel) conectándose a una base de datos **PostgreSQL**. Dado el stack, hospedar la base de datos en **Supabase** es la opción ideal para obtener una conexión rápida y segura sin preocuparse por la infraestructura inicial.
* **Frontend:** **React** empaquetado con **Vite**.
* **Estilos y UX:** **Tailwind CSS**, permitiendo el prototipado ágil bajo los lineamientos Mobile First.
* **Despliegue del Monorepo:** * El directorio `/frontend` se conectará y publicará automáticamente en **Netlify**.
* El directorio `/backend` se puede desplegar fácilmente en **Vercel** o Render.



---

## 3. Metodología de Diseño: Mobile First

La interfaz debe construirse asumiendo que el administrador operará el negocio frecuentemente desde un teléfono móvil.

* **Vistas Móviles Nativas:** Modales simplificados, navegación inferior (Bottom Navigation) y listas en formato de tarjetas (Cards) en lugar de tablas extensas para la gestión rápida de ventas y asignación de perfiles.
* **Escalabilidad a Escritorio:** Utilizar los breakpoints de Tailwind (`md:`, `lg:`) para que, al abrir la aplicación en un monitor o tablet, la interfaz se expanda mostrando tablas de datos completas, gráficos financieros interactivos y vistas consolidadas.

---

## 4. Modelo de Datos (PostgreSQL DDL)

Estructura relacional optimizada para manejar el inventario, los pagos fraccionados y el historial financiero.

```sql
CREATE TYPE tipo_cliente AS ENUM ('FINAL', 'REVENDEDOR');
CREATE TYPE estado_cliente AS ENUM ('ACTIVO', 'BANEADO');
CREATE TYPE estado_cuenta AS ENUM ('ACTIVA', 'CAIDA', 'VENCIDA', 'RENOVADA');
CREATE TYPE estado_pago AS ENUM ('PAGADO', 'PENDIENTE', 'DIAS_ESPERA', 'PAGO_PARCIAL');
CREATE TYPE entidad_financiera AS ENUM ('NEQUI', 'BANCOLOMBIA', 'DAVIPLATA', 'NU_BANK', 'EFECTIVO');
CREATE TYPE resolucion_proveedor AS ENUM ('CAMBIO_CONTRASENA', 'CAMBIO_CUENTA', 'SALDO_A_FAVOR');

CREATE TABLE plataformas (id SERIAL PRIMARY KEY, nombre VARCHAR(100) UNIQUE NOT NULL);

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY, nombre VARCHAR(150) NOT NULL, telefono VARCHAR(20) UNIQUE NOT NULL,
    tipo tipo_cliente DEFAULT 'FINAL', estado estado_cliente DEFAULT 'ACTIVO', dias_gracia_max INT DEFAULT 3
);

CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY, nombre VARCHAR(150) NOT NULL, telefono VARCHAR(20) UNIQUE NOT NULL,
    saldo_a_favor NUMERIC(12, 2) DEFAULT 0.00 CHECK (saldo_a_favor >= 0)
);

CREATE TABLE credenciales (
    id SERIAL PRIMARY KEY, email VARCHAR(150) UNIQUE NOT NULL, password VARCHAR(150) NOT NULL
);

CREATE TABLE cuentas_madre (
    id SERIAL PRIMARY KEY, proveedor_id INT REFERENCES proveedores(id), credencial_id INT REFERENCES credenciales(id),
    plataforma_id INT REFERENCES plataformas(id), max_perfiles INT NOT NULL, precio_compra NUMERIC(12, 2) NOT NULL,
    fecha_compra DATE NOT NULL, fecha_vencimiento DATE NOT NULL, estado estado_cuenta DEFAULT 'ACTIVA'
);

CREATE TABLE perfiles (
    id SERIAL PRIMARY KEY, cuenta_madre_id INT REFERENCES cuentas_madre(id) ON DELETE CASCADE,
    nombre_perfil VARCHAR(50) NOT NULL, pin VARCHAR(10), asignado BOOLEAN DEFAULT FALSE,
    UNIQUE(cuenta_madre_id, nombre_perfil)
);

CREATE TABLE combos (id SERIAL PRIMARY KEY, nombre VARCHAR(150) NOT NULL, precio_combo NUMERIC(12, 2) NOT NULL);

CREATE TABLE ventas (
    id SERIAL PRIMARY KEY, cliente_id INT REFERENCES clientes(id), fecha_corte DATE NOT NULL,
    monto_total NUMERIC(12, 2) NOT NULL, estado_pago estado_pago DEFAULT 'PENDIENTE'
);

CREATE TABLE detalles_venta (
    id SERIAL PRIMARY KEY, venta_id INT REFERENCES ventas(id) ON DELETE CASCADE,
    combo_id INT REFERENCES combos(id), cuenta_madre_id INT REFERENCES cuentas_madre(id),
    perfil_id INT REFERENCES perfiles(id), precio_aplicado NUMERIC(12, 2) NOT NULL
);

CREATE TABLE pagos_venta (
    id SERIAL PRIMARY KEY, venta_id INT REFERENCES ventas(id) ON DELETE CASCADE,
    monto NUMERIC(12, 2) NOT NULL, entidad entidad_financiera NOT NULL, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transacciones (
    id SERIAL PRIMARY KEY, tipo VARCHAR(10) CHECK (tipo IN ('INGRESO', 'EGRESO')),
    categoria VARCHAR(50) NOT NULL, monto NUMERIC(12, 2) NOT NULL,
    entidad entidad_financiera NOT NULL, referencia_id INT, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE garantias_clientes (
    id SERIAL PRIMARY KEY, detalle_venta_id INT REFERENCES detalles_venta(id),
    perfil_anterior_id INT REFERENCES perfiles(id), perfil_nuevo_id INT REFERENCES perfiles(id),
    dias_extendidos INT DEFAULT 0, resuelto BOOLEAN DEFAULT FALSE
);

```

---

## 5. Casos de Uso del Sistema (Lógica de Controladores)

### A. Gestión de Inventario

* **UC-01: Registro de Compra y Fraccionamiento:** Al crear una `Cuenta Madre`, el sistema genera N registros en la tabla `perfiles` con `asignado = FALSE` y registra automáticamente el EGRESO contable en la tabla de `transacciones`.
* **UC-06: Actualización Masiva de Seguridad:** Si el proveedor exige cambio de contraseña, se actualiza la tabla `credenciales` y la API retorna la lista de clientes con perfiles activos en esa cuenta para enviarles notificaciones masivas.

### B. Ventas y Asignación Automática

* **UC-02: Algoritmo de Venta:** Al concretar una venta, el backend busca el primer `perfil_id` libre (`asignado = FALSE`) de la plataforma requerida y lo bloquea (`asignado = TRUE`). Si el cliente compra una "Cuenta Completa", el sistema bloquea todos los perfiles asociados a la misma `Cuenta Madre`.
* **UC-07: Prorrateo en Combos:** Si un combo incluye plataformas con fechas de corte dispares, el sistema unifica la `fecha_corte` al mismo día y calcula un cobro proporcional (prorrateo) para el primer ciclo de facturación.
* **UC-10: Venta Mayorista (B2B):** Permite vender múltiples perfiles en lote a clientes tipo `REVENDEDOR`, reservándolos a su nombre pero permitiendo que el revendedor los reasigne a sus propios usuarios finales posteriormente.

### C. Gestión de Garantías y Casos Especiales

* **UC-04: Reasignación y Días Extra (Cliente):** Ante una caída de pantalla, permite liberar el perfil afectado, asignar uno nuevo disponible al cliente, y opcionalmente sumar días compensatorios a la `fecha_corte` original.
* **UC-05: Garantía a Favor (Proveedor):** Si el proveedor compensa una cuenta caída con dinero, se añade el monto al campo `saldo_a_favor` del proveedor. Este saldo se restará automáticamente del total a pagar en la siguiente compra (`UC-01`).
* **UC-09: Sistema de Baneos:** Permite marcar a un cliente moroso o problemático como `BANEADO`, bloqueando instantáneamente la asignación de nuevas ventas en el sistema.

### D. Flujo Financiero y Pagos

* **UC-11: Registro de Gastos Operativos:** Permite registrar transacciones de tipo `EGRESO` manuales (ej. servidores, marketing) para que el Dashboard de Utilidad Neta refleje métricas precisas.
* **UC-12: Gestión de Abonos:** Al registrar un pago parcial, se inserta en `pagos_venta`. Un disparador o controlador verifica la suma; si el total pagado iguala o supera el `monto_total` de la venta, el estado cambia a `PAGADO` y asienta el `INGRESO` global.

### E. Tareas de Segundo Plano (Cron Jobs)

* **UC-03: Alerta de Renovaciones Inminentes:** Consulta diaria que filtra y expone las ventas con `fecha_corte` programadas para expirar en 1 o 2 días.
* **UC-08: Suspensión Automática por Morosidad:** Tarea programada que evalúa las cuentas en estado `PENDIENTE` o `DIAS_ESPERA`. Si la fecha actual supera el límite de tolerancia (`fecha_corte + dias_gracia_max`), el sistema marca la cuenta como `VENCIDA` y libera automáticamente los perfiles (`asignado = FALSE`) devolviéndolos al inventario disponible.
