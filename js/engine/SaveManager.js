/**
 * SaveManager.js — Le Dernier Phare
 *
 * Gestionnaire de sauvegardes via localStorage.
 * Permet de sauvegarder, charger et gerer plusieurs emplacements
 * de sauvegarde, ainsi qu'une sauvegarde automatique.
 */

export class SaveManager {
  /**
   * @param {import('./StateManager.js').StateManager} stateManager
   */
  constructor(stateManager) {
    /** @type {import('./StateManager.js').StateManager} */
    this._stateManager = stateManager;

    /** Prefixe des cles localStorage pour eviter les collisions */
    this.KEY_PREFIX = "lederniephare_";
  }

  // ---------------------------------------------------------------------------
  // Sauvegarde
  // ---------------------------------------------------------------------------

  /**
   * Sauvegarde l'etat courant dans un emplacement donne.
   * @param {string} slot
   * @returns {boolean}
   */
  save(slot) {
    try {
      const saveData = {
        version: 1,
        timestamp: Date.now(),
        data: this._stateManager.serialize()
      };
      const key = this.KEY_PREFIX + slot;
      localStorage.setItem(key, JSON.stringify(saveData));
      console.log('[SaveManager] Sauvegarde reussie : ' + slot);
      return true;
    } catch (error) {
      console.error('[SaveManager] Erreur sauvegarde :', error);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Chargement
  // ---------------------------------------------------------------------------

  /**
   * Charge une sauvegarde et restaure l'etat.
   * @param {string} slot
   * @returns {boolean}
   */
  load(slot) {
    try {
      const key = this.KEY_PREFIX + slot;
      const raw = localStorage.getItem(key);
      if (!raw) {
        console.warn('[SaveManager] Aucune sauvegarde : ' + slot);
        return false;
      }
      const saveData = JSON.parse(raw);
      if (!saveData.data) {
        console.error('[SaveManager] Donnees corrompues : ' + slot);
        return false;
      }
      this._stateManager.deserialize(saveData.data);
      console.log('[SaveManager] Chargement reussi : ' + slot);
      return true;
    } catch (error) {
      console.error('[SaveManager] Erreur chargement :', error);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Verification d'existence
  // ---------------------------------------------------------------------------

  /**
   * Verifie si une sauvegarde existe.
   * @param {string} slot
   * @returns {boolean}
   */
  hasSave(slot) {
    return localStorage.getItem(this.KEY_PREFIX + slot) !== null;
  }

  // ---------------------------------------------------------------------------
  // Suppression
  // ---------------------------------------------------------------------------

  /**
   * Supprime la sauvegarde d'un emplacement.
   * @param {string} slot
   */
  deleteSave(slot) {
    localStorage.removeItem(this.KEY_PREFIX + slot);
    console.log('[SaveManager] Sauvegarde supprimee : ' + slot);
  }

  // ---------------------------------------------------------------------------
  // Informations sur un emplacement
  // ---------------------------------------------------------------------------

  /**
   * Retourne les informations resumees d'une sauvegarde.
   * @param {string} slot
   * @returns {{ timestamp: number, act: number, phase: string, sanity: number } | null}
   */
  getSlotInfo(slot) {
    try {
      const raw = localStorage.getItem(this.KEY_PREFIX + slot);
      if (!raw) return null;
      const saveData = JSON.parse(raw);
      const stateData = JSON.parse(saveData.data);
      return {
        timestamp: saveData.timestamp,
        act: stateData.act,
        phase: stateData.phase,
        sanity: stateData.player ? stateData.player.sanity : null
      };
    } catch (error) {
      console.error('[SaveManager] Erreur lecture info :', error);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Sauvegarde automatique
  // ---------------------------------------------------------------------------

  /**
   * Effectue une sauvegarde automatique.
   * @returns {boolean}
   */
  autosave() {
    return this.save("autosave");
  }
}
