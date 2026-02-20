/**
 * main.js — Point d'entree du jeu "Le Dernier Phare"
 *
 * Initialise tous les systemes et orchestre le demarrage du jeu.
 */

import { GameLoop }        from './engine/GameLoop.js';
import { StateManager }    from './engine/StateManager.js';
import { Renderer }        from './engine/Renderer.js';
import { InputHandler }    from './engine/InputHandler.js';
import { SaveManager }     from './engine/SaveManager.js';
import { Board }           from './board/Board.js';
import { BoardRenderer }   from './board/BoardRenderer.js';
import { PathFinder }      from './board/PathFinder.js';
import { ISLAND_MAP, NPC_SPAWN_LOCATIONS } from './data/island-map.js';
import { ResourceManager } from './systems/ResourceManager.js';
import { TimeManager }     from './systems/TimeManager.js';
import { TutorialSystem }  from './systems/TutorialSystem.js';

// ============================================================
// Classe principale du jeu
// ============================================================
class Game {
    constructor() {
        // --- References DOM ---
        this.titleScreen   = document.getElementById('title-screen');
        this.gameContainer = document.getElementById('game-container');
        this.canvas        = document.getElementById('game-canvas');

        // --- Systemes du moteur ---
        this.stateManager  = new StateManager();
        this.renderer      = new Renderer(this.canvas);
        this.gameLoop      = new GameLoop();
        this.saveManager   = new SaveManager(this.stateManager);

        // --- Systemes Phase 2 ---
        this.resourceManager = new ResourceManager(this.stateManager);
        this.timeManager     = new TimeManager(this.stateManager, this.resourceManager);
        this.tutorial        = new TutorialSystem(this.stateManager);

        // --- Systeme de plateau ---
        this.board         = new Board(ISLAND_MAP);
        this.boardRenderer = new BoardRenderer(this.renderer, this.board, this.stateManager);
        this.pathFinder    = new PathFinder(this.board);

        // --- Input ---
        this.inputHandler = new InputHandler(this.canvas, (hex) => this.onHexClick(hex));

        // --- Etat UI ---
        this.isDialogueActive = false;
        this.isPaused         = false;

        // --- Initialisation ---
        this._wireTimeManager();
        this._setupEventListeners();
        this._setupGameLoop();
        this._checkSaves();
    }

    // =========================================================================
    // Initialisation
    // =========================================================================

    /** Connecte les callbacks du TimeManager aux methodes de ce Game. */
    _wireTimeManager() {
        this.tutorial.setNotifyFn((msg, type) => this.showNotification(msg, type));

        this.timeManager.setCallbacks({
            showTransition:   (title, sub) => this.showPhaseTransition(title, sub),
            showDialogue:     (cfg)        => this.showDialogue(cfg),
            showNotification: (msg, type)  => this.showNotification(msg, type),
            closeDialogue:    ()           => this.closeDialogue(),
            updateHUD:        ()           => this.updateHUD(),
            updateValidMoves: ()           => this._updateValidMoves(),
            checkNewArrivals: (act)        => this._checkNewArrivals(act),
            onDawnComplete:   (act)        => {
                this.tutorial.checkAutoTriggers();
                this.updateHUD();
            },
            onGameOver: (reason, message) => this._handleGameOver(reason, message),
        });
    }

    _setupEventListeners() {
        // Boutons ecran titre
        document.getElementById('btn-new-game').addEventListener('click', () => this.startNewGame());
        document.getElementById('btn-continue').addEventListener('click', () => this.continueGame());

        // Boutons in-game
        document.getElementById('btn-menu').addEventListener('click', () => this.togglePauseMenu());
        document.getElementById('btn-journal').addEventListener('click', () => this.toggleJournal());
        document.getElementById('btn-close-journal').addEventListener('click', () => this.toggleJournal());

        // Bouton fin de journee
        document.getElementById('btn-end-day').addEventListener('click', () => {
            if (!this.isDialogueActive && !this.isPaused) {
                const state = this.stateManager.getState();
                if (state.phase === 'day') {
                    this.tutorial.trigger('day_end_manual');
                    this.timeManager.transitionToDusk();
                }
            }
        });

        // Menu pause
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePauseMenu());
        document.getElementById('btn-save').addEventListener('click', () => this.saveGame());
        document.getElementById('btn-load').addEventListener('click', () => this.loadGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToTitle());

