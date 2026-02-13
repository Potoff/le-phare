/**
 * Renderer.js — Le Dernier Phare
 *
 * Orchestrateur de rendu canvas.
 * Gere le contexte 2D, le redimensionnement adaptatif
 * et le nettoyage de l'ecran.
 */

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas - L'element canvas sur lequel dessiner.
   */
  constructor(canvas) {
    /** @type {HTMLCanvasElement} Reference vers le canvas */
    this._canvas = canvas;

    /** @type {CanvasRenderingContext2D} Contexte de rendu 2D */
    this._ctx = canvas.getContext('2d');

    /** Couleur de fond — le noir abyssal du Dernier Phare */
    this._bgColor = '#0a0a0f';

    // Adapter immediatement le canvas a son conteneur
    this.resize();

    // Ecouter les changements de taille de la fenetre
    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  // ---------------------------------------------------------------------------
  // Acces au contexte
  // ---------------------------------------------------------------------------

  /**
   * Retourne le contexte de rendu 2D.
   * @returns {CanvasRenderingContext2D}
   */
  getContext() {
    return this._ctx;
  }

  /**
   * Retourne l'element canvas.
   * @returns {HTMLCanvasElement}
   */
  getCanvas() {
    return this._canvas;
  }

  // ---------------------------------------------------------------------------
  // Redimensionnement
  // ---------------------------------------------------------------------------

  /**
   * Redimensionne le canvas pour remplir son conteneur parent.
   * Prend en compte le devicePixelRatio pour un rendu net
   * sur les ecrans haute resolution (Retina, etc.).
   */
  resize() {
    const parent = this._canvas.parentElement || document.body;
    const rect = parent.getBoundingClientRect();

    // Ratio de pixels de l'appareil (1 standard, 2 Retina, etc.)
    const dpr = window.devicePixelRatio || 1;

    // Dimensions logiques (CSS) du canvas
    const displayWidth = Math.floor(rect.width);
    const displayHeight = Math.floor(rect.height);

    // Dimensions physiques (pixels reels) du buffer de rendu
    this._canvas.width = displayWidth * dpr;
    this._canvas.height = displayHeight * dpr;

    // Le canvas CSS occupe tout l'espace disponible
    this._canvas.style.width = displayWidth + 'px';
    this._canvas.style.height = displayHeight + 'px';

    // Mise a l'echelle du contexte pour coordonnees logiques
    // tout en profitant de la resolution physique
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Stocker les dimensions logiques pour usage externe
    this._displayWidth = displayWidth;
    this._displayHeight = displayHeight;
  }

  /**
   * Retourne les dimensions logiques du canvas.
   * @returns {{ width: number, height: number }}
   */
  getDisplaySize() {
    return {
      width: this._displayWidth,
      height: this._displayHeight
    };
  }

  // ---------------------------------------------------------------------------
  // Nettoyage
  // ---------------------------------------------------------------------------

  /**
   * Efface tout le canvas en le remplissant de la couleur de fond.
   * Appele au debut de chaque frame de rendu.
   */
  clear() {
    this._ctx.fillStyle = this._bgColor;
    this._ctx.fillRect(0, 0, this._displayWidth, this._displayHeight);
  }

  // ---------------------------------------------------------------------------
  // Nettoyage des ressources
  // ---------------------------------------------------------------------------

  /**
   * Supprime les ecouteurs d'evenements.
   * A appeler lors de la destruction du renderer.
   */
  destroy() {
    window.removeEventListener('resize', this._onResize);
  }
}
