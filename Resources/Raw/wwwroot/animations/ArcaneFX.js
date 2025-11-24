/**
 * ArcaneFX.js - Ultimate VFX system
 * Version: 9.0.0
 */

// ============================================================================
// SEQUENCE COMMANDS
// ============================================================================
export const SEQUENCE_COMMANDS = {
        VFX: 'VFX', // [COMMAND, delay, name, x, y, options, STORAGE_KEY]
        IMPACT_FRAME: 'IMPACT_FRAME',
        WAIT: 'WAIT',
        SHADOW: 'SHADOW',
        ANIMATE: 'ANIMATE', // HTML Animation
        PHYSICS: 'PHYSICS', // HTML Physics
        MOVE_VFX: 'MOVE_VFX', // [COMMAND, delay, effectId, targetX, targetY, duration_ms]
        CLEAR_VFX: 'CLEAR_VFX' // [COMMAND, delay, effectId]
};

// ============================================================================
// CORE ENGINE
// ============================================================================
export class ArcaneFX {
        constructor() {
                this.effects = new Map(); // Global Generators
                this.activeGlobalEffects = new Map(); // Running Instances
                this.activeSequences = [];
                this.animations = new Map();
                this.physicsObjects = new Map();

                this.canvas = null;
                this.ctx = null;
                this.overlay = null;
                this.shadowContainer = null;

                this.viewport = { width: window.innerWidth, height: window.innerHeight };
                this.dpr = window.devicePixelRatio || 1;

                this.init();
        }

        init() {
                document.querySelectorAll('.arcanefx-layer').forEach(el => el.remove());

                // Overlay (Z-Index 999999)
                this.overlay = document.createElement('div');
                this.overlay.className = 'arcanefx-layer arcanefx-overlay';
                Object.assign(this.overlay.style, {
                        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                        pointerEvents: 'none', zIndex: '999999',
                        backgroundColor: 'transparent', transition: 'background-color 0.05s',
                        mixBlendMode: 'normal'
                });
                document.body.appendChild(this.overlay);

                // Canvas (Z-Index 999998)
                this.canvas = document.createElement('canvas');
                this.canvas.className = 'arcanefx-layer arcanefx-canvas';
                Object.assign(this.canvas.style, {
                        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                        pointerEvents: 'none', zIndex: '999998'
                });
                this.ctx = this.canvas.getContext('2d');
                document.body.appendChild(this.canvas);

                // Shadow Layer (Z-Index 999990)
                this.shadowContainer = document.createElement('div');
                this.shadowContainer.className = 'arcanefx-layer arcanefx-shadows';
                Object.assign(this.shadowContainer.style, {
                        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                        pointerEvents: 'none', zIndex: '999990'
                });
                document.body.appendChild(this.shadowContainer);

                this.updateCanvasSize();
                window.addEventListener('resize', () => this.updateCanvasSize());
                this._injectCSS();
                this._loop();
        }

        _injectCSS() {
                if (document.getElementById('arcanefx-style')) return;
                const style = document.createElement('style');
                style.id = 'arcanefx-style';
                style.innerHTML = `
            @keyframes arcanefx-shake {
                0% { transform: translate(2px, 2px) rotate(0deg); }
                30% { transform: translate(4px, 3px) rotate(1deg); }
                70% { transform: translate(2px, -2px) rotate(-1deg); }
                100% { transform: translate(0, 0) rotate(0deg); }
            }
            @keyframes arcanefx-rumble { 0% { transform: translate(0,0); } 25% { transform: translate(1px, 1px); } 75% { transform: translate(-1px, 1px); } }
            @keyframes arcanefx-chromatic { 0% { text-shadow: 2px 0 #f0f, -2px 0 #0ff; } 50% { text-shadow: -2px 0 #f0f, 2px 0 #0ff; } }
            .arcanefx-shadow-clone { will-change: transform, opacity; }
        `;
                document.head.appendChild(style);
        }

