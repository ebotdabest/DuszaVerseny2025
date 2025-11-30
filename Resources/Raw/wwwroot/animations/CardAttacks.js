import { ArcaneFX, SEQUENCE_COMMANDS } from './ArcaneFX.js';

// =============================================================================
// REGISTER CARD EFFECTS
// =============================================================================
function registerCardEffects(arcaneEngine) {
    // HEAL: Green bubbles rising
    arcaneEngine.registerEffect('heal_bubbles', (instance) => {
        // Central soft glow
        instance.spawn({
            life: 60, color: '#00FF00', size: 30, alpha: 0.3,
            behavior: p => { p.size *= 1.02; p.alpha -= 0.005; }
        });

        // Rising bubbles emitter
        instance.emitter = () => {
            if (Math.random() > 0.3) return;
            instance.spawn({
                x: (Math.random() - 0.5) * 60,
                y: (Math.random() - 0.5) * 60,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -1 - Math.random() * 2,
                life: 40, color: '#32CD32', size: 4 + Math.random() * 6,
                alpha: 0.8,
                behavior: p => { p.y += p.vy; p.x += p.vx; p.alpha -= 0.02; }
            });
        };
    });

    // SLASH: Diagonal cut
    arcaneEngine.registerEffect('slash_cut', (instance) => {
        // The main cut line
        instance.spawn({
            x: 0, y: 0,
            vx: 0, vy: 0,
            life: 15, color: '#FFFFFF', size: 3, length: 120, width: 4,
            type: 'line', rotation: -0.785, // -45 degrees (top-left to bottom-right visual)
            behavior: p => { p.alpha = p.life / 15; p.width *= 0.9; }
        });

        // Impact particles
        for (let i = 0; i < 8; i++) {
            instance.spawn({
                x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                life: 20, color: '#E0FFFF', size: 2, shrink: true
            });
        }
    });

    // SHIELD: Blue bubble appearing and disappearing
    arcaneEngine.registerEffect('shield_bubble', (instance) => {
        // Expanding bubble
        instance.spawn({
            life: 40, color: 'rgba(0, 191, 255, 0.3)', size: 10,
            behavior: p => {
                if (p.life > 30) p.size += 4; // Expand
                else if (p.life < 10) p.alpha -= 0.1; // Fade out
            }
        });
        // Border/Ring
        instance.spawn({
            life: 40, color: 'rgba(0, 191, 255, 0.8)', size: 10, type: 'circle',
            width: 2,
            behavior: p => {
                if (p.life > 30) p.size += 4;
                else if (p.life < 10) p.alpha -= 0.1;
            }
        });
    });

    // PROJECTILE: Red bubble
    arcaneEngine.registerEffect('red_orb', (instance) => {
        // Core orb
        instance.spawn({
            life: 100, color: '#FF0000', size: 15,
            behavior: p => { p.size = 15 + Math.sin(Date.now() / 50) * 2; }
        });
        // Trail emitter
        instance.emitter = () => {
            instance.spawn({
                x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5,
                vx: (Math.random() - 0.5), vy: (Math.random() - 0.5),
                life: 15, color: '#FF4500', size: 6, shrink: true
            });
        };
    });
}

// =============================================================================
// HELPERS
// =============================================================================

function ensureEngine() {
    if (!window.arcaneEngine) {
        window.arcaneEngine = new ArcaneFX();
    }
    // Register effects (safe to call multiple times as it overwrites map keys)
    registerCardEffects(window.arcaneEngine);
    return window.arcaneEngine;
}

function getCardCenter(isPlayer) {
    const id = isPlayer ? 'arenaPlayerCard' : 'arenaEnemyCard';
    const el = document.getElementById(id);
    if (!el) {
        // Fallback if card not found (e.g. testing)
        return { x: window.innerWidth / 2, y: window.innerHeight / 2, id: null };
    }
    const rect = el.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        id: id
    };
}

// =============================================================================
// EXPORTED ANIMATIONS
// =============================================================================

/**
 * Green bubbles appear around a card.
 * @param {boolean} isPlayer - True for player card, false for enemy card.
 */
export async function healAnimation(isPlayer) {
    const engine = ensureEngine();
    const { x, y, id } = getCardCenter(isPlayer);

    const sequence = [
        [SEQUENCE_COMMANDS.VFX, 0, 'heal_bubbles', x, y, { life: 60 }],
        id ? [SEQUENCE_COMMANDS.SHADOW, 0, `#${id}`, '#00FF00', 600] : [SEQUENCE_COMMANDS.WAIT, 0],
        [SEQUENCE_COMMANDS.WAIT, 600]
    ];
    await engine.runSequence(sequence);
}

/**
 * Slash effect on the card.
 * @param {boolean} isPlayer - True for player card, false for enemy card.
 */
export async function slashAnimation(isPlayer) {
    const engine = ensureEngine();
    const { x, y } = getCardCenter(isPlayer);

    const sequence = [
        [SEQUENCE_COMMANDS.VFX, 0, 'slash_cut', x, y, { life: 20 }],
        [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'rgba(255,255,255,0.1)', 'shake'],
        [SEQUENCE_COMMANDS.WAIT, 300]
    ];
    await engine.runSequence(sequence);
}

/**
 * Blue bubble appears then disappears.
 * @param {boolean} isPlayer - True for player card, false for enemy card.
 */
export async function blueBubbleAnimation(isPlayer) {
    const engine = ensureEngine();
    const { x, y } = getCardCenter(isPlayer);

    const sequence = [
        [SEQUENCE_COMMANDS.VFX, 0, 'shield_bubble', x, y, { life: 40 }],
        [SEQUENCE_COMMANDS.WAIT, 400]
    ];
    await engine.runSequence(sequence);
}

/**
 * Red bubble appears on top of the card and moves to the center of the opposite card.
 * @param {boolean} isPlayer - True: Start at Player -> Move to Enemy. False: Start at Enemy -> Move to Player.
 */
export async function redBubbleProjectileAnimation(isPlayer) {
    const engine = ensureEngine();
    const start = getCardCenter(isPlayer);
    const end = getCardCenter(!isPlayer);

    const sequence = [
        // Spawn red orb at start
        [SEQUENCE_COMMANDS.VFX, 0, 'red_orb', start.x, start.y, { life: 100 }, 'red_proj'],
        // Move to end
        [SEQUENCE_COMMANDS.MOVE_VFX, 0, 'red_proj', end.x, end.y, 400],
        [SEQUENCE_COMMANDS.WAIT, 400],
        // Clear orb
        [SEQUENCE_COMMANDS.CLEAR_VFX, 0, 'red_proj'],
        // Impact
        [SEQUENCE_COMMANDS.IMPACT_FRAME, 0, 'rgba(255,0,0,0.2)', 'shake'],
        [SEQUENCE_COMMANDS.WAIT, 200]
    ];
    await engine.runSequence(sequence);
}

// Expose globally
window.healAnimation = healAnimation;
window.slashAnimation = slashAnimation;
window.blueBubbleAnimation = blueBubbleAnimation;
window.redBubbleProjectileAnimation = redBubbleProjectileAnimation;
