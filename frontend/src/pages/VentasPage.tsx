import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';
import { 
  ShoppingCart, Plus, Trash2, 
  CheckCircle, ShieldCheck, DollarSign, Smartphone, 
  Search, Info, Sparkles, ToggleLeft, ToggleRight
} from 'lucide-react';

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
}

interface Plataforma {
  id: number;
  nombre: string;
}

interface Plantilla {
  id: number;
  nombre: string;
  mensaje: string;
}

interface CuentaMadre {
  id: number;
  credencial: {
    email: string;
    password: string;
  };
}

interface VentaItem {
  plataforma_id: number;
  precio_original: number;
  precio_aplicado: number;
  tipo_unidad: 'PANTALLA' | 'CUENTA';
  is_edited: boolean;
}

export default function VentasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cuentas, setCuentas] = useState<CuentaMadre[]>([]);
  
  // POS Form States
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
  const [fechaCorte, setFechaCorte] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<VentaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Item selector states
  const [selectedPlatId, setSelectedPlatId] = useState('');
  const [tipoUnidad, setTipoUnidad] = useState<'PANTALLA' | 'CUENTA'>('PANTALLA');
  const [selectedPrecio, setSelectedPrecio] = useState(15000);

  // Combo States
  const [isComboActive, setIsComboActive] = useState(false);
  const [comboTotalPrice, setComboTotalPrice] = useState(0);

  // Success Modal States
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [registeredVenta, setRegisteredVenta] = useState<any>(null);

  // Success Modal Payment fields
  const [abonoMonto, setAbonoMonto] = useState(0);
  const [abonoEntidad, setAbonoEntidad] = useState('NEQUI');
  const [paymentStatus, setPaymentStatus] = useState('');

  const fetchPOSData = async () => {
    try {
      const [clRes, platRes, plantRes, cmRes] = await Promise.all([
        api.get('/clientes/'),
        api.get('/plataformas/'),
        api.get('/plantillas/'),
        api.get('/cuentas_madre/'),
      ]);
      setClientes(clRes.data);
      setPlataformas(platRes.data);
      setPlantillas(plantRes.data);
      setCuentas(cmRes.data);

      if (platRes.data.length > 0) setSelectedPlatId(String(platRes.data[0].id));
    } catch (err: any) {
      console.error('Error al cargar datos POS', err);
    }
  };

  useEffect(() => {
    fetchPOSData();
  }, []);

  // Sincronizar precio según tipo de unidad seleccionado
  useEffect(() => {
    if (tipoUnidad === 'PANTALLA') {
      setSelectedPrecio(15000);
    } else {
      setSelectedPrecio(40000);
    }
  }, [tipoUnidad]);

  // Al activar/desactivar el combo o cambiar cantidad de items
  const handleToggleCombo = () => {
    const nextState = !isComboActive;
    setIsComboActive(nextState);

    if (nextState) {
      // Iniciar combo con la suma de precios sugeridos
      const originalSum = items.reduce((acc, curr) => acc + curr.precio_original, 0);
      setComboTotalPrice(originalSum);

      // Distribuir equitativamente al inicio (is_edited = false para todos)
      const equalShare = parseFloat((originalSum / items.length).toFixed(2));
      setItems(items.map(item => ({
        ...item,
        precio_aplicado: equalShare,
        is_edited: false
      })));
    } else {
      // Si se desactiva, volver a precios originales
      setItems(items.map(item => ({
        ...item,
        precio_aplicado: item.precio_original,
        is_edited: false
      })));
    }
  };

  const handleAddItem = () => {
    if (!selectedPlatId) return;
    const platIdNum = parseInt(selectedPlatId);

    const newItem: VentaItem = {
      plataforma_id: platIdNum,
      precio_original: selectedPrecio,
      precio_aplicado: selectedPrecio,
      tipo_unidad: tipoUnidad,
      is_edited: false
    };

    const nextItems = [...items, newItem];

    if (isComboActive) {
      // Sumar el precio del nuevo item al total del combo
      const newTotal = comboTotalPrice + selectedPrecio;
      setComboTotalPrice(newTotal);

      // Redistribuir el nuevo total entre todos
      const editedItems = nextItems.filter(item => item.is_edited);
      const uneditedItems = nextItems.filter(item => !item.is_edited);
      const sumEdited = editedItems.reduce((acc, curr) => acc + curr.precio_aplicado, 0);
      const remaining = newTotal - sumEdited;
      
      const distributedValue = Math.max(0, remaining / uneditedItems.length);
      const finalItems = nextItems.map(item => {
        if (item.is_edited) return item;
        return {
          ...item,
          precio_aplicado: parseFloat(distributedValue.toFixed(2))
        };
      });
      setItems(finalItems);
    } else {
      setItems(nextItems);
    }
  };

  const handleRemoveItem = (index: number) => {
    const itemToRemove = items[index];
    const nextItems = items.filter((_, i) => i !== index);

    if (nextItems.length < 2) {
      setIsComboActive(false);
      setItems(nextItems.map(item => ({
        ...item,
        precio_aplicado: item.precio_original,
        is_edited: false
      })));
    } else if (isComboActive) {
      // Restar el precio del item removido del total del combo
      const newTotal = Math.max(0, comboTotalPrice - itemToRemove.precio_aplicado);
      setComboTotalPrice(newTotal);

      // Redistribuir el saldo restante entre los que quedan
      const editedItems = nextItems.filter(item => item.is_edited);
      const uneditedItems = nextItems.filter(item => !item.is_edited);
      const sumEdited = editedItems.reduce((acc, curr) => acc + curr.precio_aplicado, 0);
      const remaining = newTotal - sumEdited;

      if (uneditedItems.length > 0) {
        const distributedValue = Math.max(0, remaining / uneditedItems.length);
        const finalItems = nextItems.map(item => {
          if (item.is_edited) return item;
          return {
            ...item,
            precio_aplicado: parseFloat(distributedValue.toFixed(2))
          };
        });
        setItems(finalItems);
      } else {
        // Si todos están editados, fijamos el total en la suma de lo que queda
        const finalSum = nextItems.reduce((acc, curr) => acc + curr.precio_aplicado, 0);
        setComboTotalPrice(finalSum);
        setItems(nextItems);
      }
    } else {
      setItems(nextItems);
    }
  };

  // Cambiar manualmente el precio total del combo entero
  const handleComboTotalPriceChange = (newTotal: number) => {
    setComboTotalPrice(newTotal);

    const editedItems = items.filter(item => item.is_edited);
    const uneditedItems = items.filter(item => !item.is_edited);
    const sumEdited = editedItems.reduce((acc, curr) => acc + curr.precio_aplicado, 0);
    const remaining = newTotal - sumEdited;

    if (uneditedItems.length > 0) {
      const distributedValue = Math.max(0, remaining / uneditedItems.length);
      setItems(items.map(item => {
        if (item.is_edited) return item;
        return {
          ...item,
          precio_aplicado: parseFloat(distributedValue.toFixed(2))
        };
      }));
    }
  };

  // Editar manualmente el precio final de un elemento individual del carrito
  const handleEditItemPrice = (index: number, newVal: number) => {
    const updatedList = items.map((item, idx) => {
      if (idx === index) {
        return { ...item, precio_aplicado: newVal, is_edited: true };
      }
      return item;
    });

    if (isComboActive) {
      const editedItems = updatedList.filter(item => item.is_edited);
      const uneditedItems = updatedList.filter(item => !item.is_edited);
      const sumEdited = editedItems.reduce((acc, curr) => acc + curr.precio_aplicado, 0);
      
      if (sumEdited > comboTotalPrice || uneditedItems.length === 0) {
        // Ajustar el total del combo a la suma de los elementos
        const newTotal = updatedList.reduce((acc, curr) => acc + curr.precio_aplicado, 0);
        setComboTotalPrice(newTotal);
        setItems(updatedList);
      } else {
        // Redistribuir diferencia entre no-editados
        const remaining = comboTotalPrice - sumEdited;
        const distributedValue = Math.max(0, remaining / uneditedItems.length);
        const finalItems = updatedList.map(item => {
          if (item.is_edited) return item;
          return {
            ...item,
            precio_aplicado: parseFloat(distributedValue.toFixed(2))
          };
        });
        setItems(finalItems);
      }
    } else {
      setItems(updatedList);
    }
  };

  const calculateTotal = () => {
    if (isComboActive) return comboTotalPrice;
    return items.reduce((acc, curr) => acc + curr.precio_aplicado, 0);
  };

  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!clienteId) {
      setError('Debes seleccionar un cliente.');
      return;
    }
    if (items.length === 0) {
      setError('Añade al menos una plataforma a la venta.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        cliente_id: parseInt(clienteId),
        fecha_corte: fechaCorte,
        monto_total: calculateTotal(),
        items: items.map(item => ({
          plataforma_id: item.plataforma_id,
          combo_id: null, // Combo dinámico/personalizado
          precio_aplicado: item.precio_aplicado,
          tipo_unidad: item.tipo_unidad
        }))
      };

      const res = await api.post('/ventas/', payload);
      setRegisteredVenta(res.data);
      setAbonoMonto(calculateTotal()); // Por defecto abono completo
      setPaymentStatus('');
      setIsSuccessOpen(true);
      setItems([]); // Limpiar POS
      setIsComboActive(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al procesar la venta. Verifica el inventario.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!registeredVenta) return;
    setPaymentStatus('');
    try {
      await api.post(`/ventas/${registeredVenta.id}/pagos`, {
        monto: abonoMonto,
        entidad: abonoEntidad
      });
      setPaymentStatus('Abono registrado con éxito.');
      // Refrescar venta en modal
      const res = await api.get(`/ventas/${registeredVenta.id}`);
      setRegisteredVenta(res.data);
    } catch (err: any) {
      setPaymentStatus('Error al registrar el abono.');
    }
  };

  // WhatsApp link parser
  const getWhatsAppLink = (detail: any) => {
    if (!registeredVenta) return '#';
    const cliente = clientes.find(c => c.id === registeredVenta.cliente_id);
    if (!cliente) return '#';

    // Obtener plantilla "cambio_credenciales"
    const template = plantillas.find(p => p.nombre === 'cambio_credenciales') || {
      mensaje: "Hola [Nombre Cliente], aquí están tus accesos de {plataforma}:\nUsuario: {email}\nClave: {password}\nPIN: {pin}"
    };

    // Resolver plataforma y credencial
    const platName = plataformas.find(p => p.id === detail.plataforma_id)?.nombre || `Plataforma #${detail.plataforma_id}`;
    
    // Buscar la cuenta madre para sacar email/password
    const cuentaMadre = cuentas.find(c => c.id === detail.cuenta_madre_id);
    const email = cuentaMadre?.credencial?.email || 'N/A';
    const password = cuentaMadre?.credencial?.password || 'N/A';

    let profilePin = 'N/A';
    if (cuentaMadre && 'perfiles' in cuentaMadre) {
      const matchPerfil = (cuentaMadre as any).perfiles?.find((p: any) => p.id === detail.perfil_id);
      if (matchPerfil) {
        profilePin = matchPerfil.pin || 'Sin PIN';
      }
    }

    let msg = template.mensaje
      .replace('[Nombre Cliente]', cliente.nombre)
      .replace('{plataforma}', platName)
      .replace('{email}', email)
      .replace('{password}', password)
      .replace('{pin}', profilePin);

    msg = msg.replace('{monto}', String(detail.precio_aplicado))
             .replace('{fecha_corte}', registeredVenta.fecha_corte);

    const telefonoLimpio = cliente.telefono.replace('+', '').replace(/\s/g, '');
    return `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(msg)}`;
  };

  const getPlataformaName = (id: number) => plataformas.find(p => p.id === id)?.nombre || `ID #${id}`;

  // Filtrar la lista de clientes para la búsqueda interactiva
  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.telefono.includes(clienteSearch)
  );

  const handleSelectCliente = (c: Cliente) => {
    setClienteId(String(c.id));
    setClienteSearch(`${c.nombre} (${c.telefono})`);
    setShowClientDropdown(false);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Venta y Asignación (POS)</h1>
        <p className="text-slate-400 text-sm mt-1">Registra ventas y asigna perfiles/cuentas automáticas sin colisiones.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario POS */}
        <Card className="lg:col-span-2 space-y-4 bg-slate-900/40">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-cyan-400" /> Nuevo Registro de Venta
          </h2>

          {error && (
            <p className="text-sm text-red-400 font-semibold">{error}</p>
          )}

          <form onSubmit={handleProcessSale} className="space-y-4">
            
            {/* Buscador interactivo de clientes */}
            <div className="relative">
              <Input
                label="Buscar Cliente"
                placeholder="Escribe el nombre o teléfono del cliente..."
                value={clienteSearch}
                onChange={(e) => {
                  setClienteSearch(e.target.value);
                  setShowClientDropdown(true);
                  if (!e.target.value) setClienteId('');
                }}
                onFocus={() => setShowClientDropdown(true)}
                leftIcon={<Search className="w-4 h-4 text-slate-500" />}
                required
              />
              {showClientDropdown && filteredClientes.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-850">
                  {filteredClientes.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCliente(c)}
                      className="px-4 py-2.5 hover:bg-slate-800 text-slate-200 text-sm cursor-pointer transition-colors"
                    >
                      <p className="font-semibold">{c.nombre}</p>
                      <p className="text-xs text-slate-500">{c.telefono}</p>
                    </div>
                  ))}
                </div>
              )}
              {showClientDropdown && filteredClientes.length === 0 && clienteSearch && (
                <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 text-xs text-slate-500 italic">
                  No se encontraron clientes que coincidan.
                </div>
              )}
            </div>

            <Input
              label="Fecha de Corte"
              type="date"
              value={fechaCorte}
              onChange={(e) => setFechaCorte(e.target.value)}
              required
            />

            {/* Configurar Añadir Items */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Configurar Pantalla / Cuenta</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Selector Plataforma */}
                <Select
                  label="Plataforma de Streaming"
                  value={selectedPlatId}
                  onChange={(e) => setSelectedPlatId(e.target.value)}
                  options={plataformas.map(p => ({ value: p.id, label: p.nombre }))}
                />

                {/* Selección Unidad: Pantalla vs Cuenta */}
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Unidad a Vender</label>
                  <div className="flex gap-2 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTipoUnidad('PANTALLA')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        tipoUnidad === 'PANTALLA' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      Pantalla (Perfil)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoUnidad('CUENTA')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        tipoUnidad === 'CUENTA' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      Cuenta Completa
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-850/60">
                <Input
                  label="Precio Sugerido (COP)"
                  type="number"
                  value={selectedPrecio}
                  onChange={(e) => setSelectedPrecio(parseFloat(e.target.value) || 0)}
                  min={0}
                />
                <div className="flex items-end justify-end">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={handleAddItem}
                  >
                    Agregar al Carrito
                  </Button>
                </div>
              </div>
            </div>

            {/* Listado de Items en POS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalle del Carrito</h3>
                
                {/* Switch de Combo (Aparece con 2 o más elementos) */}
                {items.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleToggleCombo}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>¿Aplicar Combo?</span>
                    {isComboActive ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                  </button>
                )}
              </div>

              {/* Si el combo está activo, mostrar el input del precio global */}
              {isComboActive && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <Input
                    label="Precio Global del Combo / Paquete (COP)"
                    type="number"
                    value={comboTotalPrice}
                    onChange={(e) => handleComboTotalPriceChange(parseFloat(e.target.value) || 0)}
                    min={1}
                  />
                  <p className="text-[10px] text-slate-400">
                    Edita los precios individuales abajo. La diferencia se distribuirá en las pantallas restantes no editadas.
                  </p>
                </div>
              )}

              {/* Items del Carrito con input de precio editable */}
              {items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-950/20 border border-slate-850 p-4 rounded-xl gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200">{getPlataformaName(item.plataforma_id)}</p>
                      <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded font-bold uppercase">
                        {item.tipo_unidad}
                      </span>
                      {isComboActive && (
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          item.is_edited ? 'bg-amber-550/15 text-amber-400 border border-amber-500/10' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.is_edited ? 'Precio Editado (Fijo)' : 'Autodistribuido'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Precio original: ${item.precio_original.toLocaleString('es-CO')} COP</p>
                  </div>
                  
                  <div className="flex items-center gap-3 justify-end">
                    <div className="w-36">
                      <Input
                        label=""
                        type="number"
                        placeholder="Precio Venta"
                        value={item.precio_aplicado}
                        onChange={(e) => handleEditItemPrice(index, parseFloat(e.target.value) || 0)}
                        min={0}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-400 hover:text-red-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer shrink-0 mt-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {items.length === 0 && (
                <p className="text-xs text-slate-550 italic text-center py-4">El carrito está vacío.</p>
              )}
            </div>

            {/* Total */}
            <div className="border-t border-slate-800/80 pt-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400">Total a Cobrar:</p>
                <h3 className="text-2xl font-bold text-cyan-400">${calculateTotal().toLocaleString('es-CO')} COP</h3>
              </div>
              <Button 
                type="submit" 
                variant="primary" 
                isLoading={loading}
                disabled={items.length === 0}
              >
                Vender y Asignar
              </Button>
            </div>
          </form>
        </Card>

        {/* Resumen Informativo */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-950">
            <h3 className="font-bold text-slate-200 text-sm mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" /> Combo Reactivo Inteligente
            </h3>
            <p className="text-xs text-slate-450 leading-relaxed">
              Agrega múltiples plataformas (pantallas o cuentas) y enciende <strong>"¿Aplicar Combo?"</strong>. Si editas manualmente una de las pantallas (p. ej. a 12,000 COP), la diferencia se recalcula automáticamente y se reparte en los demás ítems libres de forma transparente.
            </p>
          </Card>

          <Card className="bg-slate-900/20 border-dashed border-slate-800">
            <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" /> Mezcla de Recursos
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              El carrito te permite mezclar recursos de todo tipo: perfiles individuales y cuentas completas de diferentes plataformas en la misma transacción de venta.
            </p>
          </Card>
        </div>
      </div>

      {/* Modal Éxito Venta */}
      <Modal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title="¡Venta Registrada Exitosamente!"
        footer={
          <Button variant="primary" onClick={() => setIsSuccessOpen(false)}>Finalizar Proceso</Button>
        }
      >
        {registeredVenta && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-green-400 bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
              <ShieldCheck className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Venta procesada de manera correcta</p>
                <p className="text-xs text-slate-400">La fecha de vencimiento es el {registeredVenta.fecha_corte}.</p>
              </div>
            </div>

            {/* Cuentas Asignadas */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Detalles de Accesos Asignados:</h4>
              {registeredVenta.detalles.map((detail: any, index: number) => {
                const cm = cuentas.find(c => c.id === detail.cuenta_madre_id);
                let pinVal = 'Sin PIN';
                if (cm && 'perfiles' in cm) {
                  const matchPerfil = (cm as any).perfiles?.find((p: any) => p.id === detail.perfil_id);
                  if (matchPerfil && matchPerfil.pin) pinVal = matchPerfil.pin;
                }
                
                return (
                  <div key={index} className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-200">{getPlataformaName(detail.plataforma_id)}</span>
                      <a 
                        href={getWhatsAppLink(detail)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-semibold transition-colors bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20 cursor-pointer"
                      >
                        <Smartphone className="w-3.5 h-3.5" /> Enviar por WhatsApp
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-400 bg-slate-900/40 p-3 rounded-lg border border-slate-850/60">
                      <p>Usuario: <strong className="text-slate-200 font-sans">{cm?.credencial?.email || 'Cargando...'}</strong></p>
                      <p>Clave: <strong className="text-slate-200 font-sans">{cm?.credencial?.password || 'Cargando...'}</strong></p>
                      <p>PIN: <strong className="text-cyan-400 font-sans">{pinVal}</strong></p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Registrar Abono en el Acto */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-cyan-400" /> Registrar Abono Contable Inmediato
              </h4>
              
              {paymentStatus && (
                <p className="text-xs text-cyan-400 font-semibold">{paymentStatus}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-grow">
                  <Input
                    label="Monto del Abono (COP)"
                    type="number"
                    value={abonoMonto}
                    onChange={(e) => setAbonoMonto(parseFloat(e.target.value) || 0)}
                    min={0.01}
                  />
                </div>
                <div className="sm:w-44">
                  <Select
                    label="Medio de Pago"
                    value={abonoEntidad}
                    onChange={(e) => setAbonoEntidad(e.target.value)}
                    options={[
                      { value: 'NEQUI', label: 'Nequi' },
                      { value: 'BANCOLOMBIA', label: 'Bancolombia' },
                      { value: 'DAVIPLATA', label: 'Daviplata' },
                      { value: 'NU_BANK', label: 'Nu Bank' },
                      { value: 'EFECTIVO', label: 'Efectivo' },
                    ]}
                  />
                </div>
                <div className="sm:self-end">
                  <Button variant="secondary" onClick={handleRegisterPayment}>
                    Registrar Pago
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