        updateCanvasSize() {
                this.dpr = window.devicePixelRatio || 1;
                this.viewport = { width: window.innerWidth, height: window.innerHeight };
                this.canvas.width = this.viewport.width * this.dpr;
                this.canvas.height = this.viewport.height * this.dpr;
                this.ctx.scale(this.dpr, this.dpr);
        }

        // --- PHYSICS SYSTEM ---
        applyPhysics(selector, params) {
                document.querySelectorAll(selector).forEach(el => {
                        let pObj = this.physicsObjects.get(el);
                        if (!pObj) {
                                pObj = {
                                        el: el, vx: 0, vy: 0, vr: 0, friction: 0.95, gravity: 0, x: 0, y: 0, r: 0
                                };
                                const style = window.getComputedStyle(el);
                                if (style.position === 'static') el.style.position = 'relative';
                        }
                        if (params.vx !== undefined) pObj.vx = params.vx;
                        if (params.vy !== undefined) pObj.vy = params.vy;
                        if (params.vr !== undefined) pObj.vr = params.vr;
                        if (params.friction !== undefined) pObj.friction = params.friction;
                        if (params.gravity !== undefined) pObj.gravity = params.gravity;
                        if (params.reset) {
                                pObj.vx = 0; pObj.vy = 0; pObj.vr = 0; pObj.x = 0; pObj.y = 0; pObj.r = 0;
                                el.style.transform = '';
                        }
                        this.physicsObjects.set(el, pObj);
                });
        }

