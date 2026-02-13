/**
 * Tile.js — Définition d'une tuile hexagonale pour le plateau de jeu
 * "Le Dernier Phare" — Jeu narratif lovecraftien
 *
 * Chaque tuile représente une zone de l'île avec ses propriétés,
 * son état de brouillard et ses événements associés.
 */

// --- Énumération des types de tuiles ---
export const TILE_TYPES = Object.freeze({
  LIGHTHOUSE:  'lighthouse',
  SHORE:       'shore',
  CLIFF:       'cliff',
  FOREST:      'forest',
  CAVE:        'cave',
  RUINS:       'ruins',
  VILLAGE:     'village',
  REEF:        'reef',
  DEEP_WATER:  'deep_water',
  SHRINE:      'shrine',
  SHIPWRECK:   'shipwreck',
  PATH:        'path',
});

// --- Palette de couleurs par type de tuile ---
// Tons très sombres et désaturés — atmosphère horrifique
export const TILE_COLORS = Object.freeze({
  [TILE_TYPES.LIGHTHOUSE]:  { fill: '#3a3520', border: '#6b6030', icon: '#c9a84c' },
  [TILE_TYPES.SHORE]:       { fill: '#2a2e2f', border: '#4a5052', icon: '#7a8486' },
  [TILE_TYPES.CLIFF]:       { fill: '#2b2626', border: '#504544', icon: '#7a6e6c' },
  [TILE_TYPES.FOREST]:      { fill: '#1a261a', border: '#2f472e', icon: '#4a6b48' },
  [TILE_TYPES.CAVE]:        { fill: '#1c1a20', border: '#35313c', icon: '#5a5466' },
  [TILE_TYPES.RUINS]:       { fill: '#2c2a25', border: '#4f4b42', icon: '#787265' },
  [TILE_TYPES.VILLAGE]:     { fill: '#2e2720', border: '#54493c', icon: '#7d6e5c' },
  [TILE_TYPES.REEF]:        { fill: '#1e2829', border: '#374647', icon: '#556869' },
  [TILE_TYPES.DEEP_WATER]:  { fill: '#0e1418', border: '#1e2830', icon: '#2e3c48' },
  [TILE_TYPES.SHRINE]:      { fill: '#261a28', border: '#48304c', icon: '#6e4a74' },
  [TILE_TYPES.SHIPWRECK]:   { fill: '#24201c', border: '#463e36', icon: '#6b5f52' },
  [TILE_TYPES.PATH]:        { fill: '#252520', border: '#46463c', icon: '#6a6a5c' },
});

// --- États possibles du brouillard de guerre ---
export const FOG_STATES = Object.freeze({
  HIDDEN:   'hidden',
  SHROUDED: 'shrouded',
  REVEALED: 'revealed',
});

/**
 * Classe Tile — Représente une tuile hexagonale sur le plateau
 */
export class Tile {
  /**
   * @param {Object} config — Configuration de la tuile
   * @param {number} config.q — Coordonnée axiale Q
   * @param {number} config.r — Coordonnée axiale R
   * @param {string} config.type — Type de terrain (voir TILE_TYPES)
   * @param {string} config.name — Nom affiché de la tuile
   * @param {string} config.description — Description narrative
   * @param {boolean} config.explorable — Peut-on explorer cette tuile ?
   * @param {Array<string>} config.events — Identifiants des événements possibles
   * @param {Object|null} config.loot — Objets récupérables sur la tuile
   * @param {boolean} config.blocked — La tuile est-elle bloquée ?
   * @param {string} config.blockReason — Raison du blocage (ex: "éboulement")
   */
  constructor(config = {}) {
    // --- Coordonnées axiales ---
    this.q = config.q ?? 0;
    this.r = config.r ?? 0;

    // --- Propriétés de terrain ---
    this.type        = config.type        ?? TILE_TYPES.SHORE;
    this.name        = config.name        ?? 'Tuile inconnue';
    this.description = config.description ?? 'Un endroit oublié par le temps.';
    this.explorable  = config.explorable  ?? true;
    this.events      = config.events      ?? [];
    this.loot        = config.loot        ?? null;
    this.blocked     = config.blocked     ?? false;
    this.blockReason = config.blockReason ?? '';

    // --- État dynamique (évolue pendant la partie) ---
    this.explored = false;
    this.visited  = false;
    this.fogState = FOG_STATES.HIDDEN;
  }

  /**
   * Retourne la clé unique de cette tuile pour le stockage en Map
   * @returns {string} Clé au format "q,r"
   */
  getKey() {
    return `${this.q},${this.r}`;
  }

  /**
   * Retourne les couleurs associées au type de cette tuile
   * @returns {Object} { fill, border, icon }
   */
  getColors() {
    return TILE_COLORS[this.type] ?? TILE_COLORS[TILE_TYPES.SHORE];
  }

  /**
   * Vérifie si la tuile peut être traversée par le joueur
   * @returns {boolean}
   */
  isPassable() {
    return this.explorable && !this.blocked && this.type !== TILE_TYPES.DEEP_WATER;
  }

  /**
   * Sérialise l'état dynamique de la tuile (pour sauvegarde)
   * @returns {Object}
   */
  serializeState() {
    return {
      q:         this.q,
      r:         this.r,
      explored:  this.explored,
      visited:   this.visited,
      fogState:  this.fogState,
      blocked:   this.blocked,
    };
  }

  /**
   * Restaure l'état dynamique depuis une sauvegarde
   * @param {Object} state
   */
  restoreState(state) {
    if (state.explored !== undefined) this.explored = state.explored;
    if (state.visited  !== undefined) this.visited  = state.visited;
    if (state.fogState !== undefined) this.fogState  = state.fogState;
    if (state.blocked  !== undefined) this.blocked   = state.blocked;
  }
}
