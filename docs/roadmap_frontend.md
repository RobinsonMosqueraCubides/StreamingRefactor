# 🚀 Roadmap de Refactorización y Mejora Estética del Frontend
**Proyecto:** Agaray ERP (Streaming Subscription Reseller)  
**Documento de Planificación:** `docs/roadmap_frontend.md`  
**Basado en:** Habilidades de diseño (`frontend-design`, `ui-ux-pro-max`) y buenas prácticas de rendimiento (`vercel-react-best-practices`).

---

## 📋 Resumen Ejecutivo
El objetivo de este roadmap es transformar la interfaz actual de **Agaray ERP** de una UI basada en overrides forzados y componentes monolíticos a una aplicación web moderna, accesible, rápida y con una estética premium de panel de control financiero. 

> [!IMPORTANT]
> **Enfoque Obligatorio: Mobile-First.** Dado que la mayoría de los usuarios de este ERP operan y gestionan la reventa de cuentas en movilidad desde sus teléfonos celulares, todo diseño, maquetación e interacción debe optimizarse en primer lugar para pantallas de `375px` de ancho. El escalamiento a interfaces de escritorio (`md:`, `lg:`) se realizará de forma progresiva.

Este plan aborda de forma directa las deficiencias críticas identificadas en el [diagnostic_report.md](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/docs/diagnostic_report.md), estructurando el trabajo en **5 fases secuenciales**.

---

## 🎨 Sistema de Diseño Propuesto para Agaray ERP
Utilizando la inteligencia de diseño de la habilidad `ui-ux-pro-max` y las directrices de `frontend-design`, definimos el sistema de identidad visual:

### 🎛️ Diales de Configuración (Design Dials)
*   **Variance (Variabilidad Visual):** `5/10` (Dashboard moderno y balanceado; estructura de grillas limpia y predecible).
*   **Motion (Intensidad de Movimiento):** `4/10` (Micro-interacciones estándar y transiciones suaves de ruta de `300ms`; sin animaciones intrusivas).
*   **Density (Densidad Visual):** `7/10` (Escala compacta de espaciados `8px - 32px`, ideal para visualización densa de datos de ventas, cuentas e inventarios).

### 🎨 Paleta de Colores Corporativa (Sales Intelligence Dashboard)
Dejamos atrás los overrides forzados con `!important` y adoptamos una paleta semántica nativa para modo claro y oscuro:

| Rol de Diseño | Color Hex (Dark / Light) | Variable CSS | Propósito |
| :--- | :--- | :--- | :--- |
| **Primary (Base Slate)** | `#0F172A` (Oscuro) / `#FFFFFF` (Claro) | `--color-bg-app` | Fondo principal de la aplicación |
| **Secondary (Surfaces)** | `#1E293B` (Oscuro) / `#F1F5F9` (Claro) | `--color-bg-card` | Fondos de tarjetas, tablas y modales |
| **Accent / CTA** | `#10B981` (Esmeralda) / `#059669` (Dark Green) | `--color-accent` | Botones de acción, indicadores positivos de ganancias |
| **Sidebar / Nav** | `#0F172A` (Oscuro) / `#F8FAFC` (Claro) | `--color-sidebar` | Navegación lateral consistente |
| **Text Primary** | `#F8FAFC` (Oscuro) / `#0F172A` (Claro) | `--color-text-primary` | Texto legible de alta jerarquía |
| **Text Muted** | `#94A3B8` (Oscuro) / `#64748B` (Claro) | `--color-text-muted` | Etiquetas secundarias, placeholders y subtítulos |
| **Destructive** | `#EF4444` (Rojo) | `--color-destructive` | Acciones de borrado, cancelaciones y alertas críticas |

