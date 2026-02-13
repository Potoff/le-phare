/**
 * main.js — Point d'entree du jeu "Le Dernier Phare"
 *
 * Initialise tous les systemes et orchestre le demarrage du jeu.
 */

import { GameLoop } from './engine/GameLoop.js';
import { StateManager } from './engine/StateManager.js';
import { Renderer } from './engine/Renderer.js';
import { InputHandler } from './engine/InputHandler.js';
import { SaveManager } from './engine/SaveManager.js';
import { Board } from './board/Board.js';
import { BoardRenderer, HEX_SIZE } from './board/BoardRenderer.js';
import { PathFinder } from './board/PathFinder.js';
import { ISLAND_MAP, NPC_SPAWN_LOCATIONS } from './data/island-map.js';

// ============================================================
// Classe principale du jeu
// ============================================================
class Game {
    constructor() {
        // --- References DOM ---
        this.titleScreen = document.getElementById('title-screen');
        this.gameContainer = document.getElementById('game-container');
        this.canvas = document.getElementById('game-canvas');

        // --- Systemes du moteur ---
        this.stateManager = new StateManager();
        this.renderer = new Renderer(this.canvas);
        this.gameLoop = new GameLoop();
        this.saveManager = new SaveManager(this.stateManager);

        // --- Systeme de plateau ---
        this.board = new Board(ISLAND_MAP);
        this.boardRenderer = new BoardRenderer(this.renderer, this.board, this.stateManager);
        this.pathFinder = new PathFinder(this.board);

        // --- Input ---
        this.inputHandler = new InputHandler(this.canvas, (hex) => this.onHexClick(hex));

        // --- Etat UI ---
        this.isDialogueActive = false;
        this.isPaused = false;

        // --- Initialisation ---
        this._setupEventListeners();
        this._setupGameLoop();
        this._checkSaves();
    }

    // =========================================================================
    // Initialisation
    // =========================================================================

