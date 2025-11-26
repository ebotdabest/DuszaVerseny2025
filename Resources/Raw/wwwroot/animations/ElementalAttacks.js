import { ArcaneFX, SEQUENCE_COMMANDS } from './ArcaneFX.js';

/**
 * ElementalAttacks.js
 * "Anime-Style" Finishers: High particle count, multi-stage impact frames, and 3s duration.
 */

const ELEMENT_COLORS = {
    FIRE: '#FF4500',   // OrangeRed
    WATER: '#1E90FF',  // DodgerBlue
    AIR: '#E0FFFF',    // LightCyan
    EARTH: '#8B4513'   // SaddleBrown
};

function getElementTypeFromColor(hexColor) {
    if (!hexColor) return 'NONE';
    const color = hexColor.toUpperCase();
    if (['#CD5C5C', '#FF4500', '#DC143C', '#B22222', '#FF0000'].includes(color)) return 'FIRE';
    if (['#1E90FF', '#00BFFF', '#87CEFA', '#4682B4', '#0000FF'].includes(color)) return 'WATER';
    if (['#ADD8E6', '#E0FFFF', '#B0E0E6', '#AFEEEE', '#00FFFF'].includes(color)) return 'AIR';
    if (['#556B2F', '#8B4513', '#A0522D', '#8B0000', '#DAA520'].includes(color)) return 'EARTH';
    return 'NONE';
}

// =============================================================================
// HELPER: ULTIMATE PARTICLE GENERATORS
// =============================================================================

// Spawns a multi-layered explosion (Core, Shockwave, Debris)
function spawnAnimeExplosion(instance, mainColor, secColor) {
    // 1. THE FLASH (Central blinding core)
    instance.spawn({
        life: 40, maxLife: 40, color: '#FFFFFF', size: 60,
        behavior: p => { p.size *= 1.2; p.alpha = p.life / 40; }
    });

    // 2. THE EXPANSION (Colored Sphere)
    instance.spawn({
        life: 50, color: mainColor, size: 40,
        behavior: p => { p.size *= 1.1; p.alpha = 0.8; }
    });

    // 3. SHOCKWAVE RINGS (Fast expanding donuts)
    for (let j = 0; j < 3; j++) {
        const delay = j * 5;
        setTimeout(() => {
            for (let i = 0; i < 50; i++) {
                const angle = (i / 50) * 6.28;
                instance.spawn({
                    x: Math.cos(angle) * (10 + j * 10), y: Math.sin(angle) * (10 + j * 10),
                    vx: Math.cos(angle) * (15 + j * 5), vy: Math.sin(angle) * (15 + j * 5),
                    life: 40, color: secColor, size: 8, shrink: true
                });
            }
        }, delay * 10);
    }

    // 4. DEBRIS / SPARKS (Chaos)
    for (let i = 0; i < 60; i++) {
        const angle = Math.random() * 6.28;
        const speed = Math.random() * 25 + 5;
        instance.spawn({
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 60, color: Math.random() > 0.5 ? mainColor : '#FFF',
            size: Math.random() * 10 + 2, shrink: true
        });
    }
}

// =============================================================================
// REGISTER BASIC ATTACKS (Kept Snappy)
// =============================================================================
export function registerElementalEffects(arcaneEngine) {
    // --- FIRE ---
    arcaneEngine.registerEffect('fire_attack', (instance) => {
        instance.spawn({ life: 60, color: '#FFD700', size: 25, behavior: p => { p.size *= 0.9; p.color = '#FF4500'; } });
        instance.emitter = () => {
            instance.spawn({ x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15, life: 20, color: '#FF4500', size: 8, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, shrink: true });
        };
    });
    arcaneEngine.registerEffect('fire_hit', (instance) => spawnAnimeExplosion(instance, '#FF4500', '#FFFF00'));

    // --- WATER ---
    arcaneEngine.registerEffect('water_attack', (instance) => {
        instance.spawn({ life: 60, color: '#00BFFF', size: 22, behavior: p => { p.size = 22 + Math.sin(Date.now() / 40) * 3; } });
        instance.emitter = () => {
            instance.spawn({ x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20, life: 25, color: '#E0FFFF', size: 6, vx: (Math.random() - 0.5) * 2, vy: -2, shrink: true });
        };
    });
    arcaneEngine.registerEffect('water_hit', (instance) => spawnAnimeExplosion(instance, '#1E90FF', '#00FFFF'));

    // --- EARTH ---
    arcaneEngine.registerEffect('earth_attack', (instance) => {
        instance.spawn({ life: 80, color: '#8B4513', size: 28, type: 'triangle', behavior: p => { p.rotation += 0.15; } });
    });
    arcaneEngine.registerEffect('earth_hit', (instance) => spawnAnimeExplosion(instance, '#8B4513', '#D2B48C'));

    // --- AIR ---
    arcaneEngine.registerEffect('air_attack', (instance) => {
        instance.spawn({ life: 60, color: '#E0FFFF', size: 20, behavior: p => { p.size = 20 + Math.sin(Date.now() / 20) * 5; } });
        instance.emitter = () => {
            instance.spawn({ x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15, life: 10, color: '#FFF', size: 2, vx: -10, vy: 0, type: 'line', length: 15 });
        };
    });
    arcaneEngine.registerEffect('air_hit', (instance) => spawnAnimeExplosion(instance, '#E0FFFF', '#FFFFFF'));
}

