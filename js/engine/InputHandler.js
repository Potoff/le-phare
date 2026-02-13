/**
 * InputHandler.js — Le Dernier Phare
 *
 * Gestionnaire d'entrees utilisateur (souris et clavier).
 * Convertit les interactions en coordonnees hexagonales
 * et gere le defilement/zoom de la vue.
 */

export class InputHandler {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Function} onHexClick - Callback appele avec {q, r}.
   */
  constructor(canvas, onHexClick) {
    this._canvas = canvas;
    this._onHexClick = onHexClick;
    this.mousePos = { x: 0, y: 0 };
    this.hoveredHex = null;
    this.isDragging = false;
    this._dragStart = { x: 0, y: 0 };
    this._dragViewStart = { x: 0, y: 0 };
    this.viewOffset = { x: 0, y: 0 };
    this.zoom = 1;
    this._hexSize = 50;
    this._dragThreshold = 5;
    this._dragMoved = false;
    this._bindEvents();
  }

  _bindEvents() {
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onClick = this._handleClick.bind(this);
    this._canvas.addEventListener('mousedown', this._onMouseDown);
    this._canvas.addEventListener('mousemove', this._onMouseMove);
    this._canvas.addEventListener('mouseup', this._onMouseUp);
    this._canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this._canvas.addEventListener('click', this._onClick);
    this._canvas.addEventListener('contextmenu', e => e.preventDefault());
    this._onKeyDown = this._handleKeyDown.bind(this);
    document.addEventListener('keydown', this._onKeyDown);
  }

  _handleMouseDown(e) {
    if (e.button !== 0) return;
    this.isDragging = true;
    this._dragMoved = false;
    this._dragStart = { x: e.clientX, y: e.clientY };
    this._dragViewStart = { x: this.viewOffset.x, y: this.viewOffset.y };
  }

  _handleMouseMove(e) {
    const rect = this._canvas.getBoundingClientRect();
    this.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (this.isDragging) {
      const dx = e.clientX - this._dragStart.x;
      const dy = e.clientY - this._dragStart.y;
      if (!this._dragMoved && (Math.abs(dx) > this._dragThreshold || Math.abs(dy) > this._dragThreshold))
        this._dragMoved = true;
      if (this._dragMoved) {
        this.viewOffset.x = this._dragViewStart.x + dx;
        this.viewOffset.y = this._dragViewStart.y + dy;
      }
    }
    this.hoveredHex = this.pixelToHex(this.mousePos.x, this.mousePos.y);
  }

  _handleMouseUp(e) { this.isDragging = false; }

  _handleClick(e) {
    if (this._dragMoved) return;
    const rect = this._canvas.getBoundingClientRect();
    const hex = this.pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
    if (hex && this._onHexClick) this._onHexClick(hex);
  }

  _handleWheel(e) {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    const oldZoom = this.zoom;
    const newZoom = Math.max(0.3, Math.min(3, this.zoom + direction * 0.1));
    const rect = this._canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const scale = newZoom / oldZoom;
    this.viewOffset.x = mx - scale * (mx - this.viewOffset.x);
    this.viewOffset.y = my - scale * (my - this.viewOffset.y);
    this.zoom = newZoom;
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape') {
      document.dispatchEvent(new CustomEvent('game:toggleMenu'));
    }
  }

  /**
   * Convertit pixel ecran -> coordonnees axiales hexagonales (pointy-top).
   * @param {number} px
   * @param {number} py
   * @returns {{ q: number, r: number }}
   */
  pixelToHex(px, py) {
    const size = this._hexSize * this.zoom;
    const rect = this._canvas.getBoundingClientRect();
    const cx = rect.width / 2 + this.viewOffset.x;
    const cy = rect.height / 2 + this.viewOffset.y;
    const relX = (px - cx) / size, relY = (py - cy) / size;
    const sqrt3 = Math.sqrt(3);
    const fracQ = sqrt3 / 3 * relX - 1 / 3 * relY;
    const fracR = 2 / 3 * relY;
    return this._axialRound(fracQ, fracR);
  }

  /** Arrondi cubique: q + r + s = 0. @private */
  _axialRound(fQ, fR) {
    const fS = -fQ - fR;
    let q = Math.round(fQ), r = Math.round(fR), s = Math.round(fS);
    const dQ = Math.abs(q - fQ), dR = Math.abs(r - fR), dS = Math.abs(s - fS);
    if (dQ > dR && dQ > dS) q = -r - s;
    else if (dR > dS) r = -q - s;
    return { q, r };
  }

  /** @returns {{ offsetX: number, offsetY: number, zoom: number }} */
  getViewTransform() {
    return { offsetX: this.viewOffset.x, offsetY: this.viewOffset.y, zoom: this.zoom };
  }

  resetView() { this.viewOffset = { x: 0, y: 0 }; this.zoom = 1; }

  destroy() {
    this._canvas.removeEventListener('mousedown', this._onMouseDown);
    this._canvas.removeEventListener('mousemove', this._onMouseMove);
    this._canvas.removeEventListener('mouseup', this._onMouseUp);
    this._canvas.removeEventListener('wheel', this._onWheel);
    this._canvas.removeEventListener('click', this._onClick);
    document.removeEventListener('keydown', this._onKeyDown);
  }
}
