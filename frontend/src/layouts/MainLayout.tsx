import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Database, ShoppingCart, Settings, LogOut } from 'lucide-react';

export default function MainLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const root = window.document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    };

    // Initial check
    handleChange(mediaQuery);

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/inventario', label: 'Inventario', icon: Database },
    { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
    { to: '/configuracion', label: 'Configuración', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-brand-primary text-brand-textPrimary flex flex-col md:flex-row pb-20 md:pb-0 font-sans">
      {/* Sidebar para pantallas grandes (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-brand-sidebar border-r border-brand-border p-6 shrink-0 md:h-screen md:sticky md:top-0 overflow-y-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-brand-accent to-blue-500 bg-clip-text text-transparent font-mono">
              Agaray ERP
            </h1>
            <p className="text-xs text-brand-textMuted">Panel de Control</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2 flex-grow">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }: { isActive: boolean }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left cursor-pointer active:scale-98 ${
                    isActive
                      ? 'bg-brand-accent/15 text-brand-accent border-l-4 border-brand-accent font-medium'
                      : 'text-brand-textMuted hover:bg-brand-secondary/50 hover:text-brand-textPrimary'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left text-brand-destructive hover:bg-brand-destructive/10 hover:text-brand-destructive mt-auto cursor-pointer border-none bg-transparent active:scale-98"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation para pantallas móviles */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-brand-sidebar/80 backdrop-blur-xl border border-brand-border/80 rounded-2xl shadow-lg px-4 py-2 flex justify-between items-center z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer"
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <div
                    className={`p-2 rounded-xl transition-all duration-300 active:scale-95 ${
                      isActive 
                        ? 'bg-brand-accent/20 text-brand-accent scale-110' 
                        : 'text-brand-textMuted'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] ${isActive ? 'text-brand-accent font-medium' : 'text-brand-textMuted'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer border-none bg-transparent text-brand-destructive active:scale-95"
        >
          <div className="p-2 rounded-xl text-brand-destructive">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="text-[10px] text-brand-destructive">Cerrar</span>
        </button>
      </nav>
    </div>
  );
}