// =============================================================================
// REGISTER ANIME FINISHERS
// =============================================================================
export function registerElementalFinishers(arcaneEngine) {

    // --- FIRE: "PROMINENCE BURNOUT" ---
    arcaneEngine.registerEffect('fire_god_charge', (instance) => {
        // Gathering energy spiraling IN
        instance.emitter = () => {
            for (let k = 0; k < 3; k++) {
                const angle = Math.random() * 6.28;
                const dist = 200 + Math.random() * 50;
                instance.spawn({
                    x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
                    vx: -Math.cos(angle) * 15, vy: -Math.sin(angle) * 15, // High speed suck
                    life: 20, color: k === 0 ? '#FF4500' : '#FFD700', size: 5,
                    behavior: p => p.size += 0.5 // Get bigger as they reach center
                });
            }
        };
    });

    arcaneEngine.registerEffect('fire_god_explode', (instance) => {
        spawnAnimeExplosion(instance, '#FF0000', '#FFA500');
        // Extra lingering flames
        for (let i = 0; i < 50; i++) {
            instance.spawn({
                x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100,
                vx: 0, vy: -2,
                life: 100, color: '#FF4500', size: 10, alpha: 0.5,
                behavior: p => { p.y -= 1; p.size *= 0.95; }
            });
        }
    });

    // --- WATER: "LEVIATHAN'S PRISON" ---
    arcaneEngine.registerEffect('water_god_vortex', (instance) => {
        let angle = 0;
        instance.emitter = () => {
            angle += 0.3;
            // Double helix rising
            for (let i = 0; i < 2; i++) {
                const a = angle + (i * 3.14);
                const r = 80;
                instance.spawn({
                    x: Math.cos(a) * r, y: Math.sin(a) * r + (Math.sin(Date.now() / 100) * 20),
                    vx: -Math.sin(a) * 5, vy: Math.cos(a) * 5,
                    life: 40, color: '#00BFFF', size: 8,
                    behavior: p => { p.x += p.vx; p.y += p.vy; p.size *= 0.95; }
                });
            }
        };
    });

    arcaneEngine.registerEffect('water_god_burst', (instance) => {
        spawnAnimeExplosion(instance, '#1E90FF', '#00FFFF');
        // Hundreds of bubbles rising
        for (let i = 0; i < 100; i++) {
            instance.spawn({
                x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300,
                vx: 0, vy: -5 - Math.random() * 5,
                life: 80, color: 'rgba(255,255,255,0.6)', size: Math.random() * 10,
                gravity: -0.1
            });
        }
    });

    // --- EARTH: "PLANETARY DEVASTATION" ---
    arcaneEngine.registerEffect('earth_god_rumble', (instance) => {
        // Rocks defying gravity
        instance.emitter = () => {
            if (Math.random() > 0.3) return;
            instance.spawn({
                x: (Math.random() - 0.5) * 200, y: 150,
                vx: 0, vy: -5, // Float up
                life: 60, color: '#5D4037', size: 15, type: 'triangle',
                rotation: Math.random() * 6,
                behavior: p => { p.y += p.vy; p.rotation += 0.1; }
            });
        };
    });

    arcaneEngine.registerEffect('earth_god_impact', (instance) => {
        // The Meteor
        instance.spawn({
            y: -500, vx: 0, vy: 40, life: 15, color: '#3E2723', size: 120,
            behavior: p => { p.y += p.vy; } // Just slams down
        });
    });

    arcaneEngine.registerEffect('earth_god_shatter', (instance) => {
        spawnAnimeExplosion(instance, '#8B4513', '#A0522D');
        // Ground fissures (Lines)
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * 6.28;
            instance.spawn({
                life: 100, color: '#3E2723', size: 4, length: 150, width: 5,
                type: 'line', rotation: angle,
                x: Math.cos(angle) * 20, y: Math.sin(angle) * 20
            });
        }
    });

    // --- AIR: "HEAVENLY VOID SLASH" ---
    arcaneEngine.registerEffect('air_god_charge', (instance) => {
        // Vacuum lines
        instance.emitter = () => {
            const angle = Math.random() * 6.28;
            instance.spawn({
                x: Math.cos(angle) * 200, y: Math.sin(angle) * 200,
                vx: -Math.cos(angle) * 25, vy: -Math.sin(angle) * 25, // Super fast suck
                life: 10, color: '#E0FFFF', size: 2, length: 60, type: 'line', rotation: angle
            });
        }
    });

    arcaneEngine.registerEffect('air_god_slice', (instance) => {
        // The Single Cut
        instance.spawn({
            x: -200, y: 200, vx: 20, vy: -20, // Diagonal up
            life: 10, color: '#FFF', size: 5, length: 600, width: 8, type: 'line', rotation: -0.78
        });
    });

    arcaneEngine.registerEffect('air_god_flurry', (instance) => {
        // 1000 Cuts
        for (let i = 0; i < 80; i++) {
            instance.spawn({
                x: (Math.random() - 0.5) * 150, y: (Math.random() - 0.5) * 150,
                life: 20, color: '#FFF', size: 2, length: 100, width: 3,
                type: 'line', rotation: Math.random() * 6.28
            });
        }
        spawnAnimeExplosion(instance, '#E0FFFF', '#FFFFFF');
    });
}

