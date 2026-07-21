import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { AlertCircle, Search, Eye, EyeOff } from 'lucide-react';
import type { Cliente, Plataforma, CuentaMadre, Credencial } from '../../types';

interface EditarVentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSale: any;
  clientes: Cliente[];
  plataformas: Plataforma[];
  cuentas: CuentaMadre[];
  credenciales: Credencial[];
  onSubmit: (ventaId: number, updateData: any, accessUpdates: any) => Promise<void>;
}

export default function EditarVentaModal({
  isOpen,
  onClose,
  selectedSale,
  clientes,
  plataformas,
  cuentas,
  credenciales,
  onSubmit
}: EditarVentaModalProps) {
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaCorte, setFechaCorte] = useState('');
  const [montoTotal, setMontoTotal] = useState<number | ''>('');
  const [estadoPago, setEstadoPago] = useState('');
  const [nota, setNota] = useState('');

  // Accesses state
  const [detailsList, setDetailsList] = useState<any[]>([]);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    if (selectedSale) {
      setClienteId(String(selectedSale.cliente_id));
      const client = clientes.find(c => c.id === selectedSale.cliente_id);
      setClienteSearch(client ? `${client.nombre} (${client.telefono})` : `Cliente #${selectedSale.cliente_id}`);
      
      setFechaInicio(selectedSale.fecha_inicio);
      setFechaCorte(selectedSale.fecha_corte);
      
      setMontoTotal(selectedSale.monto_total);
      setEstadoPago(selectedSale.estado_pago);
      setNota(selectedSale.nota || '');

      // Initialize details list
      const details = selectedSale.detalles.map((d: any) => {
        const cm = cuentas.find(c => c.id === d.cuenta_madre_id);
        const cred = credenciales.find(c => c.id === cm?.credencial_id);
        const platId = d.plataforma_id || cm?.plataforma_id || 0;
        
        let profileUser = '';
        let pinVal = '';
        if (cm && cm.perfiles) {
          const matchPerfil = cm.perfiles.find((p: any) => p.id === d.perfil_id);
          if (matchPerfil) {
            profileUser = matchPerfil.nombre_perfil;
            pinVal = matchPerfil.pin || '';
          }
        }

        return {
          id: d.id,
          perfil_id: d.perfil_id,
          cuenta_madre_id: d.cuenta_madre_id,
          plataforma_id: platId,
          cred_id: cm?.credencial_id || null,
          email: cred?.email || '',
          password: (cm?.proveedor?.nombre === "Correos A" ? cm.clave_plataforma : cred?.password) || '',
          nombre_perfil: profileUser,
          pin: pinVal,
          perfil_id_present: !!d.perfil_id,
          isCorreosA: cm?.proveedor?.nombre === "Correos A",
          precio_aplicado: d.precio_aplicado,
          
          // Original values to compare
          originalPlataformaId: platId,
          originalCuentaMadreId: d.cuenta_madre_id,
          originalPerfilId: d.perfil_id,
          originalEmail: cred?.email || '',
          originalPassword: (cm?.proveedor?.nombre === "Correos A" ? cm.clave_plataforma : cred?.password) || '',
          originalNombrePerfil: profileUser,
          originalPin: pinVal,
          originalPrecioAplicado: d.precio_aplicado,
        };
      });
      setDetailsList(details);
      setError('');
      setSuccess('');
    }
  }, [selectedSale, clientes, plataformas, cuentas, credenciales, isOpen]);

  // Click outside to close client dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleFechaInicioChange = (val: string) => {
    setFechaInicio(val);
    if (val && fechaCorte) {
      const oldStart = new Date(fechaInicio + 'T00:00:00');
      const oldEnd = new Date(fechaCorte + 'T00:00:00');
      const diffTime = oldEnd.getTime() - oldStart.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const newStart = new Date(val + 'T00:00:00');
      newStart.setDate(newStart.getDate() + (diffDays > 0 ? diffDays : 30));
      
      const year = newStart.getFullYear();
      const month = String(newStart.getMonth() + 1).padStart(2, '0');
      const day = String(newStart.getDate()).padStart(2, '0');
      setFechaCorte(`${year}-${month}-${day}`);
    }
  };

  const handlePlatformChange = (index: number, newPlatId: number) => {
    const filteredAccs = cuentas.filter(c => c.plataforma_id === newPlatId && c.estado === 'ACTIVA');
    const firstAcc = filteredAccs[0] || null;
    
    setDetailsList(prev => prev.map((item, idx) => {
      if (idx === index) {
        const updated = {
          ...item,
          plataforma_id: newPlatId,
          cuenta_madre_id: firstAcc ? firstAcc.id : null,
          cred_id: firstAcc ? firstAcc.credencial_id : null
        };
        
        if (firstAcc) {
          const cred = credenciales.find(c => c.id === firstAcc.credencial_id);
          updated.email = cred?.email || '';
          updated.originalEmail = cred?.email || '';
          updated.password = cred?.password || '';
          updated.originalPassword = cred?.password || '';
          
          if (item.perfil_id_present) {
            // Find first available profile of the new account
            const firstPerf = firstAcc.perfiles && firstAcc.perfiles.length > 0 ? firstAcc.perfiles[0] : null;
            updated.perfil_id = firstPerf ? firstPerf.id : null;
            updated.nombre_perfil = firstPerf ? firstPerf.nombre_perfil : '';
            updated.pin = firstPerf?.pin || '';
            updated.originalNombrePerfil = firstPerf ? firstPerf.nombre_perfil : '';
            updated.originalPin = firstPerf?.pin || '';
          } else {
            updated.perfil_id = null;
          }
        } else {
          updated.email = '';
          updated.password = '';
          updated.perfil_id = null;
          updated.nombre_perfil = '';
          updated.pin = '';
        }
        return updated;
      }
      return item;
    }));
  };

  const handleAccountChange = (index: number, newAccId: number) => {
    const accObj = cuentas.find(c => c.id === newAccId);
    
    setDetailsList(prev => prev.map((item, idx) => {
      if (idx === index) {
        const updated = {
          ...item,
          cuenta_madre_id: newAccId,
          cred_id: accObj ? accObj.credencial_id : null
        };
        
        if (accObj) {
          const cred = credenciales.find(c => c.id === accObj.credencial_id);
          updated.email = cred?.email || '';
          updated.originalEmail = cred?.email || '';
          updated.password = cred?.password || '';
          updated.originalPassword = cred?.password || '';
          
          if (item.perfil_id_present) {
            const firstPerf = accObj.perfiles && accObj.perfiles.length > 0 ? accObj.perfiles[0] : null;
            updated.perfil_id = firstPerf ? firstPerf.id : null;
            updated.nombre_perfil = firstPerf ? firstPerf.nombre_perfil : '';
            updated.pin = firstPerf?.pin || '';
            updated.originalNombrePerfil = firstPerf ? firstPerf.nombre_perfil : '';
            updated.originalPin = firstPerf?.pin || '';
          } else {
            updated.perfil_id = null;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const handleProfileChange = (index: number, newPerfId: number) => {
    setDetailsList(prev => prev.map((item, idx) => {
      if (idx === index) {
        const accObj = cuentas.find(c => c.id === item.cuenta_madre_id);
        const perfObj = accObj?.perfiles.find(p => p.id === newPerfId);
        
        return {
          ...item,
          perfil_id: newPerfId,
          nombre_perfil: perfObj ? perfObj.nombre_perfil : '',
          pin: perfObj?.pin || '',
          originalNombrePerfil: perfObj ? perfObj.nombre_perfil : '',
          originalPin: perfObj?.pin || ''
        };
      }
      return item;
    }));
  };

  const handleDetailTextChange = (index: number, field: string, value: string) => {
    setDetailsList(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const recalculateMontoTotal = (list: any[]) => {
    const sum = list.reduce((acc, d) => acc + (parseFloat(String(d.precio_aplicado)) || 0), 0);
    setMontoTotal(sum);
  };

  const handleAddDetail = () => {
    const tempId = `new-${Date.now()}`;
    const newDetail = {
      id: tempId,
      perfil_id: null,
      cuenta_madre_id: null,
      plataforma_id: plataformas.length > 0 ? plataformas[0].id : 0,
      cred_id: null,
      email: '',
      password: '',
      nombre_perfil: '',
      pin: '',
      perfil_id_present: true,
      isCorreosA: false,
      precio_aplicado: 15000,
      
      originalPlataformaId: null,
      originalCuentaMadreId: null,
      originalPerfilId: null,
      originalEmail: '',
      originalPassword: '',
      originalNombrePerfil: '',
      originalPin: '',
      originalPrecioAplicado: 0,
    };
    
    setDetailsList(prev => {
      const updated = [...prev, newDetail];
      recalculateMontoTotal(updated);
      return updated;
    });
  };

  const handleDeleteDetail = (index: number) => {
    setDetailsList(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      recalculateMontoTotal(updated);
      return updated;
    });
  };

  const handlePriceChange = (index: number, value: number) => {
    setDetailsList(prev => {
      const updated = prev.map((item, idx) => {
        if (idx === index) {
          return { ...item, precio_aplicado: value };
        }
        return item;
      });
      recalculateMontoTotal(updated);
      return updated;
    });
  };

  const handleTypeChange = (index: number, newType: 'PANTALLA' | 'CUENTA') => {
    setDetailsList(prev => {
      const updated = prev.map((item, idx) => {
        if (idx === index) {
          const isPresent = newType === 'PANTALLA';
          const defaultPrice = isPresent ? 15005 : 40000; // default prices for quick fill
          const updatedItem = {
            ...item,
            perfil_id_present: isPresent,
            precio_aplicado: defaultPrice,
            perfil_id: null,
            nombre_perfil: '',
            pin: '',
          };
          
          if (item.cuenta_madre_id) {
            const accObj = cuentas.find(c => c.id === item.cuenta_madre_id);
            if (accObj) {
              if (isPresent) {
                const firstPerf = accObj.perfiles && accObj.perfiles.length > 0 ? accObj.perfiles[0] : null;
                updatedItem.perfil_id = firstPerf ? firstPerf.id : null;
                updatedItem.nombre_perfil = firstPerf ? firstPerf.nombre_perfil : '';
                updatedItem.pin = firstPerf?.pin || '';
              } else {
                updatedItem.perfil_id = null;
              }
            }
          }
          return updatedItem;
        }
        return item;
      });
      recalculateMontoTotal(updated);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      setError('Debes seleccionar un cliente válido.');
      return;
    }
    if (!fechaCorte) {
      setError('Debes especificar una fecha de corte.');
      return;
    }
    if (montoTotal === '') {
      setError('Debes especificar el monto total.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 1. Prepare general sale updates
      const saleUpdateData: any = {
        cliente_id: parseInt(clienteId),
        fecha_inicio: fechaInicio,
        fecha_corte: fechaCorte,
        monto_total: parseFloat(String(montoTotal)),
        estado_pago: estadoPago,
        nota: nota || null
      };

      // 2. Prepare all details for sync
      const detallesUpdates = detailsList.map(d => {
        const isNew = typeof d.id === 'string' && d.id.startsWith('new-');
        return {
          id: isNew ? null : d.id,
          plataforma_id: d.plataforma_id,
          cuenta_madre_id: d.cuenta_madre_id,
          perfil_id: d.perfil_id_present ? (d.perfil_id || 0) : 0, // 0 represents None/full account
          precio_aplicado: parseFloat(String(d.precio_aplicado)),
          tipo_unidad: d.perfil_id_present ? "PANTALLA" : "CUENTA",
          nombre_perfil: d.nombre_perfil || null,
          pin: d.pin || null
        };
      });

      saleUpdateData.detalles = detallesUpdates;

      // 3. Prepare credentials updates (fixing typos)
      const credencialesUpdates: any[] = [];
      const perfilesUpdates: any[] = []; // Empty, as profile updates are handled directly by update_venta API

      detailsList.forEach(d => {
        if (d.cred_id && (d.email !== d.originalEmail || d.password !== d.originalPassword)) {
          credencialesUpdates.push({
            id: d.cred_id,
            email: d.email,
            password: d.password
          });
        }
      });

      const accessUpdates = {
        credencialesUpdates,
        perfilesUpdates
      };

      await onSubmit(selectedSale.id, saleUpdateData, accessUpdates);
      setSuccess('¡Transacción y accesos actualizados correctamente!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error al actualizar la transacción.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedSale) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar Transacción (Venta #${selectedSale.id})`} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold">
            {success}
          </div>
        )}

        {/* DATOS GENERALES DE LA TRANSACCIÓN */}
        <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Información General</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Buscador de Cliente */}
            <div className="relative" ref={dropdownRef}>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Cliente</label>
              <div className="relative">
                <Input
                  placeholder="Buscar cliente por nombre o celular..."
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setShowClientDropdown(true);
                    if (!e.target.value) setClienteId('');
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  leftIcon={<Search className="w-4 h-4 text-slate-500" />}
                />
              </div>

              {showClientDropdown && (
                <div className="absolute z-50 w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-850">
                  {filteredClientes.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">No se encontraron clientes</div>
                  ) : (
                    filteredClientes.map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCliente(c)}
                        className={`p-2.5 text-xs text-slate-350 hover:text-slate-100 hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          clienteId === String(c.id) ? 'bg-cyan-500/10 text-cyan-400 font-bold' : ''
                        }`}
                      >
                        {c.nombre} <span className="text-[10px] text-slate-500 font-mono">({c.telefono})</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Fecha de Inicio */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Fecha de Inicio</label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => handleFechaInicioChange(e.target.value)}
                required
              />
            </div>

            {/* Fecha de Corte */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Fecha de Corte</label>
              <Input
                type="date"
                value={fechaCorte}
                onChange={(e) => setFechaCorte(e.target.value)}
                required
              />
            </div>

            {/* Monto Total */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Monto Total ($ COP)</label>
              <Input
                type="number"
                value={montoTotal}
                onChange={(e) => setMontoTotal(e.target.value === '' ? '' : parseFloat(e.target.value))}
                min="0"
                step="any"
                required
              />
            </div>

            {/* Estado de Pago */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Estado de Pago</label>
              <Select
                value={estadoPago}
                onChange={(e) => setEstadoPago(e.target.value)}
                required
              >
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="PAGO_PARCIAL">PAGO_PARCIAL</option>
                <option value="PAGADO">PAGADO</option>
                <option value="DIAS_ESPERA">DIAS_ESPERA</option>
              </Select>
            </div>

            {/* Nota / Observaciones */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-400 block">Nota / Observaciones de la Venta</label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Escribe alguna observación o nota para esta venta..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none h-16 resize-none"
              />
            </div>

          </div>
        </div>

        {/* ACCESOS (CREDENCIALES Y PERFILES) */}
        <div className="bg-slate-955/20 p-4 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Credenciales y Accesos</h3>
          
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {detailsList.map((d, index) => {
              // Filters
              const platformCuentas = cuentas.filter(c => c.plataforma_id === d.plataforma_id && c.estado === 'ACTIVA');
              const selectedAccount = cuentas.find(c => c.id === d.cuenta_madre_id);
              const accountPerfiles = selectedAccount ? selectedAccount.perfiles : [];

              return (
                <div key={d.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-850/60 pb-2">
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-wide">
                      Servicio #{index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <select
                        value={d.perfil_id_present ? "PANTALLA" : "CUENTA"}
                        onChange={(e) => handleTypeChange(index, e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-350 focus:outline-none"
                      >
                        <option value="PANTALLA">Pantalla Individual</option>
                        <option value="CUENTA">Cuenta Completa</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteDetail(index)}
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300 focus:outline-none flex items-center gap-1 cursor-pointer bg-transparent border-none"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    
                    {/* Platform Selector */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Plataforma</label>
                      <Select
                        value={d.plataforma_id}
                        onChange={(e) => handlePlatformChange(index, parseInt(e.target.value))}
                        className="!py-2 !px-2.5 min-h-[38px] text-xs bg-slate-900 border-slate-800 text-slate-200"
                      >
                        {plataformas.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </Select>
                    </div>

                    {/* Account Selector */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Cuenta (Correo)</label>
                      <Select
                        value={d.cuenta_madre_id || ''}
                        onChange={(e) => handleAccountChange(index, parseInt(e.target.value))}
                        className="!py-2 !px-2.5 min-h-[38px] text-xs bg-slate-900 border-slate-800 text-slate-200"
                      >
                        <option value="">-- Seleccionar cuenta --</option>
                        {platformCuentas.map(c => {
                          const cred = credenciales.find(cr => cr.id === c.credencial_id);
                          return (
                            <option key={c.id} value={c.id}>
                              {cred?.email || `Cuenta #${c.id}`}
                            </option>
                          );
                        })}
                      </Select>
                    </div>

                    {/* Profile Selector */}
                    {d.perfil_id_present ? (
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Perfil / Pantalla</label>
                        <Select
                          value={d.perfil_id || ''}
                          onChange={(e) => handleProfileChange(index, parseInt(e.target.value))}
                          className="!py-2 !px-2.5 min-h-[38px] text-xs bg-slate-900 border-slate-800 text-slate-200"
                        >
                          <option value="">-- Seleccionar perfil --</option>
                          {accountPerfiles.map(p => {
                            const isThisPerf = p.id === d.originalPerfilId;
                            const statusText = isThisPerf 
                              ? ' (Actual)' 
                              : p.asignado 
                                ? ' (Ocupado)' 
                                : ' (Disponible)';
                            return (
                              <option key={p.id} value={p.id} disabled={p.asignado && !isThisPerf}>
                                {p.nombre_perfil}{statusText}
                              </option>
                            );
                          })}
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-end pb-2">
                        <span className="text-[11px] text-sky-400 italic font-semibold">Acceso Completo (Cuenta entera)</span>
                      </div>
                    )}

                    {/* Price Input */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Valor ($ COP)</label>
                      <input
                        type="number"
                        value={d.precio_aplicado}
                        onChange={(e) => handlePriceChange(index, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 min-h-[38px] text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                        required
                        min="0"
                        step="any"
                      />
                    </div>

                  </div>

                  {/* CREDENTIAL EDIT FIELDS (Allows fixing typos) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
                    <div>
                      <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Correo de Acceso (Modificar)</label>
                      <input
                        type="text"
                        value={d.email}
                        onChange={(e) => handleDetailTextChange(index, 'email', e.target.value)}
                        disabled={d.isCorreosA}
                        title={d.isCorreosA ? "Los correos propios no se pueden modificar desde aquí" : ""}
                        className="w-full bg-slate-955 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-350 font-mono focus:border-cyan-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Contraseña de Acceso (Modificar)</label>
                      <div className="relative">
                        <input
                          type={showPasswords[String(d.id)] ? "text" : "password"}
                          value={d.password}
                          onChange={(e) => handleDetailTextChange(index, 'password', e.target.value)}
                          disabled={d.isCorreosA}
                          title={d.isCorreosA ? "Las claves de plataforma no se pueden modificar desde aquí" : ""}
                          className="w-full bg-slate-955 border border-slate-800 rounded pl-2.5 pr-8 py-1.5 text-xs text-slate-355 font-mono focus:border-cyan-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, [String(d.id)]: !prev[String(d.id)] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer p-0"
                        >
                          {showPasswords[String(d.id)] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {d.perfil_id_present && (
                      <>
                        <div>
                          <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Nombre Perfil (Modificar)</label>
                          <input
                            type="text"
                            value={d.nombre_perfil}
                            onChange={(e) => handleDetailTextChange(index, 'nombre_perfil', e.target.value)}
                            className="w-full bg-slate-955 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 font-sans focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">PIN (Modificar)</label>
                          <input
                            type="text"
                            value={d.pin}
                            onChange={(e) => handleDetailTextChange(index, 'pin', e.target.value)}
                            placeholder="Vacío o PIN"
                            className="w-full bg-slate-955 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleAddDetail}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-400/20 rounded-xl transition-all cursor-pointer text-xs"
              >
                + Añadir Servicio
              </button>
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-850">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold">
            {loading ? 'Procesando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
