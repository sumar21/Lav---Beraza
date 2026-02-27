import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, Plus, Package, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';

export default function RecipesPage() {
  const [packs, setPacks] = useState<any[]>([]);
  const [garments, setGarments] = useState<any[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Form State
  const [packId, setPackId] = useState<number | null>(null);
  const [packName, setPackName] = useState('');
  const [components, setComponents] = useState<{ garment_id: string, quantity: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [packsRes, garmentsRes] = await Promise.all([
      axios.get('/api/packs'),
      axios.get('/api/garments')
    ]);
    setPacks(packsRes.data);
    setGarments(garmentsRes.data); // Allow all garments to be components, including the pack itself
  };

  const handleEdit = (pack: any) => {
    setPackId(pack.id);
    setPackName(pack.name);
    setComponents(pack.components.map((c: any) => ({
      garment_id: c.component_garment_id.toString(),
      quantity: c.quantity
    })));
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setPackId(null);
    setPackName('');
    setComponents([]);
    setIsSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setPackId(null);
      setPackName('');
      setComponents([]);
    }
  };

  const addComponent = () => {
    setComponents([...components, { garment_id: '', quantity: 1 }]);
  };

  const removeComponent = (index: number) => {
    const newComponents = [...components];
    newComponents.splice(index, 1);
    setComponents(newComponents);
  };

  const updateComponent = (index: number, field: 'garment_id' | 'quantity', value: any) => {
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setComponents(newComponents);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!packName.trim()) return alert('El nombre del pack es requerido');
    if (components.some(c => !c.garment_id || c.quantity <= 0)) return alert('Complete todos los componentes correctamente');

    const payload = {
      name: packName,
      components: components.map(c => ({
        garment_id: parseInt(c.garment_id),
        quantity: parseInt(c.quantity.toString())
      }))
    };

    try {
      if (packId) {
        await axios.put(`/api/packs/${packId}`, payload);
      } else {
        await axios.post('/api/packs', payload);
      }
      setIsSheetOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el pack');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este pack y su receta?')) {
      await axios.delete(`/api/packs/${id}`);
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Packs</h2>
          <p className="text-muted-foreground">Configure la composición de los packs quirúrgicos.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Pack
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => (
          <Card key={pack.id} className="relative group hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{pack.name}</CardTitle>
                    <CardDescription>{pack.components.length} componentes</CardDescription>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(pack)}>
                    <Edit className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(pack.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-2 space-y-2">
                {pack.components.map((c: any) => (
                  <div key={c.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                    <span className="text-slate-600">{c.name}</span>
                    <Badge variant="secondary" className="font-mono">x{c.quantity}</Badge>
                  </div>
                ))}
                {pack.components.length === 0 && (
                  <p className="text-sm italic text-slate-400">Sin componentes definidos</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
          <SheetHeader>
            <SheetTitle>{packId ? 'Editar Pack' : 'Nuevo Pack'}</SheetTitle>
            <SheetDescription>
              Defina el nombre del pack y agregue las prendas que lo componen.
            </SheetDescription>
          </SheetHeader>
          
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6 mt-6 overflow-hidden">
            <div className="grid gap-2">
              <Label htmlFor="packName">Nombre del Pack (Prenda Unívoca)</Label>
              <Input 
                id="packName"
                value={packName} 
                onChange={(e) => setPackName(e.target.value)} 
                placeholder="Ej: Pack QX"
                required
              />
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="flex justify-between items-center">
                <Label>Componentes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                  <Plus className="h-4 w-4 mr-2" /> Agregar Componente
                </Button>
              </div>

              <ScrollArea className="flex-1 pr-4 -mr-4">
                <div className="space-y-4">
                  {components.length === 0 && (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No hay componentes agregados.</p>
                    </div>
                  )}

                  {components.map((comp, idx) => (
                    <div key={idx} className="flex gap-3 items-end border p-3 rounded-md bg-slate-50/50">
                      <div className="flex-1 grid gap-1.5">
                        <Label className="text-xs text-muted-foreground">Prenda</Label>
                        <Select
                          value={comp.garment_id}
                          onValueChange={(val) => updateComponent(idx, 'garment_id', val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {garments.map(g => (
                              <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-20 grid gap-1.5">
                        <Label className="text-xs text-muted-foreground">Cant.</Label>
                        <Input
                          className="h-9"
                          type="number"
                          min="1"
                          value={comp.quantity}
                          onChange={(e) => updateComponent(idx, 'quantity', e.target.value)}
                          required
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-red-500" onClick={() => removeComponent(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <SheetFooter className="mt-auto pt-4 border-t">
              <SheetClose asChild>
                <Button variant="outline" type="button">Cancelar</Button>
              </SheetClose>
              <Button type="submit">Guardar Pack</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
