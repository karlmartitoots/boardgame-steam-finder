import { enrichGames } from '../bggEnricher';
import { UnifiedGame } from '@/lib/types';
import { gameMetadataAdapter } from '@/lib/adapters/InMemoryGameMetadataAdapter';

// Mock the adapter
jest.mock('@/lib/adapters/InMemoryGameMetadataAdapter', () => ({
  gameMetadataAdapter: {
    getTags: jest.fn(),
    saveTags: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('bggEnricher', () => {
  let mockGames: UnifiedGame[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGames = [
      { id: '101', name: 'Game A', thumbnail: '', rating: 8.5, source: 'bgg' },
      { id: '102', name: 'Game B', thumbnail: '', rating: 9.0, source: 'bgg' }, // Top 1
      { id: '103', name: 'Game C', thumbnail: '', rating: 7.0, source: 'bgg' },
    ];
    // Default mock response to avoid crashes
    (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => '<items></items>'
    });
  });

  it('should enrich top games with tags from cache', async () => {
    // Adapter returns tags for Game B (highest rating)
    (gameMetadataAdapter.getTags as jest.Mock).mockResolvedValue({
      'bgg:102': ['Economy', 'Strategy'],
    });

    const result = await enrichGames(mockGames);

    // Sorted order: Game B (9.0) should be first
    expect(result[0].id).toBe('102');
    expect(result[0].tags).toEqual(['Economy', 'Strategy']);

    // Game A (8.5) should be second, no tags
    expect(result[1].id).toBe('101');
    expect(result[1].tags).toBeUndefined();
  });

  it('should fetch tags for games missing in cache', async () => {
     (gameMetadataAdapter.getTags as jest.Mock).mockResolvedValue({});

     // Mock fetch response for Game B
     const mockXml = `
     <items>
       <item type="boardgame" id="102">
         <link type="boardgamecategory" value="Sci-Fi" />
         <link type="boardgamemechanic" value="Dice" />
       </item>
     </items>
     `;

     (global.fetch as jest.Mock).mockResolvedValue({
         ok: true,
         text: async () => mockXml
     });

     const result = await enrichGames(mockGames);

     expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('id=102,101,103'),
        expect.anything()
     ); // All fetched in batch (order depends on sort)
     // Actually sorted order: 102, 101, 103.

     expect(gameMetadataAdapter.saveTags).toHaveBeenCalledWith(expect.objectContaining({
         'bgg:102': expect.arrayContaining(['Sci-Fi', 'Dice'])
     }));

     const gameB = result.find(g => g.id === '102');
     expect(gameB?.tags).toEqual(['Sci-Fi', 'Dice']);
  });

  it('should use mock data for specific mock IDs', async () => {
      const mockGame = { id: '68448', name: 'Mock Game', thumbnail: '', rating: 10, source: 'bgg' } as UnifiedGame;

      (gameMetadataAdapter.getTags as jest.Mock).mockResolvedValue({});

      const result = await enrichGames([mockGame]);

      // Should NOT call fetch (or might call fetch if logic is "try fetch, fallback"? No, logic was "check if mock ID present")
      // My implementation: `const shouldUseMock = gamesToFetch.some(g => mockIds.includes(g.id));`
      // If true, it uses mock string immediately.

      expect(global.fetch).not.toHaveBeenCalled();

      expect(result[0].tags).toEqual(expect.arrayContaining(['Card Game', 'Civilization']));
  });
});
