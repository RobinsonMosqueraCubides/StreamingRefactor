import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function InventarioPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Inventario</h1>
          <p className="text-slate-400 text-sm mt-1">Cuentas Madre, Credenciales y Perfiles disponibles.</p>
        </div>
        <Button variant="primary">Nueva Cuenta Madre</Button>
      </div>

      <Card>
        <p className="text-slate-400 text-sm text-center py-8">
          Próximamente: Lista expandible de Cuentas Madre con sus perfiles asíncronos en tiempo real.
        </p>
      </Card>
    </div>
  );
}
