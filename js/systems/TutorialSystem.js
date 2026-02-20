/**
 * TutorialSystem.js — Le Dernier Phare
 *
 * Hints contextuels non-intrusifs pour guider le joueur sans briser l'immersion.
 * Chaque hint ne s'affiche qu'une fois par partie.
 * Les textes sont écrits sur un ton narratif, pas de style "tuto de jeu vidéo".
 */

export class TutorialSystem {

    static HINTS = {
        game_start: {
            delay: 3500,
            type: 'info',
            text: 'Explorez l\'île en cliquant sur les cases adjacentes. Vous avez 6 déplacements par jour.'
        },
        first_move: {
            delay: 0,
            type: 'info',
            text: 'Certaines cases recèlent des ressources ou des survivants. Revenez au phare chaque soir.'
        },
        first_loot: {
            delay: 0,
            type: 'loot',
            text: 'Chaque nuit, le phare consomme de l\'huile. La nourriture nourrit vous et les survivants.'
        },
        dusk_warning: {
            delay: 0,
            type: 'warning',
            text: 'Au crépuscule, vous choisissez d\'allumer ou non le phare. L\'obscurité ronge l\'esprit.'
        },
        low_oil: {
            delay: 0,
            type: 'warning',
            text: 'Cherchez des barils sur les plages, de la résine dans les bois. L\'huile est la vie du phare.'
        },
        low_food: {
            delay: 0,
            type: 'warning',
            text: 'Les côtes et les forêts offrent de quoi se nourrir. Chaque survivant compte dans vos bouches à nourrir.'
        },
        low_sanity: {
            delay: 0,
            type: 'danger',
            text: 'Votre esprit vacille. Allumer le phare et manger à votre faim stabilise votre état mental.'
        },
        fog_shroud: {
            delay: 0,
            type: 'info',
            text: 'Les cases dans la brume légère sont adjacentes. Approchez-vous pour les révéler entièrement.'
        },
        new_arrival: {
            delay: 500,
            type: 'event',
            text: 'Quelqu\'un de nouveau est arrivé sur l\'île. Cherchez sur les plages et les épaves.'
        },
        moves_low: {
            delay: 0,
            type: 'warning',
            text: 'Il vous reste peu de déplacements. Vous pouvez terminer la journée à tout moment.'
        },
        day_end_manual: {
            delay: 0,
            type: 'info',
            text: 'Vous pouvez terminer la journée avant d\'épuiser vos déplacements, si nécessaire.'
        },
    };

    constructor(stateManager) {
        this._sm     = stateManager;
        this._shown  = new Set();
        this._notify = null; // injecté par main.js
    }

    /**
     * Injecte la fonction de notification (évite les dépendances circulaires).
     */
    setNotifyFn(fn) {
        this._notify = fn;
    }

    /**
     * Déclenche un hint si : pas encore affiché, tutorial non désactivé.
     * @param {string} trigger - Clé du hint (cf. HINTS ci-dessus)
     */
    trigger(trigger) {
        if (this._shown.has(trigger)) return;
        if (!this._notify) return;

        const state = this._sm.getState();
        // Respecter le flag "tutorial désactivé" si le joueur le choisit plus tard
        if (state.player.flags?.tutorial_disabled) return;

        const hint = TutorialSystem.HINTS[trigger];
        if (!hint) return;

        this._shown.add(trigger);

        const show = () => this._notify(hint.text, hint.type);
        if (hint.delay > 0) {
            setTimeout(show, hint.delay);
        } else {
            show();
        }
    }

    /**
     * Vérifie automatiquement les seuils de ressources et les avertissements.
     * À appeler après chaque changement de state.
     */
    checkAutoTriggers() {
        const state = this._sm.getState();
        if (!state.gameStarted || state.gameOver) return;

        const { oil, food } = state.resources;
        const { sanity } = state.player;

        if (oil <= 4)    this.trigger('low_oil');
        if (food <= 3)   this.trigger('low_food');
        if (sanity <= 40) this.trigger('low_sanity');

        if (state.movesRemaining === 2 && state.phase === 'day') {
            this.trigger('moves_low');
        }
    }

    /**
     * Réinitialise les hints pour une nouvelle partie.
     */
    reset() {
        this._shown.clear();
    }
}
