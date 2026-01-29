
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';

interface Photo {
  id: string;
  image_url: string;
  download_url?: string;
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
  };
}

interface PhotoCardWithDownloadProps {
  photo: Photo;
  onVote?: (photoId: string) => void;
  hasVoted?: boolean;
  showVoting?: boolean;
}

export function PhotoCardWithDownload({ photo, onVote, hasVoted, showVoting = true }: PhotoCardWithDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const downloadPhoto = async () => {
    if (!photo.download_url && !photo.image_url) {
      toast({
        title: "Error",
        description: "No se pudo obtener la URL de descarga",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const downloadUrl = photo.download_url || photo.image_url;
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const authorName = photo.users 
        ? `${photo.users.first_name}_${photo.users.last_name}`
        : 'anonimo';
      a.download = `foto_${authorName}_${photo.id.slice(0, 8)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Descarga iniciada",
        description: "La foto se está descargando",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar la foto",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const authorName = photo.users 
    ? `${photo.users.first_name} ${photo.users.last_name}`
    : 'Usuario anónimo';

  return (
    <Card className="overflow-hidden bg-white shadow-lg">
      <CardContent className="p-0">
        <div className="relative">
          <img
            src={photo.image_url}
            alt={`Foto de ${authorName}`}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        </div>
        <div className="p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm text-gray-900 truncate block">
                {authorName}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(photo.created_at).toLocaleDateString('es-ES')}
              </span>
            </div>
            <Button
              onClick={downloadPhoto}
              disabled={isDownloading}
              variant="outline"
              size="sm"
              className="ml-2 flex-shrink-0"
            >
              {isDownloading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
            </Button>
          </div>
          
          {showVoting && onVote && (
            <Button
              onClick={() => onVote(photo.id)}
              disabled={hasVoted}
              variant={hasVoted ? "secondary" : "default"}
              size="sm"
              className="w-full"
            >
              {hasVoted ? 'Ya votaste' : 'Votar'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
