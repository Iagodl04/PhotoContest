
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContest } from '@/hooks/useContest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function Login() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { settings } = useContest();
  const { toast } = useToast();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 9) {
      setPhone(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor, completa tu nombre y apellido",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(firstName.trim(), lastName.trim(), phone.trim() || undefined);
    } catch (error: any) {
      if (error.message === 'duplicate_name') {
        toast({
          title: "Usuario ya existe",
          description: "Ya existe un usuario con ese nombre y apellido. Por favor, usa un nombre diferente.",
          variant: "destructive",
        });
      } else if (error.message === 'device_limit') {
        toast({
          title: "Dispositivo no autorizado",
          description: "Este usuario ya está registrado en otro dispositivo. Solo puedes usar un dispositivo por cuenta.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error de registro",
          description: "No se pudo completar el registro. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            {settings?.title || 'Concurso de Fotos'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {settings?.subtitle || 'Participa y vota por tus favoritas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-gray-700">Nombre *</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Tu nombre"
                required
                className="border-gray-300"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-gray-700">Apellido *</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Tu apellido"
                required
                className="border-gray-300"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700">Teléfono (opcional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="123456789"
                maxLength={9}
                className="border-gray-300"
              />
              {phone.length > 0 && (
                <p className="text-xs text-gray-500">
                  {phone.length}/9 dígitos
                </p>
              )}
            </div>
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Entrar al Concurso'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
