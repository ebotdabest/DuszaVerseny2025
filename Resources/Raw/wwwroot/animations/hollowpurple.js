import { ArcaneFX, SEQUENCE_COMMANDS as CMD, convertAbsoluteSequence } from './ArcaneFX.js';

const fx = new ArcaneFX();

// BLUE ORB - LAPSE: BLUE (Maximum Attraction)
fx.registerEffect('blue_orb', function (inst) {
    inst.emitter = function () {
        // Core orb glow - Unstable Blue
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 40;
            inst.spawn({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                vx: 0, vy: 0,
                life: 10,
                size: 30 + Math.random() * 20,
                color: '#00d4ff'
            });
        }
        // DEBRIS SUCTION - The world being pulled in
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 400 + Math.random() * 400;
            const speed = 25 + Math.random() * 10;
            inst.spawn({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                vx: -Math.cos(angle) * speed,
                vy: -Math.sin(angle) * speed,
                life: 40,
                size: 4 + Math.random() * 8,
                color: Math.random() > 0.5 ? '#00d4ff' : '#ffffff',
                length: 40, width: 2, type: 'line', // Speed lines
                rotation: angle
            });
        }
        // Orbiting debris
        for (let i = 0; i < 5; i++) {
            const angle = (inst.life * 0.1) + (i * Math.PI * 2 / 5);
            const r = 100 + Math.sin(inst.life * 0.2) * 20;
            inst.spawn({
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r,
                vx: 0, vy: 0,
                life: 5, size: 8, color: '#fff'
            });
        }
    };
});

// RED ORB - REVERSAL: RED (Maximum Repulsion)
fx.registerEffect('red_orb', function (inst) {
    inst.emitter = function () {
        // Core orb glow - Violent Red
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 40;
            inst.spawn({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                vx: 0, vy: 0,
                life: 10,
                size: 30 + Math.random() * 20,
                color: '#ff1744'
            });
        }
        // SHOCKWAVE REPULSION - Blasting everything away
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 15;
            inst.spawn({
                x: 0, y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 40,
                size: 5 + Math.random() * 10,
                color: Math.random() > 0.5 ? '#ff1744' : '#000000',
                length: 30, width: 3, type: 'line',
                rotation: angle
            });
        }
        // Gravity distortion rings
        if (inst.life % 5 === 0) {
            inst.spawn({
                x: 0, y: 0, vx: 0, vy: 0,
                life: 20, size: 10, color: '#ff1744',
                type: 'ring', // Conceptual, using particles for now
                behavior: (p) => {
                    p.size += 5;
                    p.life--;
                }
            });
        }
    };
});

// PURPLE ORB - HOLLOW PURPLE (Imaginary Mass)
fx.registerEffect('purple_orb', function (inst) {
    inst.emitter = function () {
        // The Singularity
        for (let i = 0; i < 10; i++) {
            inst.spawn({
                x: (Math.random() - 0.5) * 40,
                y: (Math.random() - 0.5) * 40,
                vx: 0, vy: 0,
                life: 5,
                size: 60 + Math.random() * 20,
                color: '#8b00ff'
            });
        }
        // White void center
        inst.spawn({
            x: 0, y: 0, vx: 0, vy: 0, life: 5, size: 40, color: '#fff'
        });

        // Reality Cracks (Lightning)
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 60;
            inst.spawn({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                vx: 0, vy: 0,
                life: 5,
                size: 2,
                length: 100, width: 3,
                color: '#d8b4fe',
                type: 'lightning',
                points: 5
            });
        }
    };
});

// PARTICLE STORM - Chaos Environment
fx.registerEffect('particle_storm', function (inst) {
    inst.emitter = function () {
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 200 + Math.random() * 600;
            inst.spawn({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                life: 20,
                size: 2 + Math.random() * 4,
                color: ['#8b00ff', '#000000', '#ffffff'][Math.floor(Math.random() * 3)],
            });
        }
    };
});

