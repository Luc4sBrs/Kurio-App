import { Link } from '@tanstack/react-router'

export function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-kurio-darker border-b border-kurio-gold/10">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-kurio-gold rounded-full flex items-center justify-center">
            <span className="text-kurio-darker font-black text-xs">K</span>
          </div>
          <span className="text-2xl font-bold tracking-tighter text-kurio-gold">KURIO</span>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-kurio-muted">
          <Link to="/" className="text-kurio-text border-b-2 border-kurio-gold pb-1">Explorar</Link>
          <Link to="/" className="hover:text-kurio-gold transition-colors">Coleções</Link>
          <Link to="/" className="hover:text-kurio-gold transition-colors">Como funciona</Link>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden lg:block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-kurio-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input
            type="text"
            placeholder="Buscar arte, criadores..."
            className="bg-kurio-dark border border-kurio-gold/20 rounded-full pl-10 pr-12 py-2 text-sm focus:outline-none focus:border-kurio-gold w-64 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-kurio-darker border border-kurio-gold/30 px-1.5 py-0.5 rounded text-[10px] text-kurio-muted">
            /
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s0-2-3-9a6 6 0 0 1 12 0"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span className="absolute -top-1 -right-1 bg-kurio-gold/20 text-kurio-gold text-[8px] w-4 h-4 flex items-center justify-center rounded-full">3</span>
          </div>
          <Link to="/login" className="text-sm font-medium hover:text-kurio-gold transition-colors">Entrar</Link>
          <Link to="/register" className="bg-kurio-gold text-kurio-darker px-4 py-2 rounded-full font-bold text-sm hover:bg-kurio-goldLight transition-all flex items-center gap-2">
            Criar conta <span className="text-xs">→</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}