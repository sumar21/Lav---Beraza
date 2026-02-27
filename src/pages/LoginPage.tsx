import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Package, ShieldCheck, User, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (u: string, p: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/login', { username: u, password: p });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError('Credenciales inválidas. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(username, password);
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Side - Image & Branding */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-primary/40 mix-blend-multiply z-10" />
        <img 
          src="https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=2070&auto=format&fit=crop" 
          alt="Lavadero Industrial Hospitalario" 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="relative z-20 text-white p-12 max-w-xl">
          <div className="mb-8 inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <Package className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-6 tracking-tight">Lavadero Berazategui</h1>
          <p className="text-lg text-slate-200 mb-8 leading-relaxed">
            Líderes en lavado industrial y trazabilidad textil con tecnología RFID. 
            Garantizamos higiene, eficiencia y control total para el sector salud.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-slate-100">Trazabilidad en tiempo real</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-slate-100">Certificación de procesos</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span className="text-slate-100">Tecnología RFID avanzada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4 lg:hidden">
              <Package className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Bienvenido</CardTitle>
            <CardDescription className="text-slate-500">
              Ingrese sus credenciales para acceder al sistema de gestión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="nombre.usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-white"
                />
              </div>
              {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md border border-red-200 text-center font-medium">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full h-11 text-base shadow-md hover:shadow-lg transition-all" disabled={loading}>
                {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Accesos Rápidos (Demo)</span>
              <Separator className="flex-1" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleLogin('guemes', '123')}
                disabled={loading}
                className="w-full flex flex-col items-center h-auto py-3 gap-1 hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="text-xs font-medium">Usuario Guemes</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleLogin('admin', 'admin123')}
                disabled={loading}
                className="w-full flex flex-col items-center h-auto py-3 gap-1 hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-medium">Administrador</span>
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 text-center text-xs text-muted-foreground pt-6 border-t bg-slate-50/50 rounded-b-xl">
            <p>Sistema de Gestión de Trazabilidad RFID</p>
            <p>© 2024 Lavadero Berazategui</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
