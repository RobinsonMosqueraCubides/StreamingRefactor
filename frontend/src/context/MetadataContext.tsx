import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import type { Cliente, Plataforma, Credencial, Proveedor } from '../types';

interface MetadataContextType {
  clientes: Cliente[];
  plataformas: Plataforma[];
  credenciales: Credencial[];
  proveedores: Proveedor[];
  plantillas: any[];
  loading: boolean;
  error: string;
  refreshMetadata: () => Promise<void>;
}

const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

export function MetadataProvider({ children }: { children: React.ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [credenciales, setCredenciales] = useState<Credencial[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshMetadata = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) return; // Esperar a que haya sesión iniciada
      
      const [clRes, platRes, credRes, provRes, plantRes] = await Promise.all([
        api.get('/clientes/'),
        api.get('/plataformas/'),
        api.get('/credenciales/'),
        api.get('/proveedores/'),
        api.get('/plantillas/'),
      ]);
      setClientes(clRes.data);
      setPlataformas(platRes.data);
      setCredenciales(credRes.data);
      setProveedores(provRes.data);
      setPlantillas(plantRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al precargar metadatos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMetadata();
  }, []);

  return (
    <MetadataContext.Provider value={{
      clientes,
      plataformas,
      credenciales,
      proveedores,
      plantillas,
      loading,
      error,
      refreshMetadata
    }}>
      {children}
    </MetadataContext.Provider>
  );
}

export function useMetadata() {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('useMetadata debe ser utilizado dentro de un MetadataProvider');
  }
  return context;
}
