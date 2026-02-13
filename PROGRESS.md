# Le Dernier Phare - Avancement du projet

## Concept
Jeu de plateau narratif solo en navigateur. Le joueur incarne un gardien de phare sur une ile mysterieuse. Des naufrages arrivent avec des histoires contradictoires. Ambiance Lovecraft, 5 actes (jours), 6 PNJs, exploration hexagonale, fins multiples.

## Stack technique
- Vanilla HTML/CSS/JS avec ES modules (pas de framework, pas de build)
- Canvas pour le plateau hexagonal + DOM pour l'UI (approche hybride)
- Coordonnees axiales (q, r) pour grille hexagonale pointy-top
- State management type Redux (StateManager)
- Web Audio API prevu pour l'audio procedural

---

## Phases d'implementation

### Phase 1 : Fondations et plateau (TERMINEE)
- [x] Structure HTML complete (index.html)
- [x] CSS : main.css, board.css, ui.css, dialogue.css, effects.css, title.css
- [x] Moteur : GameLoop, StateManager, Renderer, InputHandler, SaveManager
- [x] Plateau : Tile, Board, BoardRenderer, PathFinder
- [x] Donnees : island-map.js (35 tuiles hex, 6 PNJs)
- [x] Orchestrateur : main.js (~845 lignes)
- [x] Ecran titre fonctionnel avec silhouette phare en CSS pur
- [x] Plateau hex rendu avec brouillard de guerre (3 etats : hidden/shrouded/revealed)
- [x] Token joueur anime avec lueur de lanterne
- [x] HUD avec barres de ressources (huile, nourriture, sante mentale)
- [x] Panneau lateral avec infos de localisation
- [x] Systeme de deplacement (clic hex adjacent, validation, exploration 2-profondeur)
- [x] Evenements narratifs basiques : marin naufrage (2 branches), vision falaise, epave Morrigane (2 choix)
- [x] Cycle jour/nuit complet : aube -> jour (6 deplacements) -> crepuscule (choix phare) -> nuit (consommation nourriture) -> aube suivante
- [x] Systeme de sauvegarde/chargement (localStorage)
- [x] Systeme de notifications
- [x] Transitions de phase
- [x] Journal du joueur
- [x] Menu pause

### Phase 2 : Temps, Ressources et HUD (A FAIRE)
- [ ] TimeManager module dedie (gestion fine des phases, minuteries)
- [ ] ResourceManager module dedie (regles de consommation, rarete progressive)
- [ ] Amelioration du HUD (indicateurs visuels plus riches, mini-carte?)
- [ ] Equilibrage des ressources par acte

### Phase 3 : Dialogues et systeme narratif (A FAIRE)
- [ ] DialogueEngine module dedie (arbre de dialogues, conditions)
- [ ] NPCManager (etats, confiance, revelations conditionnelles)
- [ ] StoryManager (progression narrative, flags, verifications)
- [ ] Dialogues complets pour les 6 PNJs :
  - Le Marin (Acte 1) - basique deja en place
  - La Scientifique (Acte 1)
  - Le Pretre (Acte 2)
  - L'Enfant (Acte 2)
  - La Capitaine (Acte 3)
  - L'Ombre (Acte 4)

### Phase 4 : Evenements et Sante mentale (A FAIRE)
- [ ] EventSystem module dedie (evenements aleatoires, conditions, poids)
- [ ] SanitySystem (effets visuels progressifs, hallucinations, faux indices)
- [ ] Evenements de nuit dynamiques
- [ ] Effets de sante mentale basse sur le gameplay (faux PNJs, tuiles qui changent)

### Phase 5 : Atmosphere visuelle et sonore (A FAIRE)
- [ ] ParticleSystem (pluie, brume, cendres, lucioles)
- [ ] LightingSystem (eclairage dynamique, ombres)
- [ ] AudioManager (Web Audio API procedural)
  - Ambiance ocean, vent, pluie
  - Musique procedurale adaptative
  - Sons d'UI (clic, notification, page journal)
  - Sons narratifs (voix, bruits etranges)
