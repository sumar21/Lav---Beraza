import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, LabelList } from 'recharts';
import { AlertTriangle, Package, Target, Shirt, Activity, RefreshCw, Loader2, Layers, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCabin, setSelectedCabin] = useState<string>('all');
  const [requestingPack, setRequestingPack] = useState<number | null>(null);
  
  // Admin state
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  useEffect(() => {
    if (user?.role === 'admin') {
      axios.get('/api/clients').then(res => {
        setClients(res.data);
        if (res.data.length > 0) {
          setSelectedClientId(res.data[0].id.toString());
        }
      });
    }
  }, [user]);

  useEffect(() => {
    // If admin and no client selected yet, wait.
    if (user?.role === 'admin' && !selectedClientId) return;
    
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [selectedClientId, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '/api/dashboard-data';
      if (user?.role === 'admin' && selectedClientId) {
        url += `?clientId=${selectedClientId}`;
      }
      const res = await axios.get(url);
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
      <div className="relative flex items-center justify-center w-16 h-16">
        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin opacity-70"></div>
        <div className="absolute inset-0 rounded-full border-r-2 border-emerald-400 animate-spin opacity-70" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        <Package className="h-6 w-6 text-primary animate-pulse relative z-10" />
      </div>
      <div className="flex flex-col items-center space-y-2">
        <h3 className="text-lg font-semibold text-slate-700">Cargando Dashboard</h3>
        <p className="text-sm text-muted-foreground animate-pulse text-center max-w-xs">
          Sincronizando datos de inventario y lecturas RFID en tiempo real...
        </p>
      </div>
    </div>
  );
  
  if (!data) return <div className="p-8 text-center text-muted-foreground">No hay datos disponibles. Verifique la configuración del cliente.</div>;

  const stats = selectedCabin === 'all' ? data.global : data.cabins[selectedCabin];
  const packStock = stats?.packStock || [];
  const integrityAlerts = stats?.integrityAlerts || [];
  const replenishmentAlerts = stats?.replenishmentAlerts || [];

  const handleRequestReinforcement = async (packId: number, quantity: number) => {
    setRequestingPack(packId);
    try {
      await axios.post('/api/reinforcements', {
        pack_garment_id: packId,
        requested_quantity: quantity,
        client_id: user?.role === 'admin' ? selectedClientId : undefined
      });
      toast.success('Pedido de refuerzo enviado con éxito');
      fetchData(); // Refresh to update any potential state, though mostly it's for the reinforcement list
    } catch (error) {
      toast.error('Error al solicitar refuerzo');
    } finally {
      setRequestingPack(null);
    }
  };

  // Prepare chart data
  const chartData = packStock.map((p: any) => ({
    name: p.name,
    Actual: p.current,
    Consumo: p.consumed || 0,
    Objetivo: p.target,
  }));

  // Prepare Laundry by Day data
  const laundryByDayEntries = Object.entries(data.laundryByDay || {}).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  const laundryByDayData = laundryByDayEntries.map(([date, counts]: [string, any], index) => {
    const total = Object.values(counts).reduce((sum: number, val: any) => sum + (val as number), 0) as number;
    
    let variationStr = '';
    if (index > 0) {
      const prevCounts = laundryByDayEntries[index - 1][1];
      const prevTotal = Object.values(prevCounts).reduce((sum: number, val: any) => sum + (val as number), 0) as number;
      if (prevTotal > 0) {
        const variation = ((total - prevTotal) / prevTotal) * 100;
        variationStr = variation > 0 ? `+${variation.toFixed(1)}%` : `${variation.toFixed(1)}%`;
      } else if (total > 0) {
        variationStr = '+100%';
      }
    }

    return {
      date: `${date.substring(6,8)}/${date.substring(4,6)}`, // Format YYYYMMDD to DD/MM
      total,
      variationStr,
      ...counts
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Dashboard Operativo</h2>
          <p className="text-muted-foreground">Monitoreo en tiempo real de stock y procesos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Button onClick={fetchData} disabled={loading} variant="outline" className="bg-white">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          {user?.role === 'admin' && (
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Seleccionar Cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedCabin} onValueChange={setSelectedCabin}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por Cabina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Cabinas</SelectItem>
              {data.cabins && Object.keys(data.cabins).map((cab) => (
                <SelectItem key={cab} value={cab}>{cab}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Prendas (Stock)</CardTitle>
            <Layers className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{data.totalStockItems || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Prendas en CAB1</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Packs (Unívocos)</CardTitle>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {data.rawCounts?.['SG EQ UNIV EST'] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Packs identificados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas de Integridad</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{integrityAlerts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Packs incompletos detectados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Lavadero (2 días)</CardTitle>
            <Shirt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{data.laundryCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Lecturas zona sucia</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              Ciclo de Vida: Stock vs Consumo
            </CardTitle>
            <CardDescription>Comparativa de stock limpio vs prendas a reponer</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="Actual" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} name="Stock Limpio">
                    <LabelList dataKey="Actual" position="top" fontSize={10} fill="#64748b" />
                  </Bar>
                  <Bar dataKey="Consumo" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} name="A Reponer (Sucia)">
                    <LabelList dataKey="Consumo" position="top" fontSize={10} fill="#64748b" />
                  </Bar>
                  <Bar dataKey="Objetivo" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={30} name="Objetivo">
                    <LabelList dataKey="Objetivo" position="top" fontSize={10} fill="#64748b" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stock Composition Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              Composición de Stock ({data.totalStockItems} prendas)
            </CardTitle>
            <CardDescription>Desglose de prendas limpias en CAB1</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(data.stockComposition || {}).map(([name, count]) => ({ name, count }))} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} name="Cantidad">
                    <LabelList dataKey="count" position="right" fontSize={10} fill="#64748b" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Integrity Alerts Table */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Detalle de Alertas
            </CardTitle>
            <CardDescription>Packs armados con componentes faltantes</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {integrityAlerts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pack</TableHead>
                    <TableHead>Detalle Faltante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrityAlerts.map((alert: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium align-top">
                        <div>{alert.packName}</div>
                        <Badge variant="outline" className="mt-1 text-xs border-red-200 text-red-700 bg-red-50">
                          Stock: {alert.packCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ul className="space-y-1">
                          {alert.missingComponents.map((comp: any, cIdx: number) => (
                            <li key={cIdx} className="text-xs text-muted-foreground">
                              <span className="font-semibold text-red-600">-{comp.missing}</span> {comp.name}
                              <div className="text-[10px] text-slate-400">
                                Req: {comp.required} | Disp: {comp.available}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Todo en orden. No hay alertas.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Replenishment Alerts Table */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <Target className="h-5 w-5" />
              Detalle a Reponer
            </CardTitle>
            <CardDescription>Componentes faltantes para alcanzar el objetivo</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {replenishmentAlerts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pack</TableHead>
                    <TableHead>Detalle Faltante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replenishmentAlerts.map((alert: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium align-top">
                        <div>{alert.packName}</div>
                        <Badge variant="outline" className="mt-1 text-xs border-orange-200 text-orange-700 bg-orange-50">
                          Faltan: {alert.missingPacks} Packs
                        </Badge>
                        <div className="mt-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full text-xs h-7"
                            disabled={requestingPack === alert.packId}
                            onClick={() => handleRequestReinforcement(alert.packId, alert.missingPacks)}
                          >
                            {requestingPack === alert.packId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                            Solicitar Refuerzo
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ul className="space-y-1">
                          {alert.missingComponents.map((comp: any, cIdx: number) => (
                            <li key={cIdx} className="text-xs text-muted-foreground">
                              <span className="font-semibold text-orange-600">-{comp.missing}</span> {comp.name}
                              <div className="text-[10px] text-slate-400">
                                Req: {comp.required} | Disp: {comp.available}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Target className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Objetivos alcanzados.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        {/* Laundry by Day Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5 text-blue-500" />
              Consumo por Día ({data.laundryCount} prendas)
            </CardTitle>
            <CardDescription>Prendas recibidas en zona sucia por fecha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={laundryByDayData} 
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  {/* Dynamically generate bars for each garment type found in laundry */}
                  {Array.from(new Set(Object.values(data.laundryByDay || {}).flatMap(d => Object.keys(d as object)))).map((garmentName, idx) => {
                    // Generate a color based on index
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
                    return (
                      <Bar key={garmentName as string} dataKey={garmentName as string} stackId="a" fill={colors[idx % colors.length]} />
                    );
                  })}
                  <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} name="Total Diario">
                    <LabelList dataKey="total" position="top" fontSize={11} fontWeight="bold" fill="#334155" offset={15} />
                    <LabelList dataKey="variationStr" position="bottom" fontSize={10} fill="#6366f1" offset={10} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stock Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Detalle de Inventario y Reposición</CardTitle>
          <CardDescription>Desglose por prenda de stock limpio disponible vs consumo a reponer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prenda / Pack</TableHead>
                <TableHead className="text-right">Stock Limpio</TableHead>
                <TableHead className="text-right">Objetivo</TableHead>
                <TableHead className="text-right">Var (Stock vs Obj)</TableHead>
                <TableHead className="text-right">Consumo (Zona Sucia)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.keys(data.rawCounts || {}).map((garmentName) => {
                const isPack = packStock.some((p: any) => p.name === garmentName);
                const current = data.rawCounts[garmentName] || 0;
                const consumed = data.laundryCounts?.[garmentName] || 0;
                
                let target: number | string = '-';
                if (isPack) {
                  target = packStock.find((p: any) => p.name === garmentName)?.target || 0;
                } else if (data.componentTargets && data.componentTargets[garmentName]) {
                  target = data.componentTargets[garmentName];
                }

                let variation: number | string = '-';
                if (target !== '-') {
                  variation = current - (target as number);
                }
                
                return (
                  <TableRow key={garmentName} className={isPack ? 'bg-indigo-50/30' : ''}>
                    <TableCell className="font-medium">
                      {garmentName}
                      {isPack && <Badge variant="outline" className="ml-2 text-[10px] border-indigo-200 text-indigo-700">Pack</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-indigo-600 font-semibold">{current}</TableCell>
                    <TableCell className="text-right text-slate-500">{target}</TableCell>
                    <TableCell className={`text-right font-semibold ${typeof variation === 'number' ? (variation < 0 ? 'text-red-500' : 'text-emerald-500') : 'text-slate-500'}`}>
                      {typeof variation === 'number' && variation > 0 ? `+${variation}` : variation}
                    </TableCell>
                    <TableCell className="text-right text-amber-600 font-semibold">{consumed}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
