
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, Archive } from 'lucide-react';

interface Photo {
  id: string;
  image_url: string;
  download_url: string;
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
  };
}

export function AllPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('options')
        .select(`
          *,
          users (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las fotos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPhoto = async (photo: Photo) => {
    try {
      const response = await fetch(photo.download_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foto_${photo.id}_${photo.users?.first_name || 'anonimo'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar la foto",
        variant: "destructive",
      });
    }
  };

  const downloadAllPhotos = async () => {
    if (photos.length === 0) return;

    setIsDownloadingAll(true);
    toast({
      title: "Preparando descarga",
      description: "Se están preparando todas las fotos para descargar...",
    });

    try {
      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Download all photos and add to zip
      const promises = photos.map(async (photo, index) => {
        try {
          const response = await fetch(photo.download_url);
          const blob = await response.blob();
          const fileName = `${String(index + 1).padStart(3, '0')}_${photo.users?.first_name || 'anonimo'}_${photo.users?.last_name || ''}_${photo.id.slice(0, 8)}.jpg`;
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Error downloading photo ${photo.id}:`, error);
        }
      });

      await Promise.all(promises);

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `concurso_fotos_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Descarga completada",
        description: "Todas las fotos han sido descargadas en un ZIP",
      });
    } catch (error) {
      console.error('Error creating zip:', error);
      toast({
        title: "Error al crear ZIP",
        description: "No se pudo crear el archivo ZIP. Intenta descargar las fotos individualmente.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  // Check admin access
  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 pt-4">
        <div className="max-w-md mx-auto p-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Archive className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acceso denegado</h3>
              <p className="text-gray-600">
                No tienes permisos para acceder a esta página.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 pt-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-4">
      <div className="max-w-2xl mx-auto p-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Todas las Fotos ({photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={downloadAllPhotos}
              disabled={isDownloadingAll || photos.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
            >
              {isDownloadingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparando ZIP...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Descargar todas ({photos.length} fotos)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {photos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No hay fotos en el concurso aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {photos.map((photo) => {
              const authorName = photo.users 
                ? `${photo.users.first_name} ${photo.users.last_name}`
                : 'Usuario anónimo';
              
              return (
                <Card key={photo.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={photo.image_url}
                        alt={`Foto de ${authorName}`}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">{authorName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(photo.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      <Button
                        onClick={() => downloadPhoto(photo)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Descargar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
