import Button from '../../components/ui/Button';
import { Users, Trash2, Edit2, AlertTriangle } from 'lucide-react';

interface Proveedor {
  id: number;
  nombre: string;
  telefono: string;
  saldo_a_favor: number;
}

interface ProveedoresTabProps {
  proveedores: Proveedor[];
  onOpenAdd: () => void;
  onOpenEdit: (p: Proveedor) => void;
  onDelete: (id: number) => Promise<void>;
}

export default function ProveedoresTab({
  proveedores,
  onOpenAdd,
  onOpenEdit,
  onDelete
}: ProveedoresTabProps) {

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este proveedor?')) {
      await onDelete(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-850">
        <div>
          <h2 className="text-sm font-bold text-slate-200">Listado de Proveedores</h2>
          <p className="text-xs text-slate-500">Administra los contactos comerciales de compra de cuentas.</p>
        </div>
        <Button 
          onClick={onOpenAdd} 
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
        >
          <Users className="w-4 h-4" /> Agregar Proveedor
        </Button>
      </div>

      {proveedores.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-600" />
          <p className="font-semibold text-sm">No se encontraron proveedores registrados</p>
          <p className="text-xs">Añade uno nuevo para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {proveedores.map((p) => (
            <div 
              key={p.id} 
              className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-200">{p.nombre}</p>
                <p className="text-xs text-slate-500">Teléfono: <strong>{p.telefono}</strong></p>
                <p className="text-xs text-slate-400">
                  Saldo a Favor: <strong className="text-cyan-400 font-mono">${p.saldo_a_favor.toLocaleString('es-CO')} COP</strong>
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-850/50 justify-end">
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
