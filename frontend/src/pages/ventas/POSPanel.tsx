import { useMemo } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { 
  ShoppingCart, Plus, Trash2, Search, Sparkles, ToggleLeft, ToggleRight,
  AlertTriangle
} from 'lucide-react';

import type { Cliente, Plataforma, CuentaMadre, Credencial, Proveedor, VentaItem } from '../../types';

interface POSPanelProps {
  clientes: Cliente[];
  plataformas: Plataforma[];
  cuentas: CuentaMadre[];
  credenciales: Credencial[];
  proveedores: Proveedor[];
  setClienteId: (val: string) => void;
  clienteSearch: string;
  setClienteSearch: (val: string) => void;
  showClientDropdown: boolean;
  setShowClientDropdown: (val: boolean) => void;
  fechaCorte: string;
  setFechaCorte: (val: string) => void;
  fechaInicio: string;
  setFechaInicio: (val: string) => void;
  items: VentaItem[];
  loading: boolean;
  selectedPlatId: string;
  setSelectedPlatId: (val: string) => void;
  tipoUnidad: 'PANTALLA' | 'CUENTA';
  setTipoUnidad: (val: 'PANTALLA' | 'CUENTA') => void;
  selectedPrecio: number | "";
  setSelectedPrecio: (val: number | "") => void;
  setSelectedCuentaId: (val: string) => void;
  cuentaSearchText: string;
  setCuentaSearchText: (val: string) => void;
  showCuentaDropdown: boolean;
  setShowCuentaDropdown: (val: boolean) => void;
  isComboActive: boolean;
  comboTotalPrice: number | "";
  onProcessSale: (e: React.FormEvent) => void;
  handleAddItem: () => void;
  handleRemoveItem: (index: number) => void;
  handleToggleCombo: () => void;
  handleComboTotalPriceChange: (val: number | "") => void;
  handleEditItemPrice: (index: number, newVal: number | "") => void;
  calculateTotal: () => number;
}