        // --- SHADOW SYSTEM ---
        createShadows(selector, color, duration_ms = 500) {
                const targets = document.querySelectorAll(selector);
                targets.forEach(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.width === 0 || rect.height === 0) return;
                        const clone = el.cloneNode(false);
                        clone.className = (el.className || '') + ' arcanefx-shadow-clone';
                        Object.assign(clone.style, {
                                position: 'absolute', top: `${rect.top}px`, left: `${rect.left}px`,
                                width: `${rect.width}px`, height: `${rect.height}px`, margin: '0',
                                transform: window.getComputedStyle(el).transform,
                                borderRadius: window.getComputedStyle(el).borderRadius, zIndex: '999990', pointerEvents: 'none',
                                backgroundColor: color, borderColor: color, boxShadow: `0 0 15px ${color}`, opacity: '0.7',
                                transition: `all ${duration_ms}ms cubic-bezier(0.1, 0.7, 1.0, 0.1)`
                        });
                        this.shadowContainer.appendChild(clone);
                        requestAnimationFrame(() => {
                                clone.style.transform = `${clone.style.transform} scale(1.1)`;
                                clone.style.opacity = '0';
                                clone.style.filter = 'blur(4px)';
                        });
                        setTimeout(() => clone.remove(), duration_ms);
                });
        }

        // --- SPAWNING ---
        registerEffect(name, generatorFn) {
                this.effects.set(name, generatorFn);
        }

        spawn(name, targetOrX, y, options = {}) {
                if (targetOrX instanceof HTMLElement) return this._spawnLocal(name, targetOrX, y || {});
                return this._spawnGlobal(name, targetOrX ?? '50%', y ?? '50%', options);
        }

        _spawnGlobal(name, x, y, opts) {
                const generator = this.effects.get(name);
                if (!generator) return null;
                const parse = (v, max) => (typeof v === 'string' && v.includes('%')) ? (parseFloat(v) / 100) * max : parseFloat(v) || max / 2;
                const instance = new EffectInstance(this.ctx, this.viewport.width, this.viewport.height, null, parse(x, this.viewport.width), parse(y, this.viewport.height), opts);
                generator(instance);
                this.activeGlobalEffects.set(instance.id, instance);
                return instance.id; // Return ID for manipulation
        }

        _spawnLocal(name, element, opts) {
                const generator = this.effects.get(name);
                if (!generator) return;
                const container = document.createElement('div');
                Object.assign(container.style, {
                        position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                        pointerEvents: 'none', overflow: 'hidden', zIndex: '10',
                        borderRadius: window.getComputedStyle(element).borderRadius
                });
                if (window.getComputedStyle(element).position === 'static') element.style.position = 'relative';
                element.appendChild(container);
                const canvas = document.createElement('canvas');
                canvas.width = element.offsetWidth; canvas.height = element.offsetHeight;
                Object.assign(canvas.style, { width: '100%', height: '100%' });
                container.appendChild(canvas);
                const ctx = canvas.getContext('2d');
                const instance = new EffectInstance(ctx, canvas.width, canvas.height, container, canvas.width / 2, canvas.height / 2, opts);
                generator(instance);
                instance.startLocalLoop();
                return instance;
        }

        // --- ANIMATION & UTILS ---
        async runSequence(sequence, x, y) {
                const runner = new SequenceRunner(this, sequence, x, y);
                this.activeSequences.push(runner);

                // execute sequence
                await runner.execute();

                // After the sequence steps finish, wait for active visual effects to drain so the showcase truly ends
                const maxWait = 10000; // ms - safety cap
                const poll = 80; // ms
                const start = Date.now();
                while (this.activeGlobalEffects.size > 0 && (Date.now() - start) < maxWait) {
                        await new Promise(r => setTimeout(r, poll));
                }
                // tiny grace period for final fades
                await new Promise(r => setTimeout(r, 60));
                this.activeSequences = this.activeSequences.filter(r => r !== runner);
        }

        applyHtmlFx(type, duration_ms) {
                const body = document.body;
                requestAnimationFrame(() => {
                        switch (type) {
                                case 'shake': body.style.animation = `arcanefx-shake 0.1s infinite`; break;
                                case 'rumble': body.style.animation = `arcanefx-rumble 0.05s infinite`; break;
                                case 'chromatic': body.style.animation = `arcanefx-chromatic 0.1s infinite`; body.style.filter = 'contrast(1.2) saturate(1.2)'; break;
                                case 'blur': body.style.transition = `filter ${duration_ms}ms`; body.style.filter = 'blur(8px) brightness(1.5)'; break;
                                case 'invert': body.style.filter = 'invert(1)'; break;
                                case 'contrast': body.style.transition = 'filter 0.1s'; body.style.filter = 'grayscale(100%) contrast(300%) brightness(0.8)'; break;
                                case 'zoom': body.style.transition = `transform ${duration_ms}ms ease-in`; body.style.transform = 'scale(1.05)'; break;
                        }
                        setTimeout(() => {
                                body.style.filter = ''; body.style.animation = ''; body.style.transform = '';
                        }, duration_ms);
                });
        }

        animateHTML(element, options) {
                const anim = new HTMLAnimation(element, options, this);
                anim.start();
                return anim;
        }

        _startAnimationLoop() {
                if (this._animationLoopRunning) return;
                this._animationLoopRunning = true;
                const loop = () => {
                        if (this.animations.size === 0) { this._animationLoopRunning = false; return; }
                        this.animations.forEach((anim, id) => {
                                anim.update();
                                if (anim.completed) this.animations.delete(id);
                        });
                        if (this._animationLoopRunning) requestAnimationFrame(loop);
                };
                requestAnimationFrame(loop);
        }

        _loop() {
                const animate = () => {
                        this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
                        this.ctx.globalCompositeOperation = 'lighter';

                        // 1. Render VFX
                        this.activeGlobalEffects.forEach((eff, id) => {
                                if (eff.update()) eff.render(this.ctx);
                                else this.activeGlobalEffects.delete(id);
                        });

                        // 2. Physics
                        this.ctx.globalCompositeOperation = 'source-over';
                        this.physicsObjects.forEach((obj, el) => {
                                obj.vx *= obj.friction; obj.vy *= obj.friction; obj.vr *= obj.friction; obj.vy += obj.gravity;
                                obj.x += obj.vx; obj.y += obj.vy; obj.r += obj.vr;
                                if (Math.abs(obj.vx) > 0.01 || Math.abs(obj.vy) > 0.01 || Math.abs(obj.vr) > 0.01 || obj.gravity !== 0) {
                                        el.style.transform = `translate(${obj.x}px, ${obj.y}px) rotate(${obj.r}deg)`;
                                }
                        });
                        requestAnimationFrame(animate);
                };
                animate();
        }
}

