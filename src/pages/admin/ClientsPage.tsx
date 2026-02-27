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
import { Plus, Building2, Link as LinkIcon } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [stockUrl, setStockUrl] = useState('');
  const [tagsUrl, setTagsUrl] = useState('');
  const [readingsUrl, setReadingsUrl] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const res = await axios.get('/api/clients');
    setClients(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/clients', { 
        name, 
        stock_csv_url: stockUrl,
        tags_url: tagsUrl,
        laundry_readings_url: readingsUrl
      });
      setName('');
      setStockUrl('');
      setTagsUrl('');
      setReadingsUrl('');
      setIsDialogOpen(false);
      fetchClients();
    } catch (error) {
      console.error(error);
      alert('Error al crear el cliente');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h2>
          <p className="text-muted-foreground">Administre las instituciones y sus fuentes de datos.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead>Institución</TableHead>
                <TableHead>Fuentes de Datos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client: any) => (
                <TableRow key={client.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{client.id}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-100 p-2 rounded-lg">
                        <Building2 className="h-4 w-4 text-slate-500" />
                      </div>
                      {client.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <LinkIcon className="h-3 w-3" />
                        <span className="font-semibold">Stock:</span> 
                        <span className="truncate max-w-[300px]" title={client.stock_csv_url}>{client.stock_csv_url}</span>
                      </div>
                      {client.tags_url && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <LinkIcon className="h-3 w-3" />
                          <span className="font-semibold">Tags:</span>
                          <span className="truncate max-w-[300px]" title={client.tags_url}>{client.tags_url}</span>
                        </div>
                      )}
                      {client.laundry_readings_url && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <LinkIcon className="h-3 w-3" />
                          <span className="font-semibold">Lecturas:</span>
                          <span className="truncate max-w-[300px]" title={client.laundry_readings_url}>{client.laundry_readings_url}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No hay clientes registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Registre una nueva institución y configure sus URLs de datos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre de la Institución</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Sanatorio Güemes"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stockUrl">URL CSV Stock (Cabina)</Label>
              <Input
                id="stockUrl"
                value={stockUrl}
                onChange={(e) => setStockUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tagsUrl">URL CSV Tags (Maestro)</Label>
              <Input
                id="tagsUrl"
                value={tagsUrl}
                onChange={(e) => setTagsUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="readingsUrl">URL CSV Lecturas (Lavadero)</Label>
              <Input
                id="readingsUrl"
                value={readingsUrl}
                onChange={(e) => setReadingsUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <DialogFooter>
              <Button type="submit">Crear Cliente</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
