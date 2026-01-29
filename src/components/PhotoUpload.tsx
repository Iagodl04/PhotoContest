
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContest } from '@/hooks/useContest';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from './TopBar';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'image/bmp', 'image/tiff'];

export function PhotoUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const { isContestActive } = useContest();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Tipo de archivo no permitido`);
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Archivo demasiado grande (máx. 20MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      toast({
        title: "Archivos no válidos",
        description: errors.join('\n'),
        variant: "destructive",
      });
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  }, [toast]);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !user) return;

    if (!isContestActive()) {
      toast({
        title: "Concurso finalizado",
        description: "No se pueden subir fotos cuando el concurso ha terminado",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const fileName = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contest-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('contest-photos')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('options')
          .insert({
            image_url: publicUrl,
            download_url: publicUrl,
            user_id: user.id,
            user_device_id: user.device_id,
          });

        if (dbError) throw dbError;
      });

      await Promise.all(uploadPromises);

      toast({
        title: "¡Fotos subidas!",
        description: `${selectedFiles.length} foto(s) subida(s) exitosamente`,
      });

      setSelectedFiles([]);
      
      setTimeout(() => {
        navigate('/galeria');
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error al subir",
        description: "No se pudieron subir las fotos. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isContestActive()) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar />
        <div className="pt-20 pb-20 px-4">
          <div className="max-w-md mx-auto">
            <Card className="text-center py-12">
              <CardContent>
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Concurso finalizado</h3>
                <p className="text-gray-600">
                  Ya no se pueden subir más fotos al concurso.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <div className="pt-20 pb-20 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Upload Button - Now positioned above the upload area */}
          {selectedFiles.length > 0 && (
            <div className="text-center">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full max-w-md bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
              >
                {isUploading ? 'Subiendo...' : `Subir ${selectedFiles.length} foto(s)`}
              </Button>
            </div>
          )}

          {/* Upload Area */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors">
            <CardContent className="p-4">
              <div
                className="text-center cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-purple-400', 'bg-purple-50');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-purple-400', 'bg-purple-50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-purple-400', 'bg-purple-50');
                  handleFileSelect(e.dataTransfer.files);
                }}
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <h3 className="text-base font-semibold mb-1 text-gray-900">Arrastra tus fotos aquí</h3>
                <p className="text-gray-600 mb-2 text-sm">
                  o haz clic para seleccionar archivos
                </p>
                <p className="text-xs text-gray-500">
                  Máximo 20MB por archivo. Formatos: JPG, PNG, WebP, HEIC, GIF, BMP, TIFF, RAW, DNG
                </p>
              </div>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-gray-900">
                  Archivos seleccionados ({selectedFiles.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
