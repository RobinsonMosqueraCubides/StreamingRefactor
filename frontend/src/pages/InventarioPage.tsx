import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';
import { 
  ChevronDown, ChevronUp, Database, Calendar, DollarSign, 
  Plus, CheckCircle2, ShieldAlert, KeyRound, UserRound, Sparkles, RefreshCw, AlertTriangle,
  Users, Trash2, Edit2
} from 'lucide-react';

interface Perfil {
  id: number;
  nombre_perfil: string;
  pin: string | null;
  asignado: boolean;
  reportado?: boolean;
}

interface CuentaMadre {
  id: number;
  proveedor_id: number;
  credencial_id: number;
  plataforma_id: number;
  max_perfiles: number;
  precio_compra: number;
  fecha_compra: string;
  fecha_vencimiento: string;
  estado: 'ACTIVA' | 'CAIDA' | 'VENCIDA' | 'RENOVADA';
  perfiles: Perfil[];
}

interface Proveedor {
  id: number;
  nombre: string;
  telefono: string;
  saldo_a_favor: number;
}

interface Plataforma {
  id: number;
  nombre: string;
}

interface Credencial {
  id: number;
  email: string;
}

export default function InventarioPage() {
  const [cuentas, setCuentas] = useState<CuentaMadre[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [credenciales, setCredenciales] = useState<Credencial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // activeTab: 'cuentas' | 'proveedores' | 'plataformas'
  const [activeTab, setActiveTab] = useState<'cuentas' | 'proveedores' | 'plataformas'>('cuentas');

  // Expand state
  const [expandedCuentaId, setExpandedCuentaId] = useState<number | null>(null);

  // --- CUENTA MADRE MODAL STUFF ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formProveedorId, setFormProveedorId] = useState('');
  const [formPlataformaId, setFormPlataformaId] = useState('');
  const [formCredencialId, setFormCredencialId] = useState('');
  const [formMaxPerfiles, setFormMaxPerfiles] = useState(5);
  const [formPrecioCompra, setFormPrecioCompra] = useState(30000);
  const [formFechaCompra, setFormFechaCompra] = useState(new Date().toISOString().split('T')[0]);
  const [formFechaVencimiento, setFormFechaVencimiento] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  );
  const [formEntidadPago, setFormEntidadPago] = useState('NEQUI');

  // Option to create credencial on the fly
  const [createNewCred, setCreateNewCred] = useState(false);
  const [newCredEmail, setNewCredEmail] = useState('');
  const [newCredPassword, setNewCredPassword] = useState('');

  // Option to create provider on the fly
  const [createNewProv, setCreateNewProv] = useState(false);
  const [newProvNombre, setNewProvNombre] = useState('');
  const [newProvTelefono, setNewProvTelefono] = useState('');

  // Option to create platform on the fly
  const [createNewPlat, setCreateNewPlat] = useState(false);
  const [newPlatNombre, setNewPlatNombre] = useState('');

  // --- REGISTRO GARANTIA PROVEEDOR ---
  const [isProvGarantiaOpen, setIsProvGarantiaOpen] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState<CuentaMadre | null>(null);
  const [tipoGarantiaProv, setTipoGarantiaProv] = useState('CAMBIO_CLAVE');
  const [nuevaClaveProv, setNuevaClaveProv] = useState('');
  const [nuevoEmailProv, setNuevoEmailProv] = useState('');
  const [montoSaldoAFavorProv, setMontoSaldoAFavorProv] = useState(0);
  const [provGarantiaError, setProvGarantiaError] = useState('');
  const [provGarantiaSuccess, setProvGarantiaSuccess] = useState('');

  // --- FILTRO VENCIMIENTO INVENTARIO ---
  const [vencimientoFilter, setVencimientoFilter] = useState<'todas' | 'por_vencer'>('todas');

  // --- RENOVACION CUENTA MADRE ---
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [selectedCuentaToRenew, setSelectedCuentaToRenew] = useState<CuentaMadre | null>(null);
  const [newFechaVencimientoProv, setNewFechaVencimientoProv] = useState('');
  const [renewError, setRenewError] = useState('');
  const [renewSuccess, setRenewSuccess] = useState('');

  // --- PROVEEDORES CRUD MODALS ---
  const [isProvModalOpen, setIsProvModalOpen] = useState(false);
  const [selectedProv, setSelectedProv] = useState<Proveedor | null>(null);
  const [provNombre, setProvNombre] = useState('');
  const [provTelefono, setProvTelefono] = useState('');
  const [provSaldo, setProvSaldo] = useState(0);
  const [provError, setProvError] = useState('');

  // --- PLATAFORMAS CRUD MODALS ---
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
      setError('Error al cargar cuentas de inventario');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormMetadata = async () => {
    try {
      const [provRes, platRes, credRes] = await Promise.all([
        api.get('/proveedores/'),
        api.get('/plataformas/'),
        api.get('/credenciales/'),
      ]);
      setProveedores(provRes.data);
      setPlataformas(platRes.data);
      setCredenciales(credRes.data);

      if (provRes.data.length > 0) setFormProveedorId(String(provRes.data[0].id));
      if (platRes.data.length > 0) setFormPlataformaId(String(platRes.data[0].id));
      if (credRes.data.length > 0) setFormCredencialId(String(credRes.data[0].id));
    } catch (err: any) {
      console.error('Error al cargar metadatos de formulario', err);
    }
  };

  useEffect(() => {
    fetchCuentas();
    fetchFormMetadata();
  }, []);

  const handleToggleExpand = (id: number) => {
    setExpandedCuentaId(expandedCuentaId === id ? null : id);
  };

  const handleOpenAdd = () => {
    setFormError('');
    setCreateNewCred(false);
    setCreateNewProv(false);
    setCreateNewPlat(false);
    setNewCredEmail('');
    setNewCredPassword('');
    setNewProvNombre('');
    setNewProvTelefono('');
    setNewPlatNombre('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      let finalProveedorId = parseInt(formProveedorId);
      let finalPlataformaId = parseInt(formPlataformaId);
      let finalCredencialId = parseInt(formCredencialId);

      // 1. Crear proveedor en caliente si aplica
      if (createNewProv) {
        if (!newProvNombre || !newProvTelefono) {
          setFormError('Completa el nombre y teléfono del nuevo proveedor.');
          return;
        }
        const provRes = await api.post('/proveedores/', {
          nombre: newProvNombre,
          telefono: newProvTelefono,
          saldo_a_favor: 0.0
        });
        finalProveedorId = provRes.data.id;
      }

      // 2. Crear plataforma en caliente si aplica
      if (createNewPlat) {
        if (!newPlatNombre) {
          setFormError('Completa el nombre de la nueva plataforma.');
          return;
        }
        const platRes = await api.post('/plataformas/', {
          nombre: newPlatNombre
        });
        finalPlataformaId = platRes.data.id;
      }

      // 3. Crear credencial en caliente si aplica
      if (createNewCred) {
        if (!newCredEmail || !newCredPassword) {
          setFormError('Completa el correo y la contraseña de la nueva credencial.');
          return;
        }
        const credRes = await api.post('/credenciales/', {
          email: newCredEmail,
          password: newCredPassword,
        });
        finalCredencialId = credRes.data.id;
      }

      if (!finalProveedorId) {
        setFormError('Debes seleccionar o crear un proveedor.');
        return;
      }
      if (!finalPlataformaId) {
        setFormError('Debes seleccionar o crear una plataforma.');
        return;
      }
      if (!finalCredencialId) {
        setFormError('Debes seleccionar o crear una credencial.');
        return;
      }

      const payload = {
        proveedor_id: finalProveedorId,
        credencial_id: finalCredencialId,
        plataforma_id: finalPlataformaId,
        max_perfiles: formMaxPerfiles,
        precio_compra: formPrecioCompra,
        fecha_compra: formFechaCompra,
        fecha_vencimiento: formFechaVencimiento,
        estado: 'ACTIVA',
        entidad_pago: formEntidadPago,
      };

      await api.post('/cuentas_madre/', payload);
      await fetchFormMetadata();
      await fetchCuentas();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al guardar la Cuenta Madre.');
    }
  };

  // --- GARANTIA PROVEEDOR HANDLERS ---
  const handleOpenProvGarantia = (cuenta: CuentaMadre) => {
    setSelectedCuenta(cuenta);
    setTipoGarantiaProv('CAMBIO_CLAVE');
    setNuevaClaveProv('');
    setNuevoEmailProv('');
    setMontoSaldoAFavorProv(cuenta.precio_compra);
    setProvGarantiaError('');
    setProvGarantiaSuccess('');
    setIsProvGarantiaOpen(true);
  };

  const handleApplyProvGarantia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCuenta) return;

    setProvGarantiaError('');
    setProvGarantiaSuccess('');

    try {
      const payload: any = {
        cuenta_madre_id: selectedCuenta.id,
        tipo_garantia: tipoGarantiaProv,
      };

      if (tipoGarantiaProv === 'CAMBIO_CLAVE') {
        payload.nueva_clave = nuevaClaveProv;
      } else if (tipoGarantiaProv === 'CAMBIO_CUENTA') {
        payload.nueva_clave = nuevaClaveProv;
        if (nuevoEmailProv) payload.nuevo_email = nuevoEmailProv;
      } else if (tipoGarantiaProv === 'SALDO_A_FAVOR') {
        payload.monto_saldo_a_favor = montoSaldoAFavorProv;
      }

      await api.post('/garantias-proveedores/', payload);
      setProvGarantiaSuccess('¡Garantía aplicada al proveedor con éxito!');
      fetchCuentas();
      setTimeout(() => {
        setIsProvGarantiaOpen(false);
      }, 1000);
    } catch (err: any) {
      setProvGarantiaError(err.response?.data?.detail || 'Error al registrar la garantía del proveedor.');
    }
  };

  // --- RENOVACION HANDLERS ---
  const handleOpenRenewCuenta = (cuenta: CuentaMadre) => {
    setSelectedCuentaToRenew(cuenta);
    const originalDate = new Date(cuenta.fecha_vencimiento);
    originalDate.setDate(originalDate.getDate() + 30);
    const suggestedStr = originalDate.toISOString().split('T')[0];

    setNewFechaVencimientoProv(suggestedStr);
    setRenewError('');
    setRenewSuccess('');
    setIsRenewOpen(true);
  };

  const handleApplyRenewCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCuentaToRenew) return;

    setRenewError('');
    setRenewSuccess('');

    try {
      const payload = {
        proveedor_id: selectedCuentaToRenew.proveedor_id,
        credencial_id: selectedCuentaToRenew.credencial_id,
        plataforma_id: selectedCuentaToRenew.plataforma_id,
        max_perfiles: selectedCuentaToRenew.max_perfiles,
        precio_compra: selectedCuentaToRenew.precio_compra,
        fecha_compra: selectedCuentaToRenew.fecha_compra,
        fecha_vencimiento: newFechaVencimientoProv,
        estado: selectedCuentaToRenew.estado
      };

      await api.put(`/cuentas_madre/${selectedCuentaToRenew.id}`, payload);
      setRenewSuccess('¡Cuenta Madre renovada con éxito!');
      fetchCuentas();
      setTimeout(() => {
        setIsRenewOpen(false);
      }, 1000);
    } catch (err: any) {
      setRenewError(err.response?.data?.detail || 'Error al renovar la Cuenta Madre.');
    }
  };

  // --- PROVEEDOR CRUD ---
  const handleOpenAddProv = () => {
    setSelectedProv(null);
    setProvNombre('');
    setProvTelefono('');
    setProvSaldo(0);
    setProvError('');
    setIsProvModalOpen(true);
  };

  const handleOpenEditProv = (prov: Proveedor) => {
    setSelectedProv(prov);
    setProvNombre(prov.nombre);
    setProvTelefono(prov.telefono);
    setProvSaldo(prov.saldo_a_favor);
    setProvError('');
    setIsProvModalOpen(true);
  };

  const handleSaveProv = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvError('');
    try {
      if (selectedProv) {
        // Edit
        await api.put(`/proveedores/${selectedProv.id}`, {
          nombre: provNombre,
          telefono: provTelefono,
          saldo_a_favor: provSaldo
        });
      } else {
        // Add
        await api.post('/proveedores/', {
          nombre: provNombre,
          telefono: provTelefono,
          saldo_a_favor: provSaldo
        });
      }
      fetchFormMetadata();
      setIsProvModalOpen(false);
    } catch (err: any) {
      setProvError('Error al guardar el proveedor.');
    }
  };

  const handleDeleteProv = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
    try {
      await api.delete(`/proveedores/${id}`);
      fetchFormMetadata();
    } catch (err: any) {
      alert('No se pudo eliminar el proveedor. Verifica que no tenga cuentas asociadas.');
    }
  };

  // --- PLATAFORMA CRUD ---
  const handleOpenAddPlat = () => {
    setSelectedPlat(null);
    setPlatNombre('');
    setPlatError('');
    setIsPlatModalOpen(true);
  };

  const handleOpenEditPlat = (plat: Plataforma) => {
    setSelectedPlat(plat);
    setPlatNombre(plat.nombre);
    setPlatError('');
    setIsPlatModalOpen(true);
  };

  const handleSavePlat = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlatError('');
    try {
      if (selectedPlat) {
        // Edit
        await api.put(`/plataformas/${selectedPlat.id}`, {
          nombre: platNombre
        });
      } else {
        // Add
        await api.post('/plataformas/', {
          nombre: platNombre
        });
      }
      fetchFormMetadata();
      setIsPlatModalOpen(false);
    } catch (err: any) {
      setPlatError('Error al guardar la plataforma.');
    }
  };

  const handleDeletePlat = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta plataforma?')) return;
    try {
      await api.delete(`/plataformas/${id}`);
      fetchFormMetadata();
    } catch (err: any) {
      alert('No se pudo eliminar la plataforma. Verifica que no tenga cuentas asociadas.');
    }
  };

  // Calcular diferencia de días
  const getDaysDiff = (targetDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filtrar cuentas por vencimiento
  const filteredCuentas = cuentas.filter(c => {
    if (vencimientoFilter === 'por_vencer') {
      const diff = getDaysDiff(c.fecha_vencimiento);
      return diff <= 2 && c.estado === 'ACTIVA';
    }
    return true;
  });

  // Helpers to resolve names
  const getProveedorName = (id: number) => proveedores.find(p => p.id === id)?.nombre || `Proveedor #${id}`;
  const getPlataformaName = (id: number) => plataformas.find(p => p.id === id)?.nombre || `Plataforma #${id}`;
  const getCredencialEmail = (id: number) => credenciales.find(c => c.id === id)?.email || `Credencial #${id}`;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Inventario de Cuentas</h1>
          <p className="text-slate-400 text-sm mt-1">Supervisa tus Cuentas Madre y la disponibilidad de perfiles fragmentados.</p>
        </div>
        
        {/* Navigation tabs: Cuentas, Proveedores, Plataformas */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('cuentas')}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'cuentas' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" /> Cuentas Madre
          </button>
          <button
            onClick={() => setActiveTab('proveedores')}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'proveedores' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" /> Proveedores
          </button>
          <button
            onClick={() => setActiveTab('plataformas')}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'plataformas' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Plataformas
          </button>
        </div>
      </div>

      {activeTab === 'cuentas' && (
        /* --- LISTA DE CUENTAS MADRE --- */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4 bg-slate-900/20 border border-slate-850 p-4 rounded-2xl">
            <div className="w-full sm:w-80">
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Filtro de Inventario</label>
              <select
                value={vencimientoFilter}
                onChange={(e: any) => setVencimientoFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="todas">Todas las Cuentas Madre</option>
                <option value="por_vencer">Por Vencer (2 días o menos)</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="primary" 
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleOpenAdd}
              >
                Nueva Cuenta Madre
              </Button>
              <Button variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={fetchCuentas}>
                Actualizar
              </Button>
            </div>
          </div>

          {loading && cuentas.length === 0 ? (
            <p className="text-slate-400 text-sm">Cargando inventario...</p>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : (
            <div className="space-y-4">
              {filteredCuentas.map((cuenta) => {
                const isExpanded = expandedCuentaId === cuenta.id;
                const perfilesLibres = cuenta.perfiles.filter(p => !p.asignado && !p.reportado).length;
                const diffDays = getDaysDiff(cuenta.fecha_vencimiento);
                const isVencerAlert = diffDays <= 2 && cuenta.estado === 'ACTIVA';

                return (
                  <Card key={cuenta.id} className="p-0 overflow-hidden bg-slate-900/40">
                    {/* Cabecera del acordeón */}
                    <div 
                      onClick={() => handleToggleExpand(cuenta.id)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/20 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl mt-1 sm:mt-0 shrink-0">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-100 text-lg leading-tight">
                              {getPlataformaName(cuenta.plataforma_id)}
                            </h3>
                            {isVencerAlert && (
                              <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-extrabold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Vence en {diffDays} días
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-550 mt-1">
                            Credencial: <span className="text-slate-400 font-mono">{getCredencialEmail(cuenta.credencial_id)}</span>
                          </p>
                          <p className="text-xs text-slate-550">
                            Proveedor: <span className="text-slate-450">{getProveedorName(cuenta.proveedor_id)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300">
                          {perfilesLibres} / {cuenta.max_perfiles} Libres
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          cuenta.estado === 'ACTIVA' 
                            ? 'bg-green-500/15 text-green-400' 
                            : cuenta.estado === 'CAIDA'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {cuenta.estado}
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />}
                      </div>
                    </div>

                    {/* Contenido expandido (Perfiles y Garantías) */}
                    {isExpanded && (
                      <div className="p-5 bg-slate-950/40 border-t border-slate-800/80 animate-in slide-in-from-top-2 duration-200 space-y-4">
                        <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-slate-855 pb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400 flex-grow">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-500" />
                              <span>Fecha Compra: <strong className="text-slate-200">{cuenta.fecha_compra}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-500" />
                              <span>Vencimiento: <strong className="text-slate-200">{cuenta.fecha_vencimiento}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-slate-500" />
                              <span>Costo Compra: <strong className="text-slate-200">${cuenta.precio_compra.toLocaleString('es-CO')} COP</strong></span>
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRenewCuenta(cuenta);
                              }}
                            >
                              Renovar Cuenta
                            </Button>

                            {cuenta.estado === 'ACTIVA' && (
                              <Button 
                                variant="danger" 
                                size="sm" 
                                leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenProvGarantia(cuenta);
                                }}
                              >
                                Garantía
                              </Button>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Distribución de Perfiles</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {cuenta.perfiles.map((perfil) => (
                              <div 
                                key={perfil.id}
                                className="bg-slate-900/60 border border-slate-850 rounded-xl p-3.5 flex justify-between items-center"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-200">{perfil.nombre_perfil}</p>
                                  <p className="text-xs text-slate-550 mt-1">
                                    PIN: <span className="font-mono text-slate-350">{perfil.pin || 'Sin PIN'}</span>
                                  </p>
                                </div>
                                
                                <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  perfil.reportado
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : perfil.asignado 
                                    ? 'bg-blue-500/10 text-blue-400' 
                                    : 'bg-green-500/10 text-green-400'
                                }`}>
                                  {perfil.reportado ? (
                                    <>Daño/Garantía</>
                                  ) : perfil.asignado ? (
                                    <>
                                      <ShieldAlert className="w-3 h-3" /> Asignado
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" /> Libre
                                    </>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
              {filteredCuentas.length === 0 && (
                <p className="text-slate-505 text-sm text-center py-10">No hay Cuentas Madre para los filtros seleccionados.</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'proveedores' && (
        /* --- PROVEEDORES CRUD --- */
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center bg-slate-900/20 border border-slate-850 p-4 rounded-2xl">
            <h3 className="font-bold text-slate-200 text-sm">Listado de Proveedores</h3>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAddProv}>
              Agregar Proveedor
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proveedores.map((prov) => (
              <Card key={prov.id} className="p-4 bg-slate-900/30 border-slate-850/60 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-slate-200">{prov.nombre}</h4>
                  <p className="text-xs text-slate-500 mt-1">Teléfono: <span className="text-slate-400 font-mono">{prov.telefono}</span></p>
                  <p className="text-xs text-emerald-400 font-semibold mt-2">Saldo a Favor: ${prov.saldo_a_favor.toLocaleString('es-CO')} COP</p>
                </div>
                
                <div className="flex justify-end gap-2 border-t border-slate-850/60 pt-3">
                  <button
                    onClick={() => handleOpenEditProv(prov)}
                    className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProv(prov.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'plataformas' && (
        /* --- PLATAFORMAS CRUD --- */
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center bg-slate-900/20 border border-slate-850 p-4 rounded-2xl">
            <h3 className="font-bold text-slate-200 text-sm">Listado de Plataformas</h3>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAddPlat}>
              Agregar Plataforma
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plataformas.map((plat) => (
              <Card key={plat.id} className="p-4 bg-slate-900/30 border-slate-850/60 flex flex-col justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-slate-200">{plat.nombre}</h4>
                </div>
                
                <div className="flex justify-end gap-2 border-t border-slate-850/60 pt-3">
                  <button
                    onClick={() => handleOpenEditPlat(plat)}
                    className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePlat(plat.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal Agregar/Editar Cuenta Madre */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Cuenta Madre"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmit}>Registrar e Inicializar</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="text-xs text-red-400 font-semibold">{formError}</p>
          )}

          {/* Selector / Registro Proveedor */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 block mb-1">Proveedor</label>
              <div className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  id="checkNewProv"
                  checked={createNewProv}
                  onChange={(e) => setCreateNewProv(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="checkNewProv" className="text-[10px] text-slate-350 cursor-pointer font-bold uppercase">
                  Nuevo Proveedor
                </label>
              </div>
            </div>

            {createNewProv ? (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850/60">
                <Input
                  label="Nombre Proveedor"
                  placeholder="Ej: Netflix Prime"
                  value={newProvNombre}
                  onChange={(e) => setNewProvNombre(e.target.value)}
                  required
                />
                <Input
                  label="Teléfono"
                  placeholder="Ej: +57300..."
                  value={newProvTelefono}
                  onChange={(e) => setNewProvTelefono(e.target.value)}
                  required
                />
              </div>
            ) : (
              <Select
                label=""
                value={formProveedorId}
                onChange={(e) => setFormProveedorId(e.target.value)}
                options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
                required={!createNewProv}
              />
            )}
          </div>

          {/* Selector / Registro Plataforma */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 block mb-1">Plataforma de Streaming</label>
              <div className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  id="checkNewPlat"
                  checked={createNewPlat}
                  onChange={(e) => setCreateNewPlat(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                />
                <label htmlFor="checkNewPlat" className="text-[10px] text-slate-350 cursor-pointer font-bold uppercase">
                  Nueva Plataforma
                </label>
              </div>
            </div>

            {createNewPlat ? (
              <div className="pt-2 border-t border-slate-850/60">
                <Input
                  label="Nombre Plataforma"
                  placeholder="Ej: Apple TV"
                  value={newPlatNombre}
                  onChange={(e) => setNewPlatNombre(e.target.value)}
                  required
                />
              </div>
            ) : (
              <Select
                label=""
                value={formPlataformaId}
                onChange={(e) => setFormPlataformaId(e.target.value)}
                options={plataformas.map(p => ({ value: p.id, label: p.nombre }))}
                required={!createNewPlat}
              />
            )}
          </div>

          {/* Selector o Creación de Credencial */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="checkNewCred"
                checked={createNewCred}
                onChange={(e) => setCreateNewCred(e.target.checked)}
                className="rounded text-cyan-500 focus:ring-cyan-500 cursor-pointer"
              />
              <label htmlFor="checkNewCred" className="text-xs font-semibold text-slate-350 cursor-pointer">
                Registrar una Nueva Credencial para esta cuenta
              </label>
            </div>

            {createNewCred ? (
              <div className="space-y-3 pt-2 border-t border-slate-850">
                <Input
                  label="Email de la cuenta"
                  placeholder="Ej: cuenta@netflix.com"
                  value={newCredEmail}
                  onChange={(e) => setNewCredEmail(e.target.value)}
                />
                <Input
                  label="Contraseña"
                  type="password"
                  placeholder="Escribe la clave de acceso"
                  value={newCredPassword}
                  onChange={(e) => setNewCredPassword(e.target.value)}
                />
              </div>
            ) : (
              <Select
                label="Seleccionar Credencial Existente"
                value={formCredencialId}
                onChange={(e) => setFormCredencialId(e.target.value)}
                options={credenciales.map(c => ({ value: c.id, label: c.email }))}
                required={!createNewCred}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número de Perfiles"
              type="number"
              value={formMaxPerfiles}
              onChange={(e) => setFormMaxPerfiles(parseInt(e.target.value) || 1)}
              min={1}
              required
            />
            <Input
              label="Costo Compra (COP)"
              type="number"
              value={formPrecioCompra}
              onChange={(e) => setFormPrecioCompra(parseFloat(e.target.value) || 0)}
              min={0}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha Compra"
              type="date"
              value={formFechaCompra}
              onChange={(e) => setFormFechaCompra(e.target.value)}
              required
            />
            <Input
              label="Fecha Vencimiento"
              type="date"
              value={formFechaVencimiento}
              onChange={(e) => setFormFechaVencimiento(e.target.value)}
              required
            />
          </div>

          <Select
            label="Pasarela de Pago (Egreso Contable)"
            value={formEntidadPago}
            onChange={(e) => setFormEntidadPago(e.target.value)}
            options={[
              { value: 'NEQUI', label: 'Nequi' },
              { value: 'BANCOLOMBIA', label: 'Bancolombia' },
              { value: 'DAVIPLATA', label: 'Daviplata' },
              { value: 'NU_BANK', label: 'Nu Bank' },
              { value: 'EFECTIVO', label: 'Efectivo' },
            ]}
            required
          />
        </form>
      </Modal>

      {/* Modal Reclamar Garantía al Proveedor */}
      <Modal
        isOpen={isProvGarantiaOpen}
        onClose={() => setIsProvGarantiaOpen(false)}
        title="Reclamar Garantía al Proveedor"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsProvGarantiaOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleApplyProvGarantia}>Aplicar Garantía</Button>
          </div>
        }
      >
        {selectedCuenta && (
          <form onSubmit={handleApplyProvGarantia} className="space-y-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-855 text-xs">
              <p className="text-slate-400 uppercase font-bold tracking-wider">Cuenta Reclamada:</p>
              <h3 className="text-sm font-bold text-slate-200 mt-1">{getPlataformaName(selectedCuenta.plataforma_id)}</h3>
              <p className="text-slate-500 mt-0.5">Usuario: {getCredencialEmail(selectedCuenta.credencial_id)}</p>
            </div>

            {provGarantiaError && <p className="text-xs text-red-400 font-semibold">{provGarantiaError}</p>}
            {provGarantiaSuccess && <p className="text-xs text-green-400 font-semibold">{provGarantiaSuccess}</p>}

            <Select
              label="Solución otorgada por el Proveedor"
              value={tipoGarantiaProv}
              onChange={(e) => setTipoGarantiaProv(e.target.value)}
              options={[
                { value: 'CAMBIO_CLAVE', label: 'Cambio de Clave (Misma cuenta)' },
                { value: 'CAMBIO_CUENTA', label: 'Cambio de Cuenta (Nuevo Email/Clave)' },
                { value: 'SALDO_A_FAVOR', label: 'Saldo a Favor (Crédito monetario)' }
              ]}
              required
            />

            {/* Inputs Condicionales */}
            {tipoGarantiaProv === 'CAMBIO_CLAVE' && (
              <div className="animate-in fade-in duration-200">
                <Input
                  label="Nueva Contraseña"
                  type="password"
                  placeholder="Digita la nueva clave dada por el proveedor"
                  value={nuevaClaveProv}
                  onChange={(e) => setNuevaClaveProv(e.target.value)}
                  leftIcon={<KeyRound className="w-4 h-4 text-slate-550" />}
                  required
                />
              </div>
            )}

            {tipoGarantiaProv === 'CAMBIO_CUENTA' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <Input
                  label="Nuevo Email / Usuario (Opcional)"
                  placeholder="Digita el nuevo correo (dejar vacío si es el mismo)"
                  value={nuevoEmailProv}
                  onChange={(e) => setNuevoEmailProv(e.target.value)}
                  leftIcon={<UserRound className="w-4 h-4 text-slate-500" />}
                />
                <Input
                  label="Nueva Contraseña"
                  type="password"
                  placeholder="Digita la contraseña de la nueva cuenta"
                  value={nuevaClaveProv}
                  onChange={(e) => setNuevaClaveProv(e.target.value)}
                  leftIcon={<KeyRound className="w-4 h-4 text-slate-500" />}
                  required
                />
              </div>
            )}

            {tipoGarantiaProv === 'SALDO_A_FAVOR' && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl space-y-3 animate-in fade-in duration-200">
                <div className="flex gap-2 text-emerald-400 text-xs">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <p>Al aplicar saldo a favor, la Cuenta Madre actual será inhabilitada y el balance se acumulará al proveedor.</p>
                </div>
                <Input
                  label="Monto del Saldo a Favor (COP)"
                  type="number"
                  value={montoSaldoAFavorProv}
                  onChange={(e) => setMontoSaldoAFavorProv(parseFloat(e.target.value) || 0)}
                  min={0.01}
                  required
                />
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Modal Renovación Cuenta Madre */}
      <Modal
        isOpen={isRenewOpen}
        onClose={() => setIsRenewOpen(false)}
        title="Renovar Cuenta Madre"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsRenewOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleApplyRenewCuenta}>Guardar Renovación</Button>
          </div>
        }
      >
        {selectedCuentaToRenew && (
          <form onSubmit={handleApplyRenewCuenta} className="space-y-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-xs">
              <p className="text-slate-400 uppercase font-bold tracking-wider">Cuenta Madre:</p>
              <h3 className="text-sm font-bold text-slate-200 mt-1">{getPlataformaName(selectedCuentaToRenew.plataforma_id)}</h3>
              <p className="text-slate-500 mt-1">Usuario: {getCredencialEmail(selectedCuentaToRenew.credencial_id)}</p>
              <p className="text-slate-550 mt-1">Vencimiento actual: <strong>{selectedCuentaToRenew.fecha_vencimiento}</strong></p>
            </div>

            {renewError && <p className="text-xs text-red-400 font-semibold">{renewError}</p>}
            {renewSuccess && <p className="text-xs text-green-400 font-semibold">{renewSuccess}</p>}

            <Input
              label="Nueva Fecha de Vencimiento"
              type="date"
              value={newFechaVencimientoProv}
              onChange={(e) => setNewFechaVencimientoProv(e.target.value)}
              required
            />
          </form>
        )}
      </Modal>

      {/* Modal Agregar/Editar Proveedor */}
      <Modal
        isOpen={isProvModalOpen}
        onClose={() => setIsProvModalOpen(false)}
        title={selectedProv ? "Editar Proveedor" : "Agregar Proveedor"}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsProvModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveProv}>Guardar Proveedor</Button>
          </div>
        }
      >
        <form onSubmit={handleSaveProv} className="space-y-4">
          {provError && <p className="text-xs text-red-400 font-semibold">{provError}</p>}
          <Input
            label="Nombre"
            placeholder="Ej: Distribuidora Stream"
            value={provNombre}
            onChange={(e) => setProvNombre(e.target.value)}
            required
          />
          <Input
            label="Teléfono"
            placeholder="Ej: +57300..."
            value={provTelefono}
            onChange={(e) => setProvTelefono(e.target.value)}
            required
          />
          <Input
            label="Saldo a Favor (COP)"
            type="number"
            value={provSaldo}
            onChange={(e) => setProvSaldo(parseFloat(e.target.value) || 0)}
            min={0}
            required
          />
        </form>
      </Modal>

      {/* Modal Agregar/Editar Plataforma */}
      <Modal
        isOpen={isPlatModalOpen}
        onClose={() => setIsPlatModalOpen(false)}
        title={selectedPlat ? "Editar Plataforma" : "Agregar Plataforma"}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsPlatModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSavePlat}>Guardar Plataforma</Button>
          </div>
        }
      >
        <form onSubmit={handleSavePlat} className="space-y-4">
          {platError && <p className="text-xs text-red-400 font-semibold">{platError}</p>}
          <Input
            label="Nombre de la Plataforma"
            placeholder="Ej: Disney Premium"
            value={platNombre}
            onChange={(e) => setPlatNombre(e.target.value)}
            required
          />
        </form>
      </Modal>
    </div>
  );
}
