import { UnifiedGame } from "@/lib/types";
import { gameMetadataAdapter } from "@/lib/adapters/InMemoryGameMetadataAdapter";

interface SteamGenre {
  id: string;
  description: string;
}

interface SteamAppDetails {
  [appId: string]: {
    success: boolean;
    data?: {
      genres?: SteamGenre[];
    };
  };
}

export async function enrichGames(games: UnifiedGame[]): Promise<UnifiedGame[]> {
  // Sort games by playTimeTotal (descending)
  const sortedGames = [...games].sort((a, b) => (b.playtimeHours || 0) - (a.playtimeHours || 0));

  // Take the top 20 games
  const top20 = sortedGames.slice(0, 20);
  const remainingGames = sortedGames.slice(20);

  // Check the Repository for existing tags
  const appIds = top20.map((game) => `steam:${game.id}`);
  const existingTagsMap = await gameMetadataAdapter.getTags(appIds);

  const newTagsMap: Record<string, string[]> = {};
  const gamesToFetch: UnifiedGame[] = [];

  for (const game of top20) {
    if (existingTagsMap[`steam:${game.id}`]) {
      // Tags found in cache
      game.tags = existingTagsMap[`steam:${game.id}`];
    } else {
      // Identify "misses"
      gamesToFetch.push(game);
    }
  }

  // Fetch Details: For the misses, fetch game details from the Steam Store API
  if (gamesToFetch.length > 0) {
    const fetchPromises = gamesToFetch.map(async (game) => {
      try {
        const response = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${game.id}&filters=genres&l=en`
        );
        if (!response.ok) {
            console.error(`Failed to fetch details for app ${game.id}: ${response.status}`);
            return null;
        }
        const data: SteamAppDetails = await response.json();
        const appData = data[game.id];

        if (appData && appData.success && appData.data?.genres) {
          const tags = appData.data.genres.map((g) => g.description);
          return { id: game.id, tags };
        } else {
            return { id: game.id, tags: [] };
        }
      } catch (error) {
        console.error(`Error fetching details for app ${game.id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);

    for (const result of results) {
      if (result) {
        newTagsMap[`steam:${result.id}`] = result.tags;
        // Update the game object in the top20 list
        const game = top20.find((g) => g.id === result.id);
        if (game) {
          game.tags = result.tags;
        }
      }
    }

    // Save new tags to the Repository
    if (Object.keys(newTagsMap).length > 0) {
      await gameMetadataAdapter.saveTags(newTagsMap);
    }
  }

  // Return the sorted list with the tags field populated for the top 20 games
  return sortedGames;
}
