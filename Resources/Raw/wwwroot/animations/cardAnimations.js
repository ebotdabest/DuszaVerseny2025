import { ArcaneFX, SEQUENCE_COMMANDS as CMD } from './ArcaneFX.js';

// Initialize ArcaneFX instance
const fx = new ArcaneFX();

// --- ANIMATION FUNCTIONS ---

/**
 * Animate an attack from attacker to target.
 * @param {string} attackerId - ID of the attacking card element.
 * @param {string} targetId - ID of the target card element.
 */
export function animateAttack(attackerId, targetId) {
    const attacker = document.getElementById(attackerId);
    const target = document.getElementById(targetId);

    if (!attacker || !target) return;

    const startRect = attacker.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // Calculate relative movement
    const deltaX = targetRect.left - startRect.left;
    const deltaY = targetRect.top - startRect.top;

    // Stop slightly before the target to simulate impact
    const impactX = deltaX * 0.8;
    const impactY = deltaY * 0.8;

    const sequence = [
        // 1. Wind up (pull back slightly)
        [CMD.ANIMATE, `#${attackerId}`, {
            move: { x: -impactX * 0.1, y: -impactY * 0.1 },
            duration: 200,
            easing: 'easeInExpo'
        }],
        [CMD.WAIT, 200],

        // 2. Lunge forward (attack)
        [CMD.ANIMATE, `#${attackerId}`, {
            move: { x: impactX, y: impactY },
            duration: 150,
            easing: 'easeOutElastic'
        }],

        // 3. Impact FX at target position (approximate center)
        [CMD.VFX, 350, 'dismantle_slash', targetRect.left + targetRect.width / 2, targetRect.top + targetRect.height / 2, { color: '#fff', size: 20 }],
        [CMD.IMPACT_FRAME, 350, 'rgba(255, 255, 255, 0.1)', 'shake'],

        // 4. Return to start
        [CMD.WAIT, 100],
        [CMD.ANIMATE, `#${attackerId}`, {
            move: { x: 0, y: 0 },
            duration: 300,
            easing: 'easeOutCubic'
        }]
    ];

    fx.runSequence(sequence);
}

/**
 * Animate damage taken by a target.
 * @param {string} targetId - ID of the target card element.
 */
export function animateDamage(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const sequence = [
        [CMD.ANIMATE, `#${targetId}`, {
            move: { x: 5, y: 0 },
            duration: 50,
            easing: 'linear'
        }],
        [CMD.VFX, 0, 'particle_storm', centerX, centerY, { color: '#ff2a6d', size: 2 }],
        [CMD.ANIMATE, `#${targetId}`, {
            move: { x: -5, y: 0 },
            duration: 50,
            easing: 'linear'
        }],
        [CMD.ANIMATE, `#${targetId}`, {
            move: { x: 0, y: 0 },
            duration: 50,
            easing: 'linear'
        }]
    ];

    fx.runSequence(sequence);
}

/**
 * Animate death of a card.
 * @param {string} targetId - ID of the dying card element.
 */
export function animateDeath(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const sequence = [
        [CMD.VFX, 0, 'black_hole_core', centerX, centerY, { size: 10, life: 500 }],
        [CMD.ANIMATE, `#${targetId}`, {
            scale: 0,
            opacity: 0,
            duration: 500,
            easing: 'easeInExpo'
        }],
        [CMD.WAIT, 500],
        // Ensure element is hidden after animation
        [CMD.ANIMATE, `#${targetId}`, {
            opacity: 0,
            duration: 10,
            onComplete: () => { target.style.display = 'none'; }
        }]
    ];

    fx.runSequence(sequence);
}

/**
 * Animate drawing a card (appearance).
 * @param {string} cardId - ID of the card element.
 */
export function animateDraw(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;

    // Reset state first
    card.style.opacity = '0';
    card.style.transform = 'scale(0.5) translateY(50px)';
    card.style.display = 'flex'; // Ensure it's visible for animation

    const sequence = [
        [CMD.ANIMATE, `#${cardId}`, {
            scale: 1,
            opacity: 1,
            move: { x: 0, y: 0 }, // Reset translation
            duration: 400,
            easing: 'easeOutCubic'
        }]
    ];

    fx.runSequence(sequence);
}

// --- EXPOSE TO WINDOW ---
window.animateAttack = animateAttack;
window.animateDamage = animateDamage;
window.animateDeath = animateDeath;
window.animateDraw = animateDraw;
