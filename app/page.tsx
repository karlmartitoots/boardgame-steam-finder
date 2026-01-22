"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Gamepad2, Dice5, Monitor } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { UnifiedGame } from "@/lib/types";
import { useLocalStorageHistory } from "@/hooks/use-local-storage-history";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export default function Home() {
  const [bggUsername, setBggUsername] = useState("");
  const [steamId, setSteamId] = useState("");

  const { history: bggHistory, addToHistory: addBggHistory } = useLocalStorageHistory("bgg_history");
  const { history: steamHistory, addToHistory: addSteamHistory } = useLocalStorageHistory("steam_history");

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
        addBggHistory(bggUsername);
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
              addSteamHistory(steamId);
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
      const borderClass = isSteam ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-amber-700";

      return (
        <Card key={`${game.source}-${game.id}`} className={`overflow-hidden hover:shadow-md transition-all ${borderClass}`}>
          <div className="flex flex-row p-4 gap-4 items-center h-full">
            <div className="flex-shrink-0 w-20 h-20">
                {game.thumbnail ? (
                    <img
                    src={game.thumbnail}
                    alt={game.name}
                    className="w-full h-full object-cover rounded-md shadow-sm"
                    loading="lazy"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground rounded-md text-xs">
                        No Img
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <h3 className="font-semibold text-sm sm:text-base truncate" title={game.name}>
                    {game.name}
                </h3>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {isSteam ? (
                        <>
                             <div className="flex items-center gap-1">
                                <Monitor className="h-3 w-3" />
                                <span>Digital</span>
                             </div>
                             <span className="text-primary font-medium">{game.playtimeHours} hrs</span>
                        </>
                    ) : (
                        <>
                             <div className="flex items-center gap-1">
                                <Dice5 className="h-3 w-3" />
                                <span>Tabletop</span>
                             </div>
                             <span>{game.playingTime}m • {game.minPlayers}-{game.maxPlayers}p</span>
                        </>
                    )}
                </div>

                {game.tags && game.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {game.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1 font-normal">
                                {tag}
                            </Badge>
                        ))}
                         {game.tags.length > 3 && (
                             <span className="text-[10px] text-muted-foreground self-center">+{game.tags.length - 3}</span>
                        )}
                    </div>
                )}
            </div>
          </div>
        </Card>
      );
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
        <div className="flex flex-row p-4 gap-4 items-center">
            <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
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
                         <div className="flex-1">
                           <Combobox
                             items={bggHistory}
                             inputValue={bggUsername}
                             onInputValueChange={(val) => setBggUsername(val)}
                           >
                              <ComboboxInput
                                placeholder="Username"
                                onKeyDown={handleKeyDownBGG}
                                className="w-full"
                              />
                              <ComboboxContent>
                                <ComboboxList>
                                  {(item) => (
                                    <ComboboxItem key={item} value={item}>
                                      {item}
                                    </ComboboxItem>
                                  )}
                                </ComboboxList>
                              </ComboboxContent>
                           </Combobox>
                         </div>
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
                         <div className="flex-1">
                           <Combobox
                             items={steamHistory}
                             inputValue={steamId}
                             onInputValueChange={(val) => setSteamId(val)}
                           >
                              <ComboboxInput
                                placeholder="Steam ID / Vanity URL"
                                onKeyDown={handleKeyDownSteam}
                                className="w-full"
                              />
                              <ComboboxContent>
                                <ComboboxList>
                                  {(item) => (
                                    <ComboboxItem key={item} value={item}>
                                      {item}
                                    </ComboboxItem>
                                  )}
                                </ComboboxList>
                              </ComboboxContent>
                           </Combobox>
                         </div>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {allGames.map(renderGameCard)}
                                </div>
                             ) : showEmptyState ? (
                                <div className="text-center py-12 text-muted-foreground">No games found.</div>
                             ) : null}
                        </TabsContent>
                        <TabsContent value="boardgames">
                            {bggGames.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {bggGames.map(renderGameCard)}
                                </div>
                             ) : searchedBgg && !bggLoading ? (
                                <div className="text-center py-12 text-muted-foreground">No board games found.</div>
                             ) : null}
                        </TabsContent>
                        <TabsContent value="videogames">
                             {steamGames.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
