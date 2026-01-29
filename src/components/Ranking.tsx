
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useContest } from '@/hooks/useContest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trophy, Medal, Award } from 'lucide-react';
import { TopBar } from './TopBar';

interface RankedPhoto {
  id: string;
  image_url: string;
  download_url: string;
  vote_count: number;
  user_name: string;
  created_at: string;
}

interface CategoryRanking {
  category_id: string;
  category_name: string;
  category_icon: string;
  photos: RankedPhoto[];
}

export function Ranking() {
  const [rankings, setRankings] = useState<CategoryRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { categories } = useContest();

  const loadRankings = async () => {
    try {
      const categoryRankings: CategoryRanking[] = [];

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

        // Convert to array and sort by vote count
        const rankedPhotos: RankedPhoto[] = Object.values(voteCounts)
          .map(({ photo, count }) => ({
            id: photo.id,
            image_url: photo.image_url,
            download_url: photo.download_url,
            vote_count: count,
            user_name: photo.users ? `${photo.users.first_name} ${photo.users.last_name}` : 'Usuario desconocido',
            created_at: photo.created_at,
          }))
          .sort((a, b) => {
            if (b.vote_count !== a.vote_count) {
              return b.vote_count - a.vote_count;
            }
            // Tie-breaker: most recent vote wins (based on photo creation date)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

        categoryRankings.push({
          category_id: category.id,
          category_name: category.name,
          category_icon: category.icon,
          photos: rankedPhotos,
        });
      }

      setRankings(categoryRankings);
    } catch (error) {
      console.error('Error loading rankings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, [categories]);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Award className="h-6 w-6 text-orange-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{position + 1}</span>;
    }
  };

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
        <div className="max-w-6xl mx-auto space-y-8">
          {rankings.map((categoryRanking) => (
            <Card key={categoryRanking.category_id} className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-gray-900">
                  <span className="text-2xl">{categoryRanking.category_icon}</span>
                  {categoryRanking.category_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryRanking.photos.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">
                    Sin votos aún en esta categoría
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categoryRanking.photos.map((photo, index) => (
                      <div key={photo.id} className="relative bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="aspect-square">
                          <img
                            src={photo.image_url}
                            alt={`Foto de ${photo.user_name}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute top-2 left-2 bg-white rounded-full p-2 shadow-lg">
                          {getRankIcon(index)}
                        </div>
                        <div className="p-3">
                          <p className="font-medium text-gray-900">{photo.user_name}</p>
                          <p className="text-sm text-gray-600">
                            {photo.vote_count} {photo.vote_count === 1 ? 'voto' : 'votos'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
