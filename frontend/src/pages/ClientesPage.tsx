import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';
import { Search, UserPlus, Phone, ShieldAlert, ShieldCheck, Edit } from 'lucide-react';

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  tipo: 'FINAL' | 'REVENDEDOR';
  estado: 'ACTIVO' | 'BANEADO';
  dias_gracia_max: number;
}

interface Proveedor {
  id: number;
  nombre: string;
  telefono: string;
  saldo_a_favor: number;
}

export default function ClientesPage() {
  const [activeTab, setActiveTab] = useState<'clientes' | 'proveedores'>('clientes');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data lists
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTipo, setFormTipo] = useState<'FINAL' | 'REVENDEDOR'>('FINAL');
  const [formDiasGracia, setFormDiasGracia] = useState(3);
  const [formSaldo, setFormSaldo] = useState(0);
  const [formError, setFormError] = useState('');

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clientes/');
      setClientes(res.data);
    } catch (err: any) {
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const res = await api.get('/proveedores/');
      setProveedores(res.data);
    } catch (err: any) {
      setError('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'clientes') {
      fetchClientes();
    } else {
      fetchProveedores();
    }
  }, [activeTab]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedActorId(null);
    setFormName('');
    setFormPhone('');
    setFormTipo('FINAL');
    setFormDiasGracia(3);
    setFormSaldo(0);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (actor: any) => {
    setModalMode('edit');
    setSelectedActorId(actor.id);
    setFormName(actor.nombre);
    setFormPhone(actor.telefono);
    setFormError('');
    if (activeTab === 'clientes') {
      setFormTipo(actor.tipo);
      setFormDiasGracia(actor.dias_gracia_max);
    } else {
      setFormSaldo(actor.saldo_a_favor);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      if (activeTab === 'clientes') {
        const payload = {
          nombre: formName,
          telefono: formPhone,
          tipo: formTipo,
          estado: 'ACTIVO',
          dias_gracia_max: formDiasGracia,
        };
        if (modalMode === 'add') {
          await api.post('/clientes/', payload);
        } else if (selectedActorId !== null) {
          await api.put(`/clientes/${selectedActorId}`, payload);
        }
        fetchClientes();
      } else {
        const payload = {
          nombre: formName,
          telefono: formPhone,
          saldo_a_favor: formSaldo,
        };
        if (modalMode === 'add') {
          await api.post('/proveedores/', payload);
        } else if (selectedActorId !== null) {
          await api.put(`/proveedores/${selectedActorId}`, payload);
        }
        fetchProveedores();
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al guardar datos. Verifica los campos.');
    }
  };

  const handleBanToggle = async (cliente: Cliente) => {
    try {
      if (cliente.estado === 'BANEADO') {
        // En este ERP simple, para desbanear podemos hacer un PUT con estado ACTIVO
        await api.put(`/clientes/${cliente.id}`, {
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          tipo: cliente.tipo,
          estado: 'ACTIVO',
          dias_gracia_max: cliente.dias_gracia_max,
        });
      } else {
        // Banear usando endpoint específico
        await api.put(`/clientes/${cliente.id}/ban`);
      }
      fetchClientes();
    } catch (err: any) {
      alert('Error al cambiar el estado del cliente');
    }
  };

  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.telefono.includes(searchQuery)
  );

  const filteredProveedores = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.telefono.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Actores del Sistema</h1>
          <p className="text-slate-400 text-sm mt-1">Gestiona tus clientes y proveedores en un solo lugar.</p>
        </div>
        <Button 
          variant="primary" 
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          {activeTab === 'clientes' ? 'Nuevo Cliente' : 'Nuevo Proveedor'}
        </Button>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => { setActiveTab('clientes'); setSearchQuery(''); }}
          className={`py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'clientes' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Clientes
        </button>
        <button
          onClick={() => { setActiveTab('proveedores'); setSearchQuery(''); }}
          className={`py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'proveedores' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Proveedores
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="max-w-md">
        <Input
          placeholder={`Buscar por nombre o teléfono...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-slate-500" />}
        />
      </div>

      {/* Listado */}
      {loading ? (
        <p className="text-slate-400 text-sm">Cargando datos...</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : activeTab === 'clientes' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClientes.map((cliente) => (
            <Card 
              key={cliente.id} 
              className={`flex flex-col justify-between ${cliente.estado === 'BANEADO' ? 'opacity-60 border-red-900/50 bg-red-950/5' : ''}`}
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-slate-100 text-lg leading-tight">{cliente.nombre}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    cliente.tipo === 'REVENDEDOR' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {cliente.tipo}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <a href={`https://wa.me/${cliente.telefono.replace('+', '')}`} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">
                      {cliente.telefono}
                    </a>
                  </p>
                  <p>Días de gracia: <span className="text-slate-200 font-medium">{cliente.dias_gracia_max}</span></p>
                  <p>
                    Estado: {' '}
                    <span className={`font-semibold ${cliente.estado === 'BANEADO' ? 'text-red-400' : 'text-green-400'}`}>
                      {cliente.estado}
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-5 border-t border-slate-800/80 pt-4">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  leftIcon={<Edit className="w-3.5 h-3.5" />}
                  className="flex-1"
                  onClick={() => handleOpenEdit(cliente)}
                >
                  Editar
                </Button>
                <Button 
                  variant={cliente.estado === 'BANEADO' ? 'ghost' : 'danger'} 
                  size="sm" 
                  leftIcon={cliente.estado === 'BANEADO' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  className="flex-1"
                  onClick={() => handleBanToggle(cliente)}
                >
                  {cliente.estado === 'BANEADO' ? 'Activar' : 'Banear'}
                </Button>
              </div>
            </Card>
          ))}
          {filteredClientes.length === 0 && (
            <p className="text-slate-500 text-sm col-span-full">No se encontraron clientes.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProveedores.map((proveedor) => (
            <Card key={proveedor.id} className="flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-100 text-lg leading-tight">{proveedor.nombre}</h3>
                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{proveedor.telefono}</span>
                  </p>
                  <p>
                    Saldo a favor:{' '}
                    <span className="text-green-400 font-semibold">
                      ${proveedor.saldo_a_favor.toLocaleString('es-CO')} COP
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-5 border-t border-slate-800/80 pt-4">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  leftIcon={<Edit className="w-3.5 h-3.5" />}
                  className="w-full"
                  onClick={() => handleOpenEdit(proveedor)}
                >
                  Editar Proveedor
                </Button>
              </div>
            </Card>
          ))}
          {filteredProveedores.length === 0 && (
            <p className="text-slate-500 text-sm col-span-full">No se encontraron proveedores.</p>
          )}
        </div>
      )}

      {/* Modal Agregar/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          activeTab === 'clientes'
            ? modalMode === 'add' ? 'Registrar Nuevo Cliente' : 'Editar Cliente'
            : modalMode === 'add' ? 'Registrar Nuevo Proveedor' : 'Editar Proveedor'
        }
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSubmit}>Guardar</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="text-xs text-red-400 font-semibold">{formError}</p>
          )}

          <Input
            label="Nombre"
            placeholder="Ej: Juan Pérez"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />

          <Input
            label="Teléfono Celular"
            placeholder="Ej: +573001234567"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            required
          />

          {activeTab === 'clientes' ? (
            <>
              <Select
                label="Tipo de Cliente"
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value as any)}
                options={[
                  { value: 'FINAL', label: 'Cliente Final' },
                  { value: 'REVENDEDOR', label: 'Revendedor (Mayorista)' },
                ]}
              />

              <Input
                label="Días de gracia máximos"
                type="number"
                value={formDiasGracia}
                onChange={(e) => setFormDiasGracia(parseInt(e.target.value) || 0)}
                min={0}
              />
            </>
          ) : (
            <Input
              label="Saldo a Favor (COP)"
              type="number"
              value={formSaldo}
              onChange={(e) => setFormSaldo(parseFloat(e.target.value) || 0.0)}
              min={0}
            />
          )}
        </form>
      </Modal>
    </div>
  );
}
