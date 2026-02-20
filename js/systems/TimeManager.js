/**
 * TimeManager.js — Le Dernier Phare
 *
 * Gestion du cycle temporel : phases du jour, transitions, mouvements par acte.
 * Delègue les appels d'affichage à des callbacks fournis par main.js.
 */

export class TimeManager {

    // Nombre de déplacements disponibles selon l'acte (index = acte - 1).
    // Actes 1-2 : 6 mouvements. Actes 3-4 : 7 mouvements (ile plus connue).
    // Acte 5 : 8 mouvements (urgence du dernier jour).
    static MOVES_PER_ACT = [6, 6, 7, 7, 8];

    // Durée (ms) des transitions de phase avant de déclencher la suite.
    static TRANSITION_DURATION = 2500;

    constructor(stateManager, resourceManager) {
        this._sm  = stateManager;
        this._rm  = resourceManager;

        // Callbacks injectés par main.js pour l'affichage
        this._callbacks = {
            showTransition:    null,  // (title, subtitle) => void
            showDialogue:      null,  // (config) => void
            showNotification:  null,  // (message, type) => void
            closeDialogue:     null,  // () => void
            onDawnComplete:    null,  // (newAct) => void — après la transition d'aube
            onGameOver:        null,  // (reason) => void
            updateHUD:         null,  // () => void
            checkNewArrivals:  null,  // (act) => void
            updateValidMoves:  null,  // () => void
        };
    }

    // -------------------------------------------------------------------------
    // Configuration

    /**
     * Enregistre les callbacks (appelé par main.js au démarrage).
     * @param {Object} callbacks
     */
    setCallbacks(callbacks) {
        Object.assign(this._callbacks, callbacks);
    }

    getMovesForAct(act) {
        return TimeManager.MOVES_PER_ACT[Math.min(act - 1, 4)];
    }

    // -------------------------------------------------------------------------
    // Déclencheurs

    /** Démarre la phase jour pour l'acte en cours. */
    startDay() {
        const { act } = this._sm.getState();
        const moves = this.getMovesForAct(act);
        this._sm.dispatch({ type: 'SET_PHASE', payload: { phase: 'day', movesRemaining: moves } });
        this._callbacks.updateValidMoves?.();
        this._callbacks.updateHUD?.();
    }

    /** Déclenche la transition vers le crépuscule. */
    transitionToDusk() {
        this._sm.dispatch({ type: 'SET_PHASE', payload: { phase: 'dusk', movesRemaining: 0 } });
        this._callbacks.showTransition?.('Crépuscule', 'Le soleil sombre derrière l\'horizon. Il est temps de préparer la nuit.');
        this._callbacks.updateValidMoves?.();

        setTimeout(() => {
            this._showDuskChoices();
        }, TimeManager.TRANSITION_DURATION);
    }

    // -------------------------------------------------------------------------
    // Choix du crépuscule (phare oui/non)

