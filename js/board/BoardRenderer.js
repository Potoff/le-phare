/**
 * BoardRenderer.js — Rendu du plateau hexagonal sur canvas
 * "Le Dernier Phare" — Jeu narratif lovecraftien
 *
 * Dessine le plateau avec brouillard de guerre, icônes de terrain,
 * position du joueur et indicateurs de mouvement.
 * L'ambiance visuelle est volontairement très sombre et oppressante.
 */

import { TILE_TYPES, TILE_COLORS, FOG_STATES } from './Tile.js';

// --- Constantes de rendu hexagonal ---
const HEX_SIZE      = 50;                         // Rayon d'un hexagone en pixels
const SQRT3         = Math.sqrt(3);                // Racine de 3
const HEX_WIDTH     = SQRT3 * HEX_SIZE;           // Largeur d'un hex
const HEX_HEIGHT    = 2 * HEX_SIZE;               // Hauteur d'un hex

// --- Couleurs d'ambiance ---
const COLOR_HOVER_BORDER    = 'rgba(201, 168, 76, 0.6)';   // Bordure au survol (ambre pâle)
const COLOR_PLAYER_GLOW     = 'rgba(201, 168, 76, 0.8)';   // Lueur du joueur
const COLOR_PLAYER_CORE     = '#c9a84c';                    // Centre du joueur
const COLOR_MOVE_INDICATOR  = 'rgba(201, 168, 76, 0.25)';  // Indicateur de déplacement
const COLOR_SHROUD_OUTLINE  = 'rgba(40, 40, 50, 0.5)';     // Contour des tuiles brumeuses
const COLOR_SHROUD_FILL     = 'rgba(15, 15, 20, 0.7)';     // Remplissage brumeux

/**
 * Classe BoardRenderer — Rendu visuel du plateau hexagonal
 */
export class BoardRenderer {
  /**
   * @param {Object} renderer — Instance du Renderer principal (canvas)
   * @param {Object} board — Instance de Board (plateau logique)
   * @param {Object} stateManager — Instance du StateManager (état du jeu)
   */
  constructor(renderer, board, stateManager) {
    this._renderer     = renderer;
    this._board        = board;
    this._stateManager = stateManager;

    // --- État d'interaction ---
    this._hoveredTile  = null;    // Tuile survolée {q, r}
    this._validMoves   = [];      // Déplacements valides [{q, r}, ...]
    this._animTime     = 0;       // Temps d'animation pour les pulsations
  }

  // =========================================================================
  // Conversion coordonnées
  // =========================================================================

  /**
   * Convertit des coordonnées axiales en position pixel (centre du hex)
   * Disposition pointy-top
   * @param {number} q — Coordonnée axiale Q
   * @param {number} r — Coordonnée axiale R
   * @returns {{ x: number, y: number }}
   */
  hexToPixel(q, r) {
    const x = HEX_SIZE * (SQRT3 * q + (SQRT3 / 2) * r);
    const y = HEX_SIZE * (1.5 * r);
    return { x, y };
  }

  /**
   * Convertit une position pixel en coordonnées axiales (arrondi au hex le plus proche)
   * Utile pour le clic / survol de la souris
   * @param {number} px — Position X en pixels
   * @param {number} py — Position Y en pixels
   * @returns {{ q: number, r: number }}
   */
  pixelToHex(px, py) {
    const q = ((SQRT3 / 3) * px - (1 / 3) * py) / HEX_SIZE;
    const r = ((2 / 3) * py) / HEX_SIZE;
    return BoardRenderer._axialRound(q, r);
  }

  /**
   * Arrondit des coordonnées axiales fractionnaires au hex le plus proche
   * @param {number} q — Q fractionnaire
   * @param {number} r — R fractionnaire
   * @returns {{ q: number, r: number }}
   */
  static _axialRound(q, r) {
    const s = -q - r;

    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);

    // Corriger la composante avec le plus grand écart
    if (dq > dr && dq > ds) {
      rq = -rr - rs;
    } else if (dr > ds) {
      rr = -rq - rs;
    }

