/**
 * Board.js — Gestion du plateau hexagonal
 * "Le Dernier Phare" — Jeu narratif lovecraftien
 *
 * Le plateau stocke toutes les tuiles dans une Map indexée par
 * coordonnées axiales. Il gère la révélation progressive du
 * brouillard de guerre et les requêtes de voisinage.
 */

import { Tile, TILE_TYPES, FOG_STATES } from './Tile.js';

// --- Les 6 directions en coordonnées axiales (pointy-top) ---
const AXIAL_DIRECTIONS = Object.freeze([
  { dq: +1, dr:  0 },   // Est
  { dq: +1, dr: -1 },   // Nord-Est
  { dq:  0, dr: -1 },   // Nord-Ouest
  { dq: -1, dr:  0 },   // Ouest
  { dq: -1, dr: +1 },   // Sud-Ouest
  { dq:  0, dr: +1 },   // Sud-Est
]);

/**
 * Classe Board — Plateau de jeu hexagonal
 */
export class Board {
  /**
   * @param {Array<Object>} tileConfigs — Tableau de configurations de tuiles
   *   provenant des données de la carte (island-map.js)
   */
  constructor(tileConfigs = []) {
    // Stockage des tuiles dans une Map : clé "q,r" → instance Tile
    this._tiles = new Map();

    // Création des instances de Tile à partir des configurations
    for (const config of tileConfigs) {
      const tile = new Tile(config);
      this._tiles.set(tile.getKey(), tile);
    }
  }

  // =========================================================================
  // Accesseurs de tuiles
  // =========================================================================

  /**
   * Récupère une tuile par ses coordonnées axiales
   * @param {number} q — Coordonnée Q
   * @param {number} r — Coordonnée R
   * @returns {Tile|null} La tuile ou null si inexistante
   */
  getTile(q, r) {
    return this._tiles.get(`${q},${r}`) ?? null;
  }

  /**
   * Retourne toutes les tuiles du plateau sous forme de tableau
   * @returns {Array<Tile>}
   */
  getAllTiles() {
    return Array.from(this._tiles.values());
  }

  /**
   * Filtre les tuiles par type de terrain
   * @param {string} type — Un des types de TILE_TYPES
   * @returns {Array<Tile>}
   */
  getTilesByType(type) {
    return this.getAllTiles().filter(tile => tile.type === type);
  }

  /**
   * Retourne le nombre total de tuiles sur le plateau
   * @returns {number}
   */
  get tileCount() {
    return this._tiles.size;
  }

  // =========================================================================
  // Voisinage et déplacement
  // =========================================================================

  /**
   * Retourne les tuiles adjacentes (6 directions hexagonales)
   * @param {number} q — Coordonnée Q du centre
   * @param {number} r — Coordonnée R du centre
   * @returns {Array<Tile>} Tuiles voisines existantes
   */
  getNeighbors(q, r) {
    const neighbors = [];

    for (const dir of AXIAL_DIRECTIONS) {
      const neighborQ = q + dir.dq;
      const neighborR = r + dir.dr;
      const tile = this.getTile(neighborQ, neighborR);

      if (tile !== null) {
        neighbors.push(tile);
      }
    }

    return neighbors;
  }

  /**
   * Retourne les tuiles vers lesquelles le joueur peut se déplacer
   * Conditions : adjacente, explorable, non bloquée, pas d'eau profonde
   * @param {number} q — Position actuelle Q
   * @param {number} r — Position actuelle R
   * @returns {Array<Tile>} Tuiles accessibles
   */
  getMovableTiles(q, r) {
    return this.getNeighbors(q, r).filter(tile => {
      return tile.explorable
        && !tile.blocked
        && tile.type !== TILE_TYPES.DEEP_WATER;
    });
  }

  // =========================================================================
  // Brouillard de guerre et exploration
  // =========================================================================

  /**
   * Révèle une tuile et passe ses voisins cachés en "brumeux"
   * Simule la vision limitée du gardien de phare dans l'obscurité
   * @param {number} q — Coordonnée Q
   * @param {number} r — Coordonnée R
   */
  revealTile(q, r) {
    const tile = this.getTile(q, r);
    if (!tile) return;

    // Révéler la tuile ciblée
    tile.fogState = FOG_STATES.REVEALED;

    // Les voisins cachés deviennent des silhouettes brumeuses
    const neighbors = this.getNeighbors(q, r);
    for (const neighbor of neighbors) {
      if (neighbor.fogState === FOG_STATES.HIDDEN) {
        neighbor.fogState = FOG_STATES.SHROUDED;
      }
    }
  }

  /**
   * Explore complètement une tuile : marque comme visitée,
   * révèle la tuile et ses voisins
   * @param {number} q — Coordonnée Q
   * @param {number} r — Coordonnée R
   */
  exploreTile(q, r) {
    const tile = this.getTile(q, r);
    if (!tile) return;

    // Marquer comme visitée et explorée
    tile.visited  = true;
    tile.explored = true;

    // Révéler cette tuile (et mettre les voisins en brumeux)
    this.revealTile(q, r);

    // Révéler également les tuiles voisines directes
    const neighbors = this.getNeighbors(q, r);
    for (const neighbor of neighbors) {
      this.revealTile(neighbor.q, neighbor.r);
    }
  }

  // =========================================================================
  // Sérialisation (sauvegarde / chargement)
  // =========================================================================

  /**
   * Sérialise l'état dynamique de toutes les tuiles
   * @returns {Array<Object>}
   */
  serializeState() {
    return this.getAllTiles().map(tile => tile.serializeState());
  }

  /**
   * Restaure l'état dynamique des tuiles depuis une sauvegarde
   * @param {Array<Object>} states
   */
  restoreState(states) {
    for (const state of states) {
      const tile = this.getTile(state.q, state.r);
      if (tile) {
        tile.restoreState(state);
      }
    }
  }
}
