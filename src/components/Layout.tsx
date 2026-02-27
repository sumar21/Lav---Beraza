import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Shirt, 
  Package, 
  Target, 
  Menu,
  Settings,
  User,
  ShieldCheck,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

const NavItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
};

const SidebarContent = ({ user, logout, onNavClick }: { user: any, logout: () => void, onNavClick?: () => void }) => (
  <div className="flex flex-col h-full bg-slate-50/50">
    <div className="p-6">
      <h1 className="text-xl font-bold flex items-center gap-2 text-primary tracking-tight">
        <div className="bg-primary text-primary-foreground p-1 rounded">
          <Package className="h-5 w-5" />
        </div>
        RFID Manager
      </h1>
      <p className="text-xs text-muted-foreground mt-1 ml-9">Laundry ERP System</p>
    </div>
    
    <Separator />

    <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
      <div>
        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Principal
        </h3>
        <div className="space-y-1">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={onNavClick} />
          <NavItem to="/reinforcements" icon={Send} label="Pedidos de Refuerzo" onClick={onNavClick} />
        </div>
      </div>

      {user.role === 'admin' && (
        <div>
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Administración
          </h3>
          <div className="space-y-1">
            <NavItem to="/admin/clients" icon={Users} label="Clientes" onClick={onNavClick} />
            <NavItem to="/admin/users" icon={User} label="Usuarios" onClick={onNavClick} />
            <NavItem to="/admin/garments" icon={Shirt} label="Prendas" onClick={onNavClick} />
            <NavItem to="/admin/recipes" icon={Package} label="Packs" onClick={onNavClick} />
            <NavItem to="/admin/targets" icon={Target} label="Objetivos" onClick={onNavClick} />
          </div>
        </div>
      )}
    </nav>

    <Separator />
    
    <div className="p-4">
      <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white border shadow-sm">
        <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} />
          <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium truncate text-slate-900">{user.username}</p>
          <div className="flex items-center text-xs text-muted-foreground">
            {user.role === 'admin' ? <ShieldCheck className="h-3 w-3 mr-1 text-indigo-500" /> : null}
            <span className="capitalize truncate">{user.role}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
              <Settings className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50/30 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-white flex-col fixed inset-y-0 z-50 shadow-[1px_0_20px_0_rgba(0,0,0,0.03)]">
        <SidebarContent user={user} logout={logout} />
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300 min-w-0">
        <header className="h-16 border-b bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4 md:hidden">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-r-0">
                <SidebarContent user={user} logout={logout} onNavClick={() => setIsMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-lg tracking-tight flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              RFID Manager
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
             <span className="capitalize font-medium text-slate-900">
              {location.pathname === '/' ? 'Dashboard' : 
               location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Página'}
             </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Header Actions */}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