// ============================================================================
// SEQUENCE RUNNER
// ============================================================================

/**
 * Smart converter:
 * - Converts absolute timestamps -> relative delays
 * - Injects life for long-lived VFX
 * - If a VFX is stored with a storageKey (e.g. 'purple') we compute its last referenced time
 *   (MOVE_VFX / CLEAR_VFX / any other ref) and set life = (lastRefTime - createTime) + margin
 */
export function convertAbsoluteSequence(sequence, opts = {}) {
        const { warn = true, defaultVFXLife = 200, marginMs = 100 } = opts;
        const supportedCommands = new Set(Object.values(SEQUENCE_COMMANDS));
        const longLivedVFX = new Set([
                'blue_orb', 'red_orb', 'purple_orb', 'purple_beam', 'black_hole_core'
        ]);

        // First pass: gather last reference time for each storageKey
        const lastRef = {}; // storageKey -> lastAbsoluteTime
        for (const step of sequence) {
                if (!Array.isArray(step) || step.length < 2) continue;
                const [cmd, absTime, ...args] = step;

                // Look for MOVE_VFX / CLEAR_VFX that reference storage keys
                if (cmd === SEQUENCE_COMMANDS.MOVE_VFX || cmd === SEQUENCE_COMMANDS.CLEAR_VFX) {
                        const key = args[0];
                        if (typeof key === 'string' && key.length > 0) {
                                lastRef[key] = Math.max(lastRef[key] || 0, absTime);
                        }
                }

                // Also check for any other command that might reference a storage key in arg positions
                // (extend here if you add commands that reference stored keys)
        }

        // Second pass: convert absolute -> relative, and set life intelligently
        let lastTime = 0;
        const relativeSeq = [];

        for (const step of sequence) {
                if (!Array.isArray(step) || step.length < 2) {
                        warn && console.warn(`⚠️ Skipping invalid step:`, step);
                        continue;
                }

                let [cmd, absTime, ...args] = step;

                if (!supportedCommands.has(cmd)) {
                        warn && console.warn(`⚠️ Skipping unsupported command:`, cmd, step);
                        continue;
                }

                const relDelay = Math.max(0, absTime - lastTime);
                lastTime = absTime;

                // VFX sanitization + smart life injection
                if (cmd === SEQUENCE_COMMANDS.VFX) {
                        const name = args[0];
                        // args expected: [name, x, y, opts, storageKey]
                        let optsArg = args[3];
                        const storageKey = args[4];

                        if (!optsArg || typeof optsArg !== 'object') {
                                optsArg = {};
                                args[3] = optsArg;
                        }

                        // If the effect is considered long-lived and life not set:
                        if (longLivedVFX.has(name) && optsArg.life === undefined) {
                                // If it has a storageKey and we found a future lastRef, compute required life
                                if (storageKey && lastRef[storageKey]) {
                                        const required = (lastRef[storageKey] - absTime) + marginMs;
                                        optsArg.life = Math.max(required, defaultVFXLife);
                                        warn && console.log(`🔧 Injected computed life for '${name}' (key='${storageKey}'): ${optsArg.life}ms`);
                                } else {
                                        // No storage key (or no future references found) — apply default
                                        optsArg.life = defaultVFXLife;
                                        warn && console.log(`🔧 Injected default life: ${name} → ${defaultVFXLife}`);
                                }
                        }
                }

                relativeSeq.push([cmd, relDelay, ...args]);
        }

        if (warn) console.log(`✅ Converted ${sequence.length} → ${relativeSeq.length} steps. Max time: ${lastTime}ms`);
        return relativeSeq;
}