        // Touche Escape
        document.addEventListener('game:toggleMenu', () => this.togglePauseMenu());

        // Abonnement aux changements d'etat
        this.stateManager.subscribe((state) => this.onStateChange(state));
    }

    _setupGameLoop() {
        this.gameLoop.addUpdateCallback((_dt) => {
            // Futurs systemes : particules, lumières dynamiques, etc.
        });

        this.gameLoop.addRenderCallback(() => {
            this.renderer.clear();
            const ctx           = this.renderer.getContext();
            const viewTransform = this.inputHandler.getViewTransform();
            this.boardRenderer.setHoveredTile(this.inputHandler.hoveredHex);
            this.boardRenderer.draw(ctx, viewTransform);
        });
    }

    _checkSaves() {
        const btn = document.getElementById('btn-continue');
        if (this.saveManager.hasSave('autosave') || this.saveManager.hasSave('save_1')) {
            btn.disabled = false;
        }
    }

    // =========================================================================
    // Demarrage du jeu
    // =========================================================================

    startNewGame() {
        // Reinitialiser les systemes
        this.stateManager    = new StateManager();
        this.saveManager     = new SaveManager(this.stateManager);
        this.resourceManager = new ResourceManager(this.stateManager);
        this.timeManager     = new TimeManager(this.stateManager, this.resourceManager);
        this.tutorial        = new TutorialSystem(this.stateManager);

        this._wireTimeManager();
        this.stateManager.subscribe((state) => this.onStateChange(state));

        // Reinitialiser le plateau
        this.board         = new Board(ISLAND_MAP);
        this.boardRenderer = new BoardRenderer(this.renderer, this.board, this.stateManager);
        this.pathFinder    = new PathFinder(this.board);

        this._initBoard();

        this.titleScreen.classList.add('hidden');
        this.gameContainer.classList.remove('hidden');

        setTimeout(() => {
            this.renderer.resize();
            this.inputHandler.resetView();
        }, 50);

        this.gameLoop.start();
        this._startAct1();
    }

    continueGame() {
        const loaded = this.saveManager.load('autosave') || this.saveManager.load('save_1');
        if (loaded) {
            this._restoreBoardFromState();
            this.titleScreen.classList.add('hidden');
            this.gameContainer.classList.remove('hidden');
            setTimeout(() => this.renderer.resize(), 50);
            this.gameLoop.start();
            this.updateHUD();
            this._updateValidMoves();
        }
    }

    _initBoard() {
        this.board.exploreTile(0, 0);
        this._updateValidMoves();
        this.updateHUD();
    }

    _restoreBoardFromState() {
        const state = this.stateManager.getState();
        for (const key of state.board.explored) {
            const [q, r] = key.split(',').map(Number);
            this.board.exploreTile(q, r);
        }
        this._updateValidMoves();
    }

    _startAct1() {
        this.showPhaseTransition('Jour 1', 'L\'aube se lève sur le phare. Le brouillard étouffe tout son.');

        setTimeout(() => {
            this.timeManager.startDay();
            this.showNotification('Explorez l\'île en cliquant sur les cases adjacentes.', 'info');
            this.tutorial.trigger('game_start');
        }, 3000);
    }

    // =========================================================================
    // Interaction avec le plateau
    // =========================================================================

    onHexClick(hex) {
        if (this.isDialogueActive || this.isPaused) return;

        const state = this.stateManager.getState();
        const tile  = this.board.getTile(hex.q, hex.r);
        if (!tile) return;

        // Clic sur la position actuelle -> afficher info
        if (hex.q === state.player.position.q && hex.r === state.player.position.r) {
            this.showLocationInfo(tile);
            return;
        }

        const validMoves = this.pathFinder.getValidMoves(
            state.player.position.q, state.player.position.r
        );
        const isValid = validMoves.some(m => m.q === hex.q && m.r === hex.r);

        if (!isValid) {
            if (tile.fogState !== 'hidden') {
                this.showLocationInfo(tile);
                this.tutorial.trigger('fog_shroud');
            }
            return;
        }

        if (state.movesRemaining <= 0) {
            this.showNotification('Plus de déplacements. Terminez la journée.', 'warning');
            return;
        }

        if (tile.blocked) {
            this.showNotification(tile.blockReason || 'Ce passage est bloqué.', 'warning');
            return;
        }

        this.movePlayer(hex.q, hex.r, tile);
    }

    movePlayer(q, r, tile) {
        const isFirstMove = !this.stateManager.getState().player.flags.first_move_done;

        this.stateManager.dispatch({ type: 'MOVE', payload: { q, r } });
        this.board.exploreTile(q, r);
        this.showLocationInfo(tile);

        if (isFirstMove) {
            this.stateManager.dispatch({ type: 'SET_FLAG', payload: { flag: 'first_move_done' } });
            this.tutorial.trigger('first_move');
        }

        if (tile.loot && !tile.visited) {
            this._collectLoot(tile);
        }
        tile.visited = true;

        if (tile.events && tile.events.length > 0) {
            this._checkTileEvents(tile);
        }

        this._updateValidMoves();
        this.updateHUD();
        this.tutorial.checkAutoTriggers();
        this._updateNightPreview();

        // Transition auto si plus de mouvements
        const state = this.stateManager.getState();
        if (state.movesRemaining <= 0 && state.phase === 'day') {
            setTimeout(() => {
                this.showNotification('La nuit approche...', 'warning');
                this.timeManager.transitionToDusk();
            }, 1000);
        }

        this.saveManager.autosave();
    }

    _updateValidMoves() {
        const state = this.stateManager.getState();
        const moves = this.pathFinder.getValidMoves(
            state.player.position.q, state.player.position.r
        );
        this.boardRenderer.setValidMoves(
            state.movesRemaining > 0 ? moves : []
        );
    }

    _collectLoot(tile) {
        if (!tile.loot) return;
        const loot = tile.loot;

        this.stateManager.dispatch({
            type: 'UPDATE_RESOURCE',
            payload: { resource: loot.type, amount: loot.amount }
        });

        const label = this._getResourceLabel(loot.type);
        this.showNotification(`${loot.description} (+${loot.amount} ${label})`, 'loot');

        if (!this.stateManager.getState().player.flags.first_loot_done) {
            this.stateManager.dispatch({ type: 'SET_FLAG', payload: { flag: 'first_loot_done' } });
            this.tutorial.trigger('first_loot');
        }

        tile.loot = null;
    }

    _getResourceLabel(type) {
        return { oil: 'huile', food: 'nourriture', supplies: 'matériaux' }[type] ?? type;
    }

    _checkTileEvents(tile) {
        const state = this.stateManager.getState();
        for (const eventId of tile.events) {
            if (state.events.completed.includes(eventId)) continue;

            switch (eventId) {
                case 'find_sailor':
                    if (state.act >= 1 && !state.npcs.marin) this._triggerNPCEvent('marin');
                    break;
                case 'cliff_vision':
                    this._triggerVisionEvent();
                    break;
                case 'explore_shipwreck':
                    this._triggerShipwreckEvent();
                    break;
                default:
                    // Sera gere par l'EventSystem Phase 4
                    break;
            }
        }
    }

    // =========================================================================
    // Evenements narratifs (Phase 1 - inchanges, Phase 3 enrichira)
    // =========================================================================

    _triggerNPCEvent(npcId) {
        const state = this.stateManager.getState();
        if (state.npcs[npcId]) return;

        this.stateManager.dispatch({
            type: 'UPDATE_NPC',
            payload: { id: npcId, data: { arrived: state.act, trust: 0, alive: true, revealed: [] } }
        });

        switch (npcId) {
            case 'marin':
                this.showDialogue({
                    speaker: 'Narrateur',
                    text: 'Un homme gît sur le sable, à demi-conscient. Ses vêtements sont trempés, ses lèvres bleues par le froid. Il ouvre les yeux en vous entendant approcher.',
                    choices: [
                        { text: 'L\'aider à se relever', effects: { trust: { marin: 1 } } },
                        { text: 'L\'observer à distance d\'abord', effects: { trust: { marin: -1 }, sanity: -3 } },
                    ],
                    onChoice: (index) => {
                        if (index === 0) {
                            this.showDialogue({
                                speaker: 'Le Marin',
                                text: 'Merci… Mon Dieu, merci. Je ne sais pas ce qui s\'est passé. Le bateau… il y a eu un bruit terrible, comme si la mer elle-même criait. Et puis l\'eau noire partout…',
                                choices: [{ text: 'Continuer', effects: {} }],
                                onChoice: () => {
                                    this.stateManager.dispatch({ type: 'ADD_JOURNAL', payload: { id: 'marin_found', text: 'Un marin naufragé retrouvé sur la grève. Il parle d\'un bruit terrible et d\'eau noire.' } });
                                    this.showNotification('Le Marin a rejoint le phare.', 'event');
                                    this.closeDialogue();
                                }
                            });
                        } else {
                            this.showDialogue({
                                speaker: 'Narrateur',
                                text: 'Vous l\'observez ramper sur le sable. Il murmure quelque chose — des mots que vous ne comprenez pas. Une langue qui n\'existe pas. Puis il vous voit et son regard change.',
                                choices: [{ text: 'Continuer', effects: {} }],
                                onChoice: () => {
                                    this.stateManager.dispatch({ type: 'ADD_JOURNAL', payload: { id: 'marin_found', text: 'Un marin retrouvé sur la grève. Il murmurait dans une langue inconnue avant de me voir.' } });
                                    this.stateManager.dispatch({ type: 'SET_FLAG', payload: { flag: 'saw_marin_speak_unknown' } });
                                    this.showNotification('Le Marin a rejoint le phare.', 'event');
                                    this.closeDialogue();
                                }
                            });
                        }
                    }
                });
                this.stateManager.dispatch({ type: 'SET_FLAG', payload: { flag: 'marin_found' } });
                break;
        }
    }

    _triggerVisionEvent() {
        const state = this.stateManager.getState();
        if (state.player.flags.cliff_vision) return;

        this.stateManager.dispatch({ type: 'SET_FLAG', payload: { flag: 'cliff_vision' } });
        this.stateManager.dispatch({ type: 'SET_SANITY', payload: { sanity: state.player.sanity - 8 } });

        this.showDialogue({
            speaker: 'Narrateur',
            text: 'Du haut de la falaise, vous contemplez l\'océan. Pendant un instant — un bref instant — vous croyez voir quelque chose bouger sous la surface. Quelque chose de vaste. La sensation disparaît, mais pas le malaise.',
            choices: [{ text: '…', effects: {} }],
            onChoice: () => {
                this.stateManager.dispatch({ type: 'ADD_JOURNAL', payload: { id: 'cliff_vision', text: 'Depuis la falaise nord, j\'ai cru voir… quelque chose d\'immense sous les vagues. Mon esprit me joue peut-être des tours.' } });
                this.showNotification('Santé mentale −8', 'danger');
                this.closeDialogue();
            }
        });
    }

    _triggerShipwreckEvent() {
        const state = this.stateManager.getState();
        if (state.player.flags.shipwreck_explored) return;

        this.stateManager.dispatch({ type: 'SET_FLAG', payload: { flag: 'shipwreck_explored' } });

        this.showDialogue({
            speaker: 'Narrateur',
            text: 'L\'épave du Morrigane gît sur les rochers comme une carcasse éventrée. À l\'intérieur, l\'eau clapote dans l\'obscurité. Un journal de bord est encore lisible sur la table du capitaine.',
            choices: [
                { text: 'Lire le journal de bord', effects: {} },
                { text: 'Fouiller la cale', effects: {} },
            ],
            onChoice: (index) => {
                if (index === 0) {
                    this.showDialogue({
                        speaker: 'Journal du Morrigane',
                        text: '"14 novembre — Le compas s\'affole depuis deux jours. L\'équipage entend des choses la nuit. Le mousse refuse de descendre dans la cale. Il dit que quelque chose respire en dessous."',
                        choices: [{ text: 'Fermer le journal', effects: {} }],
                        onChoice: () => {
                            this.stateManager.dispatch({ type: 'ADD_JOURNAL', payload: { id: 'morrigane_log', text: 'Journal du Morrigane : le compas s\'affolait, l\'équipage entendait des choses. Quelque chose "respirait" sous la cale.' } });
                            this.closeDialogue();
                        }
                    });
                } else {
                    const s = this.stateManager.getState();
                    this.stateManager.dispatch({ type: 'SET_SANITY', payload: { sanity: s.player.sanity - 5 } });
                    this.showDialogue({
                        speaker: 'Narrateur',
                        text: 'La cale est inondée d\'une eau noire et épaisse. En y plongeant la main, vos doigts effleurent quelque chose de lisse et froid. Ça bouge. Vous retirez votre main. Il n\'y a rien. Il n\'y a jamais rien eu.',
                        choices: [{ text: '…', effects: {} }],
                        onChoice: () => {
                            this.stateManager.dispatch({ type: 'ADD_JOURNAL', payload: { id: 'morrigane_hull', text: 'Dans la cale du Morrigane, j\'ai touché… quelque chose. L\'eau était noire comme de l\'encre.' } });
                            this.stateManager.dispatch({ type: 'SET_FLAG', payload: { flag: 'touched_something_in_hull' } });
                            this.showNotification('Santé mentale −5', 'danger');
                            this.closeDialogue();
                        }
                    });
                }
            }
        });
    }

    // =========================================================================
    // Gestion des actes
    // =========================================================================

    _checkNewArrivals(act) {
        for (const [npcId, spawn] of Object.entries(NPC_SPAWN_LOCATIONS)) {
            if (spawn.act === act && !this.stateManager.getState().npcs[npcId]) {
                this.showNotification('Quelqu\'un de nouveau semble être arrivé sur l\'île...', 'event');
                this.tutorial.trigger('new_arrival');
            }
        }
    }

    _handleGameOver(reason, message) {
        if (reason === 'complete') {
            this.stateManager.dispatch({ type: 'SET_GAME_OVER', payload: { reason: 'complete' } });
            this.showPhaseTransition('Fin', 'L\'histoire touche à sa fin…');
            return;
        }
        this.stateManager.dispatch({ type: 'SET_GAME_OVER', payload: { reason } });
        const text = message ?? 'Votre aventure s\'achève ici.';
        this.showPhaseTransition('Fin', text);
        // Le reste sera étoffe Phase 6
    }

    // =========================================================================
    // Panneau nuit (preview des coûts cette nuit)
    // =========================================================================

    _updateNightPreview() {
        const state    = this.stateManager.getState();
        const panel    = document.getElementById('night-preview');
        const costsEl  = document.getElementById('night-costs');
        if (!panel || !costsEl) return;

        if (state.phase !== 'day') {
            panel.classList.add('hidden');
            return;
        }

        panel.classList.remove('hidden');

        const oilCost  = this.resourceManager.getOilCostTonight(state.act);
        const foodCost = this.resourceManager.getFoodNeeded(state);
        const oilOk    = state.resources.oil >= oilCost;
        const foodOk   = state.resources.food >= foodCost;

        costsEl.innerHTML = `
            <div class="night-cost-row">
                <span>🕯️ Phare</span>
                <span class="${oilOk ? 'night-cost-ok' : 'night-cost-crit'}">
                    ${state.resources.oil}/${oilCost} huile
                </span>
            </div>
            <div class="night-cost-row">
                <span>🍖 Rations</span>
                <span class="${foodOk ? 'night-cost-ok' : 'night-cost-crit'}">
                    ${state.resources.food}/${foodCost} nour.
                </span>
            </div>
        `;
    }

    // =========================================================================
    // Interface utilisateur
    // =========================================================================

    showLocationInfo(tile) {
        document.getElementById('location-name').textContent = tile.name;
        document.getElementById('location-desc').textContent = tile.description;
        document.getElementById('location-info').classList.remove('hidden');
    }

    showDialogue({ speaker, text, choices, onChoice }) {
        this.isDialogueActive = true;
        const box       = document.getElementById('dialogue-box');
        const speakerEl = document.getElementById('dialogue-speaker');
        const textEl    = document.getElementById('dialogue-text');
        const choicesEl = document.getElementById('dialogue-choices');

        speakerEl.textContent = speaker;
        textEl.textContent    = '';
        choicesEl.innerHTML   = '';
        box.classList.remove('hidden');

        const renderChoices = () => {
            choices.forEach((choice, index) => {
                const btn = document.createElement('button');
                btn.className   = 'dialogue-choice';
                btn.textContent = choice.text;
                if (choice.disabled) {
                    btn.disabled = true;
                    btn.classList.add('disabled');
                }
                btn.addEventListener('click', () => {
                    if (choice.effects) this._applyChoiceEffects(choice.effects);
                    if (onChoice) onChoice(index);
                });
                choicesEl.appendChild(btn);
            });
        };

        // Effet machine à écrire
        let charIndex = 0;
        const typeInterval = setInterval(() => {
            if (charIndex < text.length) {
                textEl.textContent += text[charIndex++];
            } else {
                clearInterval(typeInterval);
                renderChoices();
            }
        }, 22);

        // Clic pour sauter l'animation
        const skipHandler = () => {
            if (charIndex < text.length) {
                clearInterval(typeInterval);
                textEl.textContent = text;
                charIndex = text.length;
                choicesEl.innerHTML = '';
                renderChoices();
            }
            textEl.removeEventListener('click', skipHandler);
        };
        textEl.addEventListener('click', skipHandler);
    }

    closeDialogue() {
        this.isDialogueActive = false;
        document.getElementById('dialogue-box').classList.add('hidden');
        this.updateHUD();
    }

    _applyChoiceEffects(effects) {
        if (!effects) return;
        if (effects.sanity) {
            const { sanity } = this.stateManager.getState().player;
            this.stateManager.dispatch({ type: 'SET_SANITY', payload: { sanity: sanity + effects.sanity } });
        }
        if (effects.trust) {
            for (const [npcId, amount] of Object.entries(effects.trust)) {
                const s = this.stateManager.getState();
                if (s.npcs[npcId]) {
                    this.stateManager.dispatch({
                        type: 'UPDATE_NPC',
                        payload: { id: npcId, data: { trust: (s.npcs[npcId].trust || 0) + amount } }
                    });
                }
            }
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notif     = document.createElement('div');
        notif.className  = `notification notification-${type}`;
        notif.textContent = message;
        container.appendChild(notif);

        requestAnimationFrame(() => notif.classList.add('show'));

        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => notif.remove(), 500);
        }, 4000);
    }

    showPhaseTransition(title, subtitle) {
        const overlay = document.getElementById('phase-transition');
        const textEl  = document.getElementById('phase-transition-text');
        textEl.innerHTML = `<h2>${title}</h2><p>${subtitle}</p>`;
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 2500);
    }

    // =========================================================================
    // HUD
    // =========================================================================

    updateHUD() {
        const state = this.stateManager.getState();
        const rm    = this.resourceManager;

        // --- Ressources ---
        const oil  = state.resources.oil;
        const food = state.resources.food;
        const san  = state.player.sanity;

        document.getElementById('oil-value').textContent    = oil;
        document.getElementById('food-value').textContent   = food;
        document.getElementById('sanity-value').textContent = san;

        document.getElementById('oil-fill').style.width    = `${rm.getPercent('oil', oil)}%`;
        document.getElementById('food-fill').style.width   = `${rm.getPercent('food', food)}%`;
        document.getElementById('sanity-fill').style.width = `${rm.getPercent('sanity', san)}%`;

        // Couleur sanite mentale
        const sanFill = document.getElementById('sanity-fill');
        sanFill.classList.remove('critical', 'low');
        if (san <= 25) sanFill.classList.add('critical');
        else if (san <= 50) sanFill.classList.add('low');

        // --- Statut phare ---
        const lighthouseStatus = document.getElementById('lighthouse-status');
        const lastNight = state.lighthouseLit[state.lighthouseLit.length - 1];
        if (lighthouseStatus) {
            if (lastNight === true) {
                lighthouseStatus.classList.add('lit');
                lighthouseStatus.classList.remove('dark');
                document.getElementById('lighthouse-icon').textContent = '🔦';
            } else if (lastNight === false) {
                lighthouseStatus.classList.add('dark');
                lighthouseStatus.classList.remove('lit');
                document.getElementById('lighthouse-icon').textContent = '🌑';
            } else {
                lighthouseStatus.classList.remove('lit', 'dark');
                document.getElementById('lighthouse-icon').textContent = '🔦';
            }
        }

        // --- NPCs ---
        const npcCount = Object.values(state.npcs).filter(n => n && n.alive).length;
        const npcEl = document.getElementById('npc-count');
        if (npcEl) npcEl.textContent = npcCount;

        // --- Temps ---
        const phaseLabels = { dawn: 'Aube', day: 'Jour', dusk: 'Crépuscule', night: 'Nuit' };
        document.getElementById('day-display').textContent   = `Jour ${state.act}`;
        document.getElementById('phase-display').textContent = phaseLabels[state.phase] ?? state.phase;

        // --- Pips de déplacements ---
        const totalMoves = this.timeManager.getMovesForAct(state.act);
        const usedMoves  = totalMoves - state.movesRemaining;
        const pipsEl     = document.getElementById('moves-pips');
        const movesLabel = document.getElementById('moves-display');
        if (pipsEl) {
            pipsEl.innerHTML = '';
            for (let i = 0; i < totalMoves; i++) {
                const pip = document.createElement('div');
                pip.className = 'moves-pip' + (i < usedMoves ? ' used' : '');
                pipsEl.appendChild(pip);
            }
        }
        if (movesLabel) {
            movesLabel.textContent = state.movesRemaining > 0
                ? `${state.movesRemaining} déplacement${state.movesRemaining > 1 ? 's' : ''}`
                : 'Journée terminée';
        }

        // --- Bouton fin de journée ---
        const btnEnd = document.getElementById('btn-end-day');
        if (btnEnd) {
            if (state.phase === 'day') {
                btnEnd.classList.remove('hidden');
                btnEnd.classList.toggle('pulse', state.movesRemaining === 0);
            } else {
                btnEnd.classList.add('hidden');
                btnEnd.classList.remove('pulse');
            }
        }

        // --- Effets de sante mentale sur le container ---
        this.gameContainer.className = '';
        if (san <= 25)      this.gameContainer.classList.add('sanity-critical');
        else if (san <= 50) this.gameContainer.classList.add('sanity-low');
        else if (san <= 75) this.gameContainer.classList.add('sanity-uneasy');

        // --- Nuit preview ---
        this._updateNightPreview();
    }

    onStateChange(state) {
        this.updateHUD();
    }

    // =========================================================================
    // Menus
    // =========================================================================

    togglePauseMenu() {
        const menu = document.getElementById('pause-menu');
        this.isPaused = !this.isPaused;
        menu.classList.toggle('hidden');
        this.gameLoop.paused = this.isPaused;
    }

    toggleJournal() {
        const journal   = document.getElementById('journal-overlay');
        const isVisible = !journal.classList.contains('hidden');
        if (isVisible) {
            journal.classList.add('hidden');
        } else {
            this._populateJournal();
            journal.classList.remove('hidden');
        }
    }

    _populateJournal() {
        const state   = this.stateManager.getState();
        const cluesEl = document.getElementById('journal-clues');
        cluesEl.innerHTML = '';

        if (state.player.journal.length === 0) {
            cluesEl.innerHTML = '<p class="journal-empty">Aucune note pour le moment…</p>';
            return;
        }

        for (const entry of state.player.journal) {
            const div = document.createElement('div');
            div.className = 'journal-entry';
            div.innerHTML = `<span class="journal-day">Jour ${entry.act}</span><p>${entry.text}</p>`;
            cluesEl.appendChild(div);
        }
    }

    saveGame() {
        this.saveManager.save('save_1');
        this.showNotification('Partie sauvegardée.', 'info');
    }

    loadGame() {
        if (this.saveManager.load('save_1')) {
            this._restoreBoardFromState();
            this.updateHUD();
            this._updateValidMoves();
            this.showNotification('Partie chargée.', 'info');
            this.togglePauseMenu();
        } else {
            this.showNotification('Aucune sauvegarde trouvée.', 'warning');
        }
    }

    quitToTitle() {
        this.gameLoop.stop();
        this.gameContainer.classList.add('hidden');
        this.titleScreen.classList.remove('hidden');
        this.isPaused = false;
        document.getElementById('pause-menu').classList.add('hidden');
    }
}

// ============================================================
// Lancement
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
