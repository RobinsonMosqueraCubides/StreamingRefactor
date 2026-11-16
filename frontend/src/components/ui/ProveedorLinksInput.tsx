import { Plus, Trash2, Link2 } from 'lucide-react';
import type { EnlaceProveedor } from '../../types';

interface ProveedorLinksInputProps {
  links: EnlaceProveedor[];
  onChange: (links: EnlaceProveedor[]) => void;
}

export default function ProveedorLinksInput({ links, onChange }: ProveedorLinksInputProps) {
  const handleAdd = () => {
    onChange([...links, { nombre: '', url: '' }]);
  };

  const handleUpdate = (index: number, field: 'nombre' | 'url', value: string) => {
    const next = links.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-cyan-400" />
          Links del Proveedor (Múltiples)
        </label>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar Link
        </button>
      </div>

      {links.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">
          No hay links agregados. Haz clic en "Agregar Link" para añadir grupos, catálogos o contactos.
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {links.map((link, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-slate-950/50 border border-slate-800 rounded-xl p-2">
              <input
                type="text"
                placeholder="Etiqueta (ej. Grupo)"
                value={link.nombre}
                onChange={(e) => handleUpdate(idx, 'nombre', e.target.value)}
                className="sm:w-1/3 bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500"
              />
              <input
                type="text"
                placeholder="https://..."
                value={link.url}
                onChange={(e) => handleUpdate(idx, 'url', e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer bg-transparent border-none self-end sm:self-center"
                title="Quitar link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
