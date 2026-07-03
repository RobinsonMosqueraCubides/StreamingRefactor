import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import ClientesPage from '../pages/ClientesPage';
import InventarioPage from '../pages/InventarioPage';
import VentasPage from '../pages/VentasPage';
import ConfiguracionPage from '../pages/ConfiguracionPage';
<<<<<<< HEAD
import LoginPage from '../pages/LoginPage';
import AuthGuard from './AuthGuard';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
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
            element: <DashboardPage />,
          },
          {
            path: 'clientes',
            element: <ClientesPage />,
          },
          {
            path: 'inventario',
            element: <InventarioPage />,
          },
          {
            path: 'ventas',
            element: <VentasPage />,
          },
          {
            path: 'configuracion',
            element: <ConfiguracionPage />,
          },
        ],
=======

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'clientes',
        element: <ClientesPage />,
      },
      {
        path: 'inventario',
        element: <InventarioPage />,
      },
      {
        path: 'ventas',
        element: <VentasPage />,
      },
      {
        path: 'configuracion',
        element: <ConfiguracionPage />,
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
      },
    ],
  },
]);
