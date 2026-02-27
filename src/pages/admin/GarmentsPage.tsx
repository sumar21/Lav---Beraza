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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Plus, Pencil, Trash2, Shirt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GarmentsPage() {
  const [garments, setGarments] = useState([]);
  const [formData, setFormData] = useState({ id: null, name: '', type: 'Pack', is_unique: false });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchGarments();
  }, []);

  const fetchGarments = async () => {
    const res = await axios.get('/api/garments');
    setGarments(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await axios.put(`/api/garments/${formData.id}`, formData);
      } else {
        await axios.post('/api/garments', formData);
      }
      setFormData({ id: null, name: '', type: 'Pack', is_unique: false });
      setIsDialogOpen(false);
      fetchGarments();
    } catch (error) {
      console.error(error);
      alert('Error al guardar la prenda');
    }
  };

  const handleEdit = (garment: any) => {
    setFormData({ ...garment, is_unique: !!garment.is_unique });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setFormData({ id: null, name: '', type: 'Pack', is_unique: false });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar esta prenda?')) {
      try {
        await axios.delete(`/api/garments/${id}`);
        fetchGarments();
      } catch (error) {
        alert('No se puede eliminar la prenda porque está en uso en una receta o target.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Maestro de Prendas</h2>
          <p className="text-muted-foreground">Gestione el catálogo de prendas y packs.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Prenda
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Propiedades</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {garments.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="bg-slate-100 p-2 rounded-full">
                      <Shirt className="h-4 w-4 text-slate-500" />
                    </div>
                    {g.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{g.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {g.is_unique ? (
                      <Badge variant="default" className="bg-indigo-500 hover:bg-indigo-600">Unívoca</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(g)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(g.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {garments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No hay prendas registradas.
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
            <DialogTitle>{formData.id ? 'Editar Prenda' : 'Nueva Prenda'}</DialogTitle>
            <DialogDescription>
              Complete los detalles de la prenda o pack.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Camisolín"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <Select 
                value={formData.type} 
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pack">Pack</SelectItem>
                  <SelectItem value="Prenda Blanca">Prenda Blanca</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_unique" 
                checked={formData.is_unique}
                onCheckedChange={(checked) => setFormData({ ...formData, is_unique: checked === true })}
              />
              <Label htmlFor="is_unique" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                ¿Es Prenda Unívoca? (Identifica un Pack)
              </Label>
            </div>
            <DialogFooter>
              <Button type="submit">Guardar cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
