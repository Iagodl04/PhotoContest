
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContest } from '@/hooks/useContest';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, Image, Vote, Hash, Settings, Eye, Square, RotateCcw, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Stats {
  users: number;
  photos: number;
  votes: number;
  categories: number;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  device_id: string;
  created_at: string;
}

export function AdminPanel() {
  const [stats, setStats] = useState<Stats>({ users: 0, photos: 0, votes: 0, categories: 0 });
  const [users, setUsers] = useState<User[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(true);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    title: '',
    subtitle: '',
    end_at: '',
  });
  
  const { user, isAdmin, forceLogoutAll } = useAuth();
  const { settings, updateSettings, refreshSettings } = useContest();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePasswordSubmit = () => {
    if (password === '3333') {
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      toast({
        title: "Acceso concedido",
        description: "Bienvenido al panel de administración",
      });
    } else {
      toast({
        title: "Contraseña incorrecta",
        description: "La contraseña ingresada no es válida",
        variant: "destructive",
      });
      setPassword('');
    }
  };

  const loadStats = async () => {
    try {
      const [usersResult, photosResult, votesResult, categoriesResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('options').select('id', { count: 'exact', head: true }),
        supabase.from('votes').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        users: usersResult.count || 0,
        photos: photosResult.count || 0,
        votes: votesResult.count || 0,
        categories: categoriesResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handlePreviewResults = () => {
    navigate('/resultados');
  };

  const handleFinishContest = async () => {
    if (!window.confirm('¿Estás seguro de que quieres terminar el concurso ahora?')) {
      return;
    }

    try {
      // Delete all user data completely
      await supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('options').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Set contest as inactive
      await updateSettings({ is_active: false });
      
      // Clear local storage and force logout
      localStorage.clear();
      
      toast({
        title: "Concurso finalizado",
        description: "El concurso ha sido marcado como finalizado y todos los usuarios han sido desconectados",
      });
      await loadStats();
      
      // Redirect to results after finishing
      setTimeout(() => {
        window.location.href = '/resultados';
      }, 1500);
    } catch (error) {
      console.error('Error finishing contest:', error);
      toast({
        title: "Error",
        description: "No se pudo finalizar el concurso",
        variant: "destructive",
      });
    }
  };

  const handleRestartContest = async () => {
    try {
      toast({
        title: "Reiniciando concurso...",
        description: "Por favor espera, esto puede tomar unos momentos",
      });

      // 1. Delete all files from the storage bucket
      const { data: files, error: listError } = await supabase.storage
        .from('contest-photos')
        .list('', { limit: 1000 });

      if (listError) {
        console.error('Error listing files:', listError);
      } else if (files && files.length > 0) {
        const filePaths = files.map(file => file.name);
        const { error: deleteFilesError } = await supabase.storage
          .from('contest-photos')
          .remove(filePaths);
        
        if (deleteFilesError) {
          console.error('Error deleting files:', deleteFilesError);
        }
      }

      // 2. Delete ALL data from database tables completely using standard delete operations
      console.log('Deleting all votes...');
      const { error: votesError } = await supabase
        .from('votes')
        .delete()
        .gte('created_at', '1900-01-01');
      
      if (votesError) {
        console.error('Error deleting votes:', votesError);
      }
      
      console.log('Deleting all options...');
      const { error: optionsError } = await supabase
        .from('options')
        .delete()
        .gte('created_at', '1900-01-01');
      
      if (optionsError) {
        console.error('Error deleting options:', optionsError);
      }
      
      console.log('Deleting all users...');
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .gte('created_at', '1900-01-01');
      
      if (usersError) {
        console.error('Error deleting users:', usersError);
      }
      
      // 3. Reset contest settings to initial state
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 30);
      
      await updateSettings({ 
        title: 'Concurso de Fotos',
        subtitle: 'Participa y vota por tus favoritas',
        is_active: true,
        end_at: newEndDate.toISOString()
      });
      
      // 4. Clear ALL localStorage data for complete reset
      localStorage.clear();
      
      // 5. Reset ALL local component state to zero
      setStats({ users: 0, photos: 0, votes: 0, categories: 0 });
      setUsers([]);
      setShowUsers(false);
      setIsAuthenticated(false);
      setShowPasswordDialog(true);
      
      toast({
        title: "Concurso reiniciado completamente",
        description: "Todos los datos han sido eliminados permanentemente. Redirigiendo...",
      });
      
      // 6. Force complete logout and redirect to fresh start
      setTimeout(() => {
        // Clear everything and redirect to root
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Error restarting contest:', error);
      toast({
        title: "Error",
        description: "No se pudo reiniciar el concurso completamente",
        variant: "destructive",
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      const endDate = new Date(settingsForm.end_at);
      const now = new Date();
      
      await updateSettings({
        title: settingsForm.title,
        subtitle: settingsForm.subtitle,
        end_at: endDate.toISOString(),
        is_active: endDate > now, // Reactivate if new end date is in the future
      });
      
      toast({
        title: "Configuración guardada",
        description: "Los cambios han sido aplicados exitosamente",
      });
      
      setShowSettings(false);
      await refreshSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      if (settings) {
        const endDate = new Date(settings.end_at);
        setSettingsForm({
          title: settings.title,
          subtitle: settings.subtitle,
          end_at: endDate.toISOString().slice(0, 16),
        });
      }
    }
  }, [isAuthenticated, settings]);

  // Check admin access
  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-white pb-20 pt-4">
        <div className="max-w-md mx-auto p-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Acceso denegado</h3>
              <p className="text-gray-600">
                No tienes permisos para acceder al panel de administración.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Password dialog
  if (showPasswordDialog) {
    return (
      <div className="min-h-screen bg-white pb-20 pt-4 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-gray-900">Panel de Administración</CardTitle>
            <CardDescription className="text-center">
              Ingresa la contraseña de administrador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-gray-700">Contraseña</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa la contraseña"
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                className="border-gray-300"
              />
            </div>
            <Button
              onClick={handlePasswordSubmit}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
            >
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20 pt-4">
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.users}</p>
              <p className="text-sm text-gray-600">Usuarios</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <Image className="h-8 w-8 text-pink-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.photos}</p>
              <p className="text-sm text-gray-600">Fotos</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <Vote className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.votes}</p>
              <p className="text-sm text-gray-600">Votos</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <Hash className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.categories}</p>
              <p className="text-sm text-gray-600">Categorías</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900">Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => {
                setShowUsers(true);
                loadUsers();
              }}
              variant="outline"
              className="w-full justify-start"
            >
              <Users className="h-4 w-4 mr-2" />
              Ver Usuarios
            </Button>
            
            <Button
              onClick={handlePreviewResults}
              variant="outline"
              className="w-full justify-start"
            >
              <Eye className="h-4 w-4 mr-2" />
              Previsualizar Resultados
            </Button>
            
            <Button
              onClick={handleFinishContest}
              variant="outline"
              className="w-full justify-start"
            >
              <Square className="h-4 w-4 mr-2" />
              Terminar Concurso Ahora
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reiniciar Concurso
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Reiniciar concurso completamente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará PERMANENTEMENTE TODOS los datos del concurso de la base de datos:
                    <br />• Todos los usuarios y sus cuentas
                    <br />• Todas las fotos subidas (incluso del almacenamiento)
                    <br />• Todos los votos registrados
                    <br />• Todos los registros de dispositivos
                    <br />• Cerrará todas las sesiones activas
                    <br />• Restablecerá la configuración al estado inicial
                    <br /><br />
                    La aplicación quedará completamente vacía como si fuera la primera vez que se usa.
                    Todos los usuarios (incluyendo el admin) deberán registrarse nuevamente desde cero.
                    Los contadores mostrarán 0 usuarios, 0 fotos y 0 votos.
                    <br /><br />
                    <strong>Esta acción elimina los datos PERMANENTEMENTE de la base de datos y no se puede deshacer.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestartContest} className="bg-red-600 hover:bg-red-700">
                    Sí, eliminar TODOS los datos permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button
              onClick={() => setShowSettings(true)}
              variant="outline"
              className="w-full justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </Button>
            
            <Button
              onClick={() => navigate('/todas-las-fotos')}
              variant="outline"
              className="w-full justify-start"
            >
              <Camera className="h-4 w-4 mr-2" />
              Todas las Fotos
            </Button>
          </CardContent>
        </Card>

        {/* Users Dialog */}
        <Dialog open={showUsers} onOpenChange={setShowUsers}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Lista de Usuarios ({users.length})</DialogTitle>
              <DialogDescription>
                Todos los usuarios registrados en el concurso
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="p-3 border rounded-lg">
                  <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                  {user.phone && <p className="text-sm text-gray-600">📱 {user.phone}</p>}
                  <p className="text-xs text-gray-500">ID: {user.device_id.slice(0, 8)}...</p>
                  <p className="text-xs text-gray-500">
                    Registro: {new Date(user.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Configuración del Concurso</DialogTitle>
              <DialogDescription>
                Modifica los ajustes principales
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-700">Título</Label>
                <Input
                  id="title"
                  value={settingsForm.title}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, title: e.target.value }))}
                  className="border-gray-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subtitle" className="text-gray-700">Subtítulo</Label>
                <Input
                  id="subtitle"
                  value={settingsForm.subtitle}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="border-gray-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_at" className="text-gray-700">Fecha de fin</Label>
                <Input
                  id="end_at"
                  type="datetime-local"
                  value={settingsForm.end_at}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, end_at: e.target.value }))}
                  className="border-gray-300"
                />
              </div>
              
              <Button
                onClick={handleSaveSettings}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
              >
                Guardar Cambios
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
