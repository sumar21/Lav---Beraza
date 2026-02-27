import ReinforcementSection from '@/components/ReinforcementSection';
import { useAuth } from '@/context/AuthContext';

export default function ReinforcementsPage() {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-primary">Pedidos de Refuerzo</h2>
        <p className="text-muted-foreground">
          {user?.role === 'admin' 
            ? 'Gestión centralizada de solicitudes de reposición de todos los clientes.' 
            : 'Historial y estado de tus solicitudes de reposición.'}
        </p>
      </div>
      
      <ReinforcementSection />
    </div>
  );
}
