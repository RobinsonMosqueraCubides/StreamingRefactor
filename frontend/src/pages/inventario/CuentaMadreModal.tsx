import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import api from '../../api/axios';
import { AlertCircle, Plus, Eye, EyeOff } from 'lucide-react';

import type { Proveedor, Plataforma, Credencial, CuentaMadre } from '../../types';

interface CuentaMadreModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedores: Proveedor[];
  plataformas: Plataforma[];
  credenciales: Credencial[];
  onSuccess: () => Promise<void>;
  cuentaAEditar?: CuentaMadre | null;
}

export default function CuentaMadreModal({
  isOpen,
  onClose,
  proveedores,
  plataformas,
  credenciales,
  onSuccess,
  cuentaAEditar = null
}: CuentaMadreModalProps) {
  const [formProveedorId, setFormProveedorId] = useState('');
  const [formPlataformaId, setFormPlataformaId] = useState('');
  const [formCredencialId, setFormCredencialId] = useState('');
  const [formMaxPerfiles, setFormMaxPerfiles] = useState<number | "">(5);
  const [formPrecioCompra, setFormPrecioCompra] = useState<number | "">(30000);
  const [formFechaCompra, setFormFechaCompra] = useState(new Date().toISOString().split('T')[0]);
  const [formFechaVencimiento, setFormFechaVencimiento] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  );
  const [formEntidadPago, setFormEntidadPago] = useState('NEQUI');
  const [formEstado, setFormEstado] = useState('ACTIVA');
  const [editCredEmail, setEditCredEmail] = useState('');
  const [editCredPassword, setEditCredPassword] = useState('');
  const [showEditCredPassword, setShowEditCredPassword] = useState(false);

  // Hot creates
  const [createNewCred, setCreateNewCred] = useState(false);
  const [newCredEmail, setNewCredEmail] = useState('');
  const [newCredPassword, setNewCredPassword] = useState('');
  const [showCredPassword, setShowCredPassword] = useState(false);

  const [createNewProv, setCreateNewProv] = useState(false);
  const [newProvNombre, setNewProvNombre] = useState('');
  const [newProvTelefono, setNewProvTelefono] = useState('');

  const [createNewPlat, setCreateNewPlat] = useState(false);
  const [newPlatNombre, setNewPlatNombre] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (cuentaAEditar) {
        setFormProveedorId(String(cuentaAEditar.proveedor_id));
        setFormPlataformaId(String(cuentaAEditar.plataforma_id));
        setFormCredencialId(String(cuentaAEditar.credencial_id));
        setFormMaxPerfiles(cuentaAEditar.max_perfiles);
        setFormPrecioCompra(Number(cuentaAEditar.precio_compra));
        setFormFechaCompra(cuentaAEditar.fecha_compra);
        setFormFechaVencimiento(cuentaAEditar.fecha_vencimiento);
        setFormEstado(cuentaAEditar.estado);
        setFormEntidadPago('NEQUI');

        const currentCred = credenciales.find(c => c.id === cuentaAEditar.credencial_id);
        if (currentCred) {
          setEditCredEmail(currentCred.email);
          setEditCredPassword(currentCred.password || '');
        } else {
          setEditCredEmail('');
          setEditCredPassword('');
        }
        setShowEditCredPassword(false);
      } else {
        if (proveedores.length > 0) setFormProveedorId(String(proveedores[0].id));
        if (plataformas.length > 0) setFormPlataformaId(String(plataformas[0].id));
        if (credenciales.length > 0) setFormCredencialId(String(credenciales[0].id));

        setFormMaxPerfiles(5);
        setFormPrecioCompra(30000);
        setFormFechaCompra(new Date().toISOString().split('T')[0]);
        setFormFechaVencimiento(new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]);
        setFormEntidadPago('NEQUI');
        setFormEstado('ACTIVA');
        setEditCredEmail('');
        setEditCredPassword('');
        setShowEditCredPassword(false);
      }

      setCreateNewCred(false);
      setCreateNewProv(false);
      setCreateNewPlat(false);
      setNewCredEmail('');
      setNewCredPassword('');
      setNewProvNombre('');
      setNewProvTelefono('');
      setNewPlatNombre('');
      setError('');
      setShowCredPassword(false);
    }
  }, [isOpen, proveedores, plataformas, credenciales, cuentaAEditar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let finalProveedorId = parseInt(formProveedorId);
      let finalPlataformaId = parseInt(formPlataformaId);
      let finalCredencialId = parseInt(formCredencialId);

      // 1. Crear proveedor en caliente
      if (createNewProv) {
        if (!newProvNombre || !newProvTelefono) {
          setError('Completa el nombre y teléfono del nuevo proveedor.');
          setLoading(false);
          return;
        }
        const provRes = await api.post('/proveedores/', {
          nombre: newProvNombre,
          telefono: newProvTelefono,
          saldo_a_favor: 0.0
        });
        finalProveedorId = provRes.data.id;
      }

      // 2. Crear plataforma en caliente
      if (createNewPlat) {
        if (!newPlatNombre) {
          setError('Completa el nombre de la nueva plataforma.');
          setLoading(false);
          return;
        }
        const platRes = await api.post('/plataformas/', {
          nombre: newPlatNombre
        });
        finalPlataformaId = platRes.data.id;
      }

      // 3. Crear credencial en caliente (con toggle para ocultar contraseña en DOM si es necesario, pero aquí es ingreso)
      if (createNewCred) {
        if (!newCredEmail || !newCredPassword) {
          setError('Completa el correo y la contraseña de la nueva credencial.');
          setLoading(false);
          return;
        }
        const credRes = await api.post('/credenciales/', {
          email: newCredEmail,
          password: newCredPassword,
        });
        finalCredencialId = credRes.data.id;
      }

      if (!finalProveedorId) {
        setError('Debes seleccionar o crear un proveedor.');
        setLoading(false);
        return;
      }
      if (!finalPlataformaId) {
        setError('Debes seleccionar o crear una plataforma.');
        setLoading(false);
        return;
      }
      if (!finalCredencialId) {
        setError('Debes seleccionar o crear una credencial.');
        setLoading(false);
        return;
      }

      const payload: any = {
        proveedor_id: finalProveedorId,
        credencial_id: finalCredencialId,
        plataforma_id: finalPlataformaId,
        max_perfiles: Number(formMaxPerfiles) || 0,
        precio_compra: Number(formPrecioCompra) || 0,
        fecha_compra: formFechaCompra,
        fecha_vencimiento: formFechaVencimiento,
        estado: cuentaAEditar ? formEstado : 'ACTIVA',
      };

      if (cuentaAEditar) {
        // 1. Actualizar primero la credencial asociada
        await api.put(`/credenciales/${cuentaAEditar.credencial_id}`, {
          email: editCredEmail,
          password: editCredPassword,
        });

        // 2. Actualizar la cuenta madre
        await api.put(`/cuentas_madre/${cuentaAEditar.id}`, payload);
      } else {
        payload.entidad_pago = formEntidadPago;
        await api.post('/cuentas_madre/', payload);
      }
      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar la Cuenta Madre.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={cuentaAEditar ? "Editar Cuenta Madre" : "Registrar Nueva Cuenta Madre"}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PROVEEDOR */}
        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proveedor</span>
            <button
              type="button"
              onClick={() => setCreateNewProv(!createNewProv)}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 focus:outline-none flex items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              <Plus className="w-3.5 h-3.5" />
              {createNewProv ? 'Seleccionar Existente' : 'Crear Nuevo'}
            </button>
          </div>

          {createNewProv ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombre del Proveedor"
                placeholder="Nombre del Proveedor..."
                value={newProvNombre}
                onChange={(e) => setNewProvNombre(e.target.value)}
                required
              />
              <Input
                label="Celular/WhatsApp"
                placeholder="+57..."
                value={newProvTelefono}
                onChange={(e) => setNewProvTelefono(e.target.value)}
                required
              />
            </div>
          ) : (
            <Select
              label="Seleccionar Proveedor"
              value={formProveedorId}
              onChange={(e) => setFormProveedorId(e.target.value)}
            >
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Select>
          )}
        </div>

        {/* PLATAFORMA */}
        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plataforma</span>
            <button
              type="button"
              onClick={() => setCreateNewPlat(!createNewPlat)}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 focus:outline-none flex items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              <Plus className="w-3.5 h-3.5" />
              {createNewPlat ? 'Seleccionar Existente' : 'Crear Nueva'}
            </button>
          </div>

          {createNewPlat ? (
            <Input
              label="Nombre de la Plataforma"
              placeholder="Netflix, Disney+, Max..."
              value={newPlatNombre}
              onChange={(e) => setNewPlatNombre(e.target.value)}
              required
            />
          ) : (
            <Select
              label="Seleccionar Plataforma"
              value={formPlataformaId}
              onChange={(e) => setFormPlataformaId(e.target.value)}
            >
              {plataformas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Select>
          )}
        </div>

        {/* CREDENCIALES (CUENTA) */}
        {cuentaAEditar ? (
          <div className="bg-slate-955/40 p-3 rounded-xl border border-slate-850 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Credenciales de Acceso</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Usuario (Email)"
                placeholder="ejemplo@gmail.com"
                type="email"
                value={editCredEmail}
                onChange={(e) => setEditCredEmail(e.target.value)}
                required
              />
              <div className="relative">
                <Input
                  label="Contraseña"
                  placeholder="••••••••"
                  type={showEditCredPassword ? 'text' : 'password'}
                  value={editCredPassword}
                  onChange={(e) => setEditCredPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowEditCredPassword(!showEditCredPassword)}
                  className="absolute right-2.5 top-8.5 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer bg-transparent border-none"
                >
                  {showEditCredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-955/40 p-3 rounded-xl border border-slate-850 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Credenciales de Acceso</span>
              <button
                type="button"
                onClick={() => setCreateNewCred(!createNewCred)}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 focus:outline-none flex items-center gap-1 cursor-pointer bg-transparent border-none"
              >
                <Plus className="w-3.5 h-3.5" />
                {createNewCred ? 'Seleccionar Existente' : 'Crear Nueva'}
              </button>
            </div>

            {createNewCred ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Usuario (Email)"
                  placeholder="ejemplo@gmail.com"
                  type="email"
                  value={newCredEmail}
                  onChange={(e) => setNewCredEmail(e.target.value)}
                  required
                />
                <div className="relative">
                  <Input
                    label="Contraseña"
                    placeholder="••••••••"
                    type={showCredPassword ? 'text' : 'password'}
                    value={newCredPassword}
                    onChange={(e) => setNewCredPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCredPassword(!showCredPassword)}
                    className="absolute right-2.5 top-8.5 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer bg-transparent border-none"
                  >
                    {showCredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <Select
                label="Seleccionar Credencial"
                value={formCredencialId}
                onChange={(e) => setFormCredencialId(e.target.value)}
              >
                {credenciales.map((c) => (
                  <option key={c.id} value={c.id}>{c.email}</option>
                ))}
              </Select>
            )}
          </div>
        )}

        {/* METADATOS CUENTA MADRE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Máx Perfiles"
            type="number"
            value={formMaxPerfiles}
            onChange={(e) => {
              const val = e.target.value;
              setFormMaxPerfiles(val === "" ? "" : parseInt(val) || 0);
            }}
            min="1"
            required
          />
          <Input
            label="Precio Compra (COP)"
            type="number"
            value={formPrecioCompra}
            onChange={(e) => {
              const val = e.target.value;
              setFormPrecioCompra(val === "" ? "" : parseFloat(val) || 0);
            }}
            min="0"
            required
          />
          {cuentaAEditar ? (
            <Select
              label="Estado de la Cuenta"
              value={formEstado}
              onChange={(e) => setFormEstado(e.target.value)}
            >
              <option value="ACTIVA">Activa</option>
              <option value="RENOVADA">Renovada</option>
              <option value="VENCIDA">Vencida</option>
              <option value="CAIDA">Caída</option>
            </Select>
          ) : (
            <Select
              label="Caja de Pago"
              value={formEntidadPago}
              onChange={(e) => setFormEntidadPago(e.target.value)}
            >
              <option value="NEQUI">Nequi</option>
              <option value="DAVIPLATA">Daviplata</option>
              <option value="BANCOLOMBIA">Bancolombia</option>
              <option value="NU_BANK">Nu Bank</option>
              <option value="EFECTIVO">Efectivo</option>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">
            {loading ? (cuentaAEditar ? 'Guardando...' : 'Registrando...') : (cuentaAEditar ? 'Guardar Cambios' : 'Registrar Cuenta')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
