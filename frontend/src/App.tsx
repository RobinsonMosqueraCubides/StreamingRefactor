import { useState } from 'react';
import MainLayout from './layouts/MainLayout';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto mt-6">
        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Vista: {activeTab.toUpperCase()}
        </h2>
        <p className="text-slate-400">
          Esta es la sección base para la gestión de <strong>{activeTab}</strong>.
        </p>
        
        <div className="mt-8 p-4 bg-slate-950 rounded-xl border border-slate-800">
          <p className="text-sm text-slate-500">
            Enfoque Mobile First: Abre la consola del navegador y activa la vista móvil para verificar el Bottom Navigation responsivo con diseño glassmorphism. En pantallas grandes se expande automáticamente a una barra lateral elegante.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

export default App;
