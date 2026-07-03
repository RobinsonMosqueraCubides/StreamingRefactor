import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { TrendingUp, Users, ShieldAlert, Award } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen financiero y operativo del negocio.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverEffect className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Ingresos Mensuales</p>
            <h3 className="text-xl font-bold text-slate-100">$0.00 COP</h3>
          </div>
        </Card>

        <Card hoverEffect className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Clientes Activos</p>
            <h3 className="text-xl font-bold text-slate-100">0</h3>
          </div>
        </Card>

        <Card hoverEffect className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Perfiles Libres</p>
            <h3 className="text-xl font-bold text-slate-100">0</h3>
          </div>
        </Card>

        <Card hoverEffect className="flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Garantías Activas</p>
            <h3 className="text-xl font-bold text-slate-100">0</h3>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-2">Bienvenido a Streaming ERP</h2>
        <p className="text-slate-400 text-sm">
          Este sistema te permite administrar ventas de streaming de manera Mobile First, organizar perfiles fragmentados y procesar notificaciones rápidas de WhatsApp.
        </p>
        <div className="mt-4">
          <Button variant="primary">Empezar Venta</Button>
        </div>
      </Card>
    </div>
  );
}
