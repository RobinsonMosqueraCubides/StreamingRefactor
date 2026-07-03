import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function VentasPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Ventas</h1>
          <p className="text-slate-400 text-sm mt-1">Registra y administra ventas individuales y combos.</p>
        </div>
        <Button variant="primary">Nueva Venta</Button>
      </div>

      <Card>
        <p className="text-slate-400 text-sm text-center py-8">
          Próximamente: POS interactivo para vender y asignar perfiles de forma automática.
        </p>
      </Card>
    </div>
  );
}
