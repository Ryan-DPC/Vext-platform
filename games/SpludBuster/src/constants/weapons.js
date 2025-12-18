const WEAPONS = [
    'Bow02', 'Club01', 'EnergySword01', 'Hammer01', 'Knife01',
    'Mace01', 'Scimitar01', 'Scythe01', 'Shuriken01', 'Sling01',
    'Spear01', 'Staff01', 'Sword01', 'ThrowingAxe01', 'Wand01'
];

const STARTER_WEAPONS = [
    'Sword01', // Épée
    'Bow02',   // Arc
    'Staff01'  // Bâton
];

const POOL_WEAPONS = WEAPONS; // Tous les armes peuvent être dans le shop

const WEAPON_TIERS = {
    0: { name: 'Common', color: 0x9ca3af, multiplier: 1.0, label: 'Gris' },      // Gris
    1: { name: 'Uncommon', color: 0x10b981, multiplier: 1.5, label: 'Vert' },    // Vert
    2: { name: 'Rare', color: 0xf59e0b, multiplier: 2.5, label: 'Or' },          // Or
    3: { name: 'Mythic', color: 0xef4444, multiplier: 4.0, label: 'Rouge' }      // Rouge
};

const MAX_WEAPONS = 4;
