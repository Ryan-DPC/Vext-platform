import axios from '../utils/axiosConfig';
import tauriAPI from '../tauri-adapter';
import { socketService } from './socket';

class StatsService {
  private currentSessionId: string | null = null;
  private currentGameId: string | null = null;
  private sessionStartTime: number = 0;

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    tauriAPI.onGameExited(async (data: any) => {
      console.log('Game exited:', data);
      if (this.currentSessionId && this.currentGameId === data.gameId) {
        await this.endSession(this.currentSessionId);
      } else if (this.currentSessionId) {
        // Fallback: if gameId mismatch but session is open, close it anyway
        console.warn('Closing session with mismatched GameID');
        await this.endSession(this.currentSessionId);
      }
    });
  }

  // Game ID to display name mapping
  private getGameDisplayName(gameId: string): string {
    const gameNames: Record<string, string> = {
      aether_strike: 'Aether Strike',
      stick_arena: 'Stick Arena',
      // Add more games as needed
    };
    return gameNames[gameId] || gameId;
  }

  async startSession(gameId: string): Promise<string | null> {
    try {
      this.sessionStartTime = Date.now();
      const response = await axios.post('/stats/session/start', { gameId });
      this.currentSessionId = response.data.sessionId;
      this.currentGameId = gameId;

      // Update Socket Status with rich activity
      const activity = {
        game: this.getGameDisplayName(gameId),
        startedAt: new Date().toISOString(),
      };
      socketService.updateStatus('in-game', this.currentSessionId || undefined, activity);

      return this.currentSessionId;
    } catch (error) {
      console.error('Failed to start session:', error);
      this.currentGameId = gameId;

      // Still update status with activity
      const activity = {
        game: this.getGameDisplayName(gameId),
        startedAt: new Date().toISOString(),
      };
      socketService.updateStatus('in-game', undefined, activity);
      return null;
    }
  }

  async endSession(sessionId: string | null): Promise<void> {
    try {
      if (sessionId) {
        await axios.post('/stats/session/end', { sessionId });
      }

      // Calculate runtime
      if (this.sessionStartTime > 0 && this.currentGameId) {
        const durationMs = Date.now() - this.sessionStartTime;
        const minutes = Math.floor(durationMs / 60000); // Convert to minutes

        if (minutes > 0) {
          console.log(`Reporting playtime: ${minutes} minutes for game ${this.currentGameId}`);
          await axios.post('/users/playtime', {
            gameId: this.currentGameId,
            minutes: minutes,
          });
        }
      }

      this.currentSessionId = null;
      this.currentGameId = null;
      this.sessionStartTime = 0;

      // Reset Status
      socketService.updateStatus('online');
    } catch (error) {
      console.error('Failed to end session/playtime:', error);
      socketService.updateStatus('online'); // Reset anyway
    }
  }

  async getGlobalStats(): Promise<any> {
    try {
      const response = await axios.get('/stats/global');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch global stats:', error);
      return null;
    }
  }

  async getGameStats(gameId: string): Promise<any> {
    try {
      const response = await axios.get(`/stats/${gameId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch game stats:', error);
      return null;
    }
  }
}

export const statsService = new StatsService();
