import Button from '../../components/ui/Button';
import { Database, Trash2, Edit2, AlertTriangle } from 'lucide-react';

interface Plataforma {
  id: number;
  nombre: string;
}

interface PlataformasTabProps {
  plataformas: Plataforma[];
  onOpenAdd: () => void;
  onOpenEdit: (p: Plataforma) => void;
  onDelete: (id: number) => Promise<void>;
}

export default function PlataformasTab({
  plataformas,
  onOpenAdd,
  onOpenEdit,
  onDelete
}: PlataformasTabProps) {

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta plataforma?')) {
      await onDelete(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-850">
        <div>
          <h2 className="text-sm font-bold text-slate-200">Listado de Plataformas</h2>
          <p className="text-xs text-slate-500">Maneja las plataformas registradas en el catálogo de streaming.</p>
        </div>
        <Button 
          onClick={onOpenAdd} 
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
        >
          <Database className="w-4 h-4" /> Agregar Plataforma
        </Button>
      </div>

      {plataformas.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-600" />
          <p className="font-semibold text-sm">No se encontraron plataformas registradas</p>
          <p className="text-xs">Añade una nueva para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {plataformas.map((p) => (
            <div 
              key={p.id} 
              className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 flex justify-between items-center"
            >
              <div>
                <p className="text-sm font-bold text-slate-200">{p.nombre}</p>
                <p className="text-[10px] text-slate-500 font-mono">ID Plataforma: #{p.id}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onOpenEdit(p)}
                  className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
