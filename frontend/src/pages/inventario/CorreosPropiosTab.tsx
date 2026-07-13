import { useState, useMemo } from 'react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import api from '../../api/axios';
import { Mail, Trash2, Edit2, AlertTriangle, Plus, Eye, EyeOff, Calendar, User, Phone, CheckSquare } from 'lucide-react';

interface CorreoPropio {
  id: number;
  correo_gmail: str;
  password_gmail: str;
  correo_verificacion?: string;
  numero_asociado?: string;
  ultimo_ingreso?: string;
  pide_validacion: boolean;
  nota?: string;
  notas_pago_netflix?: string;
  nombre_correo?: string;
  fecha_nacimiento?: string;
  sexo?: string;
}

interface CorreosPropiosTabProps {
  correosPropios: CorreoPropio[];
  onRefresh: () => Promise<void>;
}

export default function CorreosPropiosTab({
  correosPropios,
  onRefresh
}: CorreosPropiosTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCorreo, setEditingCorreo] = useState<CorreoPropio | null>(null);
  const [showPassword, setShowPassword] = useState<{[key: number]: boolean}>({});

  // Form states
  const [formCorreoGmail, setFormCorreoGmail] = useState('');
  const [formPasswordGmail, setFormPasswordGmail] = useState('');
  const [formCorreoVerificacion, setFormCorreoVerificacion] = useState('');
  const [formNumeroAsociado, setFormNumeroAsociado] = useState('');
  const [formUltimoIngreso, setFormUltimoIngreso] = useState('');
  const [formPideValidacion, setFormPideValidacion] = useState(false);
  const [formNota, setFormNota] = useState('');
  const [formNotasPagoNetflix, setFormNotasPagoNetflix] = useState('');
  const [formNombreCorreo, setFormNombreCorreo] = useState('');
  const [formFechaNacimiento, setFormFechaNacimiento] = useState('');
  const [formSexo, setFormSexo] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredCorreos = useMemo(() => {
    return correosPropios.filter(c => {
      const term = searchTerm.toLowerCase();
      return (
        c.correo_gmail.toLowerCase().includes(term) ||
        (c.nombre_correo && c.nombre_correo.toLowerCase().includes(term)) ||
        (c.numero_asociado && c.numero_asociado.includes(term))
      );
    });
  }, [correosPropios, searchTerm]);

  const openAddModal = () => {
    setEditingCorreo(null);
    setFormCorreoGmail('');
    setFormPasswordGmail('');
    setFormCorreoVerificacion('');
    setFormNumeroAsociado('');
    setFormUltimoIngreso('');
    setFormPideValidacion(false);
    setFormNota('');
    setFormNotasPagoNetflix('');
    setFormNombreCorreo('');
    setFormFechaNacimiento('');
    setFormSexo('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: CorreoPropio) => {
    setEditingCorreo(c);
    setFormCorreoGmail(c.correo_gmail);
    setFormPasswordGmail(c.password_gmail);
    setFormCorreoVerificacion(c.correo_verificacion || '');
    setFormNumeroAsociado(c.numero_asociado || '');
    setFormUltimoIngreso(c.ultimo_ingreso || '');
    setFormPideValidacion(c.pide_validacion);
    setFormNota(c.nota || '');
    setFormNotasPagoNetflix(c.notas_pago_netflix || '');
    setFormNombreCorreo(c.nombre_correo || '');
    setFormFechaNacimiento(c.fecha_nacimiento || '');
    setFormSexo(c.sexo || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este correo propio?')) {
      try {
        await api.delete(`/correos_propios/${id}`);
        await onRefresh();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Error al eliminar el correo propio.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      correo_gmail: formCorreoGmail,
      password_gmail: formPasswordGmail,
      correo_verificacion: formCorreoVerificacion || null,
      numero_asociado: formNumeroAsociado || null,
      ultimo_ingreso: formUltimoIngreso || null,
      pide_validacion: formPideValidacion,
      nota: formNota || null,
      notas_pago_netflix: formNotasPagoNetflix || null,
      nombre_correo: formNombreCorreo || null,
      fecha_nacimiento: formFechaNacimiento || null,
      sexo: formSexo || null
    };

    try {
      if (editingCorreo) {
        await api.put(`/correos_propios/${editingCorreo.id}`, payload);
      } else {
        await api.post('/correos_propios/', payload);
      }
      setIsModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar el correo propio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/60 p-4 rounded-xl border border-slate-850 gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-200">Listado de Correos Propios</h2>
          <p className="text-xs text-slate-500">Administra tus cuentas de Gmail registradas y vinculadas.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar correo, nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none w-full sm:w-48"
          />
          <Button 
            onClick={openAddModal} 
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Agregar Correo
          </Button>
        </div>
      </div>

      {/* Lista */}
      {filteredCorreos.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-600" />
          <p className="font-semibold text-sm">No se encontraron correos propios</p>
          <p className="text-xs">Añade uno nuevo para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCorreos.map((c) => {
            const showPw = showPassword[c.id];
            return (
              <div 
                key={c.id} 
                className={`bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 flex flex-col justify-between hover:border-slate-800 transition-colors ${
                  c.pide_validacion ? 'border-l-4 border-l-rose-500' : ''
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-cyan-400" />
                      <p className="text-sm font-bold text-slate-200 select-all">{c.correo_gmail}</p>
                    </div>
                    {c.pide_validacion && (
                      <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase">
                        Requiere Validación
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-400">
                    <p className="flex items-center gap-1.5">
                      Clave: 
                      <strong className="text-slate-300 select-all font-mono">
                        {showPw ? c.password_gmail : '••••••••'}
                      </strong>
                      <button 
                        onClick={() => setShowPassword(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                        className="text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer bg-transparent border-none"
                      >
                        {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </p>
                    {c.nombre_correo && <p>Nombre: <strong className="text-slate-300">{c.nombre_correo}</strong></p>}
                    {c.correo_verificacion && <p className="truncate">Verificación: <strong className="text-slate-350 select-all">{c.correo_verificacion}</strong></p>}
                    {c.numero_asociado && <p>Celular: <strong className="text-slate-300 select-all">{c.numero_asociado}</strong></p>}
                    {c.fecha_nacimiento && <p>Nacimiento: <strong className="text-slate-300">{c.fecha_nacimiento}</strong></p>}
                    {c.sexo && <p>Sexo: <strong className="text-slate-300">{c.sexo}</strong></p>}
                    {c.ultimo_ingreso && <p>Último Ingreso: <strong className="text-slate-300">{c.ultimo_ingreso}</strong></p>}
                  </div>

                  {(c.nota || c.notas_pago_netflix) && (
                    <div className="border-t border-slate-900/60 pt-2 space-y-1 text-[11px] text-slate-400">
                      {c.nota && <p><span className="text-slate-500 font-bold">Nota:</span> {c.nota}</p>}
                      {c.notas_pago_netflix && <p><span className="text-rose-400 font-bold">Pago Netflix:</span> {c.notas_pago_netflix}</p>}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-900/60 justify-end">
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Agregar/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCorreo ? 'Editar Correo Propio' : 'Agregar Correo Propio'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Correo Gmail"
              type="email"
              placeholder="ejemplo@gmail.com"
              value={formCorreoGmail}
              onChange={(e) => setFormCorreoGmail(e.target.value)}
              required
            />
            <Input
              label="Contraseña Gmail"
              type="text"
              placeholder="Contraseña del correo..."
              value={formPasswordGmail}
              onChange={(e) => setFormPasswordGmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Correo Verificación (Opcional)"
              type="email"
              placeholder="verificacion@gmail.com"
              value={formCorreoVerificacion}
              onChange={(e) => setFormCorreoVerificacion(e.target.value)}
            />
            <Input
              label="Número Asociado (Opcional)"
              type="text"
              placeholder="Número de celular..."
              value={formNumeroAsociado}
              onChange={(e) => setFormNumeroAsociado(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Nombre Correo (Opcional)"
              type="text"
              placeholder="Nombre de la cuenta..."
              value={formNombreCorreo}
              onChange={(e) => setFormNombreCorreo(e.target.value)}
            />
            <Input
              label="Fecha Nacimiento (Opcional)"
              type="date"
              value={formFechaNacimiento}
              onChange={(e) => setFormFechaNacimiento(e.target.value)}
            />
            <Select
              label="Sexo (Opcional)"
              value={formSexo}
              onChange={(e) => setFormSexo(e.target.value)}
            >
              <option value="">Selecciona...</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="OTRO">Otro</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Último Ingreso"
              type="date"
              value={formUltimoIngreso}
              onChange={(e) => setFormUltimoIngreso(e.target.value)}
            />
            <div className="flex items-center gap-2 mt-7">
              <input
                type="checkbox"
                id="pide_validacion"
                checked={formPideValidacion}
                onChange={(e) => setFormPideValidacion(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded border-slate-800 bg-slate-905"
              />
              <label htmlFor="pide_validacion" className="text-xs text-slate-350 cursor-pointer select-none">
                ¿Pide Validación de Gmail?
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 block">Nota General</label>
            <textarea
              value={formNota}
              onChange={(e) => setFormNota(e.target.value)}
              placeholder="Escribe alguna nota adicional..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none h-16 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 block text-rose-400">Notas Medio Pago Netflix</label>
            <textarea
              value={formNotasPagoNetflix}
              onChange={(e) => setFormNotasPagoNetflix(e.target.value)}
              placeholder="Detalles sobre el medio de pago vinculado a Netflix..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-rose-500 focus:outline-none h-16 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