### 🔠 Tipografía y Personalidad (Typography Pairing)
*   **Display / Headings (Precisión y Datos):** `Fira Code` (Monospaced). Aporta un look técnico de terminal y asegura que los números en tablas e ingresos no cambien de ancho ni causen *Layout Shifts*.
*   **Body (Lectura Fluida):** `Fira Sans`. Una tipografía sin serif con excelente legibilidad en pantallas de cualquier tamaño y densidad.
*   **Importación CSS:**
    ```css
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
            ```

            ---

            ## 🗺️ Fases del Roadmap

            ### 📂 Fase 1: Saneamiento del Sistema de Estilos y Configuración (Tailwind & CSS)
            **Objetivo:** Eliminar los hacks de CSS en [index.css](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/src/index.css) y configurar Tailwind CSS de forma idiomática utilizando variables CSS dinámicas y el modificador `dark:`.

            *   **[ ] Configuración de Google Fonts:**
                *   Agregar las fuentes `Fira Sans` y `Fira Code` en [index.html](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/index.html).
                    *   Vincular las familias tipográficas a `font-sans` y `font-mono` en [tailwind.config.js](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/tailwind.config.js).
                    *   **[ ] Limpieza de Overrides Forzados:**
                        *   Eliminar todos los selectores `.bg-slate-900 !important`, `.bg-cyan-500 !important` y similares de [index.css](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/src/index.css).
                            *   Declarar el mapeo semántico de variables CSS en `:root` y `html.dark` para soportar de forma nativa temas claros y oscuros.
                            *   **[ ] Corrección de Clases No Estándar (Hallazgo F-13):**
                                *   Reemplazar clases huérfanas en el código como `text-slate-450`, `text-slate-550`, `border-slate-850` por clases estándar de Tailwind CSS (`text-slate-400`, `text-slate-500`, `border-slate-800`) o registrarlas explícitamente en la sección `extend.colors` de [tailwind.config.js](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/tailwind.config.js).
                                *   **[ ] Depuración de Código Muerto (Hallazgo F-14):**
                                    *   Vaciar el archivo [App.css](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/src/App.css) que contiene estilos por defecto de la plantilla de Vite no utilizados en el ERP.

                                    ---

                                    ### 🧱 Fase 2: Modularización Arquitectónica del Frontend (SRP)
                                    **Objetivo:** Dividir los componentes masivos "God Object" de más de 1000 líneas ([VentasPage.tsx](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/src/pages/VentasPage.tsx) y [InventarioPage.tsx](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/src/pages/InventarioPage.tsx)) en subcomponentes modulares y hooks personalizados (Single Responsibility Principle).

                                    ```mermaid
                                    graph TD
                                        A[VentasPage.tsx] --> B[custom hooks: useSalesState.ts]
                                            A --> C[subcomponents/SalesSummaryCard.tsx]
                                                A --> D[subcomponents/SalesCart.tsx]
                                                    A --> E[subcomponents/WhatsAppMessageGenerator.tsx]
                                                        A --> F[subcomponents/WarrantyModal.tsx]
                                                        ```

                                                        *   **[ ] Componentización de la Vista de Ventas (Hallazgo F-02):**
                                                            *   Crear la estructura `/src/pages/ventas/components/` para alojar subcomponentes como el Carrito de Compras, el Historial de Transacciones, y el Modal de Garantías.
                                                                *   Extraer la lógica de negocio, manipulación de carrito y llamadas API a un hook personalizado `useVentas.ts`.
                                                                *   **[ ] Componentización de la Vista de Inventario (Hallazgo F-02):**
                                                                    *   Crear `/src/pages/inventario/components/` y extraer la tabla de Cuentas Madre, el formulario de creación rápida, y el desglose de Perfiles.
                                                                        *   Crear el hook personalizado `useInventario.ts`.
                                                                        *   **[ ] Unificación de Tipos (Hallazgo F-08):**
                                                                            *   Eliminar las interfaces duplicadas en los archivos de página.
                                                                                *   Centralizar las definiciones en un directorio compartido `src/types/` (ej. `index.ts` o `types.d.ts`), alineando los tipos exactamente con los esquemas Pydantic del Backend.

                                                                                ---

                                                                                ### ⚡ Fase 3: Flujo de Datos, Caché y Rendimiento (Vercel Best Practices)
                                                                                **Objetivo:** Resolver el cuello de botella de rendimiento y la falta de caché de red utilizando mejores prácticas de fetching de datos cliente-servidor.

                                                                                *   **[ ] Integración de TanStack Query (React Query):**
                                                                                    *   Implementar `QueryClient` para cachear llamadas a catálogos, clientes y transacciones financieras.
                                                                                        *   Evitar los 6 fetches paralelos sin caché al montar [VentasPage.tsx](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/src/pages/VentasPage.tsx).
                                                                                        *   **[ ] Eliminación de Cascadas de Red (Waterfalls):**
                                                                                            *   Asegurar el uso de `Promise.all()` cuando se requieran fetches paralelos en vistas estáticas, o utilizar Suspense para streaming de datos (directriz `async-suspense-boundaries`).
                                                                                            *   **[ ] Eliminación de Renders Inútiles (Hallazgo F-11 & rerender-memo):**
                                                                                                *   Implementar `useMemo` para los filtros de búsqueda complejos y ordenamiento de listas de clientes e inventarios.
                                                                                                    *   Memoizar subcomponentes puros de visualización (ej. filas de tablas, tarjetas KPI) mediante `React.memo` para evitar re-renderizados cuando cambia el estado global de la página.
                                                                                                    *   **[ ] Lazy Loading de Rutas (Hallazgo F-15 & bundle-dynamic-imports):**
                                                                                                        *   Reemplazar los imports estáticos en [routes/index.tsx](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/src/routes/index.tsx) por `React.lazy()` combinados con `<Suspense>` para reducir el tamaño del bundle inicial y mejorar el tiempo de carga del primer renderizado.

                                                                                                        ---

                                                                                                        ### ♿ Fase 4: Pulido Estético, Micro-Interacciones y Accesibilidad (UX Pro Max)
                                                                                                        **Objetivo:** Enriquecer la experiencia visual del usuario con layouts consistentes y accesibles mediante los principios de `ui-ux-pro-max`.

                                                                                                        *   **[ ] Accesibilidad (a11y) y Semántica (Hallazgo F-12):**
                                                                                                            *   Agregar `role="dialog"`, `aria-modal="true"`, y trampas de foco (*focus trap*) en [Modal.tsx](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/src/components/ui/Modal.tsx).
                                                                                                                *   Asegurar que todos los inputs tengan etiquetas `<label>` con atributo `htmlFor` apuntando a su `id` único.
                                                                                                                    *   Establecer anillos de enfoque visibles (`focus-visible:ring-2 focus-visible:ring-emerald-500`) en elementos interactivos (directriz `focus-states`).
                                                                                                                    *   **[ ] Retroalimentación de Carga y Skeletons (Directriz loading-states):**
                                                                                                                        *   Sustituir la pantalla blanca de carga por componentes *Skeleton* (shimmer effects) al traer información de la base de datos.
                                                                                                                            *   Deshabilitar y mostrar estado de carga en botones al procesar transacciones financieras o registrar egresos.
                                                                                                                            *   **[ ] Micro-Interacciones y Transiciones Suaves:**
                                                                                                                                *   Implementar transiciones de hover consistentes de `150ms` a `200ms` (`transition-all duration-200`) en botones, inputs y menús de navegación en [MainLayout.tsx](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/src/layouts/MainLayout.tsx).
                                                                                                                                    *   Añadir efecto de escala sutil al hacer click/tap (`active:scale-95`) para una sensación física de interactividad (directriz `scale-feedback`).
                                                                                                                                    *   **[ ] Optimización Táctil y Mobile-First (Directrices `touch-target-size`, `touch-spacing` y `readable-font-size`):**
                                                                                                                                        *   Asegurar que todos los elementos interactivos en pantallas móviles tengan un tamaño de objetivo táctil mínimo de `44x44px` para evitar pulsaciones erróneas.
                                                                                                                                            *   Mantener un espaciado mínimo de `8px` de separación entre botones o enlaces adyacentes.
                                                                                                                                                *   Establecer un tamaño de fuente mínimo de `16px` en inputs y dropdowns para impedir que los navegadores móviles (como Safari en iOS) realicen un auto-zoom molesto al enfocar los campos.

                                                                                                                                                ---

                                                                                                                                                ### 🛡️ Fase 5: Seguridad en Cliente y Manejo de Errores
                                                                                                                                                **Objetivo:** Solucionar fugas de seguridad visuales en la interfaz del cliente y capturar fallos inesperados de la aplicación.

                                                                                                                                                *   **[ ] Enmascarar Credenciales en el DOM (Hallazgo F-01):**
                                                                                                                                                    *   Enmascarar contraseñas de las cuentas de streaming en la UI usando strings censurados (ej. `••••••••`) y agregar un botón de ojo (eye icon) para revelar la credencial solo tras la confirmación táctil o click.
                                                                                                                                                        *   Evitar inyectar contraseñas en texto plano directamente en el árbol del DOM sin interacción previa del usuario.
                                                                                                                                                        *   **[ ] Manejo Consistente de Errores (Hallazgo F-03 & F-06):**
                                                                                                                                                            *   Implementar límites de error (`Error Boundaries`) a nivel global en [App.tsx](file:///c:/Users/Robinson%20Mosquera/Documents/git/StreamingRefactor/frontend/src/App.tsx) y a nivel de layouts individuales para evitar la "pantalla blanca de la muerte".
                                                                                                                                                                *   Agregar notificaciones Toast (ej. `react-hot-toast` o `sonner`) con opción de descarte tras `3-5s` para notificar al usuario sobre fallos de llamadas de red sin interrumpir el flujo de navegación (directriz `toast-dismiss`).
                                                                                                                                                                *   **[ ] Validación de Formularios Client-Side (Hallazgo F-09):**
                                                                                                                                                                    *   Implementar validación interactiva utilizando `react-hook-form` y esquemas de validación tipados con `zod`.
                                                                                                                                                                        *   Mostrar mensajes de error de forma contextual debajo de cada input erróneo en lugar de alertas globales en la parte superior (directriz `error-placement`).

                                                                                                                                                                        ---

                                                                                                                                                                        ## 📊 Checklist Pre-Entrega Estética
                                                                                                                                                                        Antes de considerar las tareas del frontend como completadas, deben cumplir con los siguientes estándares de calidad:

                                                                                                                                                                        - [ ] **Enfoque Mobile-First Estricto:** Los estilos base de CSS/Tailwind deben aplicarse asumiendo una resolución de pantalla móvil (pantalla de `375px`), utilizando directivas condicionales (`md:`, `lg:`) únicamente para expandir o reordenar el layout en pantallas más grandes. Ningún elemento debe causar desbordamiento horizontal en móvil.
                                                                                                                                                                        - [ ] **Sin uso de Emojis Estructurales:** Los emojis no se usan como iconos de navegación. Todo icono interactivo debe usar la librería `lucide-react` para mantener coherencia en el grosor y estilo del trazo.
                                                                                                                                                                        - [ ] **Objetivos Táctiles Aptos (Touch Targets):** Todos los botones y links accionables deben tener un área táctil real de al menos `44x44px`.
                                                                                                                                                                        - [ ] **Formularios Mobile-Friendly:** Inputs numéricos y de texto deben usar tags de tipo correcto (ej. `type="tel"`, `type="number"`, `type="email"`) para invocar el teclado móvil correcto automáticamente.
                                                                                                                                                                        - [ ] **Contraste Mínimo 4.5:1 (WCAG AA):** Comprobar que los textos no tengan colores de bajo contraste (ej. gris claro sobre fondo crema).
                                                                                                                                                                        - [ ] **Z-Index Unificados:** Asegurar que los modales queden por encima de la barra de navegación móvil (`z-50` vs `z-40`).
                                                                                                                                                                        - [ ] **Sin Leaks en useEffect (Hallazgo F-05):** Todo `useEffect` con observables, timers o fetches de red debe proveer una función de limpieza para cancelar peticiones pendientes (`AbortController`) y descartar timeouts (`clearTimeout`).
                                                                                                                                                                        - [ ] **Desactivación de animaciones para usuarios con sensibilidad al movimiento:** Implementar media queries de Tailwind `@media (prefers-reduced-motion)` para atenuar o desactivar transiciones complejas si la preferencia del sistema operativo está habilitada.
                                                                                                                                                                        