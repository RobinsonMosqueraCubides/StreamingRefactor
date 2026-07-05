

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="flex flex-col items-center gap-4">
        {/* Outer Ring */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
          {/* Spinning Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 animate-spin"></div>
        </div>
        <p className="text-sm text-slate-400 font-medium animate-pulse">Cargando módulo...</p>
      </div>
    </div>
  );
}