// --- small helper sleep function used by WAIT and other potential async needs
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class SequenceRunner {
        constructor(engine, seq, tx, ty) {
                this.engine = engine;
                this.sequence = seq;
                this.storedEffectIds = {}; // Store VFX IDs to move/clear them later

                const parse = (v, max) => (
                        typeof v === 'string' && v.includes('%')
                                ? (parseFloat(v) / 100) * max
                                : (parseFloat(v) || max / 2)
                );

                this.tx = parse(tx || '50%', engine.viewport.width);
                this.ty = parse(ty || '50%', engine.viewport.height);
        }

        async execute() {
                for (const step of this.sequence) {
                        const [cmd, delay, ...args] = step;
                        if (delay > 0) {
                                await new Promise(r => setTimeout(r, delay));
                        }

                        // Then execute command
                        switch (cmd) {
                                case SEQUENCE_COMMANDS.VFX: {
                                        // [VFX, delay, name, x, y, opts, STORAGE_KEY]
                                        const name = args[0];
                                        const x = args[1] || this.tx;
                                        const y = args[2] || this.ty;
                                        const opts = args[3] || {};
                                        const storageKey = args[4]; // optional

                                        const fxId = this.engine.spawn(name, x, y, opts);
                                        if (storageKey) {
                                                this.storedEffectIds[storageKey] = fxId;
                                                console.log(`✅ VFX '${name}' stored as '${storageKey}' → ID: ${fxId}`);
                                        }
                                        break;
                                }

                                case SEQUENCE_COMMANDS.MOVE_VFX: {
                                        // [MOVE_VFX, delay, STORAGE_KEY, tx, ty, duration]
                                        const storageKey = args[0];
                                        const instanceId = this.storedEffectIds[storageKey];

                                        if (!instanceId) {
                                                console.warn(
                                                        `⚠️ MOVE_VFX failed: No ID stored for key '${storageKey}'. Known keys:`,
                                                        Object.keys(this.storedEffectIds)
                                                );
                                                break;
                                        }

                                        const instance = this.engine.activeGlobalEffects.get(instanceId);
                                        if (!instance) {
                                                console.warn(
                                                        `⚠️ MOVE_VFX failed: Instance not found for key '${storageKey}' (ID: ${instanceId}). Active IDs:`,
                                                        Array.from(this.engine.activeGlobalEffects.keys())
                                                );
                                                break;
                                        }

                                        const parse = (v, max) => (
                                                typeof v === 'string' && v.includes('%')
                                                        ? (parseFloat(v) / 100) * max
                                                        : parseFloat(v)
                                        );

                                        const tx = parse(args[1], this.engine.viewport.width);
                                        const ty = parse(args[2], this.engine.viewport.height);
                                        const duration = args[3] || 300;

                                        instance.moveTo(tx, ty, duration);
                                        console.log(`➡️ MOVE_VFX: '${storageKey}' → (${tx.toFixed(0)}, ${ty.toFixed(0)}) in ${duration}ms`);
                                        break;
                                }

                                case SEQUENCE_COMMANDS.CLEAR_VFX: {
                                        // [CLEAR_VFX, delay, STORAGE_KEY]
                                        const storageKey = args[0];
                                        const killId = this.storedEffectIds[storageKey];

                                        if (!killId) {
                                                console.warn(`⚠️ CLEAR_VFX: No ID for key '${storageKey}'`);
                                                break;
                                        }

                                        const instance = this.engine.activeGlobalEffects.get(killId);
                                        if (instance) {
                                                console.log(`🗑️ CLEAR_VFX: Killing '${storageKey}' (ID: ${killId})`);
                                                instance.life = 0; // kill in next update
                                        } else {
                                                console.warn(`⚠️ CLEAR_VFX: Instance '${storageKey}' (ID: ${killId}) already gone.`);
                                        }
                                        break;
                                }

                                case SEQUENCE_COMMANDS.IMPACT_FRAME: {
                                        // [IMPACT_FRAME, delay, bgColor, fxType]
                                        const bgColor = args[0];
                                        const fxType = args[1];

                                        if (fxType && fxType !== 'none') {
                                                this.engine.applyHtmlFx(fxType, delay || 100);
                                        }

                                        if (bgColor) {
                                                this.engine.overlay.style.backgroundColor = bgColor;
                                                this.engine.overlay.style.mixBlendMode =
                                                        bgColor === 'contrast' ? 'exclusion' : 'normal';
                                        }

                                        if (delay > 0 && bgColor && !['transparent', 'contrast'].includes(bgColor)) {
                                                setTimeout(() => {
                                                        if (this.engine.overlay.style.backgroundColor === bgColor) {
                                                                this.engine.overlay.style.backgroundColor = 'transparent';
                                                        }
                                                }, delay);
                                        }
                                        break;
                                }

                                case SEQUENCE_COMMANDS.SHADOW:
                                        this.engine.createShadows(args[0], args[1], args[2] || 500);
                                        break;

                                case SEQUENCE_COMMANDS.ANIMATE:
                                        document.querySelectorAll(args[0]).forEach(el =>
                                                this.engine.animateHTML(el, args[1])
                                        );
                                        break;

                                case SEQUENCE_COMMANDS.PHYSICS:
                                        this.engine.applyPhysics(args[0], args[1]);
                                        break;

                                // -----------------------------
                                // WAIT: pause execution for <ms> milliseconds.
                                // Usage (absolute sequence): [CMD.WAIT, <absTime>, <ms>]
                                // convertAbsoluteSequence -> [CMD.WAIT, <relDelay>, <ms>]
                                // -----------------------------
                                case SEQUENCE_COMMANDS.WAIT: {
                                        const ms = args[0] || 0;
                                        if (typeof ms !== 'number') {
                                                console.warn(`⚠️ WAIT expects a numeric ms, got:`, ms);
                                                break;
                                        }
                                        // pause the sequence for ms
                                        await sleep(ms);
                                        break;
                                }

                                default:
                                        console.warn(`⚠️ Unknown command:`, cmd);
                                        break;
                        }
                }

                // Cleanup
                this.engine.overlay.style.backgroundColor = 'transparent';
                this.engine.overlay.style.mixBlendMode = 'normal';
        }
}

