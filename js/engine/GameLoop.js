/**
 * GameLoop.js — Le Dernier Phare
 * 
 * Boucle de jeu principale basée sur requestAnimationFrame.
 * Gère le deltaTime, les callbacks de mise à jour et de rendu,
 * ainsi que l'état de pause.
 */

export class GameLoop {
  constructor() {
    /** @type {Function[]} Callbacks appelés lors de la phase de mise à jour */
    this._updateCallbacks = [];

    /** @type {Function[]} Callbacks appelés lors de la phase de rendu */
    this._renderCallbacks = [];

    /** Identifiant du frame en cours (pour annulation) */
    this._frameId = null;

    /** Timestamp du frame précédent en millisecondes */
    this._lastTimestamp = 0;

    /** Indique si la boucle tourne actuellement */
    this._running = false;

    /** Indique si la boucle est en pause (les callbacks ne sont pas appelés) */
    this._paused = false;

    // On lie la méthode _loop à l'instance pour conserver le contexte
    this._loop = this._loop.bind(this);
  }

  // ---------------------------------------------------------------------------
  // Gestion des callbacks
  // ---------------------------------------------------------------------------

  /**
   * Enregistre un callback de mise à jour (logique de jeu).
   * @param {Function} fn - Fonction appelée avec (deltaTime) en secondes.
   */
  addUpdateCallback(fn) {
    if (typeof fn === 'function') {
      this._updateCallbacks.push(fn);
    }
  }

  /**
   * Enregistre un callback de rendu (affichage).
   * @param {Function} fn - Fonction appelée après toutes les mises à jour.
   */
  addRenderCallback(fn) {
    if (typeof fn === 'function') {
      this._renderCallbacks.push(fn);
    }
  }

  // ---------------------------------------------------------------------------
  // Contrôle de la boucle
  // ---------------------------------------------------------------------------

  /**
   * Démarre la boucle de jeu.
   * Si déjà en cours, ne fait rien.
   */
  start() {
    if (this._running) return;

    this._running = true;
    this._paused = false;
    this._lastTimestamp = performance.now();
    this._frameId = requestAnimationFrame(this._loop);
  }

  /**
   * Arrête complètement la boucle de jeu.
   */
  stop() {
    this._running = false;
    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
  }

  /**
   * Met la boucle en pause ou la reprend.
   * La boucle continue de tourner mais les callbacks ne sont pas appelés.
   */
  get paused() {
    return this._paused;
  }

  set paused(value) {
    this._paused = Boolean(value);
    // On réinitialise le timestamp pour éviter un saut de deltaTime
    // lorsqu'on sort de la pause
    if (!this._paused) {
      this._lastTimestamp = performance.now();
    }
  }

  // ---------------------------------------------------------------------------
  // Boucle interne
  // ---------------------------------------------------------------------------

  /**
   * Méthode interne appelée à chaque frame par requestAnimationFrame.
   * @param {DOMHighResTimeStamp} timestamp - Timestamp fourni par le navigateur.
   */
  _loop(timestamp) {
    if (!this._running) return;

    // Planifier le prochain frame immédiatement
    this._frameId = requestAnimationFrame(this._loop);

    // Si en pause, on ne traite rien mais on met à jour le timestamp
    if (this._paused) {
      this._lastTimestamp = timestamp;
      return;
    }

    // Calcul du deltaTime en secondes
    const deltaTime = (timestamp - this._lastTimestamp) / 1000;
    this._lastTimestamp = timestamp;

    // Protection contre les sauts de temps trop grands
    // (ex. : onglet en arrière-plan pendant longtemps)
    const clampedDelta = Math.min(deltaTime, 0.1);

    // Exécuter le tick avec le deltaTime sécurisé
    this.tick(clampedDelta);
  }

  /**
   * Exécute un cycle complet : mise à jour puis rendu.
   * Peut être appelé manuellement pour des tests.
   * @param {number} deltaTime - Temps écoulé en secondes depuis le dernier tick.
   */
  tick(deltaTime) {
    // Phase 1 : Mise à jour de la logique de jeu
    for (const updateFn of this._updateCallbacks) {
      updateFn(deltaTime);
    }

    // Phase 2 : Rendu visuel
    for (const renderFn of this._renderCallbacks) {
      renderFn();
    }
  }
}