// PURPLE BEAM - ERASURE
fx.registerEffect('purple_beam', function (inst) {
    inst.emitter = function () {
        // Main Beam Body - Massive
        for (let i = 0; i < 20; i++) {
            inst.spawn({
                x: i * 40, // Trail behind
                y: (Math.random() - 0.5) * 200,
                vx: 50, // Fast forward
                vy: 0,
                life: 30,
                size: 80 + Math.random() * 40,
                color: '#8b00ff'
            });
        }
        // Core White Beam
        for (let i = 0; i < 20; i++) {
            inst.spawn({
                x: i * 40,
                y: (Math.random() - 0.5) * 50,
                vx: 50,
                vy: 0,
                life: 30,
                size: 30 + Math.random() * 20,
                color: '#ffffff'
            });
        }
        // Debris being erased
        for (let i = 0; i < 10; i++) {
            inst.spawn({
                x: 200 + Math.random() * 200,
                y: (Math.random() - 0.5) * 300,
                vx: 40, vy: (Math.random() - 0.5) * 20,
                life: 20, size: 5, color: '#000',
                type: 'triangle'
            });
        }
    };
});

// APOCALYPSE - Maximum destruction
fx.registerEffect('apocalypse', function (inst) {
    // Multiple explosive rings
    for (let ring = 0; ring < 10; ring++) {
        const particlesPerRing = 100;
        for (let i = 0; i < particlesPerRing; i++) {
            const angle = (Math.PI * 2 * i) / particlesPerRing;
            const speed = 20 + ring * 8 + Math.random() * 15;
            inst.spawn({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 80 - ring * 5,
                size: 20 - ring * 1.5,
                color: ring % 3 === 0 ? '#ffffff' : ring % 3 === 1 ? '#8b00ff' : '#6a0dad',
                shrink: true
            });
        }
    }
});

// DISTORTION WAVE
fx.registerEffect('distortion_wave', function (inst) {
    let radius = 0;
    inst.emitter = function () {
        radius += 30;
        if (radius > 600) return;
        for (let i = 0; i < 80; i++) {
            const angle = (Math.PI * 2 * i) / 80;
            inst.spawn({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                vx: Math.cos(angle) * 5,
                vy: Math.sin(angle) * 5,
                life: 25,
                size: 8,
                color: i % 2 === 0 ? '#8b00ff' : '#ffffff'
            });
        }
    };
});

// ENERGY TORNADO
fx.registerEffect('energy_tornado', function (inst) {
    let angle = 0;
    inst.emitter = function () {
        angle += 0.5;
        for (let i = 0; i < 8; i++) {
            const spiral = angle + (i * Math.PI / 4);
            const radius = 100 + Math.sin(angle * 0.5) * 50;
            inst.spawn({
                x: Math.cos(spiral) * radius,
                y: Math.sin(spiral) * radius,
                vx: -Math.cos(spiral) * 8,
                vy: -Math.sin(spiral) * 8,
                life: 40,
                size: 12,
                color: i % 2 === 0 ? '#8b00ff' : '#ffffff',
                shrink: true
            });
        }
    };
});

// PURPLE LIGHTNING - Jagged high-energy arcs
fx.registerEffect('purple_lightning', function (inst) {
    inst.emitter = function () {
        if (Math.random() > 0.3) return; // Intermittent
        const segments = 10;
        let startX = (Math.random() - 0.5) * 400;
        let startY = (Math.random() - 0.5) * 400;
        for (let i = 0; i < segments; i++) {
            const endX = startX + (Math.random() - 0.5) * 100;
            const endY = startY + (Math.random() - 0.5) * 100;
            inst.spawn({
                x: startX,
                y: startY,
                vx: 0, vy: 0,
                life: 5,
                size: 3,
                length: Math.hypot(endX - startX, endY - startY),
                width: 3,
                color: '#d8b4fe', // Light purple
                type: 'line',
                rotation: Math.atan2(endY - startY, endX - startX)
            });
            startX = endX;
            startY = endY;
        }
    };
});

// BLACK HOLE CORE - Imploding density
fx.registerEffect('black_hole_core', function (inst) {
    inst.emitter = function () {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 300 + Math.random() * 200;
            inst.spawn({
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                vx: -Math.cos(angle) * 15, // Suck in fast
                vy: -Math.sin(angle) * 15,
                life: 30,
                size: 5 + Math.random() * 10,
                color: Math.random() > 0.5 ? '#000000' : '#4b0082',
                shrink: false
            });
        }
        // Event Horizon
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 50;
            inst.spawn({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                vx: 0, vy: 0,
                life: 10,
                size: 40,
                color: '#000000'
            });
        }
    };
});

