import { EventEmitter } from 'events';

/**
 * Core Game Mechanics
 * This module provides the basic structure and functionality for mini-games.
 */

// Event names for observability
const GAME_EVENTS = {
  START: 'game.start',
  MOVE: 'game.move',
  FINISH: 'game.finish',
};

/**
 * GameEngine class to manage the core mechanics of a game.
 */
class GameEngine extends EventEmitter {
  protected players: string[]; // Changed from private to protected
  protected state: { started: boolean; moves: any[] }; // Changed from private to protected
  protected scoring: Record<string, number>; // Changed from private to protected

  constructor() {
    super();
    this.players = [];
    this.state = { started: false, moves: [] };
    this.scoring = {};
  }

  /**
   * Add a player to the game.
   * @param {string} playerId - Unique identifier for the player.
   */
  addPlayer(playerId: string): void {
    if (this.players.length >= 2) {
      throw new Error('Maximum players reached');
    }
    this.players.push(playerId);
    this.scoring[playerId] = 0;
  }

  /**
   * Start the game.
   */
  startGame(): void {
    this.state = { started: true, moves: [] };
    this.emit(GAME_EVENTS.START, { players: this.players });
  }

  /**
   * Record a move in the game.
   * @param {string} playerId - The player making the move.
   * @param {object} move - Details of the move.
   */
  recordMove(playerId: string, move: object): void {
    if (!this.state.started) {
      throw new Error('Game has not started');
    }
    this.state.moves.push({ playerId, ...move });
    this.emit(GAME_EVENTS.MOVE, { playerId, move });
  }

  /**
   * End the game and calculate the winner.
   */
  endGame(): void {
    this.state.started = false;
    const winner = this.calculateWinner();
    this.emit(GAME_EVENTS.FINISH, { winner });
  }

  /**
   * Calculate the winner based on scoring.
   * @returns {string} - The player ID of the winner.
   */
  private calculateWinner(): string {
    return Object.keys(this.scoring).reduce((a, b) => (this.scoring[a] > this.scoring[b] ? a : b));
  }
}

export default GameEngine;
export { GAME_EVENTS };
