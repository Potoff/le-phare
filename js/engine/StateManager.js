/**
 * StateManager.js — Le Dernier Phare
 *
 * Gestionnaire d'etat central du jeu, inspire du pattern Redux.
 * Maintient l'etat global et notifie les abonnes a chaque changement.
 */

export class StateManager {
  constructor() {
    /** @type {Object} Etat global du jeu */
    this._state = this._createInitialState();
    /** @type {Function[]} Fonctions abonnees aux changements */
    this._listeners = [];
  }

  // --- Etat initial ---

  _createInitialState() {
    return {
      act: 1, phase: "dawn", turn: 0, movesRemaining: 5,
      player: {
        position: { q: 0, r: 0 }, sanity: 100,
        inventory: [], journal: [], flags: {}
      },
      resources: { oil: 12, food: 8, supplies: 5 },
      npcs: {},
      board: { explored: new Set(["0,0"]), tileStates: {} },
      events: { completed: [], active: null },
      lighthouseLit: [],
      gameStarted: false, gameOver: false
    };
  }

  getState() { return this._state; }

  dispatch(action) {
    const { type, payload } = action;
    switch (type) {
      case 'MOVE': {
        const { q, r } = payload;
        this._state.player.position = { q, r };
        this._state.board.explored.add(q + "," + r);
        this._state.movesRemaining = Math.max(0, this._state.movesRemaining - 1);
        break; }
      case 'UPDATE_RESOURCE': {
        const { resource, amount } = payload;
        if (resource in this._state.resources)
          this._state.resources[resource] = Math.max(0, this._state.resources[resource] + amount);
        break; }
      case 'SET_PHASE': {
        this._state.phase = payload.phase;
        if (payload.movesRemaining !== undefined) this._state.movesRemaining = payload.movesRemaining;
        break; }
      case 'SET_SANITY': {
        this._state.player.sanity = Math.max(0, Math.min(100, payload.sanity));
        break; }
      case 'ADD_JOURNAL': {
        this._state.player.journal.push({ id: payload.id, text: payload.text,
          act: this._state.act, turn: this._state.turn, timestamp: Date.now() });
        break; }
      case 'SET_FLAG': {
        this._state.player.flags[payload.flag] = payload.value !== undefined ? payload.value : true;
        break; }
      case 'UPDATE_NPC': {
        const { id, data } = payload;
        this._state.npcs[id] = { ...(this._state.npcs[id] || {}), ...data };
        break; }
      case 'NEXT_ACT': {
        this._state.act = Math.min(5, this._state.act + 1);
        this._state.turn = 0; this._state.phase = "dawn";
        break; }
      case 'SET_GAME_OVER': {
        this._state.gameOver = true;
        if (payload && payload.reason) this._state.gameOverReason = payload.reason;
        break; }
      default: console.warn("[StateManager] Action inconnue : " + type); return;
    }
    this._notifyListeners();
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    this._listeners.push(listener);
    return () => { this._listeners = this._listeners.filter(l => l !== listener); };
  }

  _notifyListeners() {
    for (const listener of this._listeners) listener(this._state);
  }

  serialize() {
    const s = JSON.parse(JSON.stringify(this._state, (k, v) => {
      if (v instanceof Set) return { __type: 'Set', values: Array.from(v) };
      return v;
    }));
    return JSON.stringify(s);
  }

  deserialize(json) {
    try {
      const parsed = JSON.parse(json);
      this._restoreSets(parsed);
      this._state = parsed;
      this._notifyListeners();
    } catch (e) { console.error('[StateManager] Deserialize error:', e); }
  }

  _restoreSets(obj) {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        if (obj[key].__type === 'Set' && Array.isArray(obj[key].values))
          obj[key] = new Set(obj[key].values);
        else this._restoreSets(obj[key]);
      }
    }
  }
}
