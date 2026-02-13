// ============================================================
// Carte de l'ile - Le Dernier Phare
// Grille hexagonale en coordonnees axiales (q, r)
// Pointy-top orientation
// ============================================================

export const ISLAND_MAP = [
    // === CENTRE : Le Phare ===
    {
        q: 0, r: 0,
        type: "lighthouse",
        name: "Le Phare",
        description: "Votre phare. La tour de pierre se dresse contre le ciel gris, son mecanisme grince a chaque rotation. C'est votre refuge... pour l'instant.",
        explorable: true,
        events: ["act1_start"],
        loot: null
    },

    // === ANNEAU 1 : Alentours immediats ===
    {
        q: 1, r: 0,
        type: "path",
        name: "Sentier de la Cote Est",
        description: "Un chemin de terre battue longe la falaise. Des traces de pas recentes marquent la boue.",
        explorable: true,
        events: [],
        loot: null
    },
    {
        q: 0, r: 1,
        type: "shore",
        name: "Greve des Epaves",
        description: "Le sable gris est jonche de debris. Des planches de bois, une voile dechiree... un naufrage recent.",
        explorable: true,
        events: ["find_sailor"],
        loot: { type: "supplies", amount: 1, description: "Provisions echouees" }
    },
    {
        q: -1, r: 1,
        type: "shore",
        name: "Plage du Silence",
        description: "Aucun oiseau ne survole cette plage. Le silence est si profond qu'on entend son propre sang pulser.",
        explorable: true,
        events: [],
        loot: { type: "oil", amount: 2, description: "Baril d'huile echoue" }
    },
    {
        q: -1, r: 0,
        type: "path",
        name: "Sentier de l'Ouest",
        description: "Le chemin s'enfonce dans une brume basse. Des pierres empilees bordent le sentier, comme des cairns.",
        explorable: true,
        events: [],
        loot: null
    },
    {
        q: 0, r: -1,
        type: "cliff",
        name: "Falaise Nord",
        description: "Un a-pic vertigineux plonge dans les vagues noires. Par temps clair, on verrait la cote... mais le temps n'est jamais clair ici.",
        explorable: true,
        events: ["cliff_vision"],
        loot: null
    },
    {
        q: 1, r: -1,
        type: "shore",
        name: "Crique Cachee",
        description: "Une petite crique abrite des eaux etrangement calmes. La surface est lisse comme du verre noir.",
        explorable: true,
        events: [],
        loot: { type: "food", amount: 2, description: "Poissons pieges dans les rochers" }
    },

    // === ANNEAU 2 : Zone intermediaire ===
    {
        q: 2, r: 0,
        type: "forest",
        name: "Bois des Murmures",
        description: "Les arbres sont tordus par le vent eternel. Parfois, entre les branches, on croit entendre des voix.",
        explorable: true,
        events: ["whispers_event"],
        loot: { type: "food", amount: 1, description: "Baies sombres" }
    },
    {
        q: 2, r: -1,
        type: "forest",
        name: "Bois Profond",
        description: "La lumiere ne penetre pas ici. Les troncs sont couverts d'une mousse noire et humide.",
        explorable: true,
        events: [],
        loot: { type: "oil", amount: 1, description: "Resine inflammable" }
    },
    {
        q: 2, r: -2,
        type: "cliff",
        name: "Pointe des Lamentations",
        description: "Le vent hurlant entre les rochers produit un son qui ressemble a des pleurs. Les marins disent que c'est la mer qui pleure ses morts.",
        explorable: true,
        events: ["lamentations"],
        loot: null
    },
    {
        q: 1, r: -2,
        type: "reef",
        name: "Recifs du Diable",
        description: "Des rochers noirs percent la surface comme des dents. Combien de navires se sont brises ici ?",
        explorable: true,
        events: [],
        loot: { type: "supplies", amount: 2, description: "Debris de navire utilisables" }
    },
    {
        q: 0, r: -2,
        type: "deep_water",
        name: "L'Abime",
        description: "L'eau est d'un noir d'encre. On ne voit pas le fond. On ne veut pas voir le fond.",
        explorable: false,
        events: [],
        loot: null
    },
    {
        q: -1, r: -1,
        type: "cliff",
        name: "Falaise de l'Observatoire",
        description: "Un plateau rocheux offre une vue sur toute l'ile. Quelqu'un a grave des symboles dans la pierre.",
        explorable: true,
        events: ["observatory_symbols"],
        loot: null
    },
    {
        q: -2, r: 1,
        type: "shore",
        name: "Greve Noire",
        description: "Le sable est noir comme du charbon. L'eau qui s'y retire laisse des traces qui ressemblent a des veines.",
        explorable: true,
        events: [],
        loot: { type: "food", amount: 1, description: "Crustaces" }
    },
    {
        q: -2, r: 2,
        type: "village",
        name: "Village Abandonne",
        description: "Des maisons de pierre aux toits effondres. Le village a ete quitte a la hate. Les portes sont encore ouvertes.",
        explorable: true,
        events: ["abandoned_village"],
        loot: { type: "oil", amount: 3, description: "Reserve d'huile dans une cave" }
    },
    {
        q: -1, r: 2,
        type: "path",
        name: "Route du Village",
        description: "Un chemin pave mene au village. Les pierres sont anciennes, bien plus que les maisons.",
        explorable: true,
        events: [],
        loot: null
    },
    {
        q: 0, r: 2,
        type: "forest",
        name: "Lisiere Brumeuse",
        description: "La foret commence ici. Le brouillard y est si epais qu'on perd le sens des distances.",
        explorable: true,
        events: [],
        loot: { type: "food", amount: 2, description: "Champignons comestibles" }
    },
    {
        q: 1, r: 1,
        type: "shipwreck",
        name: "L'Epave du Morrigane",
        description: "La coque du navire est eventree sur les rochers. Le nom est encore lisible : Morrigane. L'interieur est sombre et inonde.",
        explorable: true,
        events: ["explore_shipwreck"],
        loot: { type: "supplies", amount: 3, description: "Equipement du navire" }
    },

    // === ANNEAU 3 : Zone eloignee ===
    {
        q: 3, r: -1,
        type: "forest",
        name: "Clairiere des Idoles",
        description: "Au centre de la clairiere, trois pierres dressees forment un triangle. L'herbe ne pousse pas entre elles.",
        explorable: true,
        events: ["idols_discovery"],
        loot: null
    },
    {
        q: 3, r: -2,
        type: "ruins",
        name: "Temple Englouti",
        description: "Des colonnes brisees emergent de la terre spongieuse. L'architecture n'appartient a aucune epoque connue.",
        explorable: true,
        events: ["temple_discovery"],
        loot: null,
        blocked: true,
        blockReason: "Un eboulement bloque le passage. Il faudrait des outils ou de l'aide."
    },
    {
        q: 3, r: -3,
        type: "deep_water",
        name: "Haute Mer",
        description: "L'ocean infini. Aucune terre en vue.",
        explorable: false,
        events: [],
        loot: null
    },
    {
        q: 2, r: -3,
        type: "reef",
        name: "Brisants Nord",
        description: "La mer blanche d'ecume se fracasse sur des rochers dentelés. Quelque chose brille entre les recifs.",
        explorable: true,
        events: [],
        loot: { type: "oil", amount: 2, description: "Lampe a huile intacte" }
    },
    {
        q: -2, r: 0,
        type: "cave",
        name: "Grotte des Marees",
        description: "L'entree de la grotte est submergee a maree haute. A maree basse, un passage sombre s'ouvre dans la falaise.",
        explorable: true,
        events: ["tidal_cave"],
        loot: { type: "food", amount: 2, description: "Reserves cachees" },
        blocked: true,
        blockReason: "La maree est haute. Revenez plus tard."
    },
    {
        q: -3, r: 2,
        type: "ruins",
        name: "Cimetiere Marin",
        description: "Des croix de bois tordues marquent des tombes sans nom. Certaines semblent recentes. D'autres sont impossiblement anciennes.",
        explorable: true,
        events: ["cemetery_visit"],
        loot: null
    },
    {
        q: -3, r: 3,
        type: "shrine",
        name: "L'Autel des Profondeurs",
        description: "Un monolithe de pierre noire se dresse face a la mer. Des offrandes dessechees entourent sa base. Il vibre au toucher.",
        explorable: true,
        events: ["altar_discovery"],
        loot: null,
        blocked: true,
        blockReason: "Une terreur irrationnelle vous empeche d'approcher."
    },
    {
        q: -2, r: 3,
        type: "shore",
        name: "Anse des Naufrages",
        description: "Un deuxieme lieu d'echouage. Des corps... non, des mannequins de bois. Qui les a mis la ?",
        explorable: true,
        events: ["mannequins_event"],
        loot: { type: "supplies", amount: 1, description: "Corde et bois" }
    },
    {
        q: -1, r: 3,
        type: "forest",
        name: "Sous-Bois des Racines",
        description: "Les racines des arbres forment des arches au-dessus du sol. Certaines semblent bouger quand on ne les regarde pas.",
        explorable: true,
        events: [],
        loot: { type: "food", amount: 1, description: "Racines comestibles" }
    },
    {
        q: 0, r: 3,
        type: "deep_water",
        name: "Mer du Sud",
        description: "L'ocean. Immense. Indifferent.",
        explorable: false,
        events: [],
        loot: null
    },
    {
        q: 1, r: 2,
        type: "shore",
        name: "Pointe Sud-Est",
        description: "L'extremite de l'ile. Le courant est violent ici. Des algues d'un vert maladif s'accrochent aux rochers.",
        explorable: true,
        events: [],
        loot: { type: "oil", amount: 1, description: "Debris huileux" }
    },
    {
        q: 2, r: 1,
        type: "reef",
        name: "Dents de la Mer",
        description: "Des formations rocheuses acérees percent les vagues. Elles forment presque un motif... un cercle ?",
        explorable: true,
        events: ["teeth_pattern"],
        loot: null
    },

    // === Locations speciales (deblocages narratifs) ===
    {
        q: -3, r: 1,
        type: "cave",
        name: "Grotte du Chant",
        description: "Un boyau etroit mene a une caverne ou l'eau produit une resonance. Le son ressemble a une voix qui chante dans une langue oubliee.",
        explorable: true,
        events: ["singing_cave"],
        loot: null,
        blocked: true,
        blockReason: "L'entree est obstruee. Il faudrait un outil pour degager les pierres."
    },
    {
        q: 1, r: -3,
        type: "deep_water",
        name: "Les Profondeurs",
        description: "Sous la surface, dans le noir absolu, quelque chose attend.",
        explorable: false,
        events: [],
        loot: null
    },
    {
        q: -1, r: -2,
        type: "deep_water",
        name: "Ocean Nord-Ouest",
        description: "Des eaux turbulentes. La brume est si epaisse qu'on ne voit pas ou finit la mer et ou commence le ciel.",
        explorable: false,
        events: [],
        loot: null
    }
];

// === NPCs et leurs positions d'apparition ===
export const NPC_SPAWN_LOCATIONS = {
    marin: { q: 0, r: 1, act: 1 },      // Greve des Epaves
    enfant: { q: -1, r: 1, act: 1 },     // Plage du Silence (cache)
    elise: { q: 1, r: 1, act: 2 },       // L'Epave du Morrigane
    pretre: { q: -2, r: 2, act: 3 },     // Village Abandonne
    nadia: { q: -2, r: 1, act: 3 },      // Greve Noire
    capitaine: { q: 1, r: -1, act: 4 }   // Crique Cachee
};