// ============================================================================
// EFFECT INSTANCE (VFX Lifecycle)
// ============================================================================

class EffectInstance {
        constructor(ctx, w, h, container, x, y, opts) {
                this.ctx = ctx;
                this.w = w;
                this.h = h;
                this.container = container;
                this.x = x;
                this.y = y;
                this.options = opts || {};
                this.particles = [];
                // ✅ Respect opts.life — critical for long-lived orbs!
                this.life = opts?.life ?? 100;
                this.id = Math.random().toString(36).substring(2, 10); // shorter, safer ID
                this.emitter = null;
                this.moveTarget = null;
        }
        spawn(p) {
                this.particles.push({
                        x: this.x + (p.x || 0), y: this.y + (p.y || 0),
                        vx: p.vx || 0, vy: p.vy || 0, life: p.life || 60, maxLife: p.life || 60,
                        size: p.size || 5, color: p.color || '#fff', gravity: p.gravity || 0,
                        shrink: p.shrink, type: p.type || 'circle', length: p.length, width: p.width,
                        points: p.points, rotation: p.rotation || 0, behavior: p.behavior
                });
        }
        moveTo(tx, ty, duration) {
                this.moveTarget = {
                        sx: this.x, sy: this.y, tx: tx, ty: ty,
                        startTime: performance.now(), duration: duration
                };
        }
        update() {
                // Handle Movement
                if (this.moveTarget) {
                        const now = performance.now();
                        const elapsed = now - this.moveTarget.startTime;
                        const t = Math.min(elapsed / this.moveTarget.duration, 1);
                        // EaseInOutQuad
                        const ease = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                        this.x = this.moveTarget.sx + (this.moveTarget.tx - this.moveTarget.sx) * ease;
                        this.y = this.moveTarget.sy + (this.moveTarget.ty - this.moveTarget.sy) * ease;
                        if (t >= 1) {
                                this.moveTarget = null;
                                this._justMoved = 10;
                        }
                }

                this.life--; if (this.container) this.ctx.clearRect(0, 0, this.w, this.h);
                if (this.emitter && this.life > 0) this.emitter();
                this.particles = this.particles.filter(p => p.life > 0);
                this.particles.forEach(p => {
                        if (p.behavior) p.behavior(p); else { p.x += p.vx; p.y += p.vy; p.vy += p.gravity; }
                        p.life--; if (p.shrink) p.size *= 0.9;
                });
                if (this.container && this.life <= -100 && this.particles.length === 0) return false;
                const stillMoving = this.moveTarget !== null || (this._justMoved && (this._justMoved-- > 0));
                return this.particles.length > 0 || this.life > 0 || stillMoving;
        }
        render(ctx) {
                this.particles.forEach(p => {
                        ctx.fillStyle = p.color; ctx.strokeStyle = p.color; ctx.globalAlpha = p.life / p.maxLife; ctx.lineWidth = p.width || 1;
                        ctx.beginPath();
                        if (p.type === 'line') {
                                const a = p.rotation || Math.atan2(p.vy, p.vx);
                                ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(a) * (p.length || 10), p.y - Math.sin(a) * (p.length || 10)); ctx.stroke();
                        } else if (p.type === 'lightning') {
                                ctx.moveTo(p.x, p.y);
                                let cx = p.x, cy = p.y;
                                for (let i = 0; i < p.points; i++) { cx += (Math.random() - 0.5) * 20; cy += (Math.random() - 0.5) * 20; ctx.lineTo(cx, cy); } ctx.stroke();
                        } else if (p.type === 'triangle') {
                                ctx.moveTo(p.x, p.y - p.size); ctx.lineTo(p.x + p.size, p.y + p.size); ctx.lineTo(p.x - p.size, p.y + p.size); ctx.fill();
                        } else {
                                ctx.arc(p.x, p.y, Math.max(0, p.size), 0, 6.28); ctx.fill();
                        }
                });
        }
        startLocalLoop() {
                const loop = () => { if (this.update()) { this.render(this.ctx); requestAnimationFrame(loop); } else { this.container.remove(); } };
                loop();
        }
}
class HTMLAnimation {
        constructor(e, o, g) { this.e = e; this.o = o; this.g = g; this.i = Math.random(); this.st = 0; this.d = o.duration || 1000; this.ea = o.easing || 'easeOutCubic'; this.in = this._gs(); this.r = false; }
        _gs() { const s = window.getComputedStyle(this.e); return { o: parseFloat(s.opacity), t: s.transform }; }
        start() { this.st = performance.now(); this.r = true; this.g.animations.set(this.i, this); this.g._startAnimationLoop(); }
        update() { if (!this.r) return; const el = performance.now() - this.st; let p = Math.min(el / this.d, 1); const es = { linear: t => t, easeOutCubic: t => (--t) * t * t + 1, easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10), easeOutElastic: t => { const c = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1 } }; const t = (es[this.ea] || es.easeOutCubic)(p); const tf = []; if (this.o.move) tf.push(`translate(${this.o.move.x * t}px,${this.o.move.y * t}px)`); if (this.o.scale) tf.push(`scale(${1 + (parseFloat(this.o.scale) / 100 - 1) * t})`); if (this.o.rotate) tf.push(`rotate(${this.o.rotate * t}deg)`); this.e.style.transform = `${this.in.t === 'none' ? '' : this.in.t} ${tf.join(' ')}`; if (this.o.opacity !== undefined) this.e.style.opacity = this.in.o + (this.o.opacity - this.in.o) * t; if (p >= 1) { this.r = false; this.c = true; if (this.o.onComplete) this.o.onComplete(); } }
}
