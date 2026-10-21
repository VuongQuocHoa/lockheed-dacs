(function () {
    "use strict";

    const AudioEngine = window.AudioEngine;

    // --- THREE.JS SCENE SETUP ---
    const container = document.getElementById("webgl-container");
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060b18);
    scene.fog = new THREE.FogExp2(0x060b18, 0.0014);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderCanvas = document.createElement("canvas");
    container.appendChild(renderCanvas);

    let renderer = null;
    let fallbackCtx = null;

    (function initSafeRenderer() {
        let gl = null;
        const attrs = [
            { alpha: false, antialias: true, failIfMajorPerformanceCaveat: false },
            { alpha: false, antialias: false, failIfMajorPerformanceCaveat: false },
            {}
        ];
        for (let i = 0; i < attrs.length && !gl; i++) {
            try {
                gl = renderCanvas.getContext("webgl2", attrs[i]) ||
                     renderCanvas.getContext("webgl", attrs[i]) ||
                     renderCanvas.getContext("experimental-webgl", attrs[i]);
            } catch (e) { gl = null; }
        }
        if (gl) {
            try {
                renderer = new THREE.WebGLRenderer({ canvas: renderCanvas, context: gl, antialias: true });
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                renderer.setClearColor(0x060b18, 1);
            } catch (e) { renderer = null; }
        }
        if (!renderer) {
            const freshCanvas = document.createElement("canvas");
            container.replaceChild(freshCanvas, renderCanvas);
            fallbackCtx = freshCanvas.getContext("2d");
            fallbackCtx.canvas.width = window.innerWidth;
            fallbackCtx.canvas.height = window.innerHeight;
        }
    })();

    const activeCanvas = renderer ? renderer.domElement : fallbackCtx.canvas;

    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.78);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
    sunLight.position.set(60, 120, 80);
    scene.add(sunLight);

    function createRadialPuffTexture() {
        const c = document.createElement("canvas");
        c.width = 128; c.height = 128;
        const ctx = c.getContext("2d");
        const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
        g.addColorStop(0, "rgba(255, 255, 255, 0.98)");
        g.addColorStop(0.38, "rgba(255, 240, 215, 0.72)");
        g.addColorStop(0.75, "rgba(200, 215, 235, 0.25)");
        g.addColorStop(1, "rgba(150, 170, 200, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
    }
    const puffTexture = createRadialPuffTexture();

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const groundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2400, 2400),
        new THREE.MeshStandardMaterial({ color: 0x09101f, roughness: 0.65, metalness: 0.2 })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    worldGroup.add(groundMesh);

    const gridHelper = new THREE.GridHelper(1200, 120, 0x1e3a8a, 0x0f172a);
    gridHelper.position.y = 0.05;
    worldGroup.add(gridHelper);

    const launchPadGroup = new THREE.Group();
    launchPadGroup.position.set(0, 0, 0);
    worldGroup.add(launchPadGroup);

    const padConcrete = new THREE.Mesh(
        new THREE.CylinderGeometry(8.5, 9.5, 0.5, 32),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    padConcrete.position.y = 0.25;
    launchPadGroup.add(padConcrete);

    const padWarnRing = new THREE.Mesh(
        new THREE.RingGeometry(7.8, 8.3, 32),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
    );
    padWarnRing.rotation.x = -Math.PI / 2;
    padWarnRing.position.y = 0.52;
    launchPadGroup.add(padWarnRing);

    const launcherPivot = new THREE.Group();
    launcherPivot.position.set(0, 2.2, 0);
    launchPadGroup.add(launcherPivot);

    const railBeam = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 11.5, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.35 })
    );
    railBeam.position.set(-1.15, 4.2, 0);
    launcherPivot.add(railBeam);

    const missileRoot = new THREE.Group();
    scene.add(missileRoot);

    const blueprintGhostGroup = new THREE.Group();
    missileRoot.add(blueprintGhostGroup);

    const ghostWireMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.24
    });

    const ghostCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 7.6, 12, 6), ghostWireMat);
    ghostCyl.position.y = 4.6;
    blueprintGhostGroup.add(ghostCyl);

    const ghostNose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 12), ghostWireMat);
    ghostNose.position.y = 9.5;
    blueprintGhostGroup.add(ghostNose);

    const moduleGroups = {
        engine: new THREE.Group(),
        tailFins: new THREE.Group(),
        fuselage: new THREE.Group(),
        strakes: new THREE.Group(),
        dacs: new THREE.Group(),
        nose: new THREE.Group()
    };
    Object.keys(moduleGroups).forEach(function (k) {
        missileRoot.add(moduleGroups[k]);
    });

    const matWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.22, metalness: 0.18 });
    const matSilver = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.65 });
    const matDarkGrey = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.32, metalness: 0.72 });
    const matNozzleBlack = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.8 });
    const matRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.2 });
    const matBrownStage = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.35, metalness: 0.3 });
    const matYellowBand = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const matRadomeTan = new THREE.MeshStandardMaterial({ color: 0xe2d9c8, roughness: 0.3 });

    function clearGroup(grp) {
        while (grp.children.length > 0) grp.remove(grp.children[0]);
    }

    function buildModuleMesh(slotName, partType) {
        const grp = moduleGroups[slotName];
        clearGroup(grp);
        if (!partType) return;

        if (slotName === "engine") {
            const collar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.42, 0.42, 0.55, 20),
                partType === "solid" ? matNozzleBlack : matDarkGrey
            );
            collar.position.y = 0.92;
            grp.add(collar);

            const bell = new THREE.Mesh(
                new THREE.CylinderGeometry(0.26, 0.40, 0.65, 20),
                matNozzleBlack
            );
            bell.position.y = 0.32;
            grp.add(bell);
        } else if (slotName === "tailFins") {
            for (let i = 0; i < 4; i++) {
                const finHolder = new THREE.Group();
                finHolder.rotation.y = (i * Math.PI) / 2;
                const finPlate = new THREE.Mesh(
                    new THREE.BoxGeometry(1.15, 1.35, 0.06),
                    partType === "qcc" ? matWhite : matDarkGrey
                );
                finPlate.position.set(0.72, 1.65, 0);
                finPlate.rotation.z = -0.18;
                finHolder.add(finPlate);

                const tipTrim = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 1.25, 0.075),
                    partType === "qcc" ? matRed : matYellowBand
                );
                tipTrim.position.set(1.22, 1.60, 0);
                tipTrim.rotation.z = -0.18;
                finHolder.add(tipTrim);

                grp.add(finHolder);
            }
        } else if (slotName === "fuselage") {
            const tube = new THREE.Mesh(
                new THREE.CylinderGeometry(0.42, 0.42, 4.8, 24),
                partType === "white" ? matWhite : matDarkGrey
            );
            tube.position.y = 3.6;
            grp.add(tube);

            const band1 = new THREE.Mesh(
                new THREE.CylinderGeometry(0.426, 0.426, 0.16, 24),
                partType === "white" ? matNozzleBlack : matYellowBand
            );
            band1.position.y = 5.85;
            grp.add(band1);

            const band2 = new THREE.Mesh(
                new THREE.CylinderGeometry(0.426, 0.426, 0.14, 24),
                matRed
            );
            band2.position.y = 4.65;
            grp.add(band2);
        } else if (slotName === "strakes") {
            if (partType === "qccStrakes") {
                for (let i = 0; i < 4; i++) {
                    const sh = new THREE.Group();
                    sh.rotation.y = (i * Math.PI) / 2 + Math.PI / 4;
                    const strake = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.3, 0.18), matWhite);
                    strake.position.set(0.48, 3.05, 0);
                    sh.add(strake);

                    const redStripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.8, 0.06), matRed);
                    redStripe.position.set(0.50, 3.05, 0);
                    sh.add(redStripe);
                    grp.add(sh);
                }
            } else {
                [-0.72, 0.72].forEach(function (bx) {
                    const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.6, 16), matWhite);
                    bCyl.position.set(bx, 3.0, 0);
                    grp.add(bCyl);
                    const bCone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.75, 16), matRed);
                    bCone.position.set(bx, 5.18, 0);
                    grp.add(bCone);
                });
            }
        } else if (slotName === "dacs") {
            const upperTube = new THREE.Mesh(
                new THREE.CylinderGeometry(0.42, 0.42, 2.4, 24),
                partType === "canard" ? matBrownStage : matSilver
            );
            upperTube.position.y = 7.2;
            grp.add(upperTube);

            const dacsRing = new THREE.Mesh(
                new THREE.CylinderGeometry(0.435, 0.435, 0.28, 24),
                matNozzleBlack
            );
            dacsRing.position.y = 7.35;
            grp.add(dacsRing);

            if (partType === "canard") {
                for (let i = 0; i < 4; i++) {
                    const ch = new THREE.Group();
                    ch.rotation.y = (i * Math.PI) / 2;
                    const canard = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.05), matNozzleBlack);
                    canard.position.set(0.52, 6.75, 0);
                    ch.add(canard);
                    grp.add(ch);
                }
            }
        } else if (slotName === "nose") {
            const cone = new THREE.Mesh(
                new THREE.ConeGeometry(0.42, 2.35, 24),
                partType === "redOgive" ? matRed : matRadomeTan
            );
            cone.position.y = 9.57;
            grp.add(cone);

            const baseRing = new THREE.Mesh(
                new THREE.CylinderGeometry(0.424, 0.424, 0.14, 24),
                matNozzleBlack
            );
            baseRing.position.y = 8.42;
            grp.add(baseRing);
        }
    }

    const mainFlameGroup = new THREE.Group();
    missileRoot.add(mainFlameGroup);

    const innerCoreMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 6.5, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.96 })
    );
    innerCoreMesh.rotation.x = Math.PI;
    innerCoreMesh.position.y = -3.25;
    mainFlameGroup.add(innerCoreMesh);

    const outerFlameMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.68, 9.8, 16),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.68 })
    );
    outerFlameMesh.rotation.x = Math.PI;
    outerFlameMesh.position.y = -4.9;
    mainFlameGroup.add(outerFlameMesh);
    mainFlameGroup.visible = false;

    function createDacsLateralJet(dirX, dirZ) {
        const jg = new THREE.Group();
        jg.position.set(dirX * 0.42, 7.35, dirZ * 0.42);
        const len = 3.2;

        const core = new THREE.Mesh(
            new THREE.ConeGeometry(0.14, len, 12),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94 })
        );
        const mist = new THREE.Mesh(
            new THREE.ConeGeometry(0.38, len * 1.15, 12),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.48 })
        );

        if (dirX !== 0) {
            core.rotation.z = dirX > 0 ? Math.PI / 2 : -Math.PI / 2;
            core.position.x = dirX * (len * 0.5);
            mist.rotation.z = core.rotation.z;
            mist.position.x = dirX * (len * 0.56);
        } else {
            core.rotation.x = dirZ > 0 ? -Math.PI / 2 : Math.PI / 2;
            core.position.z = dirZ * (len * 0.5);
            mist.rotation.x = core.rotation.x;
            mist.position.z = dirZ * (len * 0.56);
        }
        jg.add(core, mist);
        jg.visible = false;
        missileRoot.add(jg);
        return jg;
    }

    const dacsJetRight = createDacsLateralJet(1, 0);
    const dacsJetLeft  = createDacsLateralJet(-1, 0);
    const dacsJetUp    = createDacsLateralJet(0, 1);
    const dacsJetDown  = createDacsLateralJet(0, -1);

    const targetRoot = new THREE.Group();
    scene.add(targetRoot);

    const tgtRedMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.25, metalness: 0.5 });
    const tgtDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
    const tgtCockpitMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const tgtGlowMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true });

    const tgtBody = new THREE.Mesh(new THREE.ConeGeometry(1.15, 6.4, 16), tgtRedMat);
    tgtBody.rotation.x = Math.PI / 2;
    targetRoot.add(tgtBody);

    const tgtWings = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.18, 2.4), tgtDarkMat);
    tgtWings.position.set(0, 0, -0.4);
    targetRoot.add(tgtWings);

    const tailLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.65, 1.4), tgtRedMat);
    tailLeft.position.set(-1.35, 0.75, -2.1);
    tailLeft.rotation.z = 0.22;
    targetRoot.add(tailLeft);

    const tailRight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.65, 1.4), tgtRedMat);
    tailRight.position.set(1.35, 0.75, -2.1);
    tailRight.rotation.z = -0.22;
    targetRoot.add(tailRight);

    const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 2.1), tgtCockpitMat);
    canopyMesh.position.set(0, 0.55, 0.6);
    targetRoot.add(canopyMesh);

    const tgtAfterburner = new THREE.Mesh(
        new THREE.ConeGeometry(0.65, 3.8, 12),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 })
    );
    tgtAfterburner.rotation.x = -Math.PI / 2;
    tgtAfterburner.position.set(0, 0, -4.8);
    targetRoot.add(tgtAfterburner);

    const targetLockRing = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.6, 4), tgtGlowMat);
    targetRoot.add(targetLockRing);

    const smokePool = [];
    const MAX_PARTICLES = 180;
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    for (let i = 0; i < MAX_PARTICLES; i++) {
        const mat = new THREE.SpriteMaterial({
            map: puffTexture,
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            depthWrite: false
        });
        const sp = new THREE.Sprite(mat);
        sp.visible = false;
        particleGroup.add(sp);
        smokePool.push({
            sprite: sp,
            active: false,
            vx: 0, vy: 0, vz: 0,
            age: 0, maxAge: 1,
            startScale: 1, endScale: 5
        });
    }

    let smokeIdx = 0;
    function spawnSmoke(x, y, z, vx, vy, vz, s0, s1, maxAge, hexColor) {
        const p = smokePool[smokeIdx];
        smokeIdx = (smokeIdx + 1) % MAX_PARTICLES;
        p.active = true;
        p.age = 0;
        p.maxAge = maxAge;
        p.vx = vx; p.vy = vy; p.vz = vz;
        p.startScale = s0; p.endScale = s1;
        p.sprite.position.set(x, y, z);
        p.sprite.scale.set(s0, s0, 1);
        p.sprite.material.color.setHex(hexColor || 0xffffff);
        p.sprite.material.opacity = 0.78;
        p.sprite.visible = true;
    }

    const REQUIRED_SLOTS = ["engine", "tailFins", "fuselage", "strakes", "dacs", "nose"];

    const sim = {
        installed: {
            engine: null,
            tailFins: null,
            fuselage: null,
            strakes: null,
            dacs: null,
            nose: null
        },
        slotSlideOffset: {
            engine: 0, tailFins: 0, fuselage: 0, strakes: 0, dacs: 0, nose: 0
        },
        launchElevationDeg: 52,
        autoHoming: true,
        phase: "ASSEMBLY",
        explodeTimer: 0,
        interceptCount: 0,

        timeScale: 1.0,
        bulletTimeActive: false,
        altCursorUnlocked: false,
        camShakeAmount: 0,

        pos: new THREE.Vector3(0, 2.2, 0),
        vel: new THREE.Vector3(0, 0, 0),
        dir: new THREE.Vector3(0, 0.78, -0.62).normalize(),
        speed: 0,

        targetType: "drone",
        targetPos: new THREE.Vector3(0, 65, -240),
        targetVel: new THREE.Vector3(28, 0, 0),
        targetPhase: 0,

        camMode: 0, // 0: TPS PUBG/Free Fire Mouse Look, 1: AI Seeker FPV, 2: Free 360 Orbit, 3: Side View
        
        tpsYaw: 0,
        tpsPitch: 0.35,
        mouseSensitivity: 0.0032,
        
        chaseCamPos: new THREE.Vector3(0, 8, 16),
        chaseCamLook: new THREE.Vector3(0, 5, 0),
        chaseZoomDist: 14.5,
        chaseUpOffset: 2.8,
        chaseRightOffset: 0.6,

        lastDragTime: 0,
        flightTime: 0,
        aiState: "STANDBY",
        aiConfidence: 0.985,
        closureRate: 0,
        tti: 0,
        lastImpactPos: new THREE.Vector3(),
        camTheta: 0.58,
        camPhi: 0.28,
        camDist: 15.5,
        dragging: false,
        lastX: 0,
        lastY: 0
    };

    const keys = { w: false, s: false, a: false, d: false };

    const CAM_NAMES = [
        "🎥 GÓC NHÌN: TPS CHUỘT HƯỚNG PUBG/FREE FIRE [C / V]",
        "👁️ GÓC NHÌN: ĐẦU DÒ AI (FPV SEEKER) [C / V]",
        "🔄 GÓC NHÌN: XOAY TỰ DO 360° [C / V]",
        "🎬 GÓC NHÌN: NGANG HÀNH TRÌNH [C / V]"
    ];

    function getInstalledCount() {
        let c = 0;
        for (let i = 0; i < REQUIRED_SLOTS.length; i++) {
            if (sim.installed[REQUIRED_SLOTS[i]]) c++;
        }
        return c;
    }

    function getTotalMassKg() {
        let m = 0;
        if (sim.installed.engine) m += sim.installed.engine === "solid" ? 48 : 42;
        if (sim.installed.tailFins) m += 24;
        if (sim.installed.fuselage) m += sim.installed.fuselage === "white" ? 135 : 150;
        if (sim.installed.strakes) m += sim.installed.strakes === "boosters" ? 85 : 32;
        if (sim.installed.dacs) m += 46;
        if (sim.installed.nose) m += 28;
        return m;
    }

    function showToast(msg) {
        const el = document.getElementById("status-toast");
        if (el) el.innerHTML = msg;
    }

    function refreshAssemblyUI() {
        const count = getInstalledCount();
        const badge = document.getElementById("assembly-badge");
        const pctTxt = document.getElementById("assembly-pct-txt");
        const bar = document.getElementById("assembly-bar");
        const massEl = document.getElementById("hud-mass");
        const launchBtn = document.getElementById("btn-launch");
        const launchMain = document.getElementById("launch-main-txt");
        const launchSub = document.getElementById("launch-sub-txt");

        if (pctTxt) pctTxt.textContent = count + " / 6 BỘ PHẬN";
        if (bar) bar.style.width = ((count / 6) * 100).toFixed(0) + "%";
        if (massEl) massEl.textContent = getTotalMassKg() + " KG";

        blueprintGhostGroup.visible = count < 6 && sim.phase === "ASSEMBLY";

        REQUIRED_SLOTS.forEach(function (slot) {
            const card = document.getElementById("slot-card-" + slot);
            const tag = document.getElementById("tag-" + slot);
            const val = sim.installed[slot];
            if (card && tag) {
                if (val) {
                    card.classList.add("installed");
                    tag.textContent = "ĐÃ LẮP RÁP ✓";
                } else {
                    card.classList.remove("installed");
                    tag.textContent = "CHƯA LẮP";
                }
            }
        });

        document.querySelectorAll(".part-btn").forEach(function (btn) {
            const s = btn.getAttribute("data-slot");
            const t = btn.getAttribute("data-type");
            if (sim.installed[s] === t) {
                btn.classList.add("selected");
            } else {
                btn.classList.remove("selected");
            }
        });

        if (count === 6) {
            badge.textContent = "SẴN SÀNG PHÓNG (6/6)";
            badge.classList.add("ready");
            launchBtn.classList.remove("locked");
            if (sim.phase === "ASSEMBLY") {
                launchMain.textContent = "🔥 KHAI HỎA TÊN LỬA [SPACE]";
                launchSub.textContent = "Đã lắp đủ 6 mô-đun • Bấm để phóng";
            }
        } else {
            badge.textContent = "ĐANG LẮP RÁP (" + count + "/6)";
            badge.classList.remove("ready");
            launchBtn.classList.add("locked");
            launchMain.textContent = "🔒 CẦN LẮP ĐỦ 6 BỘ PHẬN (" + count + "/6)";
            launchSub.textContent = "Chọn đủ 6 mục bên trái để mở khóa";
        }
    }

    function installPart(slot, type) {
        if (sim.phase !== "ASSEMBLY") {
            resetToLaunchPad();
        }
        sim.installed[slot] = type;
        sim.slotSlideOffset[slot] = 2.6;
        buildModuleMesh(slot, type);

        const slotOrder = REQUIRED_SLOTS.indexOf(slot);
        AudioEngine.playSnapSound(slotOrder);

        const sparkY = [0.6, 1.6, 3.6, 3.2, 7.2, 9.2][slotOrder] || 4.0;
        const worldPos = new THREE.Vector3(0, sparkY, 0).applyMatrix4(missileRoot.matrixWorld);
        for (let i = 0; i < 8; i++) {
            spawnSmoke(
                worldPos.x + (Math.random() - 0.5) * 0.8,
                worldPos.y + (Math.random() - 0.5) * 0.8,
                worldPos.z + (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 5,
                Math.random() * 4,
                (Math.random() - 0.5) * 5,
                0.4, 1.8, 0.38, 0x38bdf8
            );
        }

        const count = getInstalledCount();
        if (count === 6) {
            showToast("✅ Đã lắp ráp hoàn chỉnh 6/6 bộ phận! Nhấn nút <strong>KHAI HỎA TÊN LỬA [SPACE]</strong> để bắn hạ mục tiêu di động.");
        } else {
            showToast("🔧 Đã lắp mô-đun <strong>" + slot.toUpperCase() + "</strong> (" + count + "/6). Hãy tiếp tục lắp các phần còn lại!");
        }
        refreshAssemblyUI();
    }

    function clearAllParts() {
        resetToLaunchPad();
        REQUIRED_SLOTS.forEach(function (s) {
            sim.installed[s] = null;
            clearGroup(moduleGroups[s]);
        });
        AudioEngine.playSnapSound(0);
        showToast("🛠️ Đã tháo rời toàn bộ mô-đun! Bệ phóng hiện đang trống, hãy tự tay lắp lại từ mục 1 đến 6.");
        refreshAssemblyUI();
    }

    function getPadDirectionVector() {
        const elevRad = THREE.MathUtils.degToRad(sim.launchElevationDeg);
        return new THREE.Vector3(0, Math.sin(elevRad), -Math.cos(elevRad)).normalize();
    }

    function resetToLaunchPad() {
        sim.phase = "ASSEMBLY";
        sim.speed = 0;
        sim.flightTime = 0;
        sim.aiState = "STANDBY";
        sim.pos.set(0, 2.2, 0);
        sim.dir.copy(getPadDirectionVector());
        
        const elevRad = THREE.MathUtils.degToRad(sim.launchElevationDeg);
        sim.tpsYaw = Math.PI;
        sim.tpsPitch = THREE.MathUtils.clamp(elevRad - 0.2, -0.6, 1.4);

        mainFlameGroup.visible = false;
        dacsJetLeft.visible = dacsJetRight.visible = dacsJetUp.visible = dacsJetDown.visible = false;
        missileRoot.visible = true;
        AudioEngine.updateFlightLoop(false, false);

        const hudLayer = document.getElementById("main-hud-layer");
        if (hudLayer) hudLayer.classList.remove("fpv-flight-active");

        const crosshair = document.getElementById("tps-crosshair");
        if (crosshair) crosshair.style.display = "none";

        refreshAssemblyUI();
    }

    function launchRocket() {
        const count = getInstalledCount();
        if (count < 6) {
            AudioEngine.playSnapSound(-2);
            showToast("⚠️ Chưa thể phóng! Bạn mới lắp <strong>" + count + "/6 bộ phận</strong>. Hãy chọn đủ 6 mục ở bảng bên trái.");
            return;
        }
        if (sim.phase === "FLIGHT") {
            resetToLaunchPad();
            return;
        }

        AudioEngine.init();
        sim.phase = "FLIGHT";
        sim.flightTime = 0;
        sim.aiState = "SCANNING";
        sim.pos.set(0, 2.4, 0);
        sim.dir.copy(getPadDirectionVector());
        
        const elevRad = THREE.MathUtils.degToRad(sim.launchElevationDeg);
        sim.tpsYaw = Math.PI;
        sim.tpsPitch = elevRad * 0.7;

        sim.speed = sim.installed.strakes === "boosters" ? 65 : 48;
        mainFlameGroup.visible = true;

        const hudLayer = document.getElementById("main-hud-layer");
        if (hudLayer) {
            if (sim.camMode === 1) hudLayer.classList.add("fpv-flight-active");
            else hudLayer.classList.remove("fpv-flight-active");
        }

        const crosshair = document.getElementById("tps-crosshair");
        if (crosshair && sim.camMode === 0) crosshair.style.display = "block";

        try {
            if (document.pointerLockElement !== activeCanvas && !("ontouchstart" in window)) {
                activeCanvas.requestPointerLock();
            }
        } catch (e) {}

        if (sim.installed.engine === "plasma") {
            innerCoreMesh.material.color.setHex(0xffffff);
            outerFlameMesh.material.color.setHex(0x38bdf8);
        } else {
            innerCoreMesh.material.color.setHex(0xfffbeb);
            outerFlameMesh.material.color.setHex(0xf59e0b);
        }

        for (let i = 0; i < 32; i++) {
            spawnSmoke(
                (Math.random() - 0.5) * 4,
                0.8 + Math.random() * 2.2,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 14,
                Math.random() * 6,
                (Math.random() - 0.5) * 14,
                2.2, 9.5, 1.4, 0xfde68a
            );
        }

        const launchMain = document.getElementById("launch-main-txt");
        const launchSub = document.getElementById("launch-sub-txt");
        if (launchMain) launchMain.textContent = "🔄 THU HỒI VỀ BỆ [R]";
        if (launchSub) launchSub.textContent = "Di chuột quay đầu tên lửa (PUBG/Free Fire) • [W/S/A/D] phụt O₂";

        showToast("🎮 <strong>CHẾ ĐỘ TPS CHUỘT QUAY ĐẦU (PUBG / Free Fire)!</strong> Di chuột đến đâu camera và tên lửa quay sang hướng đó. Nhấn <strong>[R]</strong> để nạp lại.");
    }

    function triggerInterceptExplosion(hitPos) {
        sim.phase = "EXPLODED";
        sim.explodeTimer = 2.1;
        sim.interceptCount++;
        sim.lastImpactPos.copy(hitPos);
        document.getElementById("hud-hits").textContent = String(sim.interceptCount);

        mainFlameGroup.visible = false;
        dacsJetLeft.visible = dacsJetRight.visible = dacsJetUp.visible = dacsJetDown.visible = false;
        missileRoot.visible = false;
        AudioEngine.updateFlightLoop(false, false);
        AudioEngine.playExplosionSound();

        for (let i = 0; i < 55; i++) {
            const col = i % 3 === 0 ? 0xffffff : (i % 2 === 0 ? 0xf97316 : 0xef4444);
            spawnSmoke(
                hitPos.x + (Math.random() - 0.5) * 3,
                hitPos.y + (Math.random() - 0.5) * 3,
                hitPos.z + (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 42,
                (Math.random() - 0.5) * 42,
                (Math.random() - 0.5) * 42,
                2.5, 14.0, 1.5, col
            );
        }

        showToast("💥 <strong>ĐÁNH CHẶN CHÍNH XÁC!</strong> Mục tiêu di động đã bị tiêu diệt ở cự ly trực diện. Tự động nạp lại bệ phóng...");
    }

    function updateMovingTarget(dt) {
        sim.targetPhase += dt;
        const prevPos = sim.targetPos.clone();

        if (sim.targetType === "drone") {
            const x = Math.sin(sim.targetPhase * 0.55) * 145;
            const y = 68 + Math.sin(sim.targetPhase * 1.1) * 18;
            const z = -220 + Math.cos(sim.targetPhase * 0.55) * 75;
            sim.targetPos.set(x, y, z);
        } else if (sim.targetType === "cruise") {
            const x = Math.cos(sim.targetPhase * 0.85) * 165;
            const y = 38 + Math.sin(sim.targetPhase * 2.2) * 14;
            const z = -190 + Math.sin(sim.targetPhase * 0.85) * 95;
            sim.targetPos.set(x, y, z);
        } else {
            const x = Math.sin(sim.targetPhase * 0.35) * 120;
            const y = 2.2;
            const z = -175 + Math.cos(sim.targetPhase * 0.35) * 60;
            sim.targetPos.set(x, y, z);
        }

        if (dt > 0.0001) {
            sim.targetVel.subVectors(sim.targetPos, prevPos).divideScalar(dt);
        }
        targetRoot.position.copy(sim.targetPos);
        if (sim.targetVel.lengthSq() > 0.01) {
            const lookTarget = sim.targetPos.clone().add(sim.targetVel);
            targetRoot.lookAt(lookTarget);
        }
        targetLockRing.rotation.z += dt * 2.5;
        tgtAfterburner.scale.y = 0.85 + Math.random() * 0.35;
    }

    function setDacsSvgIndicator(id, active) {
        const poly = document.getElementById(id);
        if (poly) {
            poly.setAttribute("opacity", active ? "1.0" : "0.18");
            poly.setAttribute("fill", active ? "#ffffff" : "#38bdf8");
        }
    }

    const upAxis = new THREE.Vector3(0, 1, 0);
    const defaultMeshUp = new THREE.Vector3(0, 1, 0);

    function updateSimulation(dt) {
        updateMovingTarget(dt);

        const targetTimeScale = sim.bulletTimeActive ? 0.2 : 1.0;
        sim.timeScale = THREE.MathUtils.lerp(sim.timeScale, targetTimeScale, Math.min(1, dt * 10));
        const effectiveDt = dt * sim.timeScale;

        REQUIRED_SLOTS.forEach(function (s) {
            if (sim.slotSlideOffset[s] > 0) {
                sim.slotSlideOffset[s] = Math.max(0, sim.slotSlideOffset[s] - effectiveDt * 9.5);
                moduleGroups[s].position.y = sim.slotSlideOffset[s];
            } else {
                moduleGroups[s].position.y = 0;
            }
        });

        const launcherTiltRad = THREE.MathUtils.degToRad(90 - sim.launchElevationDeg);
        launcherPivot.rotation.x = -launcherTiltRad;

        let fireUp = false, fireDown = false, fireLeft = false, fireRight = false;

        if (sim.phase === "ASSEMBLY") {
            sim.pos.set(0, 2.2, 0);
            sim.dir.copy(getPadDirectionVector());
            const q = new THREE.Quaternion().setFromUnitVectors(defaultMeshUp, sim.dir);
            missileRoot.position.copy(sim.pos);
            missileRoot.quaternion.copy(q);

            document.getElementById("hud-mach").textContent = "0.0 M";
            const d0 = sim.pos.distanceTo(sim.targetPos);
            document.getElementById("hud-dist").textContent = d0.toFixed(0) + " M";
        } else if (sim.phase === "FLIGHT") {
            sim.flightTime += effectiveDt;
            const maxSpd = sim.installed.engine === "plasma" ? 140 : 112;
            const accel = sim.installed.strakes === "boosters" ? 48 : 34;
            sim.speed = Math.min(maxSpd, sim.speed + accel * effectiveDt);

            let rightVec = new THREE.Vector3().crossVectors(sim.dir, upAxis).normalize();
            if (rightVec.lengthSq() < 0.001) rightVec.set(1, 0, 0);
            const localUpVec = new THREE.Vector3().crossVectors(rightVec, sim.dir).normalize();

            const turnAgility = sim.installed.tailFins === "tactical" ? 3.8 : 3.0;
            let pitchInput = 0;
            let yawInput = 0;

            if (keys.w) { pitchInput += 1; fireDown = true; }
            if (keys.s) { pitchInput -= 1; fireUp = true; }
            if (keys.a) { yawInput -= 1; fireRight = true; }
            if (keys.d) { yawInput += 1; fireLeft = true; }

            const noseWorldPos = sim.pos.clone().addScaledVector(sim.dir, 9.5);
            const distToTarget = noseWorldPos.distanceTo(sim.targetPos);
            sim.closureRate = Math.max(20, sim.speed + sim.targetVel.length() * 0.35);
            sim.tti = distToTarget / sim.closureRate;

            if (sim.flightTime < 0.35) {
                sim.aiState = "SCANNING";
            } else if (distToTarget > 52) {
                sim.aiState = "TAIL_CHASE";
            } else {
                sim.aiState = "TERMINAL_LOCK";
            }
            sim.aiConfidence = Math.min(0.998, 0.94 + Math.sin(sim.flightTime * 7) * 0.02 + (1 / (1 + distToTarget * 0.01)) * 0.04);

            if (sim.camMode === 0) {
                const lookDir = new THREE.Vector3(
                    -Math.sin(sim.tpsYaw) * Math.cos(sim.tpsPitch),
                    Math.sin(sim.tpsPitch),
                    -Math.cos(sim.tpsYaw) * Math.cos(sim.tpsPitch)
                ).normalize();

                const mousePitchErr = lookDir.dot(localUpVec);
                const mouseYawErr = lookDir.dot(rightVec);

                pitchInput += mousePitchErr * 5.5;
                yawInput += mouseYawErr * 5.5;

                if (mousePitchErr > 0.04) fireDown = true;
                else if (mousePitchErr < -0.04) fireUp = true;

                if (mouseYawErr > 0.04) fireLeft = true;
                else if (mouseYawErr < -0.04) fireRight = true;
            } else if (sim.autoHoming && pitchInput === 0 && yawInput === 0) {
                const tgtFwdDir = sim.targetVel.lengthSq() > 0.1
                    ? sim.targetVel.clone().normalize()
                    : new THREE.Vector3(1, 0, 0);

                const tailWakeDist = THREE.MathUtils.clamp((distToTarget - 30) * 0.32, 0, 26);
                const leadTime = Math.min(1.1, distToTarget / Math.max(55, sim.speed * 1.15));
                const aimPoint = sim.targetPos.clone()
                    .addScaledVector(sim.targetVel, leadTime * 0.65)
                    .addScaledVector(tgtFwdDir, -tailWakeDist);

                const toAim = new THREE.Vector3().subVectors(aimPoint, noseWorldPos).normalize();
                const pitchErr = toAim.dot(localUpVec);
                const yawErr = toAim.dot(rightVec);

                const deadzone = 0.015;
                if (pitchErr > deadzone) { pitchInput = Math.min(1.4, pitchErr * 4.8); fireDown = true; }
                else if (pitchErr < -deadzone) { pitchInput = Math.max(-1.4, pitchErr * 4.8); fireUp = true; }

                if (yawErr > deadzone) { yawInput = Math.min(1.4, yawErr * 4.8); fireLeft = true; }
                else if (yawErr < -deadzone) { yawInput = Math.max(-1.4, yawErr * 4.8); fireRight = true; }
            }

            if (pitchInput !== 0 || yawInput !== 0) {
                sim.dir.addScaledVector(localUpVec, pitchInput * turnAgility * effectiveDt);
                sim.dir.addScaledVector(rightVec, yawInput * turnAgility * effectiveDt);
                sim.dir.normalize();
            }

            sim.vel.copy(sim.dir).multiplyScalar(sim.speed);
            sim.pos.addScaledVector(sim.vel, effectiveDt);

            const q = new THREE.Quaternion().setFromUnitVectors(defaultMeshUp, sim.dir);
            missileRoot.position.copy(sim.pos);
            missileRoot.quaternion.copy(q);

            innerCoreMesh.scale.set(1, 0.88 + Math.random() * 0.28, 1);
            outerFlameMesh.scale.set(1 + Math.random() * 0.15, 0.9 + Math.random() * 0.3, 1 + Math.random() * 0.15);

            for (let i = 0; i < 3; i++) {
                const tailNozzlePos = sim.pos.clone().addScaledVector(sim.dir, -0.8 - i * 0.9);
                const smokeCol = sim.installed.engine === "plasma" ? 0xe0f2fe : (Math.random() < 0.38 ? 0xfde68a : 0xf8fafc);
                spawnSmoke(
                    tailNozzlePos.x + (Math.random() - 0.5) * 0.5,
                    tailNozzlePos.y + (Math.random() - 0.5) * 0.5,
                    tailNozzlePos.z + (Math.random() - 0.5) * 0.5,
                    -sim.dir.x * 16 + (Math.random() - 0.5) * 4,
                    -sim.dir.y * 16 + (Math.random() - 0.5) * 4,
                    -sim.dir.z * 16 + (Math.random() - 0.5) * 4,
                    1.3, 8.2, 1.35, smokeCol
                );
            }

            const dacsWorldPos = sim.pos.clone().addScaledVector(sim.dir, 7.35);
            if (fireLeft || fireRight || fireUp || fireDown) {
                const jetDir = new THREE.Vector3();
                if (fireRight) jetDir.add(rightVec);
                if (fireLeft) jetDir.sub(rightVec);
                if (fireUp) jetDir.add(localUpVec);
                if (fireDown) jetDir.sub(localUpVec);
                jetDir.normalize();

                spawnSmoke(
                    dacsWorldPos.x + jetDir.x * 1.1,
                    dacsWorldPos.y + jetDir.y * 1.1,
                    dacsWorldPos.z + jetDir.z * 1.1,
                    jetDir.x * 24 + (Math.random() - 0.5) * 3,
                    jetDir.y * 24 + (Math.random() - 0.5) * 3,
                    jetDir.z * 24 + (Math.random() - 0.5) * 3,
                    0.65, 2.8, 0.28, 0xe0f2fe
                );
            }

            const machNumber = sim.speed / 28.0;
            const machVal = machNumber.toFixed(1);
            document.getElementById("hud-mach").textContent = machVal + " M";
            document.getElementById("hud-dist").textContent = distToTarget.toFixed(0) + " M";

            if (distToTarget < 16.0) {
                sim.camShakeAmount = Math.max(sim.camShakeAmount, 0.45);
            }

            if (distToTarget < 8.5 || sim.pos.distanceTo(sim.targetPos) < 8.5) {
                sim.camShakeAmount = 1.2;
                triggerInterceptExplosion(sim.targetPos.clone());
            } else if (sim.pos.y < 0.3 || sim.pos.length() > 950) {
                triggerInterceptExplosion(sim.pos.clone());
            }
        } else if (sim.phase === "EXPLODED") {
            sim.explodeTimer -= effectiveDt;
            if (sim.explodeTimer <= 0) {
                resetToLaunchPad();
            }
        }

        dacsJetUp.visible = fireUp;
        dacsJetDown.visible = fireDown;
        dacsJetLeft.visible = fireLeft;
        dacsJetRight.visible = fireRight;

        setDacsSvgIndicator("dacs-svg-up", fireUp);
        setDacsSvgIndicator("dacs-svg-down", fireDown);
        setDacsSvgIndicator("dacs-svg-left", fireLeft);
        setDacsSvgIndicator("dacs-svg-right", fireRight);

        const anyDacs = fireUp || fireDown || fireLeft || fireRight;
        AudioEngine.updateFlightLoop(sim.phase === "FLIGHT", sim.phase === "FLIGHT" && anyDacs);

        for (let i = 0; i < MAX_PARTICLES; i++) {
            const p = smokePool[i];
            if (!p.active) continue;
            p.age += effectiveDt;
            if (p.age >= p.maxAge) {
                p.active = false;
                p.sprite.visible = false;
                continue;
            }
            const t = p.age / p.maxAge;
            p.sprite.position.x += p.vx * effectiveDt;
            p.sprite.position.y += p.vy * effectiveDt;
            p.sprite.position.z += p.vz * effectiveDt;
            p.vx *= 0.96; p.vy *= 0.96; p.vz *= 0.96;
            const sc = p.startScale + (p.endScale - p.startScale) * t;
            p.sprite.scale.set(sc, sc, 1);
            p.sprite.material.opacity = (1 - t) * 0.72;
        }

        const focusPoint = sim.phase === "ASSEMBLY"
            ? new THREE.Vector3(0, 6.2, 0)
            : sim.pos.clone().addScaledVector(sim.dir, 5.0);

        const crosshair = document.getElementById("tps-crosshair");

        let shakeX = 0, shakeY = 0;
        if (sim.camShakeAmount > 0.01) {
            shakeX = (Math.random() - 0.5) * sim.camShakeAmount * 0.8;
            shakeY = (Math.random() - 0.5) * sim.camShakeAmount * 0.8;
            sim.camShakeAmount = Math.max(0, sim.camShakeAmount - dt * 2.2);
        }

        if (sim.camMode === 0) {
            if (crosshair) crosshair.style.display = sim.phase === "FLIGHT" ? "block" : "none";

            if (sim.phase === "ASSEMBLY") {
                camera.fov = THREE.MathUtils.lerp(camera.fov, 50, Math.min(1, dt * 8));
                camera.updateProjectionMatrix();
                const cx = focusPoint.x + Math.sin(sim.camTheta) * Math.cos(sim.camPhi) * sim.camDist;
                const cy = Math.max(1.2, focusPoint.y + Math.sin(sim.camPhi) * sim.camDist);
                const cz = focusPoint.z + Math.cos(sim.camTheta) * Math.cos(sim.camPhi) * sim.camDist;
                camera.position.set(cx + shakeX, cy + shakeY, cz);
                camera.lookAt(focusPoint);
            } else if (sim.phase === "FLIGHT") {
                const speedRatio = THREE.MathUtils.clamp(sim.speed / 140, 0, 1);
                const targetFov = 58 + speedRatio * 14;
                if (Math.abs(camera.fov - targetFov) > 0.05) {
                    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, Math.min(1, dt * 8));
                    camera.updateProjectionMatrix();
                }

                const camLookFwd = new THREE.Vector3(
                    -Math.sin(sim.tpsYaw) * Math.cos(sim.tpsPitch),
                    Math.sin(sim.tpsPitch),
                    -Math.cos(sim.tpsYaw) * Math.cos(sim.tpsPitch)
                ).normalize();

                let camRight = new THREE.Vector3().crossVectors(camLookFwd, upAxis).normalize();
                if (camRight.lengthSq() < 0.001) camRight.set(1, 0, 0);
                const camUp = new THREE.Vector3().crossVectors(camRight, camLookFwd).normalize();

                const missileAnchor = sim.pos.clone().addScaledVector(sim.dir, 4.2);
                const desiredCamPos = missileAnchor.clone()
                    .addScaledVector(camLookFwd, -sim.chaseZoomDist)
                    .addScaledVector(camUp, sim.chaseUpOffset)
                    .addScaledVector(camRight, sim.chaseRightOffset);

                if (desiredCamPos.y < 1.2) desiredCamPos.y = 1.2;

                const lerpRate = 1 - Math.exp(-24.0 * dt);
                sim.chaseCamPos.lerp(desiredCamPos, lerpRate);
                camera.position.set(sim.chaseCamPos.x + shakeX, sim.chaseCamPos.y + shakeY, sim.chaseCamPos.z);

                const aimAheadDist = 120.0;
                const targetLookAt = camera.position.clone().addScaledVector(camLookFwd, aimAheadDist);
                camera.up.set(0, 1, 0);
                camera.lookAt(targetLookAt);
            } else {
                const impactViewPos = sim.lastImpactPos.clone().add(new THREE.Vector3(0, 8.5, 20));
                camera.position.lerp(impactViewPos, Math.min(1, dt * 5));
                camera.position.x += shakeX;
                camera.position.y += shakeY;
                camera.lookAt(sim.lastImpactPos);
            }
        } else {
            if (crosshair) crosshair.style.display = "none";

            if (sim.camMode === 1) {
                if (sim.phase === "FLIGHT") {
                    camera.fov = 56;
                    camera.updateProjectionMatrix();
                    const seekerEye = sim.pos.clone().addScaledVector(sim.dir, 10.1);
                    const seekerLook = seekerEye.clone().addScaledVector(sim.dir, 36).lerp(sim.targetPos, 0.38);
                    camera.position.set(seekerEye.x + shakeX, seekerEye.y + shakeY, seekerEye.z);
                    camera.lookAt(seekerLook);
                } else if (sim.phase === "EXPLODED") {
                    camera.position.copy(sim.lastImpactPos).addScaledVector(sim.dir, -18);
                    camera.lookAt(sim.lastImpactPos);
                } else {
                    const padNoseEye = new THREE.Vector3(0, 2.2, 0).addScaledVector(getPadDirectionVector(), 10.1);
                    camera.position.copy(padNoseEye);
                    camera.lookAt(sim.targetPos);
                }
            } else if (sim.camMode === 2) {
                camera.fov = 50;
                camera.updateProjectionMatrix();
                const cx = focusPoint.x + Math.sin(sim.camTheta) * Math.cos(sim.camPhi) * sim.camDist;
                const cy = Math.max(1.2, focusPoint.y + Math.sin(sim.camPhi) * sim.camDist);
                const cz = focusPoint.z + Math.cos(sim.camTheta) * Math.cos(sim.camPhi) * sim.camDist;
                camera.position.set(cx + shakeX, cy + shakeY, cz);
                camera.lookAt(focusPoint);
            } else {
                camera.fov = 50;
                camera.updateProjectionMatrix();
                let rightVec = new THREE.Vector3().crossVectors(sim.dir, upAxis).normalize();
                if (rightVec.lengthSq() < 0.001) rightVec.set(1, 0, 0);
                const sidePos = focusPoint.clone().addScaledVector(rightVec, 15.5).add(new THREE.Vector3(0, 1.5, 0));
                camera.position.lerp(sidePos, Math.min(1, dt * 10));
                camera.lookAt(focusPoint);
            }
        }
    }

    const aiHudCanvas = document.getElementById("ai-hud-canvas");
    const aiCtx = aiHudCanvas.getContext("2d");
    function resizeAiHud() {
        aiHudCanvas.width = window.innerWidth;
        aiHudCanvas.height = window.innerHeight;
    }
    resizeAiHud();

    function projectWorldToScreen(worldVec, W, H) {
        const v = worldVec.clone().project(camera);
        return {
            x: (v.x * 0.5 + 0.5) * W,
            y: (-v.y * 0.5 + 0.5) * H,
            visible: v.z >= -1 && v.z <= 1
        };
    }

    function renderAiSeekerHUD() {
        const W = aiHudCanvas.width;
        const H = aiHudCanvas.height;
        aiCtx.clearRect(0, 0, W, H);

        const isFpv = sim.camMode === 1;
        const isChaseFlight = sim.camMode === 0 && sim.phase === "FLIGHT";
        if (!isFpv && sim.phase !== "FLIGHT" && sim.phase !== "EXPLODED") return;

        const tgtScreen = projectWorldToScreen(sim.targetPos, W, H);
        const leadPos = sim.targetPos.clone().addScaledVector(sim.targetVel, Math.min(1.0, sim.tti * 0.65));
        const leadScreen = projectWorldToScreen(leadPos, W, H);

        if (isChaseFlight) {
            const noseForwardWorld = sim.pos.clone().addScaledVector(sim.dir, 65);
            const noseReticle = projectWorldToScreen(noseForwardWorld, W, H);
            if (noseReticle.visible) {
                aiCtx.save();
                aiCtx.strokeStyle = "rgba(56, 189, 248, 0.85)";
                aiCtx.lineWidth = 1.8;
                aiCtx.beginPath();
                aiCtx.arc(noseReticle.x, noseReticle.y, 14, 0, Math.PI * 2);
                aiCtx.stroke();

                aiCtx.beginPath();
                aiCtx.moveTo(noseReticle.x - 22, noseReticle.y);
                aiCtx.lineTo(noseReticle.x - 9, noseReticle.y);
                aiCtx.moveTo(noseReticle.x + 9, noseReticle.y);
                aiCtx.lineTo(noseReticle.x + 22, noseReticle.y);
                aiCtx.moveTo(noseReticle.x, noseReticle.y - 22);
                aiCtx.lineTo(noseReticle.x - 9, noseReticle.y);
                aiCtx.moveTo(noseReticle.x, noseReticle.y + 9);
                aiCtx.lineTo(noseReticle.x, noseReticle.y + 22);
                aiCtx.stroke();

                aiCtx.fillStyle = "#38bdf8";
                aiCtx.font = "bold 9.5px monospace";
                aiCtx.fillText("VƯỚNG MŨI TÊN LỬA", noseReticle.x - 48, noseReticle.y + 28);
                aiCtx.restore();
            }
        }

        if (isFpv) {
            const grad = aiCtx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.68);
            grad.addColorStop(0, "rgba(0, 0, 0, 0)");
            grad.addColorStop(1, "rgba(2, 12, 27, 0.72)");
            aiCtx.fillStyle = grad;
            aiCtx.fillRect(0, 0, W, H);

            aiCtx.save();
            aiCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
            aiCtx.lineWidth = 1.2;
            aiCtx.beginPath();
            aiCtx.arc(W / 2, H / 2, 42, 0, Math.PI * 2);
            aiCtx.stroke();

            aiCtx.beginPath();
            aiCtx.moveTo(W / 2 - 60, H / 2);
            aiCtx.lineTo(W / 2 + 60, H / 2);
            aiCtx.moveTo(W / 2, H / 2 - 60);
            aiCtx.lineTo(W / 2 + 60, H / 2);
            aiCtx.stroke();
            aiCtx.restore();
        }

        if (tgtScreen.visible) {
            const boxSize = 58;
            const bx = tgtScreen.x - boxSize / 2;
            const by = tgtScreen.y - boxSize / 2;
            const boxColor = sim.aiState === "TERMINAL_LOCK" ? "#f43f5e" : "#22d3ee";

            aiCtx.save();
            aiCtx.strokeStyle = boxColor;
            aiCtx.lineWidth = 2.2;
            const arm = 14;

            aiCtx.beginPath();
            aiCtx.moveTo(bx, by + arm); aiCtx.lineTo(bx, by); aiCtx.lineTo(bx + arm, by);
            aiCtx.moveTo(bx + boxSize - arm, by); aiCtx.lineTo(bx + boxSize); aiCtx.lineTo(bx + boxSize, by + arm);
            aiCtx.moveTo(bx, by + boxSize - arm); aiCtx.lineTo(bx, by + boxSize); aiCtx.lineTo(bx + arm, by + boxSize);
            aiCtx.moveTo(bx + boxSize - arm, by + boxSize); aiCtx.lineTo(bx + boxSize); aiCtx.lineTo(bx + boxSize, by + boxSize - arm);
            aiCtx.stroke();

            aiCtx.fillStyle = boxColor;
            aiCtx.font = "bold 11px monospace";
            aiCtx.fillText(
                sim.targetType.toUpperCase() + " [" + sim.aiState + "]",
                bx, by - 8
            );
            aiCtx.font = "9px monospace";
            aiCtx.fillText(
                "CONF: " + (sim.aiConfidence * 100).toFixed(1) + "% | TTI: " + sim.tti.toFixed(2) + "s",
                bx, by + boxSize + 14
            );

            if (leadScreen.visible) {
                aiCtx.strokeStyle = "#facc15";
                aiCtx.fillStyle = "#facc15";
                aiCtx.beginPath();
                aiCtx.arc(leadScreen.x, leadScreen.y, 4, 0, Math.PI * 2);
                aiCtx.fill();
                aiCtx.beginPath();
                aiCtx.arc(leadScreen.x, leadScreen.y, 9, 0, Math.PI * 2);
                aiCtx.stroke();
                aiCtx.font = "bold 8.5px monospace";
                aiCtx.fillText("LEAD", leadScreen.x + 12, leadScreen.y + 3);
            }
            aiCtx.restore();
        }
    }

    function setBtnHighlight(id, active) {
        const btn = document.getElementById(id);
        if (btn) {
            if (active) btn.classList.add("pressed");
            else btn.classList.remove("pressed");
        }
    }

    // --- UI EVENT BINDINGS ---
    document.querySelectorAll(".part-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const slot = this.getAttribute("data-slot");
            const type = this.getAttribute("data-type");
            installPart(slot, type);
        });
    });

    document.getElementById("btn-clear-all").addEventListener("click", function () {
        clearAllParts();
    });

    document.getElementById("btn-launch").addEventListener("click", function () {
        launchRocket();
    });

    document.getElementById("btn-reset-pad").addEventListener("click", function () {
        resetToLaunchPad();
    });

    document.getElementById("btn-cam").addEventListener("click", function () {
        sim.camMode = (sim.camMode + 1) % CAM_NAMES.length;
        document.getElementById("cam-txt").textContent = CAM_NAMES[sim.camMode];
        const hudLayer = document.getElementById("main-hud-layer");
        if (hudLayer) {
            if (sim.camMode === 1 && sim.phase === "FLIGHT") {
                hudLayer.classList.add("fpv-flight-active");
            } else {
                hudLayer.classList.remove("fpv-flight-active");
            }
        }
    });

    document.getElementById("btn-angle").addEventListener("click", function () {
        if (sim.phase !== "ASSEMBLY") return;
        sim.launchElevationDeg = sim.launchElevationDeg === 52 ? 88 : 52;
        const txt = sim.launchElevationDeg === 52 ? "📐 BỆ PHÓNG: NGHIÊNG 52° (ẢNH 1)" : "📐 BỆ PHÓNG: THẲNG ĐỨNG 88° (ẢNH 3, 5)";
        document.getElementById("angle-txt").textContent = txt;
        sim.dir.copy(getPadDirectionVector());
        AudioEngine.playSnapSound(1);
    });

    document.getElementById("btn-sound").addEventListener("click", function () {
        AudioEngine.init();
        AudioEngine.muted = !AudioEngine.muted;
        document.getElementById("sound-txt").textContent = AudioEngine.muted ? "🔇 ÂM THANH: TẮT" : "🔊 ÂM THANH: BẬT";
    });

    document.getElementById("btn-homing").addEventListener("click", function () {
        sim.autoHoming = !sim.autoHoming;
        this.classList.toggle("active", sim.autoHoming);
        this.querySelector("span:first-child").textContent = sim.autoHoming ? "🎯 MOUSE LOOK THEO CHUỘT: BẬT" : "🎯 MOUSE LOOK: TẮT";
    });

    document.querySelectorAll(".tgt-btn[data-target]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".tgt-btn[data-target]").forEach(function (b) { b.classList.remove("active"); });
            this.classList.add("active");
            sim.targetType = this.getAttribute("data-target");
            AudioEngine.playSnapSound(2);
        });
    });

    function toggleAltCursor() {
        sim.altCursorUnlocked = !sim.altCursorUnlocked;
        const statusTxt = document.getElementById("cursor-status-txt");
        const badge = document.getElementById("cursor-mode-badge");

        if (sim.altCursorUnlocked) {
            if (document.exitPointerLock) document.exitPointerLock();
            if (statusTxt) statusTxt.textContent = "TỰ DO CON TRỎ [ALT]";
            if (statusTxt) statusTxt.style.color = "#4ade80";
            if (badge) badge.style.borderColor = "#4ade80";
            showToast("🖱️ <strong>ĐÃ MỞ KHÓA CON TRỎ CHUỘT (CHẾ ĐỘ ALT)!</strong> Bạn có thể tự do bấm chọn menu/lắp ráp. Nhấn <strong>[ALT]</strong> lần nữa hoặc click vào canvas để khóa ngắm.");
        } else {
            if (statusTxt) statusTxt.textContent = "ĐANG KHÓA TPS [ALT]";
            if (statusTxt) statusTxt.style.color = "#fde047";
            if (badge) badge.style.borderColor = "#22d3ee";
            if (sim.phase === "FLIGHT" && sim.camMode === 0) {
                try { activeCanvas.requestPointerLock(); } catch (e) {}
            }
            showToast("🎯 <strong>ĐÃ KHÓA CON TRỎ VÀO TÂM NGẮM TPS!</strong> Di chuột để bẻ mũi tên lửa theo ý muốn.");
        }
        AudioEngine.playSnapSound(0);
    }

    function toggleBulletTime() {
        sim.bulletTimeActive = !sim.bulletTimeActive;
        const banner = document.getElementById("bullet-time-banner");
        const slomoBtn = document.getElementById("btn-slomo");
        if (banner) banner.style.display = sim.bulletTimeActive ? "block" : "none";
        if (slomoBtn) {
            slomoBtn.style.background = sim.bulletTimeActive ? "rgba(239, 68, 68, 0.4)" : "rgba(15, 23, 42, 0.9)";
            slomoBtn.style.boxShadow = sim.bulletTimeActive ? "0 0 16px rgba(239, 68, 68, 0.8)" : "none";
        }
        AudioEngine.playSnapSound(sim.bulletTimeActive ? -1 : 3);
    }

    const cursorBadge = document.getElementById("cursor-mode-badge");
    if (cursorBadge) cursorBadge.addEventListener("click", toggleAltCursor);

    const slomoBtn = document.getElementById("btn-slomo");
    if (slomoBtn) slomoBtn.addEventListener("click", toggleBulletTime);

    function setupPressControl(elemId, keyProp) {
        const el = document.getElementById(elemId);
        if (!el) return;
        const start = function (e) { e.preventDefault(); keys[keyProp] = true; el.classList.add("pressed"); };
        const end = function (e) { e.preventDefault(); keys[keyProp] = false; el.classList.remove("pressed"); };
        el.addEventListener("mousedown", start);
        el.addEventListener("mouseup", end);
        el.addEventListener("mouseleave", end);
        el.addEventListener("touchstart", start, { passive: false });
        el.addEventListener("touchend", end, { passive: false });
    }
    setupPressControl("ctrl-pitch-up", "w");
    setupPressControl("ctrl-pitch-down", "s");
    setupPressControl("ctrl-yaw-left", "a");
    setupPressControl("ctrl-yaw-right", "d");

    // --- KEYBOARD CONTROLS ---
    window.addEventListener("keydown", function (e) {
        const k = e.key.toLowerCase();
        if (e.key === "Alt") {
            e.preventDefault();
            toggleAltCursor();
            return;
        }
        if (k === "q") {
            e.preventDefault();
            toggleBulletTime();
            return;
        }
        if (k === " " || e.code === "Space") {
            e.preventDefault();
            if (sim.phase === "ASSEMBLY") {
                launchRocket();
            } else if (sim.phase === "FLIGHT") {
                resetToLaunchPad();
            }
        } else if (k === "r") {
            resetToLaunchPad();
        } else if (k === "c" || k === "v") {
            sim.camMode = (sim.camMode + 1) % CAM_NAMES.length;
            document.getElementById("cam-txt").textContent = CAM_NAMES[sim.camMode];
            const hudLayer = document.getElementById("main-hud-layer");
            if (hudLayer) {
                if (sim.camMode === 1 && sim.phase === "FLIGHT") {
                    hudLayer.classList.add("fpv-flight-active");
                } else {
                    hudLayer.classList.remove("fpv-flight-active");
                }
            }
        } else if (k === "f") {
            sim.autoHoming = !sim.autoHoming;
            const homingBtn = document.getElementById("btn-homing");
            if (homingBtn) {
                homingBtn.classList.toggle("active", sim.autoHoming);
                homingBtn.querySelector("span:first-child").textContent = sim.autoHoming ? "🎯 MOUSE LOOK THEO CHUỘT: BẬT" : "🎯 MOUSE LOOK: TẮT";
            }
        } else if (k === "w") {
            keys.w = true;
            setBtnHighlight("ctrl-pitch-up", true);
        } else if (k === "s") {
            keys.s = true;
            setBtnHighlight("ctrl-pitch-down", true);
        } else if (k === "a") {
            keys.a = true;
            setBtnHighlight("ctrl-yaw-left", true);
        } else if (k === "d") {
            keys.d = true;
            setBtnHighlight("ctrl-yaw-right", true);
        }
    });

    window.addEventListener("keyup", function (e) {
        const k = e.key.toLowerCase();
        if (k === "w") {
            keys.w = false;
            setBtnHighlight("ctrl-pitch-up", false);
        } else if (k === "s") {
            keys.s = false;
            setBtnHighlight("ctrl-pitch-down", false);
        } else if (k === "a") {
            keys.a = false;
            setBtnHighlight("ctrl-yaw-left", false);
        } else if (k === "d") {
            keys.d = false;
            setBtnHighlight("ctrl-yaw-right", false);
        }
    });

    window.addEventListener("contextmenu", function (e) {
        if (sim.phase === "FLIGHT") {
            e.preventDefault();
        }
    });

    activeCanvas.addEventListener("click", function () {
        if (sim.altCursorUnlocked) return;
        if (sim.phase === "FLIGHT" && sim.camMode === 0) {
            try {
                if (document.pointerLockElement !== activeCanvas) {
                    activeCanvas.requestPointerLock();
                }
            } catch (e) {}
        }
    });

    activeCanvas.addEventListener("pointerdown", function (e) {
        if (e.button === 2 && sim.phase === "FLIGHT") {
            e.preventDefault();
            toggleBulletTime();
            return;
        }
        if (sim.altCursorUnlocked) return;
        sim.dragging = true;
        sim.lastX = e.clientX;
        sim.lastY = e.clientY;
        sim.lastDragTime = performance.now();
    });

    window.addEventListener("pointermove", function (e) {
        if (sim.altCursorUnlocked) return;
        let dx = 0;
        let dy = 0;

        if (document.pointerLockElement === activeCanvas) {
            dx = e.movementX || 0;
            dy = e.movementY || 0;
        } else if (sim.dragging) {
            dx = e.clientX - sim.lastX;
            dy = e.clientY - sim.lastY;
            sim.lastX = e.clientX;
            sim.lastY = e.clientY;
        } else {
            return;
        }

        sim.lastDragTime = performance.now();

        if (sim.camMode === 0) {
            sim.tpsYaw -= dx * sim.mouseSensitivity;
            sim.tpsPitch = Math.max(-0.65, Math.min(1.42, sim.tpsPitch - dy * sim.mouseSensitivity));
        } else {
            sim.camTheta -= dx * 0.007;
            sim.camPhi = Math.max(-0.05, Math.min(1.25, sim.camPhi + dy * 0.006));
        }
    });

    window.addEventListener("pointerup", function () {
        sim.dragging = false;
    });

    activeCanvas.addEventListener("wheel", function (e) {
        if (sim.camMode === 0 && sim.phase === "FLIGHT") {
            sim.chaseZoomDist = Math.max(8.0, Math.min(28.0, sim.chaseZoomDist + e.deltaY * 0.012));
        } else {
            sim.camDist = Math.max(7.5, Math.min(36, sim.camDist + e.deltaY * 0.014));
        }
    }, { passive: true });

    window.addEventListener("resize", function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        if (renderer) {
            renderer.setSize(window.innerWidth, window.innerHeight);
        } else if (fallbackCtx) {
            fallbackCtx.canvas.width = window.innerWidth;
            fallbackCtx.canvas.height = window.innerHeight;
        }
        resizeAiHud();
    });

    resetToLaunchPad();

    let prevTime = performance.now();
    function animate(now) {
        requestAnimationFrame(animate);
        const dt = Math.min((now - prevTime) / 1000, 0.05);
        prevTime = now;

        updateSimulation(dt);
        if (renderer) {
            renderer.render(scene, camera);
        }
        renderAiSeekerHUD();
    }

    window.onload = function () {
        requestAnimationFrame(animate);
    };
})();
