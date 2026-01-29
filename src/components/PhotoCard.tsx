
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContest } from '@/hooks/useContest';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, X, Heart } from 'lucide-react';

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

interface PhotoCardProps {
  photo: Photo;
  votes: Vote[];
  onVote: (photoId: string, categoryId: string) => Promise<void>;
  onDelete?: (photoId: string) => Promise<void>;
  showDeleteButton?: boolean;
}

export function PhotoCard({ photo, votes, onVote, onDelete, showDeleteButton = false }: PhotoCardProps) {
  const [isVoting, setIsVoting] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();
  const { categories, isContestActive } = useContest();
  const { toast } = useToast();

  const handleVote = async (categoryId: string) => {
    if (!user || !isContestActive()) return;

    // Prevent users from voting on their own photos
    if (photo.user_device_id === user.device_id) {
      toast({
        title: "No permitido",
        description: "No puedes votar por tu propia foto",
        variant: "destructive",
      });
      return;
    }

    setIsVoting(categoryId);
    try {
      await onVote(photo.id, categoryId);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el voto",
        variant: "destructive",
      });
    } finally {
      setIsVoting(null);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(photo.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la foto",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getVoteCount = (categoryId: string) => {
    return votes.filter(vote => vote.option_id === photo.id && vote.category_id === categoryId).length;
  };

  const getUserVote = (categoryId: string) => {
    if (!user) return null;
    return votes.find(vote => 
      vote.option_id === photo.id && 
      vote.category_id === categoryId && 
      vote.user_device_id === user.device_id
    );
  };

  const isOwnPhoto = user && photo.user_device_id === user.device_id;

  return (
    <>
      <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
        <div className="relative aspect-square">
          <img
            src={photo.image_url}
            alt={`Foto de ${photo.users?.first_name} ${photo.users?.last_name}`}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setShowFullImage(true)}
          />
          
          {showDeleteButton && (
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2 h-8 w-8 p-0"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        
        <CardContent className="p-3">
          <div className="mb-3">
            <p className="font-medium text-gray-900 text-sm">
              {photo.users?.first_name} {photo.users?.last_name}
            </p>
            <p className="text-xs text-gray-600">
              {new Date(photo.created_at).toLocaleDateString('es-ES')}
            </p>
          </div>

          {/* Voting buttons - exact design from image */}
          <div className="flex items-center justify-center gap-2">
            {categories.map((category) => {
              const voteCount = getVoteCount(category.id);
              const userVoted = getUserVote(category.id);
              const isVotingThis = isVoting === category.id;
              
              return (
                <div key={category.id} className="flex items-center">
                  {isOwnPhoto ? (
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50">
                      <span className="text-sm">{category.icon}</span>
                      <span className="text-sm font-medium text-gray-400">{voteCount}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleVote(category.id)}
                      disabled={isVotingThis || !isContestActive()}
                      className={`
                        flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all duration-200
                        ${userVoted 
                          ? 'bg-purple-500 border-purple-500 text-white' 
                          : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                        }
                        ${isVotingThis || !isContestActive() 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'cursor-pointer hover:shadow-sm'
                        }
                      `}
                    >
                      {isVotingThis ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm font-medium">{voteCount}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm">{category.icon}</span>
                          <span className="text-sm font-medium">{voteCount}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Full image modal */}
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista completa de la foto</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img
              src={photo.image_url}
              alt={`Foto de ${photo.users?.first_name} ${photo.users?.last_name}`}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            <Button
              onClick={() => setShowFullImage(false)}
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