    _setupEventListeners() {
        // Boutons ecran titre
        document.getElementById('btn-new-game').addEventListener('click', () => this.startNewGame());
        document.getElementById('btn-continue').addEventListener('click', () => this.continueGame());

        // Boutons in-game
        document.getElementById('btn-menu').addEventListener('click', () => this.togglePauseMenu());
        document.getElementById('btn-journal').addEventListener('click', () => this.toggleJournal());
        document.getElementById('btn-close-journal').addEventListener('click', () => this.toggleJournal());

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
        // Callback de mise a jour (animation continue)
        this.gameLoop.addUpdateCallback((dt) => {
            // Rien de specifique pour l'instant - les particules viendront ici
        });

        // Callback de rendu
        this.gameLoop.addRenderCallback(() => {
            this.renderer.clear();
            const ctx = this.renderer.getContext();
            const viewTransform = this.inputHandler.getViewTransform();

            // Dessiner le plateau
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
        // Reinitialiser l'etat en creant un nouveau StateManager
        this.stateManager = new StateManager();
        this.saveManager = new SaveManager(this.stateManager);
        this.stateManager.subscribe((state) => this.onStateChange(state));

        // Reinitialiser le plateau
        this.board = new Board(ISLAND_MAP);
        this.boardRenderer = new BoardRenderer(this.renderer, this.board, this.stateManager);
        this.pathFinder = new PathFinder(this.board);

        // Preparer le plateau
        this._initBoard();

        // Cacher l'ecran titre, montrer le jeu
        this.titleScreen.classList.add('hidden');
        this.gameContainer.classList.remove('hidden');

        // Redimensionner le canvas (maintenant visible)
        setTimeout(() => {
            this.renderer.resize();
            this.inputHandler.resetView();
        }, 50);

        // Demarrer la boucle
        this.gameLoop.start();

        // Lancer l'Acte 1
        this._startAct1();
    }

    continueGame() {
        const loaded = this.saveManager.load('autosave') || this.saveManager.load('save_1');
        if (loaded) {
            this._restoreBoardFromState();
            this.titleScreen.classList.add('hidden');
            this.gameContainer.classList.remove('hidden');
            setTimeout(() => {
                this.renderer.resize();
            }, 50);
            this.gameLoop.start();
            this.updateHUD();
            this._updateValidMoves();
        }
    }

    _initBoard() {
        // Explorer la case de depart (le phare) et ses voisins
        this.board.exploreTile(0, 0);

        // Mettre a jour les deplacements valides
        this._updateValidMoves();

        // Mettre a jour le HUD
        this.updateHUD();
    }

    _restoreBoardFromState() {
        const state = this.stateManager.getState();
        // Re-explorer les tuiles connues
        for (const key of state.board.explored) {
            const [q, r] = key.split(',').map(Number);
            this.board.exploreTile(q, r);
        }
        this._updateValidMoves();
    }

    _startAct1() {
        // Afficher la transition
        this.showPhaseTransition('Jour 1', 'L\'aube se leve sur le phare. Le brouillard etouffe tout son.');

        // Passer en phase jour apres la transition
        setTimeout(() => {
            this.stateManager.dispatch({ type: 'SET_PHASE', payload: { phase: 'day', movesRemaining: 6 } });
            this.showNotification('Explorez l\'ile en cliquant sur les cases adjacentes.', 'info');
        }, 3000);
    }

    // =========================================================================
    // Interaction avec le plateau
    // =========================================================================

    onHexClick(hex) {
        if (this.isDialogueActive || this.isPaused) return;

        const state = this.stateManager.getState();
        const tile = this.board.getTile(hex.q, hex.r);

        if (!tile) return;

        // Verifier si c'est la position actuelle -> afficher info
        if (hex.q === state.player.position.q && hex.r === state.player.position.r) {
            this.showLocationInfo(tile);
            return;
        }

        // Verifier si c'est un mouvement valide
        const validMoves = this.pathFinder.getValidMoves(
            state.player.position.q, state.player.position.r
        );
        const isValid = validMoves.some(m => m.q === hex.q && m.r === hex.r);

        if (!isValid) {
            // Clic sur une tuile visible mais non adjacente
            if (tile.fogState !== 'hidden') {
                this.showLocationInfo(tile);
            }
            return;
        }

        // Verifier les deplacements restants
        if (state.movesRemaining <= 0) {
            this.showNotification('Plus de deplacements disponibles. Passez a la phase suivante.', 'warning');
            return;
        }

        // Verifier si la tuile est bloquee
        if (tile.blocked) {
            this.showNotification(tile.blockReason || 'Ce passage est bloque.', 'warning');
            return;
        }

        // === Effectuer le deplacement ===
        this.movePlayer(hex.q, hex.r, tile);
    }

    movePlayer(q, r, tile) {
        // Deplacer le joueur
        this.stateManager.dispatch({ type: 'MOVE', payload: { q, r } });

        // Explorer la tuile
        this.board.exploreTile(q, r);

        // Afficher les infos de la tuile
        this.showLocationInfo(tile);

        // Recuperer le loot s'il y en a
        if (tile.loot && !tile.visited) {
            this._collectLoot(tile);
        }

        // Marquer comme visitee
        tile.visited = true;

        // Verifier les evenements
        if (tile.events && tile.events.length > 0) {
            this._checkTileEvents(tile);
        }

        // Mettre a jour les deplacements valides
        this._updateValidMoves();

        // Mettre a jour le HUD
        this.updateHUD();

        // Verifier fin de phase jour
        const state = this.stateManager.getState();
        if (state.movesRemaining <= 0 && state.phase === 'day') {
            setTimeout(() => {
                this.showNotification('La nuit approche... Preparez-vous.', 'warning');
                this._transitionToDusk();
            }, 1000);
        }

        // Autosave
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
        const loot = tile.loot;
        if (!loot) return;

        this.stateManager.dispatch({
            type: 'UPDATE_RESOURCE',
            payload: { resource: loot.type, amount: loot.amount }
        });

        this.showNotification(`${loot.description} (+${loot.amount} ${this._getResourceLabel(loot.type)})`, 'loot');

        // Supprimer le loot pour ne pas le recolter deux fois
        tile.loot = null;
    }

    _getResourceLabel(type) {
        const labels = { oil: 'huile', food: 'nourriture', supplies: 'materiaux' };
        return labels[type] || type;
    }

    _checkTileEvents(tile) {
        const state = this.stateManager.getState();
        for (const eventId of tile.events) {
            if (state.events.completed.includes(eventId)) continue;

            // Gerer les evenements specifiques
            switch (eventId) {
                case 'find_sailor':
                    if (state.act >= 1 && !state.npcs.marin) {
                        this._triggerNPCEvent('marin');
                    }
                    break;
                case 'cliff_vision':
                    this._triggerVisionEvent();
                    break;
                case 'explore_shipwreck':
                    this._triggerShipwreckEvent();
                    break;
                default:
                    // Evenement generique - sera gere par l'EventSystem plus tard
                    break;
            }
        }
    }

    // =========================================================================
    // Evenements narratifs (Phase 1 - basiques)
    // =========================================================================

    _triggerNPCEvent(npcId) {
        const state = this.stateManager.getState();
        if (state.npcs[npcId]) return; // Deja rencontre

        this.stateManager.dispatch({
            type: 'UPDATE_NPC',
            payload: { id: npcId, data: { arrived: state.act, trust: 0, alive: true, revealed: [] } }
        });

        switch (npcId) {
            case 'marin':
                this.showDialogue({
                    speaker: 'Narrateur',
                    text: 'Un homme git sur le sable, a demi-conscient. Ses vetements sont trempes, ses levres bleues par le froid. Il ouvre les yeux en vous entendant approcher.',
                    choices: [
                        { text: 'L\'aider a se relever', effects: { trust: { marin: 1 } } },
                        { text: 'L\'observer a distance d\'abord', effects: { trust: { marin: -1 }, sanity: -3 } },
                    ],
                    onChoice: (index) => {
                        if (index === 0) {
                            this.showDialogue({
                                speaker: 'Le Marin',
                                text: 'Merci... Mon Dieu, merci. Je ne sais pas ce qui s\'est passe. Le bateau... il y a eu un bruit terrible, comme si la mer elle-meme criait. Et puis l\'eau noire partout...',
                                choices: [{ text: 'Continuer', effects: {} }],
                                onChoice: () => {
                                    this.stateManager.dispatch({
                                        type: 'ADD_JOURNAL',
                                        payload: { id: 'marin_found', text: 'Un marin naufrage retrouve sur la greve. Il parle d\'un bruit terrible et d\'eau noire.' }
                                    });
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
                                    this.stateManager.dispatch({
                                        type: 'ADD_JOURNAL',
                                        payload: { id: 'marin_found', text: 'Un marin retrouve sur la greve. Il murmurait dans une langue inconnue avant de me voir.' }
                                    });
                                    this.stateManager.dispatch({ type: 'SET_FLAG', payload: { flag: 'saw_marin_speak_unknown' } });
                                    this.showNotification('Le Marin a rejoint le phare.', 'event');
                                    this.closeDialogue();
                                }
                            });
                        }
                    }
                });

                this.stateManager.dispatch({
                    type: 'SET_FLAG',
                    payload: { flag: 'marin_found' }
                });
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
            text: 'Du haut de la falaise, vous contemplez l\'ocean. Pendant un instant — un bref instant — vous croyez voir quelque chose bouger sous la surface. Quelque chose de vaste. La sensation disparait, mais pas le malaise.',
            choices: [{ text: '...', effects: {} }],
            onChoice: () => {
                this.stateManager.dispatch({
                    type: 'ADD_JOURNAL',
                    payload: { id: 'cliff_vision', text: 'Depuis la falaise nord, j\'ai cru voir... quelque chose d\'immense sous les vagues. Mon esprit me joue peut-etre des tours.' }
                });
                this.showNotification('Sante mentale -8', 'danger');
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
            text: 'L\'epave du Morrigane gît sur les rochers comme une carcasse eventree. A l\'interieur, l\'eau clapote dans l\'obscurite. Un journal de bord est encore lisible sur la table du capitaine.',
            choices: [
                { text: 'Lire le journal de bord', effects: {} },
                { text: 'Fouiller la cale', effects: {} },
            ],
            onChoice: (index) => {
                if (index === 0) {
                    this.showDialogue({
                        speaker: 'Journal du Morrigane',
                        text: '"14 novembre — Le compas s\'affole depuis deux jours. L\'equipage entend des choses la nuit. Le mousse refuse de descendre dans la cale. Il dit que quelque chose respire en dessous."',
                        choices: [{ text: 'Fermer le journal', effects: {} }],
                        onChoice: () => {
                            this.stateManager.dispatch({
                                type: 'ADD_JOURNAL',
                                payload: { id: 'morrigane_log', text: 'Journal du Morrigane : le compas s\'affolait, l\'equipage entendait des choses. Quelque chose "respirait" sous la cale.' }
                            });
                            this.closeDialogue();
                        }
                    });
                } else {
                    this.stateManager.dispatch({ type: 'SET_SANITY', payload: { sanity: state.player.sanity - 5 } });
                    this.showDialogue({
                        speaker: 'Narrateur',
                        text: 'La cale est inondee d\'une eau noire et epaisse. En y plongeant la main, vos doigts effleurent quelque chose de lisse et froid. Ca bouge. Vous retirez votre main. Il n\'y a rien. Il n\'y a jamais rien eu.',
                        choices: [{ text: '...', effects: {} }],
                        onChoice: () => {
                            this.stateManager.dispatch({
                                type: 'ADD_JOURNAL',
                                payload: { id: 'morrigane_hull', text: 'Dans la cale du Morrigane, j\'ai touche... quelque chose. L\'eau etait noire comme de l\'encre.' }
                            });
                            this.stateManager.dispatch({ type: 'SET_FLAG', payload: { flag: 'touched_something_in_hull' } });
                            this.showNotification('Sante mentale -5', 'danger');
                            this.closeDialogue();
                        }
                    });
                }
            }
        });
    }

    // =========================================================================
    // Cycle jour/nuit
    // =========================================================================

    _transitionToDusk() {
        this.stateManager.dispatch({ type: 'SET_PHASE', payload: { phase: 'dusk', movesRemaining: 0 } });
        this.showPhaseTransition('Crepuscule', 'Le soleil sombre derriere l\'horizon. Il est temps de preparer la nuit.');

        setTimeout(() => {
            this._showDuskChoices();
        }, 2500);
    }

    _showDuskChoices() {
        const state = this.stateManager.getState();
        const oilNeeded = 3;
        const hasEnoughOil = state.resources.oil >= oilNeeded;

        this.showDialogue({
            speaker: 'Narrateur',
            text: `La nuit approche. Le phare a besoin de ${oilNeeded} unites d'huile pour briller cette nuit. Vous en avez ${state.resources.oil}.`,
            choices: [
                {
                    text: hasEnoughOil ? `Allumer le phare (-${oilNeeded} huile)` : `Pas assez d'huile (${state.resources.oil}/${oilNeeded})`,
                    disabled: !hasEnoughOil,
                    effects: {}
                },
                { text: 'Laisser le phare eteint cette nuit', effects: {} }
            ],
            onChoice: (index) => {
                if (index === 0 && hasEnoughOil) {
                    this.stateManager.dispatch({ type: 'UPDATE_RESOURCE', payload: { resource: 'oil', amount: -oilNeeded } });
                    const litArray = [...state.lighthouseLit, true];
                    this.stateManager._state.lighthouseLit = litArray;
                    this.showNotification('Le phare eclaire la nuit.', 'info');
                } else {
                    const litArray = [...state.lighthouseLit, false];
                    this.stateManager._state.lighthouseLit = litArray;
                    this.stateManager.dispatch({ type: 'SET_SANITY', payload: { sanity: state.player.sanity - 15 } });
                    this.showNotification('Le phare reste eteint. L\'obscurite pese sur votre esprit. (-15 sante mentale)', 'danger');
                }
                this.closeDialogue();
                this._transitionToNight();
            }
        });
    }

    _transitionToNight() {
        this.stateManager.dispatch({ type: 'SET_PHASE', payload: { phase: 'night', movesRemaining: 0 } });
        this.gameContainer.classList.add('night-phase');
        this.showPhaseTransition('Nuit', 'Les tenebres engloutissent l\'ile...');

        // Consommer la nourriture
        const state = this.stateManager.getState();
        const npcCount = Object.values(state.npcs).filter(n => n.alive).length;
        const foodNeeded = npcCount + 1; // joueur + NPCs
        if (state.resources.food >= foodNeeded) {
            this.stateManager.dispatch({ type: 'UPDATE_RESOURCE', payload: { resource: 'food', amount: -foodNeeded } });
        } else {
            this.stateManager.dispatch({ type: 'UPDATE_RESOURCE', payload: { resource: 'food', amount: -state.resources.food } });
            this.stateManager.dispatch({ type: 'SET_SANITY', payload: { sanity: state.player.sanity - 10 } });
            this.showNotification('Pas assez de nourriture pour tout le monde...', 'danger');
        }

        setTimeout(() => {
            this._nightEvents();
        }, 3000);
    }

    _nightEvents() {
        // Evenements de nuit simplifies pour la Phase 1
        const state = this.stateManager.getState();

        this.showDialogue({
            speaker: 'Narrateur',
            text: state.lighthouseLit[state.lighthouseLit.length - 1]
                ? 'La lumiere du phare balaie l\'obscurite. Vous scrutez l\'ocean depuis la galerie. La nuit passe lentement, peuplee de bruits etranges.'
                : 'Sans la lumiere du phare, l\'ile est plongee dans un noir absolu. Chaque bruit devient monstrueux. Chaque ombre prend forme.',
            choices: [{ text: 'Attendre l\'aube...', effects: {} }],
            onChoice: () => {
                this.closeDialogue();
                this._transitionToDawn();
            }
        });
    }

    _transitionToDawn() {
        this.gameContainer.classList.remove('night-phase');
        const state = this.stateManager.getState();

        if (state.act >= 5) {
            this._triggerEnding();
            return;
        }

        this.stateManager.dispatch({ type: 'NEXT_ACT' });
        const newState = this.stateManager.getState();

        this.showPhaseTransition(`Jour ${newState.act}`, 'Un nouveau jour se leve. Le brouillard est toujours la.');

        setTimeout(() => {
            this.stateManager.dispatch({ type: 'SET_PHASE', payload: { phase: 'day', movesRemaining: 6 } });
            this._checkNewArrivals();
            this._updateValidMoves();
            this.updateHUD();
        }, 3000);
    }

    _checkNewArrivals() {
        const state = this.stateManager.getState();
        for (const [npcId, spawn] of Object.entries(NPC_SPAWN_LOCATIONS)) {
            if (spawn.act === state.act && !state.npcs[npcId]) {
                // Le NPC est disponible mais pas encore rencontre
                // On marque sa position pour que le joueur puisse le trouver
                this.showNotification('Quelqu\'un de nouveau semble etre arrive sur l\'ile...', 'event');
            }
        }
    }

    _triggerEnding() {
        this.stateManager.dispatch({ type: 'SET_GAME_OVER', payload: { reason: 'complete' } });
        // Sera etoffe dans les phases suivantes
        this.showPhaseTransition('Fin', 'L\'histoire touche a sa fin...');
    }

    // =========================================================================
    // Interface utilisateur
    // =========================================================================

    showLocationInfo(tile) {
        const nameEl = document.getElementById('location-name');
        const descEl = document.getElementById('location-desc');
        const infoPanel = document.getElementById('location-info');

        nameEl.textContent = tile.name;
        descEl.textContent = tile.description;
        infoPanel.classList.remove('hidden');
    }

    showDialogue({ speaker, text, choices, onChoice }) {
        this.isDialogueActive = true;
        const box = document.getElementById('dialogue-box');
        const speakerEl = document.getElementById('dialogue-speaker');
        const textEl = document.getElementById('dialogue-text');
        const choicesEl = document.getElementById('dialogue-choices');

        speakerEl.textContent = speaker;
        textEl.textContent = '';
        choicesEl.innerHTML = '';
        box.classList.remove('hidden');

        // Effet machine a ecrire
        let charIndex = 0;
        const typeInterval = setInterval(() => {
            if (charIndex < text.length) {
                textEl.textContent += text[charIndex];
                charIndex++;
            } else {
                clearInterval(typeInterval);
                // Afficher les choix
                choices.forEach((choice, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'dialogue-choice';
                    btn.textContent = choice.text;
                    if (choice.disabled) {
                        btn.disabled = true;
                        btn.classList.add('disabled');
                    }
                    btn.addEventListener('click', () => {
                        // Appliquer les effets
                        if (choice.effects) {
                            this._applyChoiceEffects(choice.effects);
                        }
                        if (onChoice) onChoice(index);
                    });
                    choicesEl.appendChild(btn);
                });
            }
        }, 25);

        // Permettre de sauter l'animation en cliquant sur le texte
        textEl.addEventListener('click', function skipType() {
            if (charIndex < text.length) {
                clearInterval(typeInterval);
                textEl.textContent = text;
                charIndex = text.length;
                // Afficher les choix
                choices.forEach((choice, index) => {
                    const btn = document.createElement('button');
                    btn.className = 'dialogue-choice';
                    btn.textContent = choice.text;
                    if (choice.disabled) {
                        btn.disabled = true;
                        btn.classList.add('disabled');
                    }
                    btn.addEventListener('click', () => {
                        if (choice.effects) {
                            this._applyChoiceEffects?.(choice.effects);
                        }
                        if (onChoice) onChoice(index);
                    });
                    choicesEl.appendChild(btn);
                });
            }
            textEl.removeEventListener('click', skipType);
        });
    }

    closeDialogue() {
        this.isDialogueActive = false;
        document.getElementById('dialogue-box').classList.add('hidden');
        this.updateHUD();
    }

    _applyChoiceEffects(effects) {
        if (!effects) return;

        if (effects.sanity) {
            const state = this.stateManager.getState();
            this.stateManager.dispatch({ type: 'SET_SANITY', payload: { sanity: state.player.sanity + effects.sanity } });
        }

        if (effects.trust) {
            for (const [npcId, amount] of Object.entries(effects.trust)) {
                const state = this.stateManager.getState();
                if (state.npcs[npcId]) {
                    const currentTrust = state.npcs[npcId].trust || 0;
                    this.stateManager.dispatch({
                        type: 'UPDATE_NPC',
                        payload: { id: npcId, data: { trust: currentTrust + amount } }
                    });
                }
            }
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notif = document.createElement('div');
        notif.className = `notification notification-${type}`;
        notif.textContent = message;
        container.appendChild(notif);

        // Animation d'entree
        requestAnimationFrame(() => notif.classList.add('show'));

        // Suppression apres 4 secondes
        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => notif.remove(), 500);
        }, 4000);
    }