export default function POSPanel({
  clientes,
  plataformas,
  cuentas,
  credenciales,
  proveedores,
  setClienteId,
  clienteSearch,
  setClienteSearch,
  showClientDropdown,
  setShowClientDropdown,
  fechaCorte,
  setFechaCorte,
  fechaInicio,
  setFechaInicio,
  items,
  loading,
  selectedPlatId,
  setSelectedPlatId,
  tipoUnidad,
  setTipoUnidad,
  selectedPrecio,
  setSelectedPrecio,
  setSelectedCuentaId,
  cuentaSearchText,
  setCuentaSearchText,
  showCuentaDropdown,
  setShowCuentaDropdown,
  isComboActive,
  comboTotalPrice,
  onProcessSale,
  handleAddItem,
  handleRemoveItem,
  handleToggleCombo,
  handleComboTotalPriceChange,
  handleEditItemPrice,
  calculateTotal
}: POSPanelProps) {

  const getProveedorName = (provId: number) => {
    return proveedores.find(p => p.id === provId)?.nombre || `Proveedor #${provId}`;
  };

  const getPlataformaName = (platId: number) => {
    return plataformas.find(p => p.id === platId)?.nombre || `Plataforma #${platId}`;
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
      c.telefono.includes(clienteSearch)
    );
  }, [clientes, clienteSearch]);

  const handleSelectCliente = (c: Cliente) => {
    setClienteId(String(c.id));
    setClienteSearch(`${c.nombre} (${c.telefono})`);
    setShowClientDropdown(false);
  };

  const availableStockCuentas = useMemo(() => {
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
  }, [cuentas, selectedPlatId, tipoUnidad]);

  const filteredStockCuentas = useMemo(() => {
    return availableStockCuentas.filter(c => {
      const cred = credenciales.find(cr => cr.id === c.credencial_id);
      const email = cred?.email || '';
      const provName = getProveedorName(c.proveedor_id);
      
      const searchString = `${email} ${provName}`.toLowerCase();
      return searchString.includes(cuentaSearchText.toLowerCase());
    });
  }, [availableStockCuentas, credenciales, proveedores, cuentaSearchText]);

  const handleSelectCuentaMadre = (c: CuentaMadre) => {
    const cred = credenciales.find(cr => cr.id === c.credencial_id);
    const email = cred?.email || `Cuenta #${c.id}`;
    const provName = getProveedorName(c.proveedor_id);

    setSelectedCuentaId(String(c.id));
    setCuentaSearchText(`${email} (Proveedor: ${provName})`);
    setShowCuentaDropdown(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 space-y-4 bg-slate-900/40">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-cyan-400" /> Nueva Suscripción
        </h2>

        <form onSubmit={onProcessSale} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Fecha de Inicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />
            <Input
              label="Fecha de Corte"
              type="date"
              value={fechaCorte}
              onChange={(e) => setFechaCorte(e.target.value)}
              required
            />
          </div>

          {/* Agregar pantallas */}
          <div className="bg-slate-955/40 p-4 rounded-xl border border-slate-850 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Añadir recurso</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Plataforma de Streaming"
                value={selectedPlatId}
                onChange={(e) => setSelectedPlatId(e.target.value)}
              >
                <option value="">Selecciona plataforma...</option>
                {plataformas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>

              <Select
                label="Tipo de Recurso"
                value={tipoUnidad}
                onChange={(e) => setTipoUnidad(e.target.value as any)}
              >
                <option value="PANTALLA">Pantalla / Perfil Individual</option>
                <option value="CUENTA">Cuenta Completa</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Precio Sugerido Venta"
                type="number"
                value={selectedPrecio}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPrecio(val === "" ? "" : parseFloat(val) || 0);
                }}
                min="0"
              />

              {/* Búsqueda predictiva de cuenta madre específica */}
              <div className="relative">
                <Input
                  label="Cuenta Específica (Opcional)"
                  placeholder="Buscar por email o proveedor..."
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
                      const email = cred?.email || `Cuenta #${c.id}`;
                      const provName = getProveedorName(c.proveedor_id);
                      const freePerfilesCount = c.perfiles.filter(p => !p.asignado && !p.reportado).length;

                      return (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCuentaMadre(c)}
                          className="px-4 py-2 hover:bg-slate-800 text-slate-200 text-xs cursor-pointer transition-colors"
                        >
                          <p className="font-semibold">{email}</p>
                          <p className="text-[10px] text-slate-500">
                            Proveedor: {provName} | Libres: {freePerfilesCount} / {c.max_perfiles}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleAddItem}
                disabled={!selectedPlatId}
                className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold flex items-center gap-1.5 px-5 py-2 rounded-xl cursor-pointer border-none shadow-md shadow-cyan-500/10"
              >
                <Plus className="w-4 h-4" /> Añadir al Carrito
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || items.length === 0}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold py-3.5 rounded-xl shadow-lg shadow-cyan-500/10 cursor-pointer border-none"
          >
            {loading ? 'Procesando Venta...' : 'Registrar Venta'}
          </Button>
        </form>
      </Card>

      {/* DETALLES DE LA COMPRA (CARRITO) */}
      <div className="space-y-4">
        <Card className="bg-slate-900/40 border-slate-800 space-y-4">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-850">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-cyan-400" /> Resumen de Compra
            </h2>
            {items.length > 1 && (
              <button
                onClick={handleToggleCombo}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none cursor-pointer bg-transparent border-none"
              >
                {isComboActive ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-cyan-400" />
                    <span>Modo Combo Activo</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                    <span>Habilitar Combo</span>
                  </>
                )}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="py-8 text-center text-slate-500 space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">No hay plataformas en la orden</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div key={index} className="bg-slate-955/60 border border-slate-850 p-3 rounded-xl flex justify-between items-center gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-300">
                      {getPlataformaName(item.plataforma_id)}
                    </p>
                    <p className="text-[10px] text-slate-550 font-bold bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-850/40 inline-block">
                      {item.tipo_unidad}
                    </p>
                    {item.cuenta_madre_id && (
                      <p className="text-[9px] text-cyan-400 font-mono">Forzado: Cuenta ID {item.cuenta_madre_id}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.precio_aplicado}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleEditItemPrice(index, val === "" ? "" : parseFloat(val) || 0);
                      }}
                      className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-right text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    />
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="pt-4 border-t border-slate-850 space-y-3">
              {isComboActive ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>Precio del Combo</span>
                    <input
                      type="number"
                      value={comboTotalPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleComboTotalPriceChange(val === "" ? "" : parseFloat(val) || 0);
                      }}
                      className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-right text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    />
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
                    <p className="text-[10px] text-slate-400">El precio se ha distribuido proporcionalmente entre todos los perfiles de la orden.</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center font-bold text-slate-200">
                  <span className="text-xs">Monto Total Estimado</span>
                  <span className="text-base text-cyan-400 font-mono">${calculateTotal().toLocaleString('es-CO')} COP</span>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
