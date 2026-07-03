import { useState, useEffect } from 'react';
import api from '../api/axios';
import POSPanel from './ventas/POSPanel';
import HistorialPanel from './ventas/HistorialPanel';
import SuccessModal from './ventas/SuccessModal';
import GarantiaModal from './ventas/GarantiaModal';
import RenovacionModal from './ventas/RenovacionModal';
import { ShoppingCart, History } from 'lucide-react';

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

interface Credencial {
  id: number;
  email: string;
  password: string;
}

interface Proveedor {
  id: number;
  nombre: string;
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
  estado: string;
  perfiles: any[];
}

interface VentaItem {
  plataforma_id: number;
  precio_original: number;
  precio_aplicado: number;
  tipo_unidad: 'PANTALLA' | 'CUENTA';
  is_edited: boolean;
  cuenta_madre_id: number | null;
}

export default function VentasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [, setPlantillas] = useState<Plantilla[]>([]);
  const [cuentas, setCuentas] = useState<CuentaMadre[]>([]);
  const [credenciales, setCredenciales] = useState<Credencial[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  
  const [activeTab, setActiveTab] = useState<'pos' | 'historial'>('pos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- POS STUFF ---
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [fechaCorte, setFechaCorte] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<VentaItem[]>([]);

  const [selectedPlatId, setSelectedPlatId] = useState('');
  const [tipoUnidad, setTipoUnidad] = useState<'PANTALLA' | 'CUENTA'>('PANTALLA');
  const [selectedPrecio, setSelectedPrecio] = useState(15000);

  const [selectedCuentaId, setSelectedCuentaId] = useState('');
  const [cuentaSearchText, setCuentaSearchText] = useState('');
  const [showCuentaDropdown, setShowCuentaDropdown] = useState(false);

  const [isComboActive, setIsComboActive] = useState(false);
  const [comboTotalPrice, setComboTotalPrice] = useState(0);

  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [registeredVenta, setRegisteredVenta] = useState<any>(null);

  const [abonoMonto, setAbonoMonto] = useState(0);
  const [abonoEntidad, setAbonoEntidad] = useState('NEQUI');

  const [editablePerfiles, setEditablePerfiles] = useState<{
    [perfilId: number]: {
      nombre_perfil: string;
      pin: string;
    }
  }>({});

  // --- HISTORIAL STUFF ---
  const [sales, setSales] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'todos' | 'vence_2_dias' | 'vence_hoy'>('todos');
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);

  // --- GARANTIA MODAL STUFF ---
  const [isGarantiaOpen, setIsGarantiaOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  
  // --- RENOVACION MODAL STUFF ---
  const [isRenovacionOpen, setIsRenovacionOpen] = useState(false);
  const [selectedSaleToRenew, setSelectedSaleToRenew] = useState<any>(null);

  const fetchPOSData = async () => {
    try {
      const [clRes, platRes, plantRes, cmRes, credRes, provRes] = await Promise.all([
        api.get('/clientes/'),
        api.get('/plataformas/'),
        api.get('/plantillas/'),
        api.get('/cuentas_madre/'),
        api.get('/credenciales/'),
        api.get('/proveedores/'),
      ]);
      setClientes(clRes.data);
      setPlataformas(platRes.data);
      setPlantillas(plantRes.data);
      setCuentas(cmRes.data);
      setCredenciales(credRes.data);
      setProveedores(provRes.data);

      if (platRes.data.length > 0) setSelectedPlatId(String(platRes.data[0].id));
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al cargar datos POS.');
    }
  };

  const fetchSalesHistory = async () => {
    try {
      const res = await api.get('/ventas/');
      setSales(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al cargar el historial de ventas.');
    }
  };

  useEffect(() => {
    fetchPOSData();
    fetchSalesHistory();
  }, []);

  // Clear errors when active tab changes (UX fix)
  useEffect(() => {
    setError('');
  }, [activeTab]);

  useEffect(() => {
    setSelectedCuentaId('');
    setCuentaSearchText('');
  }, [selectedPlatId, tipoUnidad]);

  useEffect(() => {
    if (registeredVenta) {
      const initial: any = {};
      const clientObj = clientes.find(c => c.id === registeredVenta.cliente_id);
      const defaultUser = clientObj ? clientObj.nombre : 'Usuario';
      
      registeredVenta.detalles.forEach((det: any) => {
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        initial[det.perfil_id] = {
          nombre_perfil: defaultUser,
          pin: randomPin
        };
      });
      setEditablePerfiles(initial);
    }
  }, [registeredVenta, clientes]);

  useEffect(() => {
    if (tipoUnidad === 'PANTALLA') {
      setSelectedPrecio(15000);
    } else {
      setSelectedPrecio(40000);
    }
  }, [tipoUnidad]);

  const handleToggleCombo = () => {
    const nextState = !isComboActive;
    setIsComboActive(nextState);

    if (nextState) {
      const originalSum = items.reduce((acc, curr) => acc + curr.precio_original, 0);
      setComboTotalPrice(originalSum);

      const equalShare = parseFloat((originalSum / items.length).toFixed(2));
      setItems(items.map(item => ({
        ...item,
        precio_aplicado: equalShare,
        is_edited: false
      })));
    } else {
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
      is_edited: false,
      cuenta_madre_id: selectedCuentaId ? parseInt(selectedCuentaId) : null
    };

    const nextItems = [...items, newItem];

    if (isComboActive) {
      const newTotal = comboTotalPrice + selectedPrecio;
      setComboTotalPrice(newTotal);

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

    setSelectedCuentaId('');
    setCuentaSearchText('');
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
      const newTotal = Math.max(0, comboTotalPrice - itemToRemove.precio_aplicado);
      setComboTotalPrice(newTotal);

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
        const finalSum = nextItems.reduce((acc, curr) => acc + curr.precio_aplicado, 0);
        setComboTotalPrice(finalSum);
        setItems(nextItems);
      }
    } else {
      setItems(nextItems);
    }
  };

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
        const newTotal = updatedList.reduce((acc, curr) => acc + curr.precio_aplicado, 0);
        setComboTotalPrice(newTotal);
        setItems(updatedList);
      } else {
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
          combo_id: null,
          precio_aplicado: item.precio_aplicado,
          tipo_unidad: item.tipo_unidad,
          cuenta_madre_id: item.cuenta_madre_id
        }))
      };

      const res = await api.post('/ventas/', payload);
      setRegisteredVenta(res.data);
      setAbonoMonto(calculateTotal()); 
      setIsSuccessOpen(true);
      setItems([]); 
      setIsComboActive(false);
      fetchSalesHistory();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al procesar la venta. Verifica el inventario.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeProcess = async () => {
    if (!registeredVenta) return;
    setLoading(true);
    try {
      const savePromises = registeredVenta.detalles.map((detail: any) => {
        const editData = editablePerfiles[detail.perfil_id];
        if (editData) {
          return api.put(`/perfiles/${detail.perfil_id}`, {
            nombre_perfil: editData.nombre_perfil,
            pin: editData.pin
          });
        }
        return Promise.resolve();
      });
      await Promise.all(savePromises);

      if (abonoMonto > 0) {
        await api.post(`/ventas/${registeredVenta.id}/pagos`, {
          monto: abonoMonto,
          entidad: abonoEntidad
        });
      }

      setIsSuccessOpen(false);
      fetchPOSData();
      fetchSalesHistory();
    } catch (err: any) {
      alert('Error al guardar los accesos o registrar el abono. Verifica la información.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGarantia = async (payload: any) => {
    await api.post('/garantias/', payload);
    await fetchSalesHistory();
    await fetchPOSData();
  };

  const handleApplyRenovacion = async (nuevaFechaCorte: string) => {
    if (!selectedSaleToRenew) return;
    await api.put(`/ventas/${selectedSaleToRenew.id}/renovar`, {
      nueva_fecha_corte: nuevaFechaCorte
    });
    fetchSalesHistory();
  };

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Ventas y Garantías</h1>
          <p className="text-slate-400 text-sm mt-1">Registra, administra y audita todo tu flujo comercial en un solo lugar.</p>
        </div>
        
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer border-none bg-transparent ${
              activeTab === 'pos' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Registrar Venta (POS)
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer border-none bg-transparent ${
              activeTab === 'historial' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" /> Historial / Garantías
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          <span>{error}</span>
        </div>
      )}

      {activeTab === 'pos' ? (
        <POSPanel
          clientes={clientes}
          plataformas={plataformas}
          cuentas={cuentas}
          credenciales={credenciales}
          proveedores={proveedores}
          setClienteId={setClienteId}
          clienteSearch={clienteSearch}
          setClienteSearch={setClienteSearch}
          showClientDropdown={showClientDropdown}
          setShowClientDropdown={setShowClientDropdown}
          fechaCorte={fechaCorte}
          setFechaCorte={setFechaCorte}
          items={items}
          loading={loading}
          selectedPlatId={selectedPlatId}
          setSelectedPlatId={setSelectedPlatId}
          tipoUnidad={tipoUnidad}
          setTipoUnidad={setTipoUnidad}
          selectedPrecio={selectedPrecio}
          setSelectedPrecio={setSelectedPrecio}
          setSelectedCuentaId={setSelectedCuentaId}
          cuentaSearchText={cuentaSearchText}
          setCuentaSearchText={setCuentaSearchText}
          showCuentaDropdown={showCuentaDropdown}
          setShowCuentaDropdown={setShowCuentaDropdown}
          isComboActive={isComboActive}
          comboTotalPrice={comboTotalPrice}
          onProcessSale={handleProcessSale}
          handleAddItem={handleAddItem}
          handleRemoveItem={handleRemoveItem}
          handleToggleCombo={handleToggleCombo}
          handleComboTotalPriceChange={handleComboTotalPriceChange}
          handleEditItemPrice={handleEditItemPrice}
          calculateTotal={calculateTotal}
        />
      ) : (
        <HistorialPanel
          sales={sales}
          clientes={clientes}
          plataformas={plataformas}
          cuentas={cuentas}
          credenciales={credenciales}
          historySearch={historySearch}
          setHistorySearch={setHistorySearch}
          historyFilter={historyFilter}
          setHistoryFilter={setHistoryFilter}
          expandedSaleId={expandedSaleId}
          setExpandedSaleId={setExpandedSaleId}
          onOpenGarantiaModal={(detail) => {
            setSelectedDetail(detail);
            setIsGarantiaOpen(true);
          }}
          onOpenRenovacionModal={(sale) => {
            setSelectedSaleToRenew(sale);
            setIsRenovacionOpen(true);
          }}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        registeredVenta={registeredVenta}
        cuentas={cuentas}
        credenciales={credenciales}
        plataformas={plataformas}
        abonoMonto={abonoMonto}
        setAbonoMonto={setAbonoMonto}
        abonoEntidad={abonoEntidad}
        setAbonoEntidad={setAbonoEntidad}
        editablePerfiles={editablePerfiles}
        setEditablePerfiles={setEditablePerfiles}
        onFinalize={handleFinalizeProcess}
        loading={loading}
      />

      {/* Garantia Modal */}
      <GarantiaModal
        isOpen={isGarantiaOpen}
        onClose={() => setIsGarantiaOpen(false)}
        selectedDetail={selectedDetail}
        onSubmit={handleApplyGarantia}
      />

      {/* Renovacion Modal */}
      <RenovacionModal
        isOpen={isRenovacionOpen}
        onClose={() => setIsRenovacionOpen(false)}
        selectedSale={selectedSaleToRenew}
        onSubmit={handleApplyRenovacion}
      />
    </div>
  );
}
