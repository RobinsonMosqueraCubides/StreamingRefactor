import { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import api from '../api/axios';
import CuentasTab from './inventario/CuentasTab';
import ProveedoresTab from './inventario/ProveedoresTab';
import PlataformasTab from './inventario/PlataformasTab';
import CorreosPropiosTab from './inventario/CorreosPropiosTab';
import CanceladasTab from './inventario/CanceladasTab';
import CuentaMadreModal from './inventario/CuentaMadreModal';
import GarantiaProveedorModal from './inventario/GarantiaProveedorModal';
import RenovacionCuentaModal from './inventario/RenovacionCuentaModal';
import CancelarCuentaModal from './inventario/CancelarCuentaModal';
import { Database, Plus, Users, Mail, XCircle } from 'lucide-react';
import type { CuentaMadre, Proveedor, Plataforma } from '../types';
import { useMetadata } from '../context/MetadataContext';

export default function InventarioPage() {
  const { proveedores, plataformas, credenciales, refreshMetadata } = useMetadata();
  const [cuentas, setCuentas] = useState<CuentaMadre[]>([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState('');

  // activeTab: 'cuentas' | 'proveedores' | 'plataformas' | 'correos_propios' | 'canceladas'
  const [activeTab, setActiveTab] = useState<'cuentas' | 'proveedores' | 'plataformas' | 'correos_propios' | 'canceladas'>('cuentas');
  const [expandedCuentaId, setExpandedCuentaId] = useState<number | null>(null);
  const [correosPropios, setCorreosPropios] = useState<any[]>([]);

  // --- MODALS STUFF ---
  const [isCmModalOpen, setIsCmModalOpen] = useState(false);
  const [isProvGarantiaOpen, setIsProvGarantiaOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaMadre | null>(null);

  // Providers CRUD Modals
  const [isProvModalOpen, setIsProvModalOpen] = useState(false);
  const [selectedProv, setSelectedProv] = useState<Proveedor | null>(null);
  const [provNombre, setProvNombre] = useState('');
  const [provTelefono, setProvTelefono] = useState('');
  const [provSaldo, setProvSaldo] = useState<number | "">(0);
  const [provError, setProvError] = useState('');

  // Platforms CRUD Modals
  const [isPlatModalOpen, setIsPlatModalOpen] = useState(false);
  const [selectedPlat, setSelectedPlat] = useState<Plataforma | null>(null);
  const [platNombre, setPlatNombre] = useState('');
  const [platError, setPlatError] = useState('');

  const fetchCuentas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cuentas_madre/');
      setCuentas(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al cargar cuentas de inventario.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCorreosPropios = async () => {
    try {
      setLoading(true);
      const res = await api.get('/correos_propios/');
      setCorreosPropios(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al cargar correos propios.');
    } finally {
      setLoading(false);
    }
  };

  const reloadAll = async () => {
    await Promise.all([
      refreshMetadata(),
      fetchCuentas(),
      fetchCorreosPropios()
    ]);
  };

  useEffect(() => {
    fetchCuentas();
    fetchCorreosPropios();
  }, []);

  // Clear errors when active tab changes (UX fix)
  useEffect(() => {
    setError('');
  }, [activeTab]);

  const handleToggleExpand = (id: number) => {
    setExpandedCuentaId(expandedCuentaId === id ? null : id);
  };

  // --- RECLAMO GARANTIA AL PROVEEDOR ---
  const handleApplyProvGarantia = async (payload: any) => {
    await api.post('/garantias-proveedores/', payload);
    fetchCuentas();
  };

  // --- RENEW CUENTA MADRE ---
  const handleApplyRenew = async (nuevaFechaVencimiento: string) => {
    if (!selectedCuenta) return;
    await api.put(`/cuentas_madre/${selectedCuenta.id}/renovar`, {
      nueva_fecha_vencimiento: nuevaFechaVencimiento
    });
    fetchCuentas();
  };

  // --- CANCEL CUENTA MADRE ---
  const handleApplyCancel = async (payload: any) => {
    if (!selectedCuenta) return;
    await api.post(`/cuentas_madre/${selectedCuenta.id}/cancelar`, payload);
    reloadAll();
  };

  // --- PROVEEDOR CRUD ACTION HANDLERS ---
  const handleOpenAddProv = () => {
    setSelectedProv(null);
    setProvNombre('');
    setProvTelefono('');
    setProvSaldo(0);
    setProvError('');
    setIsProvModalOpen(true);
  };

  const handleOpenEditProv = (p: Proveedor) => {
    setSelectedProv(p);
    setProvNombre(p.nombre);
    setProvTelefono(p.telefono);
    setProvSaldo(p.saldo_a_favor);
    setProvError('');
    setIsProvModalOpen(true);
  };

  const handleSaveProv = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvError('');

    try {
      const payload = {
        nombre: provNombre,
        telefono: provTelefono,
        saldo_a_favor: Number(provSaldo) || 0
      };

      if (selectedProv) {
        await api.put(`/proveedores/${selectedProv.id}`, payload);
      } else {
        await api.post('/proveedores/', payload);
      }

      await refreshMetadata();
      setIsProvModalOpen(false);
    } catch (err: any) {
      setProvError(err.response?.data?.detail || 'Error al guardar el proveedor.');
    }
  };

  const handleDeleteProv = async (id: number) => {
    try {
      await api.delete(`/proveedores/${id}`);
      await refreshMetadata();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar el proveedor.');
    }
  };

  // --- PLATAFORMA CRUD ACTION HANDLERS ---
  const handleOpenAddPlat = () => {
    setSelectedPlat(null);
    setPlatNombre('');
    setPlatError('');
    setIsPlatModalOpen(true);
  };

  const handleOpenEditPlat = (p: Plataforma) => {
    setSelectedPlat(p);
    setPlatNombre(p.nombre);
    setPlatError('');
    setIsPlatModalOpen(true);
  };

  const handleSavePlat = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlatError('');

    try {
      const payload = { nombre: platNombre };

      if (selectedPlat) {
        await api.put(`/plataformas/${selectedPlat.id}`, payload);
      } else {
        await api.post('/plataformas/', payload);
      }

      await refreshMetadata();
      setIsPlatModalOpen(false);
    } catch (err: any) {
      setPlatError(err.response?.data?.detail || 'Error al guardar la plataforma.');
    }
  };

  const handleDeletePlat = async (id: number) => {
    try {
      await api.delete(`/plataformas/${id}`);
      await refreshMetadata();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar la plataforma.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Inventario de Cuentas</h1>
          <p className="text-slate-400 text-sm mt-1">Registra, administra y audita todas las cuentas madre compradas.</p>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('cuentas')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer border-none bg-transparent ${
              activeTab === 'cuentas' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" /> Cuentas Madre
          </button>
          <button
            onClick={() => setActiveTab('proveedores')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer border-none bg-transparent ${
              activeTab === 'proveedores' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" /> Proveedores
          </button>
          <button
            onClick={() => setActiveTab('plataformas')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer border-none bg-transparent ${
              activeTab === 'plataformas' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" /> Plataformas
          </button>
          <button
            onClick={() => setActiveTab('correos_propios')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer border-none bg-transparent ${
              activeTab === 'correos_propios' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" /> Correos Propios
          </button>
          <button
            onClick={() => setActiveTab('canceladas')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer border-none bg-transparent ${
              activeTab === 'canceladas' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <XCircle className="w-4 h-4" /> Canceladas
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          <span>{error}</span>
        </div>
      )}

      {/* Botón Flotante/Rápido para añadir Cuentas Madre */}
      {activeTab === 'cuentas' && (
        <div className="flex justify-end">
          <Button 
            onClick={() => { setSelectedCuenta(null); setIsCmModalOpen(true); }}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            <Plus className="w-4 h-4" /> Registrar Cuenta Madre
          </Button>
        </div>
      )}

      {/* RENDER DE VISTAS POR TABS */}
      {activeTab === 'cuentas' && (
        <CuentasTab
          cuentas={cuentas}
          proveedores={proveedores}
          plataformas={plataformas}
          credenciales={credenciales}
          expandedCuentaId={expandedCuentaId}
          onToggleExpand={handleToggleExpand}
          onOpenProvGarantia={(c) => {
            setSelectedCuenta(c);
            setIsProvGarantiaOpen(true);
          }}
          onOpenRenew={(c) => {
            setSelectedCuenta(c);
            setIsRenewOpen(true);
          }}
          onOpenEdit={(c) => {
            setSelectedCuenta(c);
            setIsCmModalOpen(true);
          }}
          onOpenCancel={(c) => {
            setSelectedCuenta(c);
            setIsCancelOpen(true);
          }}
        />
      )}

      {activeTab === 'proveedores' && (
        <ProveedoresTab
          proveedores={proveedores}
          onOpenAdd={handleOpenAddProv}
          onOpenEdit={handleOpenEditProv}
          onDelete={handleDeleteProv}
        />
      )}

      {activeTab === 'plataformas' && (
        <PlataformasTab
          plataformas={plataformas}
          onOpenAdd={handleOpenAddPlat}
          onOpenEdit={handleOpenEditPlat}
          onDelete={handleDeletePlat}
        />
      )}

      {activeTab === 'correos_propios' && (
        <CorreosPropiosTab
          correosPropios={correosPropios}
          onRefresh={reloadAll}
        />
      )}

      {activeTab === 'canceladas' && (
        <CanceladasTab />
      )}

      {/* REGISTRO CUENTA MADRE MODAL */}
      <CuentaMadreModal
        isOpen={isCmModalOpen}
        onClose={() => {
          setIsCmModalOpen(false);
          setSelectedCuenta(null);
        }}
        proveedores={proveedores}
        plataformas={plataformas}
        credenciales={credenciales}
        onSuccess={reloadAll}
        cuentaAEditar={selectedCuenta}
      />

      {/* GARANTIA PROVEEDOR MODAL */}
      <GarantiaProveedorModal
        isOpen={isProvGarantiaOpen}
        onClose={() => setIsProvGarantiaOpen(false)}
        selectedCuenta={selectedCuenta}
        onSubmit={handleApplyProvGarantia}
      />

      {/* RENOVACION CUENTA MADRE MODAL */}
      <RenovacionCuentaModal
        isOpen={isRenewOpen}
        onClose={() => setIsRenewOpen(false)}
        selectedCuenta={selectedCuenta}
        onSubmit={handleApplyRenew}
      />

      {/* CANCELACION CUENTA MADRE MODAL */}
      <CancelarCuentaModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        selectedCuenta={selectedCuenta}
        onSubmit={handleApplyCancel}
      />

      {/* PROVEEDOR ADD/EDIT MODAL */}
      <Modal 
        isOpen={isProvModalOpen} 
        onClose={() => setIsProvModalOpen(false)}
        title={selectedProv ? 'Editar Proveedor' : 'Agregar Nuevo Proveedor'}
      >
        <form onSubmit={handleSaveProv} className="space-y-4">
          {provError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
              {provError}
            </div>
          )}
          <Input
            label="Nombre Completo"
            value={provNombre}
            onChange={(e) => setProvNombre(e.target.value)}
            placeholder="Ej. Distribuidor Premium"
            required
          />
          <Input
            label="Número Celular"
            value={provTelefono}
            onChange={(e) => setProvTelefono(e.target.value)}
            placeholder="Ej. +573001234567"
            required
          />
          <Input
            label="Saldo a Favor (COP)"
            type="number"
            value={provSaldo}
            onChange={(e) => {
              const val = e.target.value;
              setProvSaldo(val === "" ? "" : parseFloat(val) || 0);
            }}
            min="0"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
            <Button type="button" variant="ghost" onClick={() => setIsProvModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold">
              {selectedProv ? 'Guardar Cambios' : 'Registrar Proveedor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* PLATAFORMA ADD/EDIT MODAL */}
      <Modal 
        isOpen={isPlatModalOpen} 
        onClose={() => setIsPlatModalOpen(false)}
        title={selectedPlat ? 'Editar Plataforma' : 'Agregar Nueva Plataforma'}
      >
        <form onSubmit={handleSavePlat} className="space-y-4">
          {platError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
              {platError}
            </div>
          )}
          <Input
            label="Nombre de Plataforma"
            value={platNombre}
            onChange={(e) => setPlatNombre(e.target.value)}
            placeholder="Ej. HBO Max"
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
            <Button type="button" variant="ghost" onClick={() => setIsPlatModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold">
              {selectedPlat ? 'Guardar Cambios' : 'Registrar Plataforma'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