    showPhaseTransition(title, subtitle) {
        const overlay = document.getElementById('phase-transition');
        const textEl = document.getElementById('phase-transition-text');
        textEl.innerHTML = `<h2>${title}</h2><p>${subtitle}</p>`;
        overlay.classList.remove('hidden');

        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 2500);
    }

    updateHUD() {
        const state = this.stateManager.getState();

        // Ressources
        document.getElementById('oil-value').textContent = state.resources.oil;
        document.getElementById('food-value').textContent = state.resources.food;
        document.getElementById('sanity-value').textContent = state.player.sanity;

        // Barres de progression
        document.getElementById('oil-fill').style.width = `${(state.resources.oil / 20) * 100}%`;
        document.getElementById('food-fill').style.width = `${(state.resources.food / 15) * 100}%`;
        document.getElementById('sanity-fill').style.width = `${state.player.sanity}%`;

        // Couleur de la barre de sante mentale
        const sanityFill = document.getElementById('sanity-fill');
        if (state.player.sanity <= 25) {
            sanityFill.classList.add('critical');
        } else if (state.player.sanity <= 50) {
            sanityFill.classList.add('low');
        } else {
            sanityFill.classList.remove('critical', 'low');
        }

        // Temps
        const phaseLabels = { dawn: 'Aube', day: 'Jour', dusk: 'Crepuscule', night: 'Nuit' };
        document.getElementById('day-display').textContent = `Jour ${state.act}`;
        document.getElementById('phase-display').textContent = phaseLabels[state.phase] || state.phase;
        document.getElementById('moves-display').textContent = `Deplacements : ${state.movesRemaining}`;

        // Effets de sante mentale sur le container
        this.gameContainer.className = '';
        if (state.player.sanity <= 25) {
            this.gameContainer.classList.add('sanity-critical');
        } else if (state.player.sanity <= 50) {
            this.gameContainer.classList.add('sanity-low');
        } else if (state.player.sanity <= 75) {
            this.gameContainer.classList.add('sanity-uneasy');
        }
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
        const journal = document.getElementById('journal-overlay');
        const isVisible = !journal.classList.contains('hidden');

        if (isVisible) {
            journal.classList.add('hidden');
        } else {
            this._populateJournal();
            journal.classList.remove('hidden');
        }
    }

    _populateJournal() {
        const state = this.stateManager.getState();
        const cluesEl = document.getElementById('journal-clues');
        cluesEl.innerHTML = '';

        if (state.player.journal.length === 0) {
            cluesEl.innerHTML = '<p class="journal-empty">Aucune note pour le moment...</p>';
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
        this.showNotification('Partie sauvegardee.', 'info');
    }

    loadGame() {
        if (this.saveManager.load('save_1')) {
            this._restoreBoardFromState();
            this.updateHUD();
            this._updateValidMoves();
            this.showNotification('Partie chargee.', 'info');
            this.togglePauseMenu();
        } else {
            this.showNotification('Aucune sauvegarde trouvee.', 'warning');
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
