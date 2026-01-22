export interface UnifiedGame {
  id: string;
  name: string;
  thumbnail: string;
  minPlayers?: string;
  maxPlayers?: string;
  playingTime?: string; // For BGG (e.g. "30") representing minutes
  playtimeHours?: number; // For Steam (e.g. 12.5) representing hours
  source: 'bgg' | 'steam';
  tags?: string[];
  rating?: number;
}
