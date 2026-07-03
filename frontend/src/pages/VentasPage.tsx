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
  Search, Sparkles, ToggleLeft, ToggleRight,
  History, Eye, ShieldAlert, Calendar, RefreshCw, AlertTriangle
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
  perfiles: {
    id: number;
    nombre_perfil: string;
    pin: string | null;
    asignado: boolean;
    reportado?: boolean;
  }[];
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
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cuentas, setCuentas] = useState<CuentaMadre[]>([]);
  const [credenciales, setCredenciales] = useState<Credencial[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  
  // Navigation tabs: 'pos' o 'historial'
  const [activeTab, setActiveTab] = useState<'pos' | 'historial'>('pos');

  // --- POS STUFF ---
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [fechaCorte, setFechaCorte] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<VentaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedPlatId, setSelectedPlatId] = useState('');
  const [tipoUnidad, setTipoUnidad] = useState<'PANTALLA' | 'CUENTA'>('PANTALLA');
  const [selectedPrecio, setSelectedPrecio] = useState(15000);

  // Search Cuenta Madre
  const [selectedCuentaId, setSelectedCuentaId] = useState('');
  const [cuentaSearchText, setCuentaSearchText] = useState('');
  const [showCuentaDropdown, setShowCuentaDropdown] = useState(false);

  const [isComboActive, setIsComboActive] = useState(false);
  const [comboTotalPrice, setComboTotalPrice] = useState(0);

  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [registeredVenta, setRegisteredVenta] = useState<any>(null);

  const [abonoMonto, setAbonoMonto] = useState(0);
  const [abonoEntidad, setAbonoEntidad] = useState('NEQUI');
  const [paymentStatus, setPaymentStatus] = useState('');

  // --- EDITABLE PERFILES ON SUCCESS MODAL ---
  const [editablePerfiles, setEditablePerfiles] = useState<{
    [perfilId: number]: {
      nombre_perfil: string;
      pin: string;
      saving?: boolean;
      saved?: boolean;
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
  
  const [tipoGarantia, setTipoGarantia] = useState('CAMBIO_RECURSO');
  const [diasExtendidos, setDiasExtendidos] = useState(0);
  const [liberarRecursoAnterior, setLiberarRecursoAnterior] = useState(false);
  const [montoReembolso, setMontoReembolso] = useState(0);
  const [entidadReembolso, setEntidadReembolso] = useState('NEQUI');
  const [garantiaError, setGarantiaError] = useState('');
  const [garantiaSuccess, setGarantiaSuccess] = useState('');

  // --- RENOVACION MODAL STUFF ---
  const [isRenovacionOpen, setIsRenovacionOpen] = useState(false);
  const [selectedSaleToRenew, setSelectedSaleToRenew] = useState<any>(null);
  const [nuevaFechaCorteRenovacion, setNuevaFechaCorteRenovacion] = useState('');
  const [renovacionError, setRenovacionError] = useState('');
  const [renovacionSuccess, setRenovacionSuccess] = useState('');

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
      console.error('Error al cargar datos POS', err);
    }
  };

  const fetchSalesHistory = async () => {
    try {
      const res = await api.get('/ventas/');
      setSales(res.data);
    } catch (err) {
      console.error('Error al cargar historial de ventas', err);
    }
  };

  useEffect(() => {
    fetchPOSData();
    fetchSalesHistory();
  }, []);

  // Reset selectedCuentaId when platform or unit type changes
  useEffect(() => {
    setSelectedCuentaId('');
    setCuentaSearchText('');
  }, [selectedPlatId, tipoUnidad]);

  // Inicializar editablePerfiles con valores por defecto cuando se registra una venta
  useEffect(() => {
    if (registeredVenta) {
      const initial: any = {};
      const clientObj = clientes.find(c => c.id === registeredVenta.cliente_id);
      const defaultUser = clientObj ? clientObj.nombre : 'Usuario';
      
      registeredVenta.detalles.forEach((det: any) => {
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        initial[det.perfil_id] = {
          nombre_perfil: defaultUser,
          pin: randomPin,
          saving: false,
          saved: false
        };
      });
      setEditablePerfiles(initial);
    }
  }, [registeredVenta, clientes]);

  // Sincronizar precio según tipo de unidad seleccionado
  useEffect(() => {
    if (tipoUnidad === 'PANTALLA') {
      setSelectedPrecio(15000);
    } else {
      setSelectedPrecio(40000);
    }
  }, [tipoUnidad]);

  // Al activar/desactivar el combo
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
      setPaymentStatus('');
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

  // --- AUTOMATIZACION: GUARDAR ACCESOS Y REGISTRAR ABONO EN UN CLICK ---
  const handleFinalizeProcess = async () => {
    if (!registeredVenta) return;
    setLoading(true);
    setPaymentStatus('');
    try {
      // 1. Guardar todos los perfiles asociados a la venta
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

      // 2. Registrar abono contable
      if (abonoMonto > 0) {
        await api.post(`/ventas/${registeredVenta.id}/pagos`, {
          monto: abonoMonto,
          entidad: abonoEntidad
        });
      }

      // 3. Finalizar y limpiar
      setIsSuccessOpen(false);
      fetchPOSData();
      fetchSalesHistory();
    } catch (err: any) {
      alert('Error al guardar los accesos o registrar el abono. Verifica la información.');
    } finally {
      setLoading(false);
    }
  };

  // --- GARANTIA SUBMIT ---
  const handleOpenGarantiaModal = (detail: any) => {
    setSelectedDetail(detail);
    setTipoGarantia('CAMBIO_RECURSO');
    setDiasExtendidos(0);
    setLiberarRecursoAnterior(false);
    setMontoReembolso(detail.precio_aplicado);
    setGarantiaError('');
    setGarantiaSuccess('');
    setIsGarantiaOpen(true);
  };

  const handleApplyGarantia = async (e: React.FormEvent) => {
    e.preventDefault();
    setGarantiaError('');
    setGarantiaSuccess('');

    try {
      const payload: any = {
        detalle_venta_id: selectedDetail.id,
        tipo_garantia: tipoGarantia,
        dias_extendidos: diasExtendidos,
        liberar_recurso_anterior: liberarRecursoAnterior
      };

      if (tipoGarantia === 'REEMBOLSO') {
        payload.monto_reembolso = montoReembolso;
        payload.entidad_reembolso = entidadReembolso;
      }

      await api.post('/garantias/', payload);
      setGarantiaSuccess('¡Garantía procesada de forma exitosa!');
      
      await fetchSalesHistory();
      await fetchPOSData();

      setTimeout(() => {
        setIsGarantiaOpen(false);
      }, 1000);
    } catch (err: any) {
      setGarantiaError(err.response?.data?.detail || 'Error al procesar la garantía.');
    }
  };

  // --- RENOVACION SUBMIT ---
  const handleOpenRenovacionModal = (sale: any) => {
    setSelectedSaleToRenew(sale);
    
    const originalDate = new Date(sale.fecha_corte);
    originalDate.setDate(originalDate.getDate() + 30);
    const suggestedStr = originalDate.toISOString().split('T')[0];
    
    setNuevaFechaCorteRenovacion(suggestedStr);
    setRenovacionError('');
    setRenovacionSuccess('');
    setIsRenovacionOpen(true);
  };

  const handleApplyRenovacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setRenovacionError('');
    setRenovacionSuccess('');

    if (!selectedSaleToRenew) return;

    try {
      await api.put(`/ventas/${selectedSaleToRenew.id}/renovar`, {
        nueva_fecha_corte: nuevaFechaCorteRenovacion
      });
      setRenovacionSuccess('¡Suscripción renovada con éxito!');
      fetchSalesHistory();
      setTimeout(() => {
        setIsRenovacionOpen(false);
      }, 1000);
    } catch (err: any) {
      setRenovacionError(err.response?.data?.detail || 'Error al renovar la suscripción.');
    }
  };

  // WhatsApp link parser
  const getWhatsAppLink = (detail: any, cuttingDate: string, clientObjId: number, templateType: 'cobro' | 'corte' | 'cambio_credenciales') => {
    const cliente = clientes.find(c => c.id === clientObjId);
    if (!cliente) return '#';

    const template = plantillas.find(p => p.nombre === templateType) || {
      mensaje: templateType === 'cobro' 
        ? "Hola [Nombre Cliente], te recordamos que tu suscripción de {plataforma} vence pronto ({fecha_corte}). Puedes renovarla realizando el pago de {monto} COP."
        : templateType === 'corte'
        ? "Hola [Nombre Cliente], tu suscripción de {plataforma} ha vencido y los perfiles asociados han sido suspendidos. Realiza tu pago de {monto} COP para reactivarlos."
        : "Hola [Nombre Cliente], aquí están tus accesos de {plataforma}:\nUsuario: {email}\nContraseña: {password}\nUsuario Perfil: {usuario}\nPIN: {pin}"
    };

    const cm = cuentas.find(c => c.id === detail.cuenta_madre_id);
    const platId = cm?.plataforma_id;
    const platName = plataformas.find(p => p.id === platId)?.nombre || `Plataforma #${platId}`;
    
    const cred = credenciales.find(cr => cr.id === cm?.credencial_id);
    const email = cred?.email || 'N/A';
    const password = cred?.password || 'N/A';

    const edited = editablePerfiles[detail.perfil_id];
    let profileUser = edited ? edited.nombre_perfil : cliente.nombre;
    let profilePin = edited ? edited.pin : 'N/A';

    if (!edited && cm && cm.perfiles) {
      const matchPerfil = cm.perfiles.find((p: any) => p.id === detail.perfil_id);
      if (matchPerfil) {
        profileUser = matchPerfil.nombre_perfil;
        if (matchPerfil.pin) profilePin = matchPerfil.pin;
      }
    }

    let msg = template.mensaje
      .replace('[Nombre Cliente]', cliente.nombre)
      .replace('{plataforma}', platName)
      .replace('{email}', email)
      .replace('{password}', password)
      .replace('{usuario}', profileUser)
      .replace('{pin}', profilePin);

    msg = msg.replace('{monto}', String(detail.precio_aplicado))
             .replace('{fecha_corte}', cuttingDate);

    const telefonoLimpio = cliente.telefono.replace('+', '').replace(/\s/g, '');
    return `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(msg)}`;
  };

  // WhatsApp link consolidado para todos los accesos comprados (Especial para combos o listas)
  const getConsolidatedWhatsAppLink = () => {
    if (!registeredVenta) return '#';
    const cliente = clientes.find(c => c.id === registeredVenta.cliente_id);
    if (!cliente) return '#';

    let msg = `Hola *${cliente.nombre}*, aquí tienes los accesos para tus suscripciones de streaming:\n\n`;

    registeredVenta.detalles.forEach((detail: any, idx: number) => {
      const cm = cuentas.find(c => c.id === detail.cuenta_madre_id);
      const cred = credenciales.find(cr => cr.id === cm?.credencial_id);
      const email = cred?.email || 'N/A';
      const password = cred?.password || 'N/A';
      
      const platId = cm?.plataforma_id;
      const platName = plataformas.find(p => p.id === platId)?.nombre || `Plataforma #${platId}`;

      const edited = editablePerfiles[detail.perfil_id] || { nombre_perfil: cliente.nombre, pin: 'N/A' };
      
      msg += `*${idx + 1}. ${platName}*\n`;
      msg += `   • Correo: \`${email}\`\n`;
      msg += `   • Clave: \`${password}\`\n`;
      msg += `   • Perfil (Usuario): *${edited.nombre_perfil}*\n`;
      msg += `   • PIN: *${edited.pin}*\n\n`;
    });

    msg += `Fecha de Vencimiento: *${registeredVenta.fecha_corte}*\n\n`;
    msg += `¡Gracias por tu confianza y preferencia! 🚀`;
    
    const telefonoLimpio = cliente.telefono.replace('+', '').replace(/\s/g, '');
    return `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(msg)}`;
  };

  const getPlataformaName = (id: number) => plataformas.find(p => p.id === id)?.nombre || `ID #${id}`;
  const getClienteName = (id: number) => clientes.find(c => c.id === id)?.nombre || `Cliente #${id}`;
  const getProveedorName = (id: number) => proveedores.find(p => p.id === id)?.nombre || `Proveedor #${id}`;

  const toggleExpandSale = (id: number) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

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

  // Filtrar cuentas madres según la plataforma y tipo de unidad seleccionada
  const getAvailableStockCuentas = () => {
    if (!selectedPlatId) return [];
    const platIdNum = parseInt(selectedPlatId);

    return cuentas.filter(c => {
      if (c.plataforma_id !== platIdNum || c.estado !== 'ACTIVA') return false;
      
      const freePerfiles = c.perfiles.filter(p => !p.asignado && !p.reportado);
      
      if (tipoUnidad === 'PANTALLA') {
        return freePerfiles.length > 0;
      } else {
        return freePerfiles.length === c.max_perfiles;
      }
    });
  };

  // Filtrar cuentas madres para la búsqueda predictiva de stock
  const filteredStockCuentas = getAvailableStockCuentas().filter(c => {
    const cred = credenciales.find(cr => cr.id === c.credencial_id);
    const email = cred?.email || '';
    const provName = getProveedorName(c.proveedor_id);
    
    const searchString = `${email} ${provName}`.toLowerCase();
    return searchString.includes(cuentaSearchText.toLowerCase());
  });

  const handleSelectCuentaMadre = (c: CuentaMadre) => {
    const cred = credenciales.find(cr => cr.id === c.credencial_id);
    const email = cred?.email || `Cuenta #${c.id}`;
    const provName = getProveedorName(c.proveedor_id);

    setSelectedCuentaId(String(c.id));
    setCuentaSearchText(`${email} (Proveedor: ${provName})`);
    setShowCuentaDropdown(false);
  };

  // Calcular diferencia de días para alertas
  const getDaysDiff = (targetDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filtrar historial de ventas
  const filteredSales = sales.filter(s => {
    const clName = getClienteName(s.cliente_id).toLowerCase();
    const matchesSearch = clName.includes(historySearch.toLowerCase()) || String(s.id).includes(historySearch);
    
    if (!matchesSearch) return false;

    const diff = getDaysDiff(s.fecha_corte);
    if (historyFilter === 'vence_2_dias') {
      return diff === 2;
    }
    if (historyFilter === 'vence_hoy') {
      return diff <= 0;
    }

    return true;
  });

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
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'pos' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" /> Registrar Venta (POS)
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'historial' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" /> Historial / Garantías
          </button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        /* --- POS VIEW --- */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 space-y-4 bg-slate-900/40">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-cyan-400" /> Nueva Suscripción
            </h2>

            {error && (
              <p className="text-sm text-red-400 font-semibold">{error}</p>
            )}

            <form onSubmit={handleProcessSale} className="space-y-4">
              {/* Buscador de clientes */}
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
              </div>

              <Input
                label="Fecha de Corte"
                type="date"
                value={fechaCorte}
                onChange={(e) => setFechaCorte(e.target.value)}
                required
              />

              {/* Agregar pantallas */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Añadir recurso</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Plataforma de Streaming"
                    value={selectedPlatId}
                    onChange={(e) => setSelectedPlatId(e.target.value)}
                    options={plataformas.map(p => ({ value: p.id, label: p.nombre }))}
                  />

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
                        Pantalla
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

                {/* Searchable Dropdown for Cuentas Madre of selected Platform */}
                <div className="relative">
                  <Input
                    label="Seleccionar Cuenta de Stock (Opcional - Autoselección si se deja vacío)"
                    placeholder="Buscar cuenta por correo o nombre de proveedor..."
                    value={cuentaSearchText}
                    onChange={(e) => {
                      setCuentaSearchText(e.target.value);
                      setShowCuentaDropdown(true);
                      if (!e.target.value) setSelectedCuentaId('');
                    }}
                    onFocus={() => setShowCuentaDropdown(true)}
                    leftIcon={<Search className="w-4 h-4 text-slate-500" />}
                  />
                  {showCuentaDropdown && filteredStockCuentas.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-850">
                      {filteredStockCuentas.map((c) => {
                        const cred = credenciales.find(cr => cr.id === c.credencial_id);
                        const emailStr = cred?.email || `Cuenta Madre #${c.id}`;
                        const provName = getProveedorName(c.proveedor_id);
                        const freeStock = c.perfiles.filter(p => !p.asignado && !p.reportado).length;

                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCuentaMadre(c)}
                            className="px-4 py-2.5 hover:bg-slate-800 text-slate-200 text-sm cursor-pointer transition-colors"
                          >
                            <p className="font-semibold">{emailStr}</p>
                            <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                              <span>Proveedor: {provName}</span>
                              <span className="text-cyan-400 font-medium">{freeStock} / {c.max_perfiles} perfiles libres</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items Carrito */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalle del Carrito</h3>
                  
                  {items.length >= 2 && (
                    <button
                      type="button"
                      onClick={handleToggleCombo}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>¿Aplicar Combo?</span>
                      {isComboActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                    </button>
                  )}
                </div>

                {isComboActive && (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                    <Input
                      label="Precio Total del Combo (COP)"
                      type="number"
                      value={comboTotalPrice}
                      onChange={(e) => handleComboTotalPriceChange(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}

                {items.map((item, index) => {
                  let specAccountLabel = '';
                  if (item.cuenta_madre_id) {
                    const cm = cuentas.find(c => c.id === item.cuenta_madre_id);
                    const cr = credenciales.find(cred => cred.id === cm?.credencial_id);
                    specAccountLabel = cr ? ` (Cuenta: ${cr.email})` : '';
                  }

                  return (
                    <div key={index} className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-950/20 border border-slate-850 p-4 rounded-xl gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-200">
                            {getPlataformaName(item.plataforma_id)}
                            <span className="text-xs font-normal text-slate-400">{specAccountLabel}</span>
                          </p>
                          <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded font-bold uppercase">
                            {item.tipo_unidad}
                          </span>
                          {isComboActive && (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              item.is_edited ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {item.is_edited ? 'Editado' : 'Automático'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 justify-end">
                        <div className="w-36">
                          <Input
                            label=""
                            type="number"
                            value={item.precio_aplicado}
                            onChange={(e) => handleEditItemPrice(index, parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-400 hover:text-red-200 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Procesar */}
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
                  Confirmar Venta
                </Button>
              </div>
            </form>
          </Card>

          {/* Resumen */}
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-950">
              <h3 className="font-bold text-slate-200 text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" /> Combo Reactivo
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                El switch de combo se activará al cargar 2 o más pantallas. Si digitas un precio global, se distribuirá proporcionalmente y podrás re-ajustar manualmente cualquier celda.
              </p>
            </Card>
          </div>
        </div>
      ) : (
        /* --- HISTORIAL / REPORT VIEW --- */
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-grow">
              <Input
                label="Buscador"
                placeholder="Buscar por cliente o ID de venta..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-550" />}
              />
            </div>
            
            <div className="w-full md:w-64">
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Filtro de Vencimiento</label>
              <select
                value={historyFilter}
                onChange={(e: any) => setHistoryFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="todos">Todos los Clientes</option>
                <option value="vence_2_dias">Cobro (2 días antes de vencer)</option>
                <option value="vence_hoy">Corte (Vence Hoy / Vencidas)</option>
              </select>
            </div>

            <Button variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={fetchSalesHistory}>
              Actualizar
            </Button>
          </div>

          <div className="space-y-4">
            {filteredSales.map((sale) => {
              const diffDays = getDaysDiff(sale.fecha_corte);
              let statusBadge = null;
              if (diffDays === 2) {
                statusBadge = (
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Cobrar (2 días)
                  </span>
                );
              } else if (diffDays <= 0) {
                statusBadge = (
                  <span className="text-[9px] bg-rose-500/10 text-rose-450 border border-rose-500/20 px-2 py-0.5 rounded font-extrabold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Suspender Hoy / Cortada
                  </span>
                );
              }

              return (
                <Card key={sale.id} className="bg-slate-900/30 border-slate-800/60 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-200">{getClienteName(sale.cliente_id)}</h3>
                        {statusBadge}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-550 mt-1">
                        <span className="font-mono">Venta #{sale.id}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Corte: {sale.fecha_corte}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-200">${sale.monto_total.toLocaleString('es-CO')} COP</p>
                        <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded mt-0.5 uppercase ${
                          sale.estado_pago === 'PAGADO' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          sale.estado_pago === 'PAGO_PARCIAL' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {sale.estado_pago}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="secondary" 
                          leftIcon={<Eye className="w-4 h-4" />}
                          onClick={() => toggleExpandSale(sale.id)}
                        >
                          Ver
                        </Button>
                        <Button 
                          variant="primary" 
                          leftIcon={<RefreshCw className="w-4 h-4" />}
                          onClick={() => handleOpenRenovacionModal(sale)}
                        >
                          Renovar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Detalle Expandible Accordion */}
                  {expandedSaleId === sale.id && (
                    <div className="border-t border-slate-850 pt-4 mt-2 space-y-3 animate-in fade-in duration-200">
                      <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider">Pantallas Adquiridas:</h4>
                      {sale.detalles.map((detail: any, index: number) => {
                        const cm = cuentas.find(c => c.id === detail.cuenta_madre_id);
                        const cred = credenciales.find(c => c.id === cm?.credencial_id);
                        
                        let pinVal = 'Sin PIN';
                        let profileUser = 'N/A';
                        if (cm && cm.perfiles) {
                          const matchPerfil = cm.perfiles.find((p: any) => p.id === detail.perfil_id);
                          if (matchPerfil) {
                            profileUser = matchPerfil.nombre_perfil;
                            if (matchPerfil.pin) pinVal = matchPerfil.pin;
                          }
                        }

                        const typeTemplate = diffDays <= 0 ? 'corte' : 'cobro';
                        const waMsgLink = getWhatsAppLink(detail, sale.fecha_corte, sale.cliente_id, typeTemplate);

                        return (
                          <div key={index} className="flex flex-col md:flex-row justify-between bg-slate-955/40 border border-slate-850 p-4 rounded-xl gap-4">
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-200">
                                {getPlataformaName(detail.plataforma_id)}
                              </p>
                              <p className="text-xs text-slate-500">Monto aplicado: ${detail.precio_aplicado.toLocaleString('es-CO')} COP</p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 mt-2 max-w-2xl">
                                <p>Usuario: <strong className="text-slate-200 font-sans">{cred?.email || 'N/A'}</strong></p>
                                <p>Clave: <strong className="text-slate-200 font-sans">{cred?.password || 'N/A'}</strong></p>
                                <p>Perfil: <strong className="text-slate-200 font-sans">{profileUser}</strong></p>
                                <p>PIN: <strong className="text-cyan-400 font-sans">{pinVal}</strong></p>
                              </div>
                            </div>

                            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                              {(diffDays === 2 || diffDays <= 0) ? (
                                <a
                                  href={waMsgLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`inline-flex items-center gap-1.5 text-xs font-bold transition-all px-3 py-2 rounded-lg border ${
                                    diffDays <= 0 
                                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20' 
                                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                                  }`}
                                >
                                  <Smartphone className="w-3.5 h-3.5" /> 
                                  {diffDays <= 0 ? 'Notificar Suspensión' : 'Notificar Cobro'}
                                </a>
                              ) : (
                                <a
                                  href={getWhatsAppLink(detail, sale.fecha_corte, sale.cliente_id, 'cambio_credenciales')}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 font-semibold transition-all bg-green-500/10 px-3 py-2 rounded-lg border border-green-500/20"
                                >
                                  <Smartphone className="w-3.5 h-3.5" /> Enviar por WhatsApp
                                </a>
                              )}

                              <button
                                onClick={() => handleOpenGarantiaModal(detail)}
                                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-350 font-bold bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg transition-all cursor-pointer"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" /> Reportar Garantía
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
            {filteredSales.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-10">No se encontraron registros de ventas para los filtros aplicados.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal Éxito POS */}
      <Modal
        isOpen={isSuccessOpen}
        onClose={() => {}} // Bloquear cierre accidental fuera del modal
        title="¡Venta Registrada Exitosamente!"
        footer={
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-between items-center">
            {registeredVenta && (
              <a
                href={getConsolidatedWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-green-600 border border-green-500 px-4 py-2.5 rounded-xl hover:bg-green-500 transition-all cursor-pointer w-full sm:w-auto justify-center"
              >
                <Smartphone className="w-4 h-4" /> Enviar todo por WhatsApp
              </a>
            )}
            <Button 
              variant="primary" 
              onClick={handleFinalizeProcess} 
              isLoading={loading}
              className="w-full sm:w-auto"
            >
              Finalizar proceso
            </Button>
          </div>
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
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Detalles de Accesos Asignados:</h4>
              {registeredVenta.detalles.map((detail: any, index: number) => {
                const cm = cuentas.find(c => c.id === detail.cuenta_madre_id);
                const cred = credenciales.find(c => c.id === cm?.credencial_id);
                const email = cred?.email || 'N/A';
                const password = cred?.password || 'N/A';
                
                const platId = cm?.plataforma_id;
                const platName = plataformas.find(p => p.id === platId)?.nombre || `Plataforma #${platId}`;

                const editData = editablePerfiles[detail.perfil_id] || { nombre_perfil: '', pin: '', saving: false, saved: false };

                return (
                  <div key={index} className="bg-slate-950/60 border border-slate-855 p-4 rounded-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-850/60 pb-2.5">
                      <span className="text-sm font-bold text-slate-200">{platName}</span>
                    </div>

                    {/* Non-editable credentials shown for copy/paste */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-850/60">
                      <div>
                        <p className="text-[10px] text-slate-550 font-bold uppercase mb-1">Usuario Cuenta</p>
                        <p className="text-xs text-slate-300 font-mono select-all bg-slate-950/50 p-1.5 rounded border border-slate-850">{email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-550 font-bold uppercase mb-1">Clave Cuenta</p>
                        <p className="text-xs text-slate-300 font-mono select-all bg-slate-950/50 p-1.5 rounded border border-slate-850">{password}</p>
                      </div>
                    </div>

                    {/* Editable User & PIN fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Nombre Perfil (Usuario)"
                        value={editData.nombre_perfil}
                        onChange={(e) => setEditablePerfiles(prev => ({
                          ...prev,
                          [detail.perfil_id]: { ...prev[detail.perfil_id], nombre_perfil: e.target.value, saved: false }
                        }))}
                        required
                      />
                      <Input
                        label="PIN Perfil"
                        value={editData.pin}
                        onChange={(e) => setEditablePerfiles(prev => ({
                          ...prev,
                          [detail.perfil_id]: { ...prev[detail.perfil_id], pin: e.target.value, saved: false }
                        }))}
                        required
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Registrar Abono */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-cyan-400" /> Registrar Abono Contable Inmediato
              </h4>
              
              {paymentStatus && (
                <p className="text-xs text-cyan-400 font-semibold">{paymentStatus}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Monto del Abono (COP)"
                  type="number"
                  value={abonoMonto}
                  onChange={(e) => setAbonoMonto(parseFloat(e.target.value) || 0)}
                  min={0.01}
                />
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
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Reporte Garantía */}
      <Modal
        isOpen={isGarantiaOpen}
        onClose={() => setIsGarantiaOpen(false)}
        title="Formulario de Reclamación de Garantía"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsGarantiaOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleApplyGarantia}>Aplicar Garantía</Button>
          </div>
        }
      >
        {selectedDetail && (
          <form onSubmit={handleApplyGarantia} className="space-y-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Pantalla Afectada:</p>
              <h3 className="text-sm font-bold text-slate-200 mt-1">{getPlataformaName(selectedDetail.plataforma_id)}</h3>
              <p className="text-xs text-slate-550 mt-0.5">Precio original cobrado: ${selectedDetail.precio_aplicado.toLocaleString('es-CO')} COP</p>
            </div>

            {garantiaError && <p className="text-xs text-red-400 font-semibold">{garantiaError}</p>}
            {garantiaSuccess && <p className="text-xs text-green-400 font-semibold">{garantiaSuccess}</p>}

            <Select
              label="Tipo de Solución / Garantía"
              value={tipoGarantia}
              onChange={(e) => {
                setTipoGarantia(e.target.value);
                if (e.target.value === 'REEMBOLSO') {
                  setDiasExtendidos(0); 
                }
              }}
              options={[
                { value: 'CAMBIO_RECURSO', label: 'Cambio de pantalla o cuenta' },
                { value: 'CAMBIO_CLAVE', label: 'Cambio de clave' },
                { value: 'AGREGAR_DIAS', label: 'Agregar días de compensación' },
                { value: 'REEMBOLSO', label: 'Devolución de dinero (Reembolso)' }
              ]}
              required
            />

            {/* Inputs Condicionales */}
            {tipoGarantia !== 'REEMBOLSO' ? (
              <div className="animate-in fade-in duration-200">
                <Input
                  label="Días de Compensación (Añadir a la fecha de corte)"
                  type="number"
                  value={diasExtendidos}
                  onChange={(e) => setDiasExtendidos(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                <Input
                  label="Monto a Reembolsar (COP)"
                  type="number"
                  value={montoReembolso}
                  onChange={(e) => setMontoReembolso(parseFloat(e.target.value) || 0)}
                  min={0.01}
                  required
                />
                <Select
                  label="Medio de Pago"
                  value={entidadReembolso}
                  onChange={(e) => setEntidadReembolso(e.target.value)}
                  options={[
                    { value: 'NEQUI', label: 'Nequi' },
                    { value: 'BANCOLOMBIA', label: 'Bancolombia' },
                    { value: 'DAVIPLATA', label: 'Daviplata' },
                    { value: 'NU_BANK', label: 'Nu Bank' },
                    { value: 'EFECTIVO', label: 'Efectivo' },
                  ]}
                  required
                />
              </div>
            )}

            {/* Liberar vs Baneo de pantalla vieja */}
            {['CAMBIO_RECURSO', 'REEMBOLSO'].includes(tipoGarantia) && (
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 animate-in fade-in duration-200">
                <label className="flex items-center gap-3 cursor-pointer text-xs sm:text-sm text-slate-355">
                  <input
                    type="checkbox"
                    checked={liberarRecursoAnterior}
                    onChange={(e) => setLiberarRecursoAnterior(e.target.checked)}
                    className="rounded border-slate-855 text-cyan-500 focus:ring-cyan-500 bg-slate-955 w-4 h-4"
                  />
                  <div>
                    <p className="font-semibold text-slate-200">Liberar pantalla anterior</p>
                    <p className="text-[10px] text-slate-550">Si se marca, el perfil vuelve a stock. Si se deja desmarcado, se inhabilita y sale del inventario.</p>
                  </div>
                </label>
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Modal Renovación de Venta */}
      <Modal
        isOpen={isRenovacionOpen}
        onClose={() => setIsRenovacionOpen(false)}
        title="Renovar Suscripción del Cliente"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsRenovacionOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleApplyRenovacion}>Guardar Renovación</Button>
          </div>
        }
      >
        {selectedSaleToRenew && (
          <form onSubmit={handleApplyRenovacion} className="space-y-4">
            <div className="bg-slate-955/60 p-4 rounded-xl border border-slate-850 text-xs">
              <p className="text-slate-400 uppercase font-bold tracking-wider">Cliente:</p>
              <h3 className="text-sm font-bold text-slate-200 mt-1">{getClienteName(selectedSaleToRenew.cliente_id)}</h3>
              <p className="text-slate-550 mt-1">Fecha de corte actual: <strong>{selectedSaleToRenew.fecha_corte}</strong></p>
            </div>

            {renovacionError && <p className="text-xs text-red-400 font-semibold">{renovacionError}</p>}
            {renovacionSuccess && <p className="text-xs text-green-400 font-semibold">{renovacionSuccess}</p>}

            <Input
              label="Nueva Fecha de Corte"
              type="date"
              value={nuevaFechaCorteRenovacion}
              onChange={(e) => setNuevaFechaCorteRenovacion(e.target.value)}
              required
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
