import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Database, ShoppingCart, Settings } from 'lucide-react';

export default function MainLayout() {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/inventario', label: 'Inventario', icon: Database },
    { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
    { to: '/configuracion', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Sidebar para pantallas grandes (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-6 shrink-0">
        <div className="mb-8">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Streaming ERP
          </h1>
          <p className="text-xs text-slate-500">Panel de Control</p>
        </div>
        <nav className="flex flex-col gap-2 flex-grow">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-205 text-left cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-400 font-medium'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation para pantallas móviles */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-lg px-4 py-2 flex justify-between items-center z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer"
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-2 rounded-xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-cyan-500/20 text-cyan-400 scale-110' 
                        : 'text-slate-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] ${isActive ? 'text-cyan-400 font-medium' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
