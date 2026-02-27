import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, User, Shield, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'user', client_id: '' });

  useEffect(() => {
    fetchUsers();
    fetchClients();
  }, []);

  const fetchUsers = async () => {
    const res = await axios.get('/api/users');
    setUsers(res.data);
  };

  const fetchClients = async () => {
    const res = await axios.get('/api/clients');
    setClients(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/users', formData);
      setFormData({ username: '', password: '', role: 'user', client_id: '' });
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      alert('Error creating user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">Administre el acceso y roles de los usuarios.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Cliente Asignado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="bg-slate-100 p-2 rounded-full">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    {u.username}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {u.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.client_name ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="h-3 w-3" />
                        {u.client_name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Cree un nuevo usuario y asigne sus permisos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Rol</Label>
              <Select 
                value={formData.role} 
                onValueChange={(val) => setFormData({...formData, role: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.role !== 'admin' && (
              <div className="grid gap-2">
                <Label htmlFor="client">Cliente Asignado</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(val) => setFormData({...formData, client_id: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button type="submit">Crear Usuario</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
