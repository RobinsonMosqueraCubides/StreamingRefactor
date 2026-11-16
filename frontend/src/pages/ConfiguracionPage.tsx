import { useState, useEffect, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import api from '../api/axios';
import {
  Save, MessageSquare, Edit2, Info, Plus, Trash2, Sparkles, RotateCcw, Eye
} from 'lucide-react';
import { useMetadata } from '../context/MetadataContext';

interface Plantilla {
  id: number;
  nombre: string;
  mensaje: string;
}

const SYSTEM_TEMPLATES_META: Record<string, { label: string; trigger: string; badge: string; defaultMsg: string }> = {
  compra: {
    label: 'Mensaje de Compra (Entrega de Accesos)',
    trigger: 'Se envía automáticamente al confirmar una venta nueva desde el POS.',
    badge: 'Automático · Compra',
    defaultMsg:
      'Hola *{cliente}*, aquí tienes los accesos para tus suscripciones de streaming:\n\n{detalle_accesos}Fecha de Vencimiento: *{fecha_corte}*\n\n¡Gracias por tu confianza y preferencia! 🚀',
  },
  cambio_credenciales: {
    label: 'Reenvío de Accesos / Cambio de Credenciales',
    trigger: 'Se envía al reenviar accesos desde el Historial o tras aplicar una garantía.',
    badge: 'Automático · Accesos',
    defaultMsg:
      'Hola {cliente}, aquí tienes tus credenciales para {plataforma}:\n• Correo: {usuario}\n• Clave: {password}\n• Perfil: {perfil}\n• PIN: {pin}\nFecha de corte: {fecha_corte}',
  },
  cobro: {
    label: 'Recordatorio de Cobro (Próximo a Vencer)',
    trigger: 'Se envía desde el Historial cuando la suscripción está próxima a vencer.',
    badge: 'Automático · Cobro',
    defaultMsg:
      'Hola {cliente}, te recordamos que tu suscripción de {plataforma} vence pronto ({fecha_corte}). Puedes renovarla realizando el pago de {monto} COP.',
  },
  corte: {
    label: 'Notificación de Corte (Vencida)',
    trigger: 'Se envía cuando la suscripción llega a su fecha de corte o se suspende.',
    badge: 'Automático · Corte',
    defaultMsg:
      'Hola {cliente}, tu suscripción de {plataforma} ha vencido ({fecha_corte}) y los perfiles asociados han sido suspendidos. Realiza tu pago de {monto} COP para reactivarlos.',
  },
};

const AVAILABLE_VARS = [
  { token: '{cliente}', desc: 'Primer nombre del cliente' },
  { token: '{nombre_completo}', desc: 'Nombre completo' },
  { token: '{plataforma}', desc: 'Nombre de la plataforma' },
  { token: '{usuario}', desc: 'Correo de acceso' },
  { token: '{password}', desc: 'Contraseña de acceso' },
  { token: '{perfil}', desc: 'Nombre del perfil' },
  { token: '{pin}', desc: 'PIN del perfil' },
  { token: '{monto}', desc: 'Valor en COP' },
  { token: '{fecha_inicio}', desc: 'Fecha inicio/renovación' },
  { token: '{fecha_corte}', desc: 'Fecha de vencimiento' },
  { token: '{detalle_accesos}', desc: 'Bloque de accesos (Compra)' },
];

const renderPreview = (text: string) => {
  const sampleAcceso =
    '*1. Netflix*\n   • Correo: `cuenta@ejemplo.com`\n   • Clave: `Clave123`\n   • Perfil (Usuario): *Juan*\n   • PIN: *1234*\n\n';
  return text
    .replace(/\[Nombre Cliente\]|\{cliente\}/g, 'Juan')
    .replace(/\{nombre_completo\}/g, 'Juan Pérez')
    .replace(/\[Plataforma\]|\{plataforma\}/g, 'Netflix')
    .replace(/\[Email\]|\{usuario\}|\{email\}/g, 'cuenta@ejemplo.com')
    .replace(/\[Clave\]|\{password\}|\{clave\}/g, 'Clave123')
    .replace(/\[Perfil\]|\{perfil\}/g, 'Juan')
    .replace(/\[PIN\]|\{pin\}/g, '1234')
    .replace(/\[Monto\]|\{monto\}/g, '15,000.00')
    .replace(/\[Fecha Inicio\]|\{fecha_inicio\}/g, '2026-11-15')
    .replace(/\[Fecha Corte\]|\{fecha_corte\}/g, '2026-12-15')
    .replace(/\{detalle_accesos\}/g, sampleAcceso);
};

export default function ConfiguracionPage() {
  const { refreshMetadata } = useMetadata();
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal State (create or edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('edit');
  const [selectedPlantilla, setSelectedPlantilla] = useState<Plantilla | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formMensaje, setFormMensaje] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchPlantillas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/plantillas/');
      setPlantillas(res.data);
    } catch {
      setError('Error al cargar las plantillas de WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlantillas();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedPlantilla(null);
    setFormNombre('');
    setFormMensaje('Hola {cliente}, ');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plantilla: Plantilla) => {
    setModalMode('edit');
    setSelectedPlantilla(plantilla);
    setFormNombre(plantilla.nombre);
    setFormMensaje(plantilla.mensaje);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleInsertVar = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      setFormMensaje(prev => prev + token);
      return;
    }
    const start = el.selectionStart ?? formMensaje.length;
    const end = el.selectionEnd ?? formMensaje.length;
    const updated = formMensaje.slice(0, start) + token + formMensaje.slice(end);
    setFormMensaje(updated);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const handleRestoreDefault = () => {
    const meta = SYSTEM_TEMPLATES_META[formNombre];
    if (meta) {
      setFormMensaje(meta.defaultMsg);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cleanName = formNombre.trim();
    const cleanMsg = formMensaje.trim();
    if (!cleanName || !cleanMsg) {
      setFormError('El nombre y el contenido del mensaje son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        await api.post('/plantillas/', {
          nombre: cleanName,
          mensaje: cleanMsg,
        });
      } else if (selectedPlantilla) {
        await api.put(`/plantillas/${selectedPlantilla.id}`, {
          nombre: cleanName,
          mensaje: cleanMsg,
        });
      }
      await fetchPlantillas();
      await refreshMetadata();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al guardar la plantilla.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plantilla: Plantilla) => {
    if (!window.confirm(`¿Eliminar la plantilla "${plantilla.nombre}"?`)) return;
    try {
      await api.delete(`/plantillas/${plantilla.id}`);
      await fetchPlantillas();
      await refreshMetadata();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar la plantilla.');
    }
  };

  const systemPlantillas = plantillas.filter(p => p.nombre in SYSTEM_TEMPLATES_META);
  const customPlantillas = plantillas.filter(p => !(p.nombre in SYSTEM_TEMPLATES_META));
  const isSystemEditing = modalMode === 'edit' && formNombre in SYSTEM_TEMPLATES_META;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Mensajes Personalizados</h1>
          <p className="text-slate-400 text-sm mt-1">
            Personaliza los mensajes automáticos de compra, accesos, cobro y corte, o crea tus propias plantillas de WhatsApp.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
        >
          Nueva Plantilla
        </Button>
      </div>

      {/* Guía de Variables */}
      <Card className="bg-slate-900/40">
        <div className="flex gap-3 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold">Variables Dinámicas Disponibles:</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARS.map(v => (
                <span
                  key={v.token}
                  className="inline-flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-2.5 py-1 rounded-lg text-[11px]"
                >
                  <code className="text-cyan-300 font-mono font-bold">{v.token}</code>
                  <span className="text-slate-400">· {v.desc}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <p className="text-slate-400 text-sm py-4">Cargando plantillas...</p>
      ) : error ? (
        <p className="text-red-400 text-sm py-4">{error}</p>
      ) : (
        <div className="space-y-6">
          {/* Mensajes Automáticos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" /> Mensajes Automáticos del Sistema
              </h2>
              <span className="text-xs text-slate-500">{systemPlantillas.length} plantillas activas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemPlantillas.map((plantilla) => {
                const meta = SYSTEM_TEMPLATES_META[plantilla.nombre];
                return (
                  <Card key={plantilla.id} className="bg-slate-900/50 border border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                            {meta.badge}
                          </span>
                          <h3 className="font-bold text-slate-100 text-base mt-1.5">{meta.label}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{meta.trigger}</p>
                        </div>
                      </div>
                      <pre className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono whitespace-pre-wrap leading-relaxed">
                        {plantilla.mensaje}
                      </pre>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-slate-800/70">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenEdit(plantilla)}
                      >
                        Editar Mensaje
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Plantillas Personalizadas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" /> Plantillas Personalizadas
              </h2>
              <span className="text-xs text-slate-500">{customPlantillas.length} creadas</span>
            </div>

            {customPlantillas.length === 0 ? (
              <Card className="bg-slate-900/30 border border-dashed border-slate-800 text-center py-8">
                <p className="text-sm text-slate-400">No has creado plantillas personalizadas adicionales.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Crea mensajes de bienvenida, promociones, soporte o avisos para enviarlos rápidamente desde el historial de ventas.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customPlantillas.map((plantilla) => (
                  <Card key={plantilla.id} className="bg-slate-900/50 border border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-purple-400" />
                          {plantilla.nombre}
                        </h3>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">
                          Personalizada
                        </span>
                      </div>
                      <pre className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono whitespace-pre-wrap leading-relaxed">
                        {plantilla.mensaje}
                      </pre>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/70">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                        onClick={() => handleDelete(plantilla)}
                      >
                        Eliminar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenEdit(plantilla)}
                      >
                        Editar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Creación / Edición de Plantilla */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Crear Nueva Plantilla de WhatsApp' : 'Editar Plantilla de WhatsApp'}
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <div>
              {isSystemEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={handleRestoreDefault}
                >
                  Restaurar por defecto
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <p className="text-xs text-red-400 font-semibold">{formError}</p>
          )}

          <Input
            label={isSystemEditing ? 'Identificador del Sistema' : 'Nombre de la Plantilla'}
            placeholder="Ej: bienvenida, promo_fin_de_mes, soporte"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
            required
            disabled={isSystemEditing}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 block">Insertar variable rápida:</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_VARS.map(v => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => handleInsertVar(v.token)}
                  title={v.desc}
                  className="text-[11px] font-mono bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  {v.token}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-medium text-slate-400">Contenido del Mensaje</label>
            <textarea
              ref={textareaRef}
              className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 rounded-xl py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-300 min-h-[150px] font-mono leading-relaxed"
              placeholder="Escribe el mensaje de WhatsApp..."
              value={formMensaje}
              onChange={(e) => setFormMensaje(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" /> Vista Previa (Ejemplo):
            </p>
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {renderPreview(formMensaje)}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
