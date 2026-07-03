import Card from '../components/ui/Card';

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Configuración del ERP y plantillas de WhatsApp.</p>
      </div>

      <Card>
        <p className="text-slate-400 text-sm text-center py-8">
          Próximamente: Editor de plantillas de mensaje para WhatsApp y credenciales de administrador.
        </p>
      </Card>
    </div>
  );
}
