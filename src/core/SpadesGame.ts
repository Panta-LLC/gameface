import GameEngine, { GAME_EVENTS } from './GameEngine';

/**
 * Spades Game Implementation
 * Extends the GameEngine to implement the rules and mechanics of Spades.
 */

interface SpadesState {
  started: boolean;
  moves: any[];
  tricks: Record<string, number>;
  bids: Record<string, number>;
}

class SpadesGame extends GameEngine {
  protected state: SpadesState; // Changed from private to protected to align with the base class

  constructor() {
    super();
    this.state = {
      started: false,
      moves: [],
      tricks: {},
      bids: {},
    };
  }

  /**
   * Place a bid for a player.
   * @param {string} playerId - The player making the bid.
   * @param {number} bid - The number of tricks the player expects to win.
   */
  placeBid(playerId: string, bid: number): void {
    if (this.state.started) {
      throw new Error('Cannot place bids after the game has started');
    }
    this.state.bids[playerId] = bid;
  }

  /**
   * Record a trick won by a player.
   * @param {string} playerId - The player who won the trick.
   */
  recordTrick(playerId: string): void {
    if (!this.state.started) {
      throw new Error('Game has not started');
    }
    if (!this.state.tricks[playerId]) {
      this.state.tricks[playerId] = 0;
    }
    this.state.tricks[playerId] += 1;
  }

  /**
   * Start the Spades game.
   */
  startGame(): void {
    if (Object.keys(this.state.bids).length !== this.players.length) {
      throw new Error('All players must place bids before starting the game');
    }
    this.state.started = true;
    this.emit(GAME_EVENTS.START, { players: this.players, bids: this.state.bids });
  }

  /**
   * End the Spades game and calculate the winner.
   */
  endGame(): void {
    this.state.started = false;
    const scores = this.calculateScores();
    const winner = Object.keys(scores).reduce((a, b) => (scores[a] > scores[b] ? a : b));
    this.emit(GAME_EVENTS.FINISH, { winner, scores });
  }

  /**
   * Calculate scores based on bids and tricks won.
   * @returns {Record<string, number>} - The scores for each player.
   */
  private calculateScores(): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const playerId of this.players) {
      const tricksWon = this.state.tricks[playerId] || 0;
      const bid = this.state.bids[playerId] || 0;
      scores[playerId] = tricksWon >= bid ? bid * 10 + (tricksWon - bid) : -bid * 10;
    }
    return scores;
  }
}

export default SpadesGame;
