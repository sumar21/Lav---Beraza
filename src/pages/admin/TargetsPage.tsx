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
import { Plus, Target, Building2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TargetsPage() {
  const [targets, setTargets] = useState([]);
  const [clients, setClients] = useState([]);
  const [garments, setGarments] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ client_id: '', pack_garment_id: '', target_quantity: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [tRes, cRes, gRes] = await Promise.all([
      axios.get('/api/targets'),
      axios.get('/api/clients'),
      axios.get('/api/garments')
    ]);
    setTargets(tRes.data);
    setClients(cRes.data);
    setGarments(gRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/targets', formData);
      setFormData({ client_id: '', pack_garment_id: '', target_quantity: 0 });
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      alert('Error creating target');
    }
  };

  const packs = garments.filter((g: any) => g.is_unique);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Objetivos de Stock</h2>
          <p className="text-muted-foreground">Defina las metas de stock para cada pack y cliente.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Objetivo
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead>Objetivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    {t.client_name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-indigo-500" />
                      {t.pack_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-base px-3 py-1 border-slate-300">
                      <Target className="h-3 w-3 mr-2 text-slate-500" />
                      {t.target_quantity} u.
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {targets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No hay objetivos definidos.
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
            <DialogTitle>Definir Objetivo</DialogTitle>
            <DialogDescription>
              Establezca la cantidad ideal de stock para un pack específico.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client">Cliente</Label>
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
            <div className="grid gap-2">
              <Label htmlFor="pack">Pack</Label>
              <Select 
                value={formData.pack_garment_id} 
                onValueChange={(val) => setFormData({...formData, pack_garment_id: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar pack" />
                </SelectTrigger>
                <SelectContent>
                  {packs.map((g: any) => (
                    <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Cantidad Objetivo</Label>
              <Input 
                id="quantity"
                type="number"
                min="0"
                value={formData.target_quantity} 
                onChange={(e) => setFormData({...formData, target_quantity: parseInt(e.target.value)})} 
                required 
              />
            </div>
            <DialogFooter>
              <Button type="submit">Guardar Objetivo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
