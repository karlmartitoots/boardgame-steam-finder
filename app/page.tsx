"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { RefreshCw, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

interface Game {
  id: string;
  name: string;
  thumbnail: string;
  minPlayers: string;
  maxPlayers: string;
  playingTime: string;
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchCollection = async () => {
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }

    setLoading(true);
    setSearched(true);
    setGames([]);

    try {
      const response = await fetch(`/api/bgg?username=${encodeURIComponent(username)}`);

      if (response.status === 202) {
         toast.message("BGG is processing your request. Please try again in a few moments.");
         setLoading(false);
         return;
      }

      if (!response.ok) {
        throw new Error(`Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        setGames(data.games || []);
        if (data.games?.length === 0) {
           // Handled by empty state in UI
        } else {
           toast.success(`Found ${data.games.length} games!`);
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch collection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchCollection();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex items-center space-x-2">
            <Gamepad2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">BGG Steam Finder</h1>
          </div>
          <p className="text-muted-foreground">
            Sync your BoardGameGeek collection to find matches.
          </p>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Enter BGG Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={fetchCollection} disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {loading ? "Syncing..." : "Sync Collection"}
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="p-0">
                  <AspectRatio ratio={1}>
                    <Skeleton className="h-full w-full" />
                  </AspectRatio>
                </div>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : games.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <Card key={game.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <AspectRatio ratio={1}>
                    {game.thumbnail ? (
                        <img
                        src={game.thumbnail}
                        alt={game.name}
                        className="object-cover w-full h-full"
                        loading="lazy"
                        />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
                            No Image
                        </div>
                    )}
                  </AspectRatio>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold truncate" title={game.name}>
                    {game.name}
                  </h3>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                     <span>
                        {game.minPlayers}-{game.maxPlayers} Players
                     </span>
                     <span>
                        {game.playingTime} min
                     </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searched ? (
           <div className="text-center py-12">
             <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
               <Gamepad2 className="h-6 w-6 text-muted-foreground" />
             </div>
             <h3 className="text-lg font-semibold">No games found</h3>
             <p className="text-muted-foreground">
               Try checking the username or sync again.
             </p>
           </div>
        ) : null}
      </div>
    </div>
  );
}