// =============================================================================
// MAIN EXECUTION (CINEMATIC SEQUENCES)
// =============================================================================

export async function playElementalAttack(attackerId, targetId, elementColor) {
    if (!window.arcaneEngine) {
        window.arcaneEngine = new ArcaneFX();
        registerElementalEffects(window.arcaneEngine);
        registerElementalFinishers(window.arcaneEngine);
    }
    const engine = window.arcaneEngine;
    const type = getElementTypeFromColor(elementColor);
    const attacker = document.getElementById(attackerId);
    const target = document.getElementById(targetId);
    if (!attacker || !target) return;

    const startRect = attacker.getBoundingClientRect();
    const endRect = target.getBoundingClientRect();
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + endRect.height / 2;

    let attackVfx = 'fire_attack';
    let hitVfx = 'fire_hit';
    let impactColor = 'rgba(255, 69, 0, 0.4)';
    let shadowColor = '#FF4500';

    switch (type) {
        case 'FIRE': attackVfx = 'fire_attack'; hitVfx = 'fire_hit'; impactColor = 'rgba(255,0,0,0.4)'; shadowColor = '#FF4500'; break;
        case 'WATER': attackVfx = 'water_attack'; hitVfx = 'water_hit'; impactColor = 'rgba(0,100,255,0.4)'; shadowColor = '#1E90FF'; break;
        case 'EARTH': attackVfx = 'earth_attack'; hitVfx = 'earth_hit'; impactColor = 'rgba(139,69,19,0.4)'; shadowColor = '#8B4513'; break;
        case 'AIR': attackVfx = 'air_attack'; hitVfx = 'air_hit'; impactColor = 'rgba(200,255,255,0.4)'; shadowColor = '#E0FFFF'; break;
    }

    const sequence = [
        [SEQUENCE_COMMANDS.SHADOW, 0, `#${attackerId}`, shadowColor, 300],
        [SEQUENCE_COMMANDS.VFX, 0, attackVfx, startX, startY, { life: 100 }, 'projectile'],
        [SEQUENCE_COMMANDS.MOVE_VFX, 0, 'projectile', endX, endY, 300],
        [SEQUENCE_COMMANDS.WAIT, 300],
        [SEQUENCE_COMMANDS.CLEAR_VFX, 0, 'projectile'],
        [SEQUENCE_COMMANDS.VFX, 0, hitVfx, endX, endY, { life: 50 }],
        [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, impactColor, 'shake'],
        [SEQUENCE_COMMANDS.SHADOW, 0, `#${targetId}`, shadowColor, 400]
    ];
    await engine.runSequence(sequence);
}