    return { q: rq, r: rr };
  }

  // =========================================================================
  // Dessin principal
  // =========================================================================

  /**
   * Dessine l'intégralité du plateau sur le canvas
   * @param {CanvasRenderingContext2D} ctx — Contexte de rendu
   * @param {Object} viewTransform — Transformation de la vue { offsetX, offsetY, zoom }
   */
  draw(ctx, viewTransform) {
    // Incrémenter le temps d'animation pour les effets de pulsation
    this._animTime += 0.016; // ~60fps

    ctx.save();

    // Centrer la vue sur le canvas puis appliquer offset et zoom
    const displaySize = this._renderer.getDisplaySize();
    const centerX = displaySize.width / 2;
    const centerY = displaySize.height / 2;
    ctx.translate(centerX + viewTransform.offsetX, centerY + viewTransform.offsetY);
    ctx.scale(viewTransform.zoom, viewTransform.zoom);

    const allTiles = this._board.getAllTiles();

    // --- Passe 1 : Dessiner les tuiles brouillard (silhouettes) ---
    for (const tile of allTiles) {
      if (tile.fogState === FOG_STATES.SHROUDED) {
        const { x, y } = this.hexToPixel(tile.q, tile.r);
        this._drawShroudedHex(ctx, x, y, tile);
      }
    }

    // --- Passe 2 : Dessiner les tuiles révélées ---
    for (const tile of allTiles) {
      if (tile.fogState === FOG_STATES.REVEALED) {
        const { x, y } = this.hexToPixel(tile.q, tile.r);
        this.drawHex(ctx, x, y, tile);
      }
    }

    // --- Passe 3 : Indicateurs de déplacement (pulsation) ---
    for (const move of this._validMoves) {
      const { x, y } = this.hexToPixel(move.q, move.r);
      this._drawMoveIndicator(ctx, x, y);
    }

    // --- Passe 4 : Surbrillance au survol ---
    if (this._hoveredTile) {
      const tile = this._board.getTile(this._hoveredTile.q, this._hoveredTile.r);
      if (tile && tile.fogState !== FOG_STATES.HIDDEN) {
        const { x, y } = this.hexToPixel(this._hoveredTile.q, this._hoveredTile.r);
        this.drawHexOutline(ctx, x, y, COLOR_HOVER_BORDER, 3);
      }
    }

    // --- Passe 5 : Position du joueur ---
    const playerPos = this._getPlayerPosition();
    if (playerPos) {
      const { x, y } = this.hexToPixel(playerPos.q, playerPos.r);
      this.drawPlayer(ctx, x, y);
    }

    ctx.restore();
  }

  // =========================================================================
  // Dessin des hexagones
  // =========================================================================

  /**
   * Dessine un hexagone complet (tuile révélée) avec couleur, bordure et icône
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx — Centre X en pixels
   * @param {number} cy — Centre Y en pixels
   * @param {Object} tile — Instance de Tile
   */
  drawHex(ctx, cx, cy, tile) {
    const colors = tile.getColors();
    const corners = this._getHexCorners(cx, cy);

    // Remplissage du terrain
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = colors.fill;
    ctx.fill();

    // Bordure
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Assombrissement supplémentaire si la tuile n'a pas été visitée
    if (!tile.visited) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fill();
    }

    // Icône du type de terrain
    this.drawTileIcon(ctx, cx, cy, tile.type);

    // Marqueur si la tuile est bloquée
    if (tile.blocked) {
      this._drawBlockedMarker(ctx, cx, cy);
    }
  }

  /**
   * Dessine le contour d'un hexagone (sans remplissage)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx — Centre X
   * @param {number} cy — Centre Y
   * @param {string} color — Couleur de la bordure
   * @param {number} lineWidth — Épaisseur du trait
   */
  drawHexOutline(ctx, cx, cy, color, lineWidth) {
    const corners = this._getHexCorners(cx, cy);

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  /**
   * Dessine un hex dans l'état brumeux — silhouette à peine visible
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx — Centre X
   * @param {number} cy — Centre Y
   * @param {Object} _tile — Instance de Tile (non utilisé pour le brouillard)
   */
  _drawShroudedHex(ctx, cx, cy, _tile) {
    const corners = this._getHexCorners(cx, cy);

    // Remplissage très sombre, presque invisible
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = COLOR_SHROUD_FILL;
    ctx.fill();

    // Contour subtil — on devine la forme sans la voir clairement
    ctx.strokeStyle = COLOR_SHROUD_OUTLINE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Calcule les 6 sommets d'un hexagone pointy-top
   * @param {number} cx — Centre X
   * @param {number} cy — Centre Y
   * @returns {Array<{x: number, y: number}>} Les 6 coins
   */
  _getHexCorners(cx, cy) {
    const corners = [];
    for (let i = 0; i < 6; i++) {
      // Pointy-top : angle_deg = 60 * i - 30
      const angleDeg = 60 * i - 30;
      const angleRad = (Math.PI / 180) * angleDeg;
      corners.push({
        x: cx + HEX_SIZE * Math.cos(angleRad),
        y: cy + HEX_SIZE * Math.sin(angleRad),
      });
    }
    return corners;
  }

  // =========================================================================
  // Icônes de terrain — Formes géométriques simples
  // =========================================================================

  /**
   * Dessine une icône géométrique simple selon le type de terrain
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx — Centre X
   * @param {number} cy — Centre Y
   * @param {string} type — Type de tuile (TILE_TYPES)
   */
  drawTileIcon(ctx, cx, cy, type) {
    const colors = TILE_COLORS[type];
    if (!colors) return;

    ctx.save();
    ctx.strokeStyle = colors.icon;
    ctx.fillStyle = colors.icon;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.7;

    const s = HEX_SIZE * 0.3; // Échelle des icônes

    switch (type) {
      case TILE_TYPES.LIGHTHOUSE:
        this._drawIconLighthouse(ctx, cx, cy, s);
        break;
      case TILE_TYPES.SHORE:
        this._drawIconShore(ctx, cx, cy, s);
        break;
      case TILE_TYPES.CLIFF:
        this._drawIconCliff(ctx, cx, cy, s);
        break;
      case TILE_TYPES.FOREST:
        this._drawIconForest(ctx, cx, cy, s);
        break;
      case TILE_TYPES.CAVE:
        this._drawIconCave(ctx, cx, cy, s);
        break;
      case TILE_TYPES.RUINS:
        this._drawIconRuins(ctx, cx, cy, s);
        break;
      case TILE_TYPES.VILLAGE:
        this._drawIconVillage(ctx, cx, cy, s);
        break;
      case TILE_TYPES.SHRINE:
        this._drawIconShrine(ctx, cx, cy, s);
        break;
      case TILE_TYPES.SHIPWRECK:
        this._drawIconShipwreck(ctx, cx, cy, s);
        break;
      case TILE_TYPES.PATH:
        this._drawIconPath(ctx, cx, cy, s);
        break;
      case TILE_TYPES.REEF:
        this._drawIconReef(ctx, cx, cy, s);
        break;
      case TILE_TYPES.DEEP_WATER:
        // Pas d'icône — les abysses sont vides
        break;
    }

    ctx.restore();
  }

  /** Phare — Triangle (tour) avec une ligne verticale et une lueur au sommet */
  _drawIconLighthouse(ctx, cx, cy, s) {
    // Tour du phare
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 1.2);
    ctx.lineTo(cx - s * 0.5, cy + s * 0.8);
    ctx.lineTo(cx + s * 0.5, cy + s * 0.8);
    ctx.closePath();
    ctx.stroke();

    // Ligne centrale (structure)
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 1.2);
    ctx.lineTo(cx, cy + s * 0.8);
    ctx.stroke();

    // Lueur au sommet
    ctx.beginPath();
    ctx.arc(cx, cy - s * 1.2, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Rivage — Ligne ondulée */
  _drawIconShore(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx - s, cy);
    ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.5, cx, cy);
    ctx.quadraticCurveTo(cx + s * 0.5, cy + s * 0.5, cx + s, cy);
    ctx.stroke();
  }

  /** Falaise — Ligne en dents de scie */
  _drawIconCliff(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx - s, cy + s * 0.3);
    ctx.lineTo(cx - s * 0.5, cy - s * 0.6);
    ctx.lineTo(cx - s * 0.1, cy + s * 0.1);
    ctx.lineTo(cx + s * 0.4, cy - s * 0.8);
    ctx.lineTo(cx + s * 0.7, cy + s * 0.2);
    ctx.lineTo(cx + s, cy - s * 0.3);
    ctx.stroke();
  }

  /** Forêt — Arbre simple (triangle sur un bâton) */
  _drawIconForest(ctx, cx, cy, s) {
    // Tronc
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.8);
    ctx.lineTo(cx, cy + s * 0.1);
    ctx.stroke();

    // Feuillage (triangle)
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.9);
    ctx.lineTo(cx - s * 0.6, cy + s * 0.2);
    ctx.lineTo(cx + s * 0.6, cy + s * 0.2);
    ctx.closePath();
    ctx.stroke();
  }

  /** Caverne — Arc / demi-cercle */
  _drawIconCave(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.2, s * 0.8, Math.PI, 0);
    ctx.stroke();

    // Ligne de sol
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.8, cy + s * 0.2);
    ctx.lineTo(cx + s * 0.8, cy + s * 0.2);
    ctx.stroke();
  }

  /** Ruines — Rectangle brisé */
  _drawIconRuins(ctx, cx, cy, s) {
    // Mur gauche (intact)
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.7, cy + s * 0.6);
    ctx.lineTo(cx - s * 0.7, cy - s * 0.5);
    ctx.stroke();

    // Mur du haut (brisé)
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.7, cy - s * 0.5);
    ctx.lineTo(cx - s * 0.1, cy - s * 0.5);
    ctx.stroke();

    // Fragment droit (décalé, comme écroulé)
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.2, cy - s * 0.3);
    ctx.lineTo(cx + s * 0.7, cy - s * 0.3);
    ctx.lineTo(cx + s * 0.7, cy + s * 0.6);
    ctx.stroke();

    // Sol
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.7, cy + s * 0.6);
    ctx.lineTo(cx + s * 0.7, cy + s * 0.6);
    ctx.stroke();
  }

  /** Village — Petite maison */
  _drawIconVillage(ctx, cx, cy, s) {
    // Murs
    ctx.strokeRect(cx - s * 0.5, cy - s * 0.1, s, s * 0.8);

    // Toit
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.7, cy - s * 0.1);
    ctx.lineTo(cx, cy - s * 0.8);
    ctx.lineTo(cx + s * 0.7, cy - s * 0.1);
    ctx.closePath();
    ctx.stroke();
  }

  /** Sanctuaire — Cercle avec un point central (oeil cosmique) */
  _drawIconShrine(ctx, cx, cy, s) {
    // Cercle extérieur
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Point central — présence indicible
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Épave — Coque de bateau inclinée */
  _drawIconShipwreck(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.3); // Inclinaison — le navire est échoué

    // Coque
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.4, s * 0.6, s * 0.2, s * 0.3);
    ctx.lineTo(s * 0.8, -s * 0.1);
    ctx.stroke();

    // Mât brisé
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, s * 0.2);
    ctx.lineTo(s * 0.1, -s * 0.8);
    ctx.stroke();

    ctx.restore();
  }

  /** Chemin — Trois petits points en ligne */
  _drawIconPath(ctx, cx, cy, s) {
    const dotRadius = s * 0.12;
    const positions = [
      { x: cx - s * 0.5, y: cy },
      { x: cx,           y: cy },
      { x: cx + s * 0.5, y: cy },
    ];

    for (const pos of positions) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Récif — Petites vagues anguleuses */
  _drawIconReef(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.8, cy);
    ctx.lineTo(cx - s * 0.4, cy - s * 0.3);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + s * 0.4, cy - s * 0.3);
    ctx.lineTo(cx + s * 0.8, cy);
    ctx.stroke();

    // Deuxième rangée de vagues
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5, cy + s * 0.4);
    ctx.lineTo(cx - s * 0.1, cy + s * 0.15);
    ctx.lineTo(cx + s * 0.3, cy + s * 0.4);
    ctx.stroke();
  }

  // =========================================================================
  // Joueur et indicateurs
  // =========================================================================

  /**
   * Dessine le joueur — cercle ambré avec effet de lanterne
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx — Centre X
   * @param {number} cy — Centre Y
   */
  drawPlayer(ctx, cx, cy) {
    ctx.save();

    // Halo extérieur — lueur diffuse de la lanterne
    const pulseIntensity = 0.3 + 0.1 * Math.sin(this._animTime * 3);
    const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, HEX_SIZE * 0.8);
    gradient.addColorStop(0, 'rgba(201, 168, 76, ' + pulseIntensity + ')');
    gradient.addColorStop(0.5, 'rgba(201, 168, 76, ' + (pulseIntensity * 0.3) + ')');
    gradient.addColorStop(1, 'rgba(201, 168, 76, 0)');

    ctx.beginPath();
    ctx.arc(cx, cy, HEX_SIZE * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Cercle principal — le gardien
    ctx.beginPath();
    ctx.arc(cx, cy, HEX_SIZE * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_PLAYER_CORE;
    ctx.fill();

    // Bordure lumineuse
    ctx.strokeStyle = COLOR_PLAYER_GLOW;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Dessine un indicateur de mouvement — anneau pulsant subtil
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx — Centre X
   * @param {number} cy — Centre Y
   */
  _drawMoveIndicator(ctx, cx, cy) {
    const pulse = 0.5 + 0.5 * Math.sin(this._animTime * 4);
    const radius = HEX_SIZE * (0.3 + pulse * 0.1);
    const alpha  = 0.15 + pulse * 0.1;

    ctx.save();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201, 168, 76, ' + alpha + ')';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Dessine un marqueur de tuile bloquée (croix rouge sombre)
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx — Centre X
   * @param {number} cy — Centre Y
   */
  _drawBlockedMarker(ctx, cx, cy) {
    const s = HEX_SIZE * 0.2;

    ctx.save();
    ctx.strokeStyle = 'rgba(120, 40, 40, 0.6)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s);
    ctx.lineTo(cx + s, cy + s);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + s, cy - s);
    ctx.lineTo(cx - s, cy + s);
    ctx.stroke();

    ctx.restore();
  }

  // =========================================================================
  // Interaction
  // =========================================================================

  /**
   * Met à jour la tuile survolée par la souris
   * @param {{ q: number, r: number } | null} tileCoords
   */
  setHoveredTile(tileCoords) {
    this._hoveredTile = tileCoords;
  }

  /**
   * Met à jour la liste des déplacements valides à afficher
   * @param {Array<{ q: number, r: number }>} moves
   */
  setValidMoves(moves) {
    this._validMoves = moves;
  }

  // =========================================================================
  // Utilitaires internes
  // =========================================================================

  /**
   * Récupère la position du joueur depuis le StateManager
   * @returns {{ q: number, r: number } | null}
   */
  _getPlayerPosition() {
    if (!this._stateManager) return null;

    // Tente d'obtenir la position du joueur via le state
    const state = this._stateManager.getState
      ? this._stateManager.getState()
      : this._stateManager;

    if (state && state.playerPosition) return state.playerPosition;
    if (state && state.player && state.player.position) return state.player.position;
    return null;
  }
}

// Exporter la taille d'un hex pour utilisation externe
export { HEX_SIZE };
