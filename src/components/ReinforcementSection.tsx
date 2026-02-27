import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { Send, Clock, CheckCircle2, Truck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReinforcementSection({ clientId }: { clientId?: string }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await axios.get('/api/reinforcements');
      setRequests(res.data);
    } catch (error) {
      console.error('Error fetching reinforcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [clientId]);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await axios.put(`/api/reinforcements/${id}/status`, { status });
      toast.success('Estado actualizado');
      fetchRequests();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendiente': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1"/> Pendiente</Badge>;
      case 'En Gestión': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Loader2 className="w-3 h-3 mr-1 animate-spin"/> En Gestión</Badge>;
      case 'Enviado': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Truck className="w-3 h-3 mr-1"/> Enviado</Badge>;
      case 'Completado': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Completado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading && requests.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-indigo-500" />
          Pedidos de Refuerzo
        </CardTitle>
        <CardDescription>
          {user?.role === 'admin' ? 'Gestión de solicitudes de clientes' : 'Estado de tus solicitudes de reposición'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                {user?.role === 'admin' && <TableHead>Cliente</TableHead>}
                <TableHead>Pack Solicitado</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                {user?.role === 'admin' && <TableHead>Acción</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  {user?.role === 'admin' && <TableCell className="font-medium">{req.client_name}</TableCell>}
                  <TableCell>{req.pack_name}</TableCell>
                  <TableCell className="font-bold">{req.requested_quantity}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(req.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  {user?.role === 'admin' && (
                    <TableCell>
                      <Select value={req.status} onValueChange={(val) => handleStatusChange(req.id, val)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="En Gestión">En Gestión</SelectItem>
                          <SelectItem value="Enviado">Enviado</SelectItem>
                          <SelectItem value="Completado">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No hay pedidos de refuerzo activos.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
