import { Navigate, Outlet } from 'react-router-dom';
import { MetadataProvider } from '../context/MetadataContext';

export default function AuthGuard() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <MetadataProvider>
      <Outlet />
    </MetadataProvider>
  );
}
