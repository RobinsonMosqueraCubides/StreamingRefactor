import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';
import { 
  ChevronDown, ChevronUp, Database, Calendar, DollarSign, 
  Plus, CheckCircle2, ShieldAlert 
} from 'lucide-react';

interface Perfil {
  id: number;
  nombre_perfil: string;
  pin: string | null;
  asignado: boolean;
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

  // Expand state
  const [expandedCuentaId, setExpandedCuentaId] = useState<number | null>(null);

  // Creation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
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
    setNewCredEmail('');
    setNewCredPassword('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formProveedorId || !formPlataformaId) {
      setFormError('Debes seleccionar un proveedor y una plataforma.');
      return;
    }

    try {
      let finalCredencialId = parseInt(formCredencialId);

      // Si el usuario quiere crear una credencial sobre la marcha
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
        // Refrescar metadatos
        fetchFormMetadata();
      }

      if (!finalCredencialId) {
        setFormError('Debes seleccionar o crear una credencial.');
        return;
      }

      const payload = {
        proveedor_id: parseInt(formProveedorId),
        credencial_id: finalCredencialId,
        plataforma_id: parseInt(formPlataformaId),
        max_perfiles: formMaxPerfiles,
        precio_compra: formPrecioCompra,
        fecha_compra: formFechaCompra,
        fecha_vencimiento: formFechaVencimiento,
        estado: 'ACTIVA',
        entidad_pago: formEntidadPago,
      };

      await api.post('/cuentas_madre/', payload);
      fetchCuentas();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al guardar la Cuenta Madre.');
    }
  };

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
        <Button 
          variant="primary" 
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          Nueva Cuenta Madre
        </Button>
      </div>

      {/* Lista de Cuentas */}
      {loading && cuentas.length === 0 ? (
        <p className="text-slate-400 text-sm">Cargando inventario...</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <div className="space-y-4">
          {cuentas.map((cuenta) => {
            const isExpanded = expandedCuentaId === cuenta.id;
            const perfilesLibres = cuenta.perfiles.filter(p => !p.asignado).length;

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
                      <h3 className="font-bold text-slate-100 text-lg leading-tight">
                        {getPlataformaName(cuenta.plataforma_id)}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
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

                {/* Contenido expandido (Perfiles) */}
                {isExpanded && (
                  <div className="p-5 bg-slate-950/40 border-t border-slate-800/80 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs text-slate-400">
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

                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Distribución de Perfiles</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cuenta.perfiles.map((perfil) => (
                        <div 
                          key={perfil.id}
                          className="bg-slate-900/60 border border-slate-850 rounded-xl p-3.5 flex justify-between items-center"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{perfil.nombre_perfil}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              PIN: <span className="font-mono text-slate-350">{perfil.pin || 'Sin PIN'}</span>
                            </p>
                          </div>
                          
                          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            perfil.asignado 
                              ? 'bg-blue-500/10 text-blue-400' 
                              : 'bg-green-500/10 text-green-400'
                          }`}>
                            {perfil.asignado ? (
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
                )}
              </Card>
            );
          })}
          {cuentas.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-10">No hay Cuentas Madre registradas en el inventario.</p>
          )}
        </div>
      )}

      {/* Modal Agregar Cuenta Madre */}
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

          <Select
            label="Proveedor"
            value={formProveedorId}
            onChange={(e) => setFormProveedorId(e.target.value)}
            options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
            required
          />

          <Select
            label="Plataforma de Streaming"
            value={formPlataformaId}
            onChange={(e) => setFormPlataformaId(e.target.value)}
            options={plataformas.map(p => ({ value: p.id, label: p.nombre }))}
            required
          />

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
    </div>
  );
}
