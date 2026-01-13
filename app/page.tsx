"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Gamepad2, Dice5, Monitor } from "lucide-react";
import { toast } from "sonner";
import { UnifiedGame } from "@/lib/types";

export default function Home() {
  const [bggUsername, setBggUsername] = useState("");
  const [steamId, setSteamId] = useState("");

  const [bggGames, setBggGames] = useState<UnifiedGame[]>([]);
  const [steamGames, setSteamGames] = useState<UnifiedGame[]>([]);

  const [bggLoading, setBggLoading] = useState(false);
  const [steamLoading, setSteamLoading] = useState(false);

  const [searchedBgg, setSearchedBgg] = useState(false);
  const [searchedSteam, setSearchedSteam] = useState(false);

  const fetchBGG = async () => {
    if (!bggUsername.trim()) {
      toast.error("Please enter a BGG username");
      return;
    }

    setBggLoading(true);
    setSearchedBgg(true);
    setBggGames([]);

    try {
      const response = await fetch(`/api/bgg?username=${encodeURIComponent(bggUsername)}`);

      if (response.status === 202) {
         toast.message("BGG is processing your request. Please try again in a few moments.");
         setBggLoading(false);
         return;
      }

      if (!response.ok) {
        throw new Error(`Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        const games: UnifiedGame[] = (data.games || []).map((g: any) => ({
             ...g,
             source: 'bgg'
        }));
        setBggGames(games);
        if (games.length === 0) {
           // Handled by empty state in UI
        } else {
           toast.success(`Found ${games.length} board games!`);
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch BGG collection. Please try again.");
    } finally {
      setBggLoading(false);
    }
  };

  const fetchSteam = async () => {
      if (!steamId.trim()) {
          toast.error("Please enter a Steam ID or Vanity URL");
          return;
      }

      setSteamLoading(true);
      setSearchedSteam(true);
      setSteamGames([]);

      try {
          const response = await fetch(`/api/steam?steamId=${encodeURIComponent(steamId)}`);

          if (!response.ok) {
              const errorData = await response.json();
               // Handle specific 403/404 errors with toast as requested
              if (response.status === 404) {
                 toast.error("Steam Username not found.");
              } else if (response.status === 403) {
                 toast.error(errorData.error);
              } else {
                 toast.error(errorData.error || `Status: ${response.status}`);
              }
              return;
          }

          const data = await response.json();
          if (data.error) {
              toast.error(data.error);
          } else {
              const games: UnifiedGame[] = data.games || [];
              setSteamGames(games);
              toast.success(`Found ${games.length} Steam games!`);
          }

      } catch (error) {
          console.error("Fetch error:", error);
          toast.error("Failed to fetch Steam games. Please try again.");
      } finally {
          setSteamLoading(false);
      }
  };

  const handleKeyDownBGG = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchBGG();
    }
  };

  const handleKeyDownSteam = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
          fetchSteam();
      }
  };

  const renderGameCard = (game: UnifiedGame) => {
      const isSteam = game.source === 'steam';
      const borderColor = isSteam ? "border-blue-500/50 hover:border-blue-500" : "border-amber-700/50 hover:border-amber-700";

      return (
        <Card key={`${game.source}-${game.id}`} className={`overflow-hidden hover:shadow-lg transition-all border-2 ${borderColor}`}>
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
            {/* Badge for source distinction */}
            <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold text-white rounded shadow ${isSteam ? 'bg-blue-600' : 'bg-amber-700'}`}>
                {isSteam ? 'STEAM' : 'BGG'}
            </div>
            </AspectRatio>
        </div>
        <CardContent className="p-4">
            <h3 className="font-semibold truncate" title={game.name}>
            {game.name}
            </h3>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                {isSteam ? (
                    <>
                     <span>Digital</span>
                     <span>{game.playtimeHours} hrs played</span>
                    </>
                ) : (
                    <>
                    <span>
                    {game.minPlayers}-{game.maxPlayers} Players
                    </span>
                    <span>
                    {game.playingTime} min
                    </span>
                    </>
                )}
            </div>
        </CardContent>
        </Card>
      );
  };

  const renderSkeletons = () => (
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
  );

  const allGames = [...bggGames, ...steamGames];
  // Sort? Maybe by name? Or keep order?
  // "Display the Steam games in a list/grid similar to the BGG results"
  // I'll leave them in fetch order (BGG then Steam) for now, as user didn't specify sort.

  const showEmptyState = (searchedBgg || searchedSteam) && allGames.length === 0 && !bggLoading && !steamLoading;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex items-center space-x-2">
            <Gamepad2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Game Collection Sync</h1>
          </div>
          <p className="text-muted-foreground">
            Sync your BoardGameGeek and Steam collections.
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BGG Input */}
            <Card className="p-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Dice5 className="h-4 w-4" /> BoardGameGeek
                    </label>
                    <div className="flex gap-2">
                         <Input
                        placeholder="Username"
                        value={bggUsername}
                        onChange={(e) => setBggUsername(e.target.value)}
                        onKeyDown={handleKeyDownBGG}
                        className="flex-1"
                        />
                        <Button onClick={fetchBGG} disabled={bggLoading} variant="outline" size="icon">
                        {bggLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="sr-only">Sync BGG</span>
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Steam Input */}
            <Card className="p-4">
                 <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Monitor className="h-4 w-4" /> Steam
                    </label>
                    <div className="flex gap-2">
                         <Input
                        placeholder="Steam ID / Vanity URL"
                        value={steamId}
                        onChange={(e) => setSteamId(e.target.value)}
                        onKeyDown={handleKeyDownSteam}
                        className="flex-1"
                        />
                        <Button onClick={fetchSteam} disabled={steamLoading} variant="outline" size="icon">
                        {steamLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="sr-only">Sync Steam</span>
                        </Button>
                    </div>
                </div>
            </Card>
        </div>

        {/* Tabs and Grid */}
        <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Games ({allGames.length})</TabsTrigger>
                <TabsTrigger value="boardgames">Board Games ({bggGames.length})</TabsTrigger>
                <TabsTrigger value="videogames">Video Games ({steamGames.length})</TabsTrigger>
            </TabsList>

            <div className="mt-6">
                {(bggLoading || steamLoading) ? (
                    renderSkeletons()
                ) : (
                    <>
                        <TabsContent value="all">
                             {allGames.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {allGames.map(renderGameCard)}
                                </div>
                             ) : showEmptyState ? (
                                <div className="text-center py-12 text-muted-foreground">No games found.</div>
                             ) : null}
                        </TabsContent>
                        <TabsContent value="boardgames">
                            {bggGames.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {bggGames.map(renderGameCard)}
                                </div>
                             ) : searchedBgg && !bggLoading ? (
                                <div className="text-center py-12 text-muted-foreground">No board games found.</div>
                             ) : null}
                        </TabsContent>
                        <TabsContent value="videogames">
                             {steamGames.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {steamGames.map(renderGameCard)}
                                </div>
                             ) : searchedSteam && !steamLoading ? (
                                <div className="text-center py-12 text-muted-foreground">No video games found.</div>
                             ) : null}
                        </TabsContent>
                    </>
                )}
            </div>
        </Tabs>
      </div>
    </div>
  );
}
