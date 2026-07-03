import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Clientes</h1>
          <p className="text-slate-400 text-sm mt-1">Administra la base de datos de tus clientes y revendedores.</p>
        </div>
        <Button variant="primary">Nuevo Cliente</Button>
      </div>

      <Card>
        <p className="text-slate-400 text-sm text-center py-8">
          Próximamente: Tabla de clientes con buscador y opción para reportar caídas / banear.
        </p>
      </Card>
    </div>
  );
}
