
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContest } from '@/hooks/useContest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trophy, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Winner {
  category_id: string;
  category_name: string;
  category_icon: string;
  photo?: {
    id: string;
    image_url: string;
    download_url: string;
    user_name: string;
    vote_count: number;
  };
}

export function Results() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { categories } = useContest();
  const navigate = useNavigate();

  const loadWinners = async () => {
    try {
      const categoryWinners: Winner[] = [];

      for (const category of categories) {
        const { data, error } = await supabase
          .from('votes')
          .select(`
            option_id,
            options (
              id,
              image_url,
              download_url,
              created_at,
              users (
                first_name,
                last_name
              )
            )
          `)
          .eq('category_id', category.id);

        if (error) throw error;

        // Count votes for each photo
        const voteCounts: { [photoId: string]: { photo: any, count: number } } = {};
        
        data?.forEach((vote: any) => {
          const photoId = vote.option_id;
          if (!voteCounts[photoId]) {
            voteCounts[photoId] = {
              photo: vote.options,
              count: 0
            };
          }
          voteCounts[photoId].count++;
        });

        // Find the winner (most votes, then most recent)
        let winner = null;
        if (Object.keys(voteCounts).length > 0) {
          const sortedPhotos = Object.values(voteCounts)
            .sort((a, b) => {
              if (b.count !== a.count) {
                return b.count - a.count;
              }
              return new Date(b.photo.created_at).getTime() - new Date(a.photo.created_at).getTime();
            });

          const winnerData = sortedPhotos[0];
          winner = {
            id: winnerData.photo.id,
            image_url: winnerData.photo.image_url,
            download_url: winnerData.photo.download_url,
            user_name: winnerData.photo.users 
              ? `${winnerData.photo.users.first_name} ${winnerData.photo.users.last_name}` 
              : 'Usuario desconocido',
            vote_count: winnerData.count,
          };
        }

        categoryWinners.push({
          category_id: category.id,
          category_name: category.name,
          category_icon: category.icon,
          photo: winner,
        });
      }

      setWinners(categoryWinners);
    } catch (error) {
      console.error('Error loading winners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPhoto = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    loadWinners();
  }, [categories]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              🎉 Resultados Finales
            </h1>
            <p className="text-xl text-gray-600">¡Estos son los ganadores del concurso!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {winners.map((winner) => (
              <Card key={winner.category_id} className="text-center shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2 text-gray-900">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <span className="text-xl">{winner.category_icon}</span>
                    {winner.category_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {winner.photo ? (
                    <div className="space-y-4">
                      <div className="aspect-square rounded-lg overflow-hidden shadow-md">
                        <img
                          src={winner.photo.image_url}
                          alt={`Ganador de ${winner.category_name}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-lg text-gray-900">{winner.photo.user_name}</p>
                        <p className="text-gray-600">
                          {winner.photo.vote_count} {winner.photo.vote_count === 1 ? 'voto' : 'votos'}
                        </p>
                      </div>
                      <Button
                        onClick={() => downloadPhoto(
                          winner.photo!.download_url,
                          `ganador-${winner.category_name.toLowerCase()}-${winner.photo!.user_name}.jpg`
                        )}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <p className="text-gray-500">No hay ganador en esta categoría</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center pb-8">
            <Button
              onClick={() => navigate('/todas-las-fotos')}
              className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-lg px-8 py-3"
            >
              Ver todas las fotos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
