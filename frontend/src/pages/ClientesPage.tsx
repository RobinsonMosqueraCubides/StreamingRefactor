import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';
import { Search, UserPlus, Phone, ShieldAlert, ShieldCheck, Edit } from 'lucide-react';
import type { Cliente, Proveedor } from '../types';
import { useMetadata } from '../context/MetadataContext';

const actorFormSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  telefono: z.string().regex(/^\+?[0-9]{7,15}$/, 'Número de teléfono inválido (ej: +573001234567 o 3001234567)'),
  tipo: z.enum(['FINAL', 'REVENDEDOR']),
  dias_gracia_max: z.number().int().min(0, 'No puede ser negativo'),
  saldo_a_favor: z.number().min(0, 'No puede ser negativo'),
});

type ActorFormValues = z.infer<typeof actorFormSchema>;

export default function ClientesPage() {
  const { refreshMetadata } = useMetadata();
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
  const [formError, setFormError] = useState('');

  const { register, handleSubmit: handleFormSubmit, reset, formState: { errors } } = useForm<ActorFormValues>({
    resolver: zodResolver(actorFormSchema),
    defaultValues: {
      nombre: '',
      telefono: '',
      tipo: 'FINAL',
      dias_gracia_max: 3,
      saldo_a_favor: 0,
    }
  });

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clientes/');
      setClientes(res.data);
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      setError('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
    fetchProveedores();
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedActorId(null);
    reset({
      nombre: '',
      telefono: '',
      tipo: 'FINAL',
      dias_gracia_max: 3,
      saldo_a_favor: 0,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (actor: Cliente | Proveedor) => {
    setModalMode('edit');
    setSelectedActorId(actor.id);
    reset({
      nombre: actor.nombre,
      telefono: actor.telefono,
      tipo: 'tipo' in actor ? actor.tipo : 'FINAL',
      dias_gracia_max: 'dias_gracia_max' in actor ? actor.dias_gracia_max : 3,
      saldo_a_favor: 'saldo_a_favor' in actor ? actor.saldo_a_favor : 0,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ActorFormValues) => {
    setFormError('');
    try {
      if (activeTab === 'clientes') {
        const payload = {
          nombre: data.nombre,
          telefono: data.telefono,
          tipo: data.tipo,
          estado: 'ACTIVO',
          dias_gracia_max: data.dias_gracia_max,
        };
        if (modalMode === 'add') {
          await api.post('/clientes/', payload);
        } else if (selectedActorId !== null) {
          await api.put(`/clientes/${selectedActorId}`, payload);
        }
        await fetchClientes();
        await refreshMetadata();
      } else {
        const payload = {
          nombre: data.nombre,
          telefono: data.telefono,
          saldo_a_favor: data.saldo_a_favor,
        };
        if (modalMode === 'add') {
          await api.post('/proveedores/', payload);
        } else if (selectedActorId !== null) {
          await api.put(`/proveedores/${selectedActorId}`, payload);
        }
        await fetchProveedores();
        await refreshMetadata();
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al guardar datos. Verifica los campos.');
    }
  };

  const handleBanToggle = async (cliente: Cliente) => {
    try {
      if (cliente.estado === 'BANEADO') {
        await api.put(`/clientes/${cliente.id}`, {
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          tipo: cliente.tipo,
          estado: 'ACTIVO',
          dias_gracia_max: cliente.dias_gracia_max,
        });
      } else {
        await api.put(`/clientes/${cliente.id}/ban`);
      }
      await fetchClientes();
      await refreshMetadata();
    } catch (err: unknown) {
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
      <div className="flex border-b border-slate-800 gap-6" role="tablist" aria-label="Actor Tabs">
        <button
          role="tab"
          aria-selected={activeTab === 'clientes'}
          aria-controls="panel-clientes"
          id="tab-clientes"
          onClick={() => { setActiveTab('clientes'); setSearchQuery(''); }}
          className={`py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'clientes' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Clientes
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'proveedores'}
          aria-controls="panel-proveedores"
          id="tab-proveedores"
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
          placeholder="Buscar por nombre o teléfono..."
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
        <div 
          id="panel-clientes" 
          role="tabpanel" 
          aria-labelledby="tab-clientes"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredClientes.map((cliente) => (
            <Card 
              key={cliente.id} 
              className={`flex flex-col justify-between bg-gradient-to-br from-purple-500/40 to-white/10 dark:from-purple-950/20 dark:to-slate-900 border-purple-200/50 dark:border-slate-800 ${cliente.estado === 'BANEADO' ? 'opacity-60 !border-red-900/50 !from-red-950/10 !to-red-950/5' : ''}`}
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-black dark:text-slate-100 text-lg leading-tight">{cliente.nombre}</h3>
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
                    Estado:{' '}
                    <span className={`font-semibold ${cliente.estado === 'BANEADO' ? 'text-red-500' : 'text-green-700 dark:text-green-400'}`}>
                      {cliente.estado}
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-5 border-t border-slate-800/80 pt-4">
                <Button 
                  size="sm" 
                  leftIcon={<Edit className="w-3.5 h-3.5" />}
                  className="flex-1 !bg-[#8b5fbf] !text-white hover:!bg-[#7a50a9] border-none transition-all duration-200 shadow-sm"
                  onClick={() => handleOpenEdit(cliente)}
                >
                  Editar
                </Button>
                <Button 
                  size="sm" 
                  leftIcon={cliente.estado === 'BANEADO' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  className={`flex-1 !text-white border-none transition-all duration-200 shadow-sm ${
                    cliente.estado === 'BANEADO' 
                      ? '!bg-green-700 hover:!bg-green-800' 
                      : '!bg-red-600 hover:!bg-red-700'
                  }`}
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
        <div 
          id="panel-proveedores" 
          role="tabpanel" 
          aria-labelledby="tab-proveedores"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredProveedores.map((proveedor) => (
            <Card key={proveedor.id} className="flex flex-col justify-between bg-rose-50 dark:bg-slate-900 border-rose-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-black dark:text-slate-100 text-lg leading-tight">{proveedor.nombre}</h3>
                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{proveedor.telefono}</span>
                  </p>
                  <p>
                    Saldo a favor:{' '}
                    <span className="text-green-700 dark:text-green-400 font-semibold">
                      ${proveedor.saldo_a_favor.toLocaleString('es-CO')} COP
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-5 border-t border-slate-800/80 pt-4">
                <Button 
                  size="sm" 
                  leftIcon={<Edit className="w-3.5 h-3.5" />}
                  className="w-full !bg-[#db8a9a] !text-black hover:!bg-[#c97888] border-none transition-all duration-200 shadow-sm"
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
            <Button variant="primary" onClick={() => handleFormSubmit(onSubmit)()}>Guardar</Button>
          </div>
        }
      >
        <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <p className="text-xs text-red-400 font-semibold">{formError}</p>
          )}

          <Input
            label="Nombre"
            placeholder="Ej: Juan Pérez"
            error={errors.nombre?.message}
            {...register('nombre')}
          />

          <Input
            label="Teléfono Celular"
            placeholder="Ej: +573001234567"
            error={errors.telefono?.message}
            {...register('telefono')}
          />

          {activeTab === 'clientes' ? (
            <>
              <Select
                label="Tipo de Cliente"
                error={errors.tipo?.message}
                {...register('tipo')}
                options={[
                  { value: 'FINAL', label: 'Cliente Final' },
                  { value: 'REVENDEDOR', label: 'Revendedor (Mayorista)' },
                ]}
              />

              <Input
                label="Días de gracia máximos"
                type="number"
                error={errors.dias_gracia_max?.message}
                {...register('dias_gracia_max', { valueAsNumber: true })}
                min={0}
              />
            </>
          ) : (
            <Input
              label="Saldo a Favor (COP)"
              type="number"
              error={errors.saldo_a_favor?.message}
              {...register('saldo_a_favor', { valueAsNumber: true })}
              min={0}
            />
          )}
        </form>
      </Modal>
    </div>
  );
}