// SHOCKWAVE HELIX - Spiraling expansion
fx.registerEffect('shockwave_helix', function (inst) {
    let angle = 0;
    inst.emitter = function () {
        angle += 0.4;
        // Double helix
        for (let k = 0; k < 2; k++) {
            const a = angle + k * Math.PI;
            for (let i = 0; i < 5; i++) {
                const r = 50 + i * 20;
                inst.spawn({
                    x: Math.cos(a) * r,
                    y: Math.sin(a) * r,
                    vx: Math.cos(a) * 10,
                    vy: Math.sin(a) * 10,
                    life: 40,
                    size: 10,
                    color: k === 0 ? '#8b00ff' : '#ffffff',
                    shrink: true
                });
            }
        }
    };
});

export function activateHollowPurple() {
    // --- DYNAMIC CHANT ELEMENT SETUP ---
    // Inject CSS if not already present
    if (!document.getElementById('chant-style')) {
        const style = document.createElement('style');
        style.id = 'chant-style';
        style.textContent = `
            .chant-text {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 80px;
                    font- weight: bold;
                color: #fff;
                text - shadow: 0 0 20px #8b00ff, 0 0 40px #8b00ff, 0 0 80px #fff;
                opacity: 0;
                pointer - events: none;
                z - index: 10001;
                font - family: 'Arial Black', sans - serif;
                text - align: center;
                white - space: nowrap;
                transition: opacity 0.5s, transform 0.5s;
            }
            `;
        document.head.appendChild(style);
    }

    // Create or select the chant element
    let chantEl = document.getElementById('chant-text');
    if (!chantEl) {
        chantEl = document.createElement('h1');
        chantEl.id = 'chant-text';
        chantEl.className = 'chant-text';
        document.body.appendChild(chantEl);
    }

    // Dynamic Title for the Chant (slower)
    const chantLines = [
        "九綱", // Nine Ropes
        "偏光", // Polarized Light
        "烏と声明", // Crow and Declaration
        "表裏の間", // Between Front and Back
        "矛盾の臨界点", // Contradiction Critical Point
        "虚式「紫」" // Hollow Purple
    ];

    let chantIndex = 0;
    const chantInterval = setInterval(() => {
        if (chantIndex < chantLines.length) {
            chantEl.innerText = chantLines[chantIndex];
            chantEl.style.opacity = 1;
            chantEl.style.transform = `translate(-50%, - 50%) s cale(${1 + chantIndex * 0.15})`;

            // Fade out slightly before next line for smooth transition
            setTimeout(() => {
                if (chantIndex < chantLines.length) {
                    chantEl.style.opacity = 0;
                }
            }, 800);

            chantIndex++;
        } else {
            clearInterval(chantInterval);
            chantEl.style.opacity = 0;
            setTimeout(() => {
                chantEl.innerText = "";
            }, 1000);
        }
    }, 1000);

    const sequence = [
        // PHASE 1: THE RITUAL — slower build
        [CMD.IMPACT_FRAME, 0, 'rgba(0, 0, 0, 0.1)', 'none'],
        [CMD.VFX, 0, 'energy_tornado', '50%', '50%', { color: '#8b00ff', size: 6 }],
        [CMD.VFX, 900, 'distortion_wave', '50%', '50%', { color: '#4b0082' }],
        [CMD.IMPACT_FRAME, 900, 'rgba(75, 0, 130, 0.3)', 'rumble'],

        [CMD.VFX, 1900, 'energy_tornado', '50%', '50%', { color: '#d8b4fe', size: 18 }],
        [CMD.VFX, 1900, 'purple_lightning', '50%', '50%', { color: '#fff' }],
        [CMD.IMPACT_FRAME, 1900, 'rgba(139, 0, 255, 0.2)', 'rumble'],

        [CMD.VFX, 2800, 'distortion_wave', '50%', '50%', { color: '#fff' }],
        [CMD.VFX, 2800, 'black_hole_core', '50%', '50%', { size: 22 }],

        // Small dramatic pause before duality appears (actual WAIT pause)
        // Note: [CMD.WAIT, <absTime>, <msPause>] — converter -> relative + runner awaits <msPause>
        [CMD.WAIT, 3000, 500],

        // PHASE 2: DUALITY — make orbs last longer and move slower
        [CMD.VFX, 3500, 'blue_orb', '30%', '50%', { life: 1400, size: 44 }, 'blue'],
        [CMD.VFX, 3500, 'red_orb', '70%', '50%', { life: 1400, size: 44 }, 'red'],
        [CMD.VFX, 3500, 'particle_storm', '50%', '50%', {}],

        [CMD.MOVE_VFX, 3800, 'blue', '42%', '50%', 900],
        [CMD.MOVE_VFX, 3800, 'red', '58%', '50%', 900],
        [CMD.IMPACT_FRAME, 3800, 'rgba(0, 0, 0, 0.3)', 'rumble'],

        [CMD.MOVE_VFX, 4300, 'blue', '28%', '50%', 900],
        [CMD.MOVE_VFX, 4300, 'red', '72%', '50%', 900],
        [CMD.VFX, 4300, 'distortion_wave', '50%', '50%', { color: '#00d4ff' }],
        [CMD.VFX, 4300, 'distortion_wave', '50%', '50%', { color: '#ff1744' }],

        [CMD.MOVE_VFX, 4800, 'blue', '50%', '50%', 900],
        [CMD.MOVE_VFX, 4800, 'red', '50%', '50%', 900],
        [CMD.IMPACT_FRAME, 4800, 'rgba(106, 13, 173, 0.2)', 'chromatic'],
        [CMD.VFX, 4800, 'purple_lightning', '50%', '50%', { color: '#d8b4fe', length: 180 }],

        // Small pause to let tension breathe before fusion
        [CMD.WAIT, 5000, 600],

        // PHASE 3: FUSION — the snap is bigger and clearer
        [CMD.MOVE_VFX, 5600, 'blue', '50%', '50%', 600],
        [CMD.MOVE_VFX, 5600, 'red', '50%', '50%', 600],
        [CMD.VFX, 5600, 'purple_lightning', '50%', '50%', { length: 400, width: 6 }],
        [CMD.IMPACT_FRAME, 5600, 'rgba(255, 255, 255, 1)', 'invert'],

        [CMD.CLEAR_VFX, 6200, 'blue'],
        [CMD.CLEAR_VFX, 6200, 'red'],

        // purple orb appears big and lingers LONGER so you can see & admire it
        [CMD.VFX, 6400, 'purple_orb', '50%', '50%', { size: 140, life: 3500 }, 'purple'],
        [CMD.VFX, 6400, 'black_hole_core', '50%', '50%', { size: 80, life: 2500 }],
        [CMD.VFX, 6400, 'shockwave_helix', '50%', '50%', { size: 28 }],

        // Build-up before beam: breathing pause + growing core
        [CMD.WAIT, 7000, 800],
        [CMD.VFX, 7800, 'energy_tornado', '50%', '50%', { color: '#ffffff', size: 40 }],

        // PHASE 4: 200% OUTPUT — epic beam (beam life stretched to read)
        [CMD.IMPACT_FRAME, 8700, 'rgba(255, 255, 255, 1)', 'shake'],
        [CMD.VFX, 8800, 'purple_beam', '50%', '50%', { size: 260, life: 1600 }, 'beam'],
        [CMD.MOVE_VFX, 8800, 'purple', '220%', '50%', 1100],
        [CMD.MOVE_VFX, 8800, 'beam', '220%', '50%', 1100],

        // environmental rolls
        [CMD.VFX, 9000, 'apocalypse', '50%', '50%', { size: 48 }],
        [CMD.VFX, 9150, 'apocalypse', '80%', '50%', { size: 60 }],
        [CMD.VFX, 9300, 'apocalypse', '20%', '50%', { size: 60 }],
        [CMD.VFX, 9000, 'dismantle_slash', '50%', '50%', { color: '#8b00ff', length: 700 }],

        [CMD.IMPACT_FRAME, 9000, 'rgba(139, 0, 255, 0.5)', 'chromatic'],
        [CMD.IMPACT_FRAME, 9500, 'rgba(0, 0, 0, 1)', 'invert'],

        // PHASE 5: AFTERMATH — longer fade
        [CMD.WAIT, 2000, 1200],
        [CMD.IMPACT_FRAME, 11000, 'transparent', 'none']
    ];

    // convert & run (raise default life a bit to avoid accidental early expiration)
    const converted = convertAbsoluteSequence(sequence, { warn: true, defaultVFXLife: 600 });
    fx.runSequence(converted).then(function () {
        btn.classList.remove('hidden');
        shrineBtn.classList.remove('hidden');
        title.classList.remove('visible');
        title.innerText = originalTitle;
        title.style.transform = "";
        title.style.color = "";
        title.style.textShadow = "";
        clearInterval(chantInterval);
    });
}