import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthGuard from './AuthGuard';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Lazy loading of page components
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ClientesPage = lazy(() => import('../pages/ClientesPage'));
const InventarioPage = lazy(() => import('../pages/InventarioPage'));
const VentasPage = lazy(() => import('../pages/VentasPage'));
const ConfiguracionPage = lazy(() => import('../pages/ConfiguracionPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <AuthGuard />,
    children: [
      {
        path: '',
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'clientes',
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <ClientesPage />
              </Suspense>
            ),
          },
          {
            path: 'inventario',
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <InventarioPage />
              </Suspense>
            ),
          },
          {
            path: 'ventas',
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <VentasPage />
              </Suspense>
            ),
          },
          {
            path: 'configuracion',
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <ConfiguracionPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);

