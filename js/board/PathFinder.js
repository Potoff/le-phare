/**
 * PathFinder.js — Calcul de déplacements et distances hexagonales
 * "Le Dernier Phare" — Jeu narratif lovecraftien
 *
 * Gère la validation des mouvements du joueur sur le plateau hexagonal,
 * le calcul de distances en coordonnées cubiques, et la détection
 * de voisinage entre tuiles.
 */

import { TILE_TYPES } from './Tile.js';

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
 * Classe PathFinder — Recherche de chemins et validation de mouvements
 */
export class PathFinder {
  /**
   * @param {Object} board — Instance de Board (plateau logique)
   */
  constructor(board) {
    this._board = board;
  }

  // =========================================================================
  // Mouvements valides
  // =========================================================================

  /**
   * Retourne les positions vers lesquelles le joueur peut se déplacer
   * depuis la position donnée (adjacentes, explorables, non bloquées, pas d'eau profonde)
   * @param {number} q — Position actuelle Q
   * @param {number} r — Position actuelle R
   * @returns {Array<{ q: number, r: number }>} Positions accessibles
   */
  getValidMoves(q, r) {
    const validMoves = [];

    for (const dir of AXIAL_DIRECTIONS) {
      const nq = q + dir.dq;
      const nr = r + dir.dr;
      const tile = this._board.getTile(nq, nr);

      // Vérifier que la tuile existe et est accessible
      if (tile === null) continue;
      if (!tile.explorable) continue;
      if (tile.blocked) continue;
      if (tile.type === TILE_TYPES.DEEP_WATER) continue;

      validMoves.push({ q: nq, r: nr });
    }

    return validMoves;
  }

  // =========================================================================
  // Voisinage
  // =========================================================================

  /**
   * Vérifie si deux hexagones sont adjacents (voisins directs)
   * Deux hexagones sont adjacents si leur distance est exactement 1
   * @param {number} q1 — Q du premier hex
   * @param {number} r1 — R du premier hex
   * @param {number} q2 — Q du deuxième hex
   * @param {number} r2 — R du deuxième hex
   * @returns {boolean} true si les deux hexagones sont voisins
   */
  isAdjacent(q1, r1, q2, r2) {
    return this.getDistance(q1, r1, q2, r2) === 1;
  }

  // =========================================================================
  // Distance hexagonale
  // =========================================================================

  /**
   * Calcule la distance entre deux hexagones en coordonnées cubiques
   * Conversion axiale → cubique : s = -q - r
   * Distance = max(|q1-q2|, |r1-r2|, |s1-s2|)
   * @param {number} q1 — Q du premier hex
   * @param {number} r1 — R du premier hex
   * @param {number} q2 — Q du deuxième hex
   * @param {number} r2 — R du deuxième hex
   * @returns {number} Distance en nombre de pas hexagonaux
   */
  getDistance(q1, r1, q2, r2) {
    // Conversion en coordonnées cubiques
    const s1 = -q1 - r1;
    const s2 = -q2 - r2;

    // Distance cubique = max des différences absolues
    return Math.max(
      Math.abs(q1 - q2),
      Math.abs(r1 - r2),
      Math.abs(s1 - s2)
    );
  }

  // =========================================================================
  // Utilitaires avancés
  // =========================================================================

  /**
   * Retourne tous les hexagones dans un rayon donné autour d'une position
   * @param {number} q — Centre Q
   * @param {number} r — Centre R
   * @param {number} radius — Rayon en nombre de pas
   * @returns {Array<{ q: number, r: number }>} Positions dans le rayon
   */
  getHexesInRange(q, r, radius) {
    const results = [];

    for (let dq = -radius; dq <= radius; dq++) {
      // Bornes pour respecter la géométrie hexagonale
      const minDr = Math.max(-radius, -dq - radius);
      const maxDr = Math.min(radius, -dq + radius);

      for (let dr = minDr; dr <= maxDr; dr++) {
        const tq = q + dq;
        const tr = r + dr;

        // Vérifier que la tuile existe sur le plateau
        const tile = this._board.getTile(tq, tr);
        if (tile !== null) {
          results.push({ q: tq, r: tr });
        }
      }
    }

    return results;
  }

  /**
   * Vérifie si un déplacement de (q1,r1) vers (q2,r2) est valide
   * @param {number} q1 — Position de départ Q
   * @param {number} r1 — Position de départ R
   * @param {number} q2 — Position d'arrivée Q
   * @param {number} r2 — Position d'arrivée R
   * @returns {boolean} true si le mouvement est autorisé
   */
  isValidMove(q1, r1, q2, r2) {
    // Doit être adjacent
    if (!this.isAdjacent(q1, r1, q2, r2)) return false;

    // La destination doit être dans les mouvements valides
    const validMoves = this.getValidMoves(q1, r1);
    return validMoves.some(move => move.q === q2 && move.r === r2);
  }

  /**
   * Trouve le chemin le plus court entre deux hexagones (BFS)
   * Respecte les contraintes de déplacement (explorable, non bloqué, etc.)
   * @param {number} startQ — Départ Q
   * @param {number} startR — Départ R
   * @param {number} endQ — Arrivée Q
   * @param {number} endR — Arrivée R
   * @returns {Array<{ q: number, r: number }> | null} Chemin ou null si impossible
   */
  findPath(startQ, startR, endQ, endR) {
    const startKey = startQ + ',' + startR;
    const endKey = endQ + ',' + endR;

    // Cas trivial : déjà sur la destination
    if (startKey === endKey) return [{ q: startQ, r: startR }];

    // BFS — recherche en largeur
    const visited = new Set();
    const queue = [{ q: startQ, r: startR, path: [{ q: startQ, r: startR }] }];
    visited.add(startKey);

    while (queue.length > 0) {
      const current = queue.shift();
      const moves = this.getValidMoves(current.q, current.r);

      for (const move of moves) {
        const key = move.q + ',' + move.r;

        if (visited.has(key)) continue;
        visited.add(key);

        const newPath = [...current.path, { q: move.q, r: move.r }];

        // Destination atteinte
        if (key === endKey) return newPath;

        queue.push({ q: move.q, r: move.r, path: newPath });
      }
    }

    // Aucun chemin trouvé — la destination est inaccessible
    return null;
  }
}
