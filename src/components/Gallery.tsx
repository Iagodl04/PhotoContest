
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContest } from '@/hooks/useContest';
import { supabase } from '@/integrations/supabase/client';
import { PhotoCard } from './PhotoCard';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { TopBar } from './TopBar';

interface Photo {
  id: string;
  image_url: string;
  download_url: string;
  user_id: string;
  user_device_id: string;
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
  };
}

interface Vote {
  id: string;
  option_id: string;
  category_id: string;
  user_device_id: string;
}

export function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { categories, isContestActive } = useContest();
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
    }
  };

  const loadVotes = async () => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('*');

      if (error) throw error;
      setVotes(data || []);
    } catch (error) {
      console.error('Error loading votes:', error);
    }
  };

  const handleVote = async (photoId: string, categoryId: string) => {
    if (!user) return;

    if (!isContestActive()) {
      toast({
        title: "Concurso finalizado",
        description: "No se puede votar cuando el concurso ha terminado",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if user already voted for this category
      const existingVote = votes.find(vote => 
        vote.category_id === categoryId && 
        vote.user_device_id === user.device_id
      );

      if (existingVote) {
        if (existingVote.option_id === photoId) {
          // Remove vote (toggle off)
          const { error } = await supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id);

          if (error) throw error;
          
          setVotes(prev => prev.filter(v => v.id !== existingVote.id));
        } else {
          // Move vote to new photo
          const { error } = await supabase
            .from('votes')
            .update({ option_id: photoId })
            .eq('id', existingVote.id);

          if (error) throw error;
          
          setVotes(prev => prev.map(v => 
            v.id === existingVote.id 
              ? { ...v, option_id: photoId }
              : v
          ));
        }
      } else {
        // Create new vote
        const { data, error } = await supabase
          .from('votes')
          .insert({
            option_id: photoId,
            category_id: categoryId,
            user_id: user.id,
            user_device_id: user.device_id,
          })
          .select()
          .single();

        if (error) throw error;
        
        setVotes(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Vote error:', error);
      throw error;
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      // First delete all votes for this photo
      const { error: votesError } = await supabase
        .from('votes')
        .delete()
        .eq('option_id', photoId);

      if (votesError) throw votesError;

      // Then delete the photo record
      const { error: photoError } = await supabase
        .from('options')
        .delete()
        .eq('id', photoId);

      if (photoError) throw photoError;

      // Update local state
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setVotes(prev => prev.filter(v => v.option_id !== photoId));

      toast({
        title: "Foto eliminada",
        description: "La foto ha sido eliminada exitosamente",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la foto",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadPhotos(), loadVotes()]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <TopBar />
        <div className="pt-20 pb-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <div className="pt-20 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No hay fotos aún. ¡Sé el primero en subir!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {photos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  votes={votes}
                  onVote={handleVote}
                  onDelete={isAdmin() ? handleDeletePhoto : undefined}
                  showDeleteButton={isAdmin()}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