export async function playElementalFinisher(attackerId, targetId, elementColor) {
    if (!window.arcaneEngine) {
        window.arcaneEngine = new ArcaneFX();
        registerElementalEffects(window.arcaneEngine);
        registerElementalFinishers(window.arcaneEngine);
    }

    const engine = window.arcaneEngine;
    const type = getElementTypeFromColor(elementColor);
    const target = document.getElementById(targetId);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const attackerSelector = attackerId ? `#${attackerId}` : null;
    const targetSelector = `#${targetId}`;

    let sequence = [];

    switch (type) {
        case 'FIRE':
            // === PROMINENCE BURNOUT (3000ms) ===
            sequence = [
                // 1. TENSION (Darken screen + Charge)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'rgba(0,0,0,0.7)', 'none'],
                attackerSelector ? [SEQUENCE_COMMANDS.SHADOW, 0, attackerSelector, '#FF0000', 1000] : [SEQUENCE_COMMANDS.WAIT, 0],
                [SEQUENCE_COMMANDS.VFX, 0, 'fire_god_charge', cx, cy, { life: 1500 }],
                [SEQUENCE_COMMANDS.WAIT, 1500],

                // 2. TRIGGER (White Flash)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'white', 'none'],
                [SEQUENCE_COMMANDS.WAIT, 100],

                // 3. RELEASE (Massive Red Impact)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'rgba(255,0,0,0.6)', 'shake'],
                [SEQUENCE_COMMANDS.VFX, 0, 'fire_god_explode', cx, cy, { life: 400 }],
                [SEQUENCE_COMMANDS.SHADOW, 0, targetSelector, '#000000', 1000],
                [SEQUENCE_COMMANDS.WAIT, 1400]
            ];
            break;

        case 'WATER':
            // === LEVIATHAN'S PRISON (3000ms) ===
            sequence = [
                // 1. TENSION (Deep Blue tint + Whirlpool)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'rgba(0,0,50,0.5)', 'none'],
                [SEQUENCE_COMMANDS.VFX, 0, 'water_god_vortex', cx, cy, { life: 1500 }],
                [SEQUENCE_COMMANDS.SHADOW, 200, targetSelector, '#00BFFF', 1000],
                [SEQUENCE_COMMANDS.WAIT, 1500],

                // 2. TRIGGER (Cyan Flash)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, '#00FFFF', 'none'],
                [SEQUENCE_COMMANDS.WAIT, 100],

                // 3. RELEASE (Bubble Burst)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'rgba(30,144,255,0.6)', 'shake'],
                [SEQUENCE_COMMANDS.VFX, 0, 'water_god_burst', cx, cy, { life: 400 }],
                [SEQUENCE_COMMANDS.WAIT, 1400]
            ];
            break;

        case 'EARTH':
            // === PLANETARY DEVASTATION (3000ms) ===
            sequence = [
                // 1. TENSION (Brown rumble + Rocks rising)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'rgba(60,40,20,0.5)', 'rumble'],
                [SEQUENCE_COMMANDS.VFX, 0, 'earth_god_rumble', cx, cy, { life: 1200 }],
                [SEQUENCE_COMMANDS.WAIT, 1200],

                // 2. TRIGGER (Meteor Falls - Short wait for visual)
                [SEQUENCE_COMMANDS.VFX, 0, 'earth_god_impact', cx, cy, { life: 300 }],
                [SEQUENCE_COMMANDS.WAIT, 300],

                // 3. RELEASE (Heavy Impact)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, '#FFFFFF', 'shake'], // Blind
                [SEQUENCE_COMMANDS.WAIT, 50],
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 50, 'rgba(100,50,0,0.8)', 'shake'],
                [SEQUENCE_COMMANDS.VFX, 0, 'earth_god_shatter', cx, cy, { life: 400 }],
                [SEQUENCE_COMMANDS.SHADOW, 0, targetSelector, '#3E2723', 800],
                [SEQUENCE_COMMANDS.WAIT, 1400]
            ];
            break;

        case 'AIR':
            // === HEAVENLY VOID SLASH (3000ms) ===
            sequence = [
                // 1. TENSION (Invert Colors + Vacuum)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'invert', 'none'],
                [SEQUENCE_COMMANDS.VFX, 0, 'air_god_charge', cx, cy, { life: 1200 }],
                attackerSelector ? [SEQUENCE_COMMANDS.SHADOW, 0, attackerSelector, '#FFFFFF', 1000] : [SEQUENCE_COMMANDS.WAIT, 0],
                [SEQUENCE_COMMANDS.WAIT, 1200],

                // 2. THE CUT (Single line, silence)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'rgba(0,0,0,0.9)', 'none'], // Black screen
                [SEQUENCE_COMMANDS.VFX, 0, 'air_god_slice', cx, cy, { life: 200 }],
                [SEQUENCE_COMMANDS.WAIT, 200],

                // 3. RELEASE (1000 Cuts + White Flash)
                [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'white', 'shake'],
                [SEQUENCE_COMMANDS.VFX, 0, 'air_god_flurry', cx, cy, { life: 500 }],
                [SEQUENCE_COMMANDS.SHADOW, 0, targetSelector, '#E0FFFF', 500], // Displaced shadow
                [SEQUENCE_COMMANDS.WAIT, 1500]
            ];
            break;

        default:
            sequence = [[SEQUENCE_COMMANDS.WAIT, 100]];
    }

    await engine.runSequence(sequence);
}

window.playElementalAttack = playElementalAttack;
window.playElementalFinisher = playElementalFinisher;