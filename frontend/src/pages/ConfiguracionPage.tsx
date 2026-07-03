import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import api from '../api/axios';
import { Save, MessageSquare, Edit2, Info } from 'lucide-react';

interface Plantilla {
  id: number;
  nombre: string;
  mensaje: string;
}

export default function ConfiguracionPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlantilla, setSelectedPlantilla] = useState<Plantilla | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formMensaje, setFormMensaje] = useState('');
  const [formError, setFormError] = useState('');

  const fetchPlantillas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/plantillas/');
      setPlantillas(res.data);
    } catch (err: any) {
      setError('Error al cargar las plantillas de WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlantillas();
  }, []);

  const handleOpenEdit = (plantilla: Plantilla) => {
    setSelectedPlantilla(plantilla);
    setFormNombre(plantilla.nombre);
    setFormMensaje(plantilla.mensaje);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlantilla) return;
    setFormError('');

    try {
      await api.put(`/plantillas/${selectedPlantilla.id}`, {
        nombre: formNombre,
        mensaje: formMensaje,
      });
      fetchPlantillas();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al guardar la plantilla.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">
          Ajustes del ERP y personalización de las plantillas base de notificaciones de WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Sección Plantillas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-200">Plantillas de Notificación WhatsApp</h2>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Opción A Elegida
            </span>
          </div>

          <Card className="bg-slate-900/40">
            <div className="flex gap-3 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl mb-4">
              <Info className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold mb-0.5">Soporte de Variables Dinámicas:</p>
                <p className="text-slate-400">
                  Puedes incluir variables dentro del mensaje que se reemplazarán automáticamente al enviar:
                </p>
                <ul className="list-disc pl-4 mt-1 text-slate-400 space-y-0.5">
                  <li><code className="text-cyan-300 font-mono">[Nombre Cliente]</code>: Nombre del destinatario de la venta.</li>
                  <li><code className="text-cyan-300 font-mono">[Email]</code>: Correo de acceso asignado del perfil de streaming.</li>
                  <li><code className="text-cyan-300 font-mono">[PIN]</code>: Código PIN del perfil asignado.</li>
                  <li><code className="text-cyan-300 font-mono">[Fecha Corte]</code>: Fecha de vencimiento / cobro de la cuenta.</li>
                </ul>
              </div>
            </div>

            {loading ? (
              <p className="text-slate-400 text-sm py-4">Cargando plantillas...</p>
            ) : error ? (
              <p className="text-red-400 text-sm py-4">{error}</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {plantillas.map((plantilla) => (
                  <div key={plantilla.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-bold text-slate-200">{plantilla.nombre}</h4>
                      </div>
                      <p className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 font-mono whitespace-pre-wrap leading-relaxed">
                        {plantilla.mensaje}
                      </p>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      className="shrink-0 sm:self-start"
                      onClick={() => handleOpenEdit(plantilla)}
                    >
                      Editar Mensaje
                    </Button>
                  </div>
                ))}
                {plantillas.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-6">
                    No hay plantillas de WhatsApp registradas en la base de datos.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal de Edición de Plantilla */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modificar Plantilla de WhatsApp"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
              Guardar Cambios
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <p className="text-xs text-red-400 font-semibold">{formError}</p>
          )}

          <Input
            label="Identificador de Plantilla"
            value={formNombre}
            onChange={(e) => setFormNombre(e.target.value)}
            required
            disabled
          />

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-medium text-slate-400">Contenido del Mensaje</label>
            <textarea
              className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 rounded-xl py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-300 min-h-[140px] font-mono leading-relaxed"
              placeholder="Escribe el mensaje de WhatsApp..."
              value={formMensaje}
              onChange={(e) => setFormMensaje(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
