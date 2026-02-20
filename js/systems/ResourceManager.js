/**
 * ResourceManager.js — Le Dernier Phare
 *
 * Gestion centralisee des ressources : maxima, consommation nocturne,
 * avertissements, equilibrage progressif par acte.
 */

export class ResourceManager {

    // --- Config statique ---

    /** Max pour chaque ressource */
    static MAX = {
        oil:  20,
        food: 15,
        sanity: 100,
    };

    /** Huile consommee par le phare chaque nuit, selon l'acte (index = acte - 1) */
    static OIL_COST_PER_NIGHT = [3, 3, 4, 4, 5];

    /**
     * Seuils d'avertissement pour les ressources.
     * La nourriture dépend des NPCs (calculé dynamiquement).
     */
    static WARN_THRESHOLDS = {
        oil:  { low: 6, critical: 3 },
        food: { low: 4, critical: 2 },
    };

    /** Penalite de sante mentale si le phare reste eteint */
    static SANITY_PENALTY_DARK_NIGHT = 15;
    /** Penalite de sante mentale si la nourriture manque */
    static SANITY_PENALTY_HUNGER     = 10;
    /** Penalite de sante mentale par acte supplementaire sans phare (acte 3+) */
    static SANITY_PENALTY_DARK_LATE  = 5;

    // -------------------------------------------------------------------------

    constructor(stateManager) {
        this._sm = stateManager;
    }

    // --- Accesseurs utilitaires ---

    getMax(resource) {
        return ResourceManager.MAX[resource] ?? 0;
    }

    getOilCostTonight(act) {
        return ResourceManager.OIL_COST_PER_NIGHT[Math.min(act - 1, 4)];
    }

    getFoodNeeded(state) {
        const npcCount = Object.values(state.npcs).filter(n => n && n.alive).length;
        return npcCount + 1; // joueur + NPCs vivants
    }

    /**
     * Retourne le pourcentage d'une ressource (0-100) pour l'affichage.
     */
    getPercent(resource, value) {
        const max = this.getMax(resource);
        return max > 0 ? Math.min(100, (value / max) * 100) : 0;
    }

    // --- Logique de nuit ---

    /**
     * Calcule ce qui sera consomme cette nuit.
     * @returns {{ oilCost: number, foodCost: number }}
     */
    calculateNightCosts(state) {
        return {
            oilCost:  this.getOilCostTonight(state.act),
            foodCost: this.getFoodNeeded(state),
        };
    }

    /**
     * Applique la consommation nocturne au StateManager.
     * @param {boolean} lighthouseLit - Le phare est-il allume cette nuit ?
     * @returns {{ oilUsed, oilShortfall, foodUsed, foodShortfall, sanityPenalty }}
     */
    applyNightConsumption(lighthouseLit) {
        const state    = this._sm.getState();
        const { oilCost, foodCost } = this.calculateNightCosts(state);
        const result   = { oilUsed: 0, oilShortfall: 0, foodUsed: 0, foodShortfall: 0, sanityPenalty: 0 };

        // --- Huile ---
        if (lighthouseLit) {
            if (state.resources.oil >= oilCost) {
                this._sm.dispatch({ type: 'UPDATE_RESOURCE', payload: { resource: 'oil', amount: -oilCost } });
                result.oilUsed = oilCost;
            } else {
                result.oilShortfall = oilCost - state.resources.oil;
                // Consume ce qu'il reste
                this._sm.dispatch({ type: 'UPDATE_RESOURCE', payload: { resource: 'oil', amount: -state.resources.oil } });
                // Phare eteint faute d'huile => penalite reduite
                const penalty = Math.round(ResourceManager.SANITY_PENALTY_DARK_NIGHT / 2)
                    + (state.act >= 3 ? ResourceManager.SANITY_PENALTY_DARK_LATE : 0);
                this._applySanityPenalty(penalty);
                result.sanityPenalty += penalty;
            }
        } else {
            // Phare deliberement eteint
            const penalty = ResourceManager.SANITY_PENALTY_DARK_NIGHT
                + (state.act >= 3 ? ResourceManager.SANITY_PENALTY_DARK_LATE : 0);
            this._applySanityPenalty(penalty);
            result.sanityPenalty += penalty;
        }

        // --- Nourriture ---
        const currentFood = this._sm.getState().resources.food;
        if (currentFood >= foodCost) {
            this._sm.dispatch({ type: 'UPDATE_RESOURCE', payload: { resource: 'food', amount: -foodCost } });
            result.foodUsed = foodCost;
        } else {
            result.foodShortfall = foodCost - currentFood;
            this._sm.dispatch({ type: 'UPDATE_RESOURCE', payload: { resource: 'food', amount: -currentFood } });
            this._applySanityPenalty(ResourceManager.SANITY_PENALTY_HUNGER);
            result.sanityPenalty += ResourceManager.SANITY_PENALTY_HUNGER;
        }

        return result;
    }

    _applySanityPenalty(amount) {
        if (amount <= 0) return;
        const { sanity } = this._sm.getState().player;
        this._sm.dispatch({ type: 'SET_SANITY', payload: { sanity: sanity - amount } });
    }

    // --- Avertissements ---

    /**
     * Retourne les avertissements actifs selon l'etat courant.
     * @returns {Array<{ resource: string, level: 'low'|'critical', message: string }>}
     */
    getWarnings(state) {
        const warnings = [];
        const oilThresh  = ResourceManager.WARN_THRESHOLDS.oil;
        const foodThresh = ResourceManager.WARN_THRESHOLDS.food;

        if (state.resources.oil <= oilThresh.critical) {
            warnings.push({ resource: 'oil', level: 'critical',
                message: `Huile critique ! Il faut ${this.getOilCostTonight(state.act)} unités cette nuit.` });
        } else if (state.resources.oil <= oilThresh.low) {
            warnings.push({ resource: 'oil', level: 'low',
                message: 'Les réserves d\'huile s\'épuisent...' });
        }

        const foodNeeded = this.getFoodNeeded(state);
        if (state.resources.food <= foodThresh.critical) {
            warnings.push({ resource: 'food', level: 'critical',
                message: `Nourriture critique ! Il en faut ${foodNeeded} cette nuit.` });
        } else if (state.resources.food <= foodThresh.low) {
            warnings.push({ resource: 'food', level: 'low',
                message: 'La nourriture commence à manquer...' });
        }

        return warnings;
    }

    /**
     * Verifie si le jeu est perdu a cause des ressources.
     * @returns {{ lost: boolean, reason: string } | null}
     */
    checkGameOver(state) {
        if (state.player.sanity <= 0) {
            return { lost: true, reason: 'sanity',
                message: 'Votre esprit a sombré dans les ténèbres.' };
        }
        // On pourrait ajouter : mort de faim apres N nuits sans manger, etc.
        return null;
    }
}