- [ ] Amelioration des effets CSS de sante mentale

### Phase 6 : Contenu narratif complet (A FAIRE)
- [ ] Acte 1 : L'Arrivee - dialogues complets, indices
- [ ] Acte 2 : Les Revelations - tensions entre PNJs, nouveaux indices
- [ ] Acte 3 : La Verite - revelations majeures, trahisons possibles
- [ ] Acte 4 : La Descente - climax, evenements surnaturels
- [ ] Acte 5 : Le Dernier Feu - resolution, choix final
- [ ] 4+ fins differentes basees sur les choix du joueur
- [ ] Indices caches, easter eggs

### Phase 7 : Polish et ecran titre (A FAIRE)
- [ ] UI de sauvegarde/chargement (slots visuels)
- [ ] Ecran titre : animation d'intro
- [ ] Tutoriel integre (premier acte guide)
- [ ] Ecran de fin avec resume des choix
- [ ] Responsive design
- [ ] Accessibilite (clavier, contraste)
- [ ] Optimisation performance

---

## Architecture des fichiers

```
jeu/
  index.html              <- Point d'entree, structure DOM complete
  PROGRESS.md             <- Ce fichier
  css/
    main.css              <- Variables CSS, reset, typo, animations
    board.css             <- Styles canvas/plateau (minimal, canvas gere le rendu)
    ui.css                <- HUD, panneau lateral, notifications, menus
    dialogue.css          <- Boite de dialogue, choix
    effects.css           <- Brouillard, vignette, effets sante mentale
    title.css             <- Ecran titre, silhouette phare
  js/
    main.js               <- Classe Game, orchestrateur principal
    engine/
      GameLoop.js         <- Boucle requestAnimationFrame
      StateManager.js     <- Etat centralisee type Redux
      Renderer.js         <- Gestion canvas (HiDPI, resize)
      InputHandler.js     <- Souris (clic->hex, drag, zoom) + clavier
      SaveManager.js      <- Sauvegarde/chargement localStorage
    board/
      Tile.js             <- Classe Tile, types de terrain, couleurs, etats brouillard
      Board.js            <- Carte hex (Map "q,r"), voisins, exploration
      BoardRenderer.js    <- Rendu canvas 5 passes, icones terrain, joueur anime
      PathFinder.js       <- Mouvements valides, distance, BFS
    data/
      island-map.js       <- 35 tuiles, 6 PNJs, positions spawn
    audio/                <- (vide - Phase 5)
    effects/              <- (vide - Phase 5)
    narrative/            <- (vide - Phase 3)
    systems/              <- (vide - Phase 4)
    ui/                   <- (vide - Phase 7)
```

## Bugs connus / corriges
- StateManager NEXT_ACT : max etait 3 au lieu de 5 -> corrige
- BoardRenderer : centrage canvas manquant -> corrige (centerX/centerY dans translate)
- CSS : nommage BEM ne correspondait pas au HTML -> reecrit les 4 fichiers CSS
- board.css : mauvais selecteurs -> simplifie
- startNewGame() : logique de reset trop complexe -> simplifie avec new StateManager()

## Etat actuel
Le jeu est jouable en l'etat pour un prototype Phase 1 :
- L'ecran titre s'affiche correctement
- On peut lancer une nouvelle partie
- Le plateau hexagonal s'affiche avec brouillard de guerre
- Le joueur peut se deplacer en cliquant sur les cases adjacentes
- Les ressources se mettent a jour
- Les evenements narratifs se declenchent (marin, vision, epave)
- Le cycle jour/nuit fonctionne
- La sauvegarde/chargement fonctionne

Pour lancer : `npx http-server -p 8080 -c-1` puis ouvrir http://localhost:8080
