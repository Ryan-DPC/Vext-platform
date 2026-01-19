export interface Game {
  id: string;
  _id?: string; // Handle both id formats
  title: string;
  // Support both backend 'title' and potentially 'name' if API varies
  name?: string;
  description: string;
  coverInfo?: {
    coverUrl?: string;
  };
  // Fallback flat property if structure flat
  cover_url?: string;

  // Stats
  percentage?: number;
  timePlayed?: string; // e.g. "2h 30m"
  status?: 'installed' | 'not_installed' | 'updating' | 'running';

  // Metadata
  genres?: string[];
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  rating?: number;
  isFavorite?: boolean;
}