    _showDuskChoices() {
        const state    = this._sm.getState();
        const oilCost  = this._rm.getOilCostTonight(state.act);
        const hasOil   = state.resources.oil >= oilCost;

        this._callbacks.showDialogue?.({
            speaker: 'Narrateur',
            text: `La nuit approche. Le phare réclame ${oilCost} unité${oilCost > 1 ? 's' : ''} d'huile pour éclairer cette nuit. Vous en avez ${state.resources.oil}.`,
            choices: [
                {
                    text: hasOil
                        ? `Allumer le phare (−${oilCost} huile)`
                        : `Pas assez d'huile (${state.resources.oil}/${oilCost})`,
                    disabled: !hasOil,
                    effects: {}
                },
                {
                    text: 'Laisser le phare éteint cette nuit',
                    effects: {}
                }
            ],
            onChoice: (index) => {
                const lighthouseLit = (index === 0 && hasOil);
                this._sm.dispatch({ type: 'SET_LIGHTHOUSE_NIGHT', payload: { lit: lighthouseLit } });

                if (lighthouseLit) {
                    this._callbacks.showNotification?.('Le phare éclaire la nuit.', 'info');
                } else {
                    this._callbacks.showNotification?.(
                        'Le phare reste éteint. L\'obscurité pèse sur votre esprit.',
                        'danger'
                    );
                }

                this._callbacks.closeDialogue?.();
                this._transitionToNight(lighthouseLit);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Nuit

    _transitionToNight(lighthouseLit) {
        this._sm.dispatch({ type: 'SET_PHASE', payload: { phase: 'night', movesRemaining: 0 } });
        this._callbacks.showTransition?.('Nuit', 'Les ténèbres engloutissent l\'île...');

        // Consommation nocturne
        const result = this._rm.applyNightConsumption(lighthouseLit);

        // Notifications selon les manques
        if (result.oilShortfall > 0) {
            this._callbacks.showNotification?.(
                `Huile insuffisante : il manquait ${result.oilShortfall} unité${result.oilShortfall > 1 ? 's' : ''}.`,
                'danger'
            );
        }
        if (result.foodShortfall > 0) {
            this._callbacks.showNotification?.(
                result.foodShortfall === 1
                    ? 'Pas assez de nourriture pour tout le monde...'
                    : `Il manquait ${result.foodShortfall} rations. Certains sont passés une nuit de faim.`,
                'danger'
            );
        }
        if (result.sanityPenalty > 0) {
            this._callbacks.showNotification?.(
                `Santé mentale −${result.sanityPenalty}`,
                'danger'
            );
        }

        this._callbacks.updateHUD?.();

        // Vérifier game over
        const gameOver = this._rm.checkGameOver(this._sm.getState());
        if (gameOver) {
            setTimeout(() => {
                this._sm.dispatch({ type: 'SET_GAME_OVER', payload: { reason: gameOver.reason } });
                this._callbacks.onGameOver?.(gameOver.reason, gameOver.message);
            }, TimeManager.TRANSITION_DURATION);
            return;
        }

        setTimeout(() => {
            this._showNightDialogue(lighthouseLit);
        }, TimeManager.TRANSITION_DURATION);
    }

    _showNightDialogue(lighthouseLit) {
        const state = this._sm.getState();

        this._callbacks.showDialogue?.({
            speaker: 'Narrateur',
            text: lighthouseLit
                ? 'La lumière du phare balaie l\'obscurité. Vous scrutez l\'océan depuis la galerie. La nuit passe lentement, peuplée de bruits étranges.'
                : 'Sans la lumière du phare, l\'île est plongée dans un noir absolu. Chaque bruit devient monstrueux. Chaque ombre prend forme.',
            choices: [{ text: 'Attendre l\'aube...', effects: {} }],
            onChoice: () => {
                this._callbacks.closeDialogue?.();
                this._transitionToDawn();
            }
        });
    }

    // -------------------------------------------------------------------------
    // Aube

    _transitionToDawn() {
        const state = this._sm.getState();

        // Fin du jeu au bout de 5 actes
        if (state.act >= 5) {
            this._callbacks.onGameOver?.('complete', null);
            return;
        }

        this._sm.dispatch({ type: 'NEXT_ACT' });
        const newState = this._sm.getState();
        const dayNum   = newState.act;

        this._callbacks.showTransition?.(
            `Jour ${dayNum}`,
            dayNum === 2 ? 'Un nouveau jour se lève. Le brouillard est toujours là.'
            : dayNum === 3 ? 'Le troisième jour. Les secrets de l\'île commencent à se dévoiler.'
            : dayNum === 4 ? 'Le quatrième jour. La tension est palpable.'
            :                'Le dernier jour. Tout se joue maintenant.'
        );

        setTimeout(() => {
            this.startDay();
            this._callbacks.checkNewArrivals?.(newState.act);
            this._callbacks.onDawnComplete?.(newState.act);
        }, TimeManager.TRANSITION_DURATION);
    }
}
