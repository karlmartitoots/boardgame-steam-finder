import { enrichGames } from '../steamEnricher';
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

describe('steamEnricher', () => {
  let mockGames: UnifiedGame[];

  beforeEach(() => {
    jest.clearAllMocks();
    // Create fresh objects for each test to avoid mutation bleeding
    mockGames = [
      { id: '1', name: 'Game 1', thumbnail: '', playtimeHours: 10, source: 'steam' },
      { id: '2', name: 'Game 2', thumbnail: '', playtimeHours: 20, source: 'steam' }, // Top 1
      { id: '3', name: 'Game 3', thumbnail: '', playtimeHours: 5, source: 'steam' },
    ];
  });

  it('should enrich top games with tags from cache', async () => {
    // Adapter returns tags for Game 2
    (gameMetadataAdapter.getTags as jest.Mock).mockResolvedValue({
      'steam:2': ['Action', 'RPG'],
    });

    // Mock fetch to succeed with empty result for others to avoid crash
    (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({})
    });

    const result = await enrichGames(mockGames);

    // Sorted order check: Game 2 (20hrs) should have tags
    const game2 = result.find(g => g.id === '2');
    expect(game2?.tags).toEqual(['Action', 'RPG']);
  });

  it('should fetch tags for games missing in cache', async () => {
     (gameMetadataAdapter.getTags as jest.Mock).mockResolvedValue({});

     // Mock fetch response for Game 2
     (global.fetch as jest.Mock).mockResolvedValue({
         ok: true,
         json: async () => ({
             '2': { success: true, data: { genres: [{ description: 'Strategy' }] } }
         })
     });

     const result = await enrichGames([mockGames[1]]); // Just Game 2

     expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('appids=2'));
     expect(gameMetadataAdapter.saveTags).toHaveBeenCalledWith({
         'steam:2': ['Strategy']
     });
     expect(result[0].tags).toEqual(['Strategy']);
  });

   it('should handle API failures gracefully', async () => {
     (gameMetadataAdapter.getTags as jest.Mock).mockResolvedValue({});
     (global.fetch as jest.Mock).mockResolvedValue({
         ok: false,
         status: 500
     });

     const result = await enrichGames([mockGames[1]]);

     expect(result[0].tags).toBeUndefined(); // Should not have tags if fetch failed
   });
});
