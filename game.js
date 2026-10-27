// ============================================================
// NINJA RUN - GAME.JS
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1000;
canvas.height = 500;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = 420;

// ============================================================
// GAME STATE
// ============================================================

const STATE = {
    MENU: "menu",
    PLAYING: "playing",
    PAUSED: "paused",
    DEAD: "dead",
    GAMEOVER: "gameover"
};

let gameState = STATE.MENU;

let lastTime = 0;
let score = 0;

let highScore =
    Number(localStorage.getItem("ninjaHighScore")) || 0;

let gameSpeed = 5;

let obstacleTimer = 0;
let nextObstacleTime = 1200;

let powerUpTimer = 0;

// ============================================================
// IMAGE LOADER
// ============================================================

function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

const sprites = {
    run: [
        loadImage("assets/run1.png"),
        loadImage("assets/run2.png"),
        loadImage("assets/run3.png"),
        loadImage("assets/run4.png")
    ],
    
    jump: [
        loadImage("assets/jump1.png"),
        loadImage("assets/jump2.png"),
        loadImage("assets/jump3.png"),
        loadImage("assets/jump4.png")
    ],
    
    slide: [
        loadImage("assets/slide1.png"),
        loadImage("assets/slide2.png"),
        loadImage("assets/slide3.png"),
        loadImage("assets/slide4.png")
    ],
    
    hit: [
        loadImage("assets/hit1.png"),
        loadImage("assets/hit2.png"),
        loadImage("assets/hit3.png"),
        loadImage("assets/hit4.png")
    ]
};

// ============================================================
// ANIMATION SPEED
// ============================================================

const animationSpeed = {
    run: 90,
    jump: 100,
    slide: 180,
    hit: 180
};

// ============================================================
// PLAYER
// ============================================================

const player = {

    x: 150,

    y: GROUND_Y - 78,

    width: 58,
    height: 78,

    velocityY: 0,

    gravity: 0.82,

    jumpPower: -12,

    // ========================================================
    // JUMP SYSTEM
    // ========================================================

    // Normalnya hanya boleh 1 kali jump
    jumps: 0,

    // NORMAL = 1
    // DOUBLE JUMP BUFF = 2
    maxJumps: 1,

    // ========================================================
    // SLIDE
    // ========================================================

    isSliding: false,

    slideTimer: 0,

    slideDuration: 900,

    // ========================================================
    // POWER UPS
    // ========================================================

    shieldTime: 0,

    shieldCooldown: 0,

    doubleJumpTime: 0,

    speedBoostTime: 0,

    // ========================================================
    // ANIMATION
    // ========================================================

    animationFrame: 0,

    animationTimer: 0,

    slideFrame: 0,

    slideAnimationTimer: 0,

    deathFrame: 0,

    deathTimer: 0,

    afterImages: []
};

// ============================================================
// OBJECT ARRAYS
// ============================================================

let obstacles = [];
let powerUps = [];
let particles = [];
let enemyKunai = [];
let kunaiSpawnTimer = 0;

let buffEffectTime = 0;
let shieldPulseTime = 0;
let doubleJumpFlash = 0;


// ============================================================
// POWER UP TYPES
// ============================================================

const POWERUP_TYPES = {

    SHIELD: "shield",

    DOUBLE_JUMP: "doubleJump",

    SPEED: "speed"
};

// ============================================================
// UI
// ============================================================

const scoreElement =
    document.getElementById("score");

const highScoreElement =
    document.getElementById("highScore");

const startScreen =
    document.getElementById("startScreen");

const gameOverScreen =
    document.getElementById("gameOverScreen");

const finalScore =
    document.getElementById("finalScore");

const startButton =
    document.getElementById("startButton");

const restartButton =
    document.getElementById("restartButton");

const jumpButton =
    document.getElementById("jumpButton");

const slideButton =
    document.getElementById("slideButton");

highScoreElement.textContent =
    `HIGH SCORE: ${Math.floor(highScore)}`;

// ============================================================
// AUDIO
// ============================================================

// ============================================================
// AUDIO SYSTEM - NINJA RUN
// ============================================================

const audio = {
    bgm: new Audio("audio/bgm.mp3"),
    run: new Audio("audio/run.wav"),
    jump: new Audio("audio/jump.wav"),
    slide: new Audio("audio/slide.wav"),
    death: new Audio("audio/death.wav"),
    kunai: new Audio("audio/kunai.wav"), 
    // Suara saat mengambil buff
    pickup: new Audio("audio/powerup.wav"), 
    shieldBreak: new Audio("audio/shield_break.wav")
};

// BGM
audio.bgm.loop = true;
audio.bgm.volume = 0.25;

// SFX
audio.run.volume = 0.75;
audio.jump.volume = 0.55;
audio.slide.volume = 0.55;
audio.death.volume = 0.7;
audio.kunai.volume = 0.45;
audio.pickup.volume = 0.65;

// Timer untuk suara lari
let runSoundTimer = 0;

// ============================================================
// PLAY AUDIO
// ============================================================

function playAudio(name) {
    const sound = audio[name];

    if (!sound) return;

    // Jangan mulai suara jika game sedang pause
    if (gameState === STATE.PAUSED) return;

    try {
        sound.currentTime = 0;

        const playPromise = sound.play();

        if (playPromise !== undefined) {
            playPromise.catch(() => {});
        }
    } catch (error) {
        console.warn("Audio gagal dimainkan:", name);
    }
}

// ============================================================
// STOP AUDIO
// ============================================================

function stopAudio(name) {
    const sound = audio[name];

    if (!sound) return;

    sound.pause();
    sound.currentTime = 0;
}

// ============================================================
// STOP ALL SFX
// ============================================================

function stopAllSFX() {
    stopAudio("run");
    stopAudio("jump");
    stopAudio("slide");
    stopAudio("death");
    stopAudio("kunai");
    stopAudio("pickup");
}

// ============================================================
// BGM CONTROL
// ============================================================

function playBGM() {
    audio.bgm.play().catch(() => {});
}

function pauseBGM() {
    audio.bgm.pause();
}

function stopBGM() {
    audio.bgm.pause();
    audio.bgm.currentTime = 0;
}

// ============================================================
// START GAME
// ============================================================

function startGame() {

    stopAllSFX();
    playBGM();

    runSoundTimer = 0;

    score = 0;

    gameSpeed = 5;

    obstacleTimer = 0;

    nextObstacleTime = 1200;
    
    enemyKunai = [];
    
    kunaiSpawnTimer = 0;

    powerUpTimer = 0;

    obstacles = [];

    powerUps = [];

    particles = [];

    
    resetPlayer();

    gameState =
        STATE.PLAYING;

    startScreen.classList.add(
        "hidden"
    );

    gameOverScreen.classList.add(
        "hidden"
    );

    lastTime =
        performance.now();
}

// ============================================================
// RESET PLAYER
// ============================================================

function resetPlayer() {

    player.x = 150;

    player.y =
        GROUND_Y -
        player.height;

    player.velocityY = 0;

    player.jumps = 0;

    // ========================================================
    // PENTING:
    // SETELAH GAME DIMULAI, DOUBLE JUMP TIDAK AKTIF
    // ========================================================

    player.maxJumps = 1;

    player.isSliding = false;

    player.slideTimer = 0;

    player.shieldTime = 0;

    player.shieldCooldown = 0;

    player.doubleJumpTime = 0;

    player.speedBoostTime = 0;

    player.animationFrame = 0;

    player.animationTimer = 0;

    player.slideFrame = 0;

    player.slideAnimationTimer = 0;

    player.deathFrame = 0;

    player.deathTimer = 0;

    player.afterImages = [];
}

// ============================================================
// JUMP
// ============================================================

function jump() {

    if (
        gameState === STATE.MENU
    ) {

        startGame();

        return;
    }

    if (
        gameState !== STATE.PLAYING
    ) {

        return;
    }

    // Kalau sedang slide,
    // jump membatalkan slide
    if (
        player.isSliding
    ) {

        stopSlide();
    }

    // ========================================================
    // JUMP CHECK
    // ========================================================

    if (
        player.jumps <
        player.maxJumps
    ) {

        player.velocityY =
            player.jumpPower;

        player.jumps++;

if (
    player.jumps === 2 &&
    player.doubleJumpTime > 0
) {
    doubleJumpFlash = 180;
}

createJumpAfterImage();

        stopAudio("run");
        playAudio("jump");
    }
}

// ============================================================
// SLIDE
// ============================================================

function slide() {

    if (
        gameState !== STATE.PLAYING
    ) {

        return;
    }

    // Tidak bisa slide di udara
    if (
        player.y <
        GROUND_Y -
        player.height
    ) {

        return;
    }

    // Jika sudah slide,
    // jangan restart durasi
    if (
        player.isSliding
    ) {

        return;
    }

    player.isSliding = true;

    player.slideTimer =
        player.slideDuration;

    player.slideFrame = 0;

    player.slideAnimationTimer = 0;

    stopAudio("run");
    playAudio("slide");
}

// ============================================================
// STOP SLIDE
// ============================================================

function stopSlide() {

    player.isSliding = false;

    player.slideTimer = 0;

    player.slideFrame = 0;

    player.slideAnimationTimer = 0;
}

// ============================================================
// PLAYER UPDATE
// ============================================================

function updatePlayer(delta) {
    
    const dt =
        delta / 16.67;

    doubleJumpFlash = Math.max(
    0,
    doubleJumpFlash - delta
);
        
//========================================================
// RUN SOUND
// ========================================================

const isOnGround =
    player.y >= GROUND_Y - player.height;

if (
    isOnGround &&
    !player.isSliding &&
    gameState === STATE.PLAYING
) {
    runSoundTimer += delta;

    // Jeda antar langkah kaki
    const runSoundInterval = Math.max(
        220,
        340 - gameSpeed * 8
    );

    if (runSoundTimer >= runSoundInterval) {
        runSoundTimer = 0;
        playAudio("run");
    }
} else {
    runSoundTimer = 0;
    stopAudio("run");
}
        
        
        

    // ========================================================
    // DEATH
    // ========================================================

    if (
        gameState === STATE.DEAD ||
        gameState === STATE.GAMEOVER
    ) {

        updateDeathAnimation(delta);

        return;
    }

    // ========================================================
    // GRAVITY
    // ========================================================

    player.velocityY +=
        player.gravity * dt;

    player.y +=
        player.velocityY * dt;

    // ========================================================
    // GROUND
    // ========================================================

    if (
        player.y >=
        GROUND_Y -
        player.height
    ) {

        player.y =
            GROUND_Y -
            player.height;

        player.velocityY = 0;

        player.jumps = 0;
    }

    // ========================================================
    // SLIDE TIMER
    // ========================================================

    if (
        player.isSliding
    ) {

        player.slideTimer -=
            delta;

        if (
            player.slideTimer <= 0
        ) {

            stopSlide();
        }
    }

    // ========================================================
    // SHIELD
    // ========================================================

    if (
        player.shieldTime > 0
    ) {

        player.shieldTime -=
            delta;

        if (
            player.shieldTime <= 0
        ) {

            player.shieldTime = 0;
        }
    }

    // ========================================================
    // SHIELD COOLDOWN
    // ========================================================

    if (
        player.shieldCooldown > 0
    ) {

        player.shieldCooldown -=
            delta;

        if (
            player.shieldCooldown <= 0
        ) {

            player.shieldCooldown = 0;
        }
    }

    // ========================================================
    // DOUBLE JUMP TIMER
    // ========================================================

    if (
        player.doubleJumpTime > 0
    ) {

        player.doubleJumpTime -=
            delta;

        // ====================================================
        // DOUBLE JUMP SELESAI
        // ====================================================

        if (
            player.doubleJumpTime <= 0
        ) {

            player.doubleJumpTime = 0;

            // Kembali ke normal:
            // hanya 1 kali lompat
            player.maxJumps = 1;

            // Kalau sudah melakukan jump kedua
            // sebelum buff habis, jangan sampai
            // bisa melakukan jump tambahan.
            if (
                player.jumps >
                player.maxJumps
            ) {

                player.jumps =
                    player.maxJumps;
            }
        }
    }

    // ========================================================
    // SPEED BOOST
    // ========================================================

    if (
        player.speedBoostTime > 0
    ) {

        player.speedBoostTime -=
            delta;

        if (
            player.speedBoostTime <= 0
        ) {

            player.speedBoostTime = 0;
        }
    }

    // ========================================================
    // RUN ANIMATION
    // ========================================================

    if (
        player.y >=
        GROUND_Y -
        player.height &&
        !player.isSliding
    ) {

        player.animationTimer +=
            delta;

        if (
            player.animationTimer >=
            animationSpeed.run
        ) {

            player.animationTimer = 0;

            player.animationFrame++;

            if (
                player.animationFrame >=
                sprites.run.length
            ) {

                player.animationFrame = 0;
            }
        }
    }

    // ========================================================
    // JUMP ANIMATION
    // ========================================================

    if (
        player.y <
        GROUND_Y -
        player.height
    ) {

        player.animationTimer +=
            delta;

        if (
            player.animationTimer >=
            animationSpeed.jump
        ) {

            player.animationTimer = 0;

            player.animationFrame++;

            if (
                player.animationFrame >=
                sprites.jump.length
            ) {

                player.animationFrame =
                    sprites.jump.length - 1;
            }
        }
    }

    // ========================================================
    // SLIDE ANIMATION
    // ========================================================

    if (
        player.isSliding
    ) {

        player.slideAnimationTimer +=
            delta;

        if (
            player.slideAnimationTimer >=
            animationSpeed.slide
        ) {

            player.slideAnimationTimer = 0;

            if (
                player.slideFrame <
                sprites.slide.length - 1
            ) {

                player.slideFrame++;
            }
        }
    }
}

// ============================================================
// DEATH ANIMATION
// ============================================================

function updateDeathAnimation(delta) {

    if (
        gameState !== STATE.DEAD &&
        gameState !== STATE.GAMEOVER
    ) {

        return;
    }

    if (
        gameState === STATE.GAMEOVER
    ) {

        player.deathFrame =
            sprites.hit.length - 1;

        return;
    }

    player.deathTimer +=
        delta;

    if (
        player.deathTimer >=
        animationSpeed.hit
    ) {

        player.deathTimer = 0;

        if (
            player.deathFrame <
            sprites.hit.length - 1
        ) {

            player.deathFrame++;
        }

        if (
            player.deathFrame >=
            sprites.hit.length - 1
        ) {

            player.deathFrame =
                sprites.hit.length - 1;

            gameOver();
        }
    }
}

// ============================================================
// DIE
// ============================================================

function die() {

    if (
        gameState === STATE.DEAD ||
        gameState === STATE.GAMEOVER
    ) {

        return;
    }

    gameState =
        STATE.DEAD;

    player.velocityY = 0;

    player.isSliding = false;

    player.deathFrame = 0;

    player.deathTimer = 0;

    createHitParticles(
        player.x +
        player.width / 2,

        player.y +
        player.height / 2
    );

     stopAudio("run");
     stopAudio("jump");
     stopAudio("slide");
     playAudio("death");
    
}

// ============================================================
// GAME OVER
// ============================================================

function gameOver() {

    gameState =
        STATE.GAMEOVER;

    player.deathFrame =
        sprites.hit.length - 1;

    player.deathTimer = 0;

    player.isSliding = false;

    if (score > highScore) {
    highScore = Math.floor(score);

    localStorage.setItem(
        "ninjaHighScore",
        highScore
    );
    }

    highScoreElement.textContent =
        `HIGH SCORE: ${highScore}`;

    finalScore.textContent =
        `SCORE: ${Math.floor(score)}`;

    gameOverScreen.classList.remove(
        "hidden"
    );
}




function drawBuffCharacterEffects() {
    const now = performance.now();
    const airborne =
        player.y < GROUND_Y - player.height;

    // ========================================================
    // SPEED BOOST: GARIS KECEPATAN DI BELAKANG NINJA
    // ========================================================
    if (player.speedBoostTime > 0) {
        ctx.save();

        const intensity =
            0.65 + Math.sin(now * 0.025) * 0.2;

        ctx.globalAlpha = intensity;
        ctx.lineCap = "round";

        for (let i = 0; i < 7; i++) {
            const lineY =
                player.y + 14 + i * 9;

            const length =
                15 + ((i * 13 + Math.floor(now / 35)) % 25);

            const drift =
                (now * 0.22 + i * 17) % 35;

            ctx.beginPath();
            ctx.moveTo(
                player.x - 8 - drift,
                lineY
            );
            ctx.lineTo(
                player.x - 8 - drift - length,
                lineY - 3
            );

            ctx.strokeStyle =
                i % 2 === 0 ? "#67E8F9" : "#38BDF8";

            ctx.lineWidth = i % 2 === 0 ? 3 : 2;
            ctx.shadowColor = "#22D3EE";
            ctx.shadowBlur = 9;
            ctx.stroke();
        }

        // Cahaya tipis di sekitar tubuh
        const glow = ctx.createRadialGradient(
            player.x + player.width / 2,
            player.y + player.height / 2,
            5,
            player.x + player.width / 2,
            player.y + player.height / 2,
            55
        );

        glow.addColorStop(0, "rgba(34,211,238,0.12)");
        glow.addColorStop(1, "rgba(34,211,238,0)");

        ctx.fillStyle = glow;
        ctx.fillRect(
            player.x - 25,
            player.y - 25,
            player.width + 50,
            player.height + 50
        );

        ctx.restore();
    }

    // ========================================================
    // DOUBLE JUMP: CAHAYA EMAS DI KAKI
    // ========================================================
    if (player.doubleJumpTime > 0) {
        ctx.save();

        const footX =
            player.x + player.width / 2;

        const footY =
            player.y + player.height - 2;

        const pulse =
            0.75 + Math.sin(now * 0.012) * 0.2;

        const radius =
            airborne ? 23 : 18;

        const glow = ctx.createRadialGradient(
            footX, footY, 1,
            footX, footY, radius
        );

        glow.addColorStop(
            0,
            `rgba(255,245,150,${0.65 * pulse})`
        );

        glow.addColorStop(
            0.45,
            `rgba(250,204,21,${0.3 * pulse})`
        );

        glow.addColorStop(1, "rgba(250,204,21,0)");

        ctx.fillStyle = glow;

        ctx.beginPath();
        ctx.ellipse(
            footX,
            footY,
            radius,
            airborne ? 13 : 10,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Percikan emas saat jump kedua baru digunakan
        if (doubleJumpFlash > 0) {
            ctx.globalAlpha =
                Math.min(1, doubleJumpFlash / 180);

            ctx.strokeStyle = "#FDE047";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#FACC15";
            ctx.shadowBlur = 12;

            for (let i = 0; i < 6; i++) {
                const angle =
                    (Math.PI * 2 * i / 6) +
                    now * 0.004;

                const inner = 8;
                const outer = 15 +
                    (1 - doubleJumpFlash / 180) * 8;

                ctx.beginPath();
                ctx.moveTo(
                    footX + Math.cos(angle) * inner,
                    footY + Math.sin(angle) * inner
                );
                ctx.lineTo(
                    footX + Math.cos(angle) * outer,
                    footY + Math.sin(angle) * outer
                );
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}





 // ============================================================
 // DRAW PLAYER
 // ============================================================

function drawPlayer() {

    // ========================================================
    // DEATH
    // ========================================================

    if (
        gameState === STATE.DEAD ||
        gameState === STATE.GAMEOVER
    ) {

        if (
            gameState === STATE.GAMEOVER
        ) {
            player.deathFrame =
                sprites.hit.length - 1;
        }

        const image =
            sprites.hit[player.deathFrame];

        if (image && image.complete) {
            ctx.drawImage(
                image,
                player.x - 17,
                player.y - 18,
                92,
                96
            );
        }

        return;
    }

    // ========================================================
    // BUFF EFFECTS
    // Digambar sebelum ninja agar berada di belakangnya
    // ========================================================

    drawBuffCharacterEffects();

    // ========================================================
    // AFTER IMAGE
    // ========================================================

    for (
        let i = 0;
        i < player.afterImages.length;
        i++
    ) {
        const after = player.afterImages[i];

        ctx.save();
        ctx.globalAlpha = after.alpha;

        const afterImage =
            sprites.jump[after.frame];

        if (afterImage && afterImage.complete) {
            ctx.drawImage(
                afterImage,
                after.x - 17,
                after.y - 18,
                92,
                96
            );
        }

        ctx.restore();
    }

    // ========================================================
    // SELECT SPRITE
    // ========================================================

    let image;

    if (player.isSliding) {
        image =
            sprites.slide[player.slideFrame];

    } else if (
        player.y < GROUND_Y - player.height
    ) {
        image =
            sprites.jump[player.animationFrame];

    } else {
        image =
            sprites.run[player.animationFrame];
    }

    if (!image || !image.complete) {
        return;
    }

    let drawX = player.x - 17;
    let drawY = player.y - 18;
    let drawWidth = 92;
    let drawHeight = 96;

    if (player.isSliding) {
        drawX = player.x - 17;
        drawY = player.y - 18;
        drawWidth = 92;
        drawHeight = 96;
    }

    ctx.drawImage(
        image,
        drawX,
        drawY,
        drawWidth,
        drawHeight
    );

    // ========================================================
    // SHIELD VISUAL - ENERGY BARRIER
    // ========================================================

    if (player.shieldTime > 0) {
        const now = performance.now();

        const cx =
            player.x + player.width / 2;

        const cy =
            player.y + player.height / 2;

        const pulse =
            Math.sin(now * 0.008) * 3;

        const radius = 48 + pulse;
        const rotation = now * 0.0015;

        ctx.save();

        // Aura luar
        const aura = ctx.createRadialGradient(
            cx, cy, 20,
            cx, cy, radius + 12
        );

        aura.addColorStop(
            0,
            "rgba(34,211,238,0.02)"
        );

        aura.addColorStop(
            0.75,
            "rgba(34,211,238,0.12)"
        );

        aura.addColorStop(
            1,
            "rgba(34,211,238,0)"
        );

        ctx.fillStyle = aura;

        ctx.beginPath();
        ctx.arc(
            cx, cy, radius + 12,
            0, Math.PI * 2
        );
        ctx.fill();

        // Lingkaran energi utama
        ctx.beginPath();
        ctx.arc(
            cx, cy, radius,
            0, Math.PI * 2
        );

        ctx.strokeStyle =
            "rgba(103,232,249,0.95)";

        ctx.lineWidth = 3;
        ctx.shadowColor = "#22D3EE";
        ctx.shadowBlur = 18;
        ctx.stroke();

        // Lingkaran dalam
        ctx.beginPath();
        ctx.arc(
            cx, cy, radius - 7,
            0, Math.PI * 2
        );

        ctx.strokeStyle =
            "rgba(56,189,248,0.45)";

        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 5;
        ctx.stroke();

        // Titik energi berputar
        for (let i = 0; i < 4; i++) {
            const angle =
                rotation + i * Math.PI / 2;

            const px =
                cx + Math.cos(angle) * radius;

            const py =
                cy + Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, Math.PI * 2);

            ctx.fillStyle = "#E0FCFF";
            ctx.shadowColor = "#22D3EE";
            ctx.shadowBlur = 12;
            ctx.fill();
        }

        ctx.restore();
    }
}


// ============================================================
// AFTER IMAGE
// ============================================================

function createJumpAfterImage() {

    player.afterImages.push({

        x: player.x,

        y: player.y,

        frame:
            player.animationFrame,

        alpha: 0.45
    });
}

function updateAfterImages(delta) {

    for (
        let i =
            player.afterImages.length - 1;

        i >= 0;

        i--
    ) {

        player.afterImages[i].alpha -=
            0.03 *
            (delta / 16.67);

        if (
            player.afterImages[i].alpha <= 0
        ) {

            player.afterImages.splice(
                i,
                1
            );
        }
    }
}

// ============================================================
// OBSTACLES
// ============================================================


function spawnObstacle() {
    const ceilingAllowed = score >= 300;
    const tallAllowed = score >= 1800;

    const world = getWorld();
    const random = Math.random();

    let type;

    // RINTANGAN DESA JEPANG
    if (world === "village") {
        type = random < 0.55
            ? "kunai"
            : "barricade";
    }

    // RINTANGAN HUTAN BAMBU
    else if (world === "bamboo") {
        type = random < 0.55
            ? "kunai"
            : "barricade";
    }

    // RINTANGAN RERUNTUHAN KUIL
    else {
        type = random < 0.55
            ? "rubble"
            : "barricade";
    }

    // RINTANGAN TINGGI: MUNCUL SETELAH SKOR 1800
    if (tallAllowed && Math.random() < 0.20) {
        type = "tall";
    }

    // RINTANGAN ATAS: MULAI SKOR 300
    else if (
        ceilingAllowed &&
        Math.random() < 0.25
    ) {
        type = "ceiling";
    }

    const obstacle = {
        x: WIDTH + 50,
        y: GROUND_Y - 42,
        width: 48,
        height: 42,
        type: type
    };

    // KUNAI TERTANCAP
    if (type === "kunai") {
        obstacle.width = 38;
        obstacle.height = 34;
        obstacle.y = GROUND_Y - obstacle.height;
    }

    // BARIKADE KAYU
    if (type === "barricade") {
        obstacle.width = 58;
        obstacle.height = 48;
        obstacle.y = GROUND_Y - obstacle.height;
    }

    // PECAHAN BATU KUIL
    if (type === "rubble") {
        obstacle.width = 52;
        obstacle.height = 38;
        obstacle.y = GROUND_Y - obstacle.height;
    }

    // PILAR BATU TINGGI
    if (type === "tall") {
        obstacle.width = 48;
        obstacle.height = 90;
        obstacle.y = GROUND_Y - obstacle.height;
    }

    // BALOK ATAU PERANGKAP ATAS
    if (type === "ceiling") {
        obstacle.width = 90;
        obstacle.height = 32;
        obstacle.y = 328;
    }

    obstacles.push(obstacle);
}

//kunai------///



function spawnEnemyKunai() {
    if (score < 150) return;
    
    const spawnX = WIDTH + 100;
    const safeDistance = 220 + gameSpeed * 15;
    
    // Periksa rintangan yang sudah ada
    for (const obstacle of obstacles) {
        const obstacleRight = obstacle.x + obstacle.width;
        
        // Abaikan rintangan yang sudah lewat
        if (obstacleRight < 0) continue;
        
        // Jangan munculkan kunai jika terlalu dekat
        // dengan rintangan yang masih aktif
        if (
            obstacle.x < spawnX + safeDistance &&
            obstacleRight > spawnX - safeDistance
        ) {
            return;
        }
    }
    
    // Pilih jalur kunai secara acak
    const fromHigh = Math.random() < 0.5;
    
    enemyKunai.push({
        x: spawnX,
        y: fromHigh ? GROUND_Y - 100 : GROUND_Y - 32,
        width: 38,
        height: 12,
        speed: gameSpeed + 5,
        angle: 0,
        fromHigh: fromHigh
    });
    
    playAudio("kunai");
}

/// UPDATE KUNAI////




function updateEnemyKunai(delta) {
    // Jangan munculkan kunai sebelum skor mencapai 150.
    if (score < 150) {
        kunaiSpawnTimer = 0;
        return;
    }

    kunaiSpawnTimer += delta;

    if (kunaiSpawnTimer >= 3500) {
        spawnEnemyKunai();
        kunaiSpawnTimer = 0;
    }

    for (let i = enemyKunai.length - 1; i >= 0; i--) {
        const kunai = enemyKunai[i];

        kunai.x -= kunai.speed * (delta / 16.67);
        kunai.angle -= 0.12 * (delta / 16.67);

        if (kunai.x + kunai.width < 0) {
            enemyKunai.splice(i, 1);
        }
    }
}



//draw kunai)/////

function drawEnemyKunai() {
    for (const kunai of enemyKunai) {
        ctx.save();
        
        // Titik tengah shuriken
        const centerX = kunai.x + kunai.width / 2;
        const centerY = kunai.y + kunai.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate(kunai.angle);
        
        // Bayangan shuriken
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        
        // Bentuk bintang empat
        const outerRadius = 15;
        const innerRadius = 5;
        
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i - Math.PI / 2;
            const radius = i % 2 === 0 ?
                outerRadius :
                innerRadius;
            
            const x = Math.cos(angle) * radius + 2;
            const y = Math.sin(angle) * radius + 2;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
        
        // Badan logam shuriken
        const metalGradient = ctx.createLinearGradient(
            -outerRadius, -outerRadius,
            outerRadius, outerRadius
        );
        
        metalGradient.addColorStop(0, "#f0f3f8");
        metalGradient.addColorStop(0.45, "#8995a5");
        metalGradient.addColorStop(1, "#343c49");
        
        ctx.fillStyle = metalGradient;
        ctx.strokeStyle = "#202630";
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i - Math.PI / 2;
            const radius = i % 2 === 0 ?
                outerRadius :
                innerRadius;
            
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Lubang kecil di tengah
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "#202630";
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(-0.5, -0.5, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "#dce3eb";
        ctx.fill();
        
        ctx.restore();
    }
}



// ============================================================
// UPDATE OBSTACLES
// ============================================================

function updateObstacles(delta) {

    const dt =
        delta / 16.67;

    let currentSpeed =
        gameSpeed;

    if (
        player.speedBoostTime > 0
    ) {

        currentSpeed *= 1.7;
    }

    for (
        let i =
            obstacles.length - 1;

        i >= 0;

        i--
    ) {

        obstacles[i].x -=
            currentSpeed *
            dt;

        if (
            obstacles[i].x +
            obstacles[i].width <
            -100
        ) {

            obstacles.splice(
                i,
                1
            );

            score += 10;
        }
    }

    obstacleTimer +=
        delta;

    if (
        obstacleTimer >=
        nextObstacleTime
    ) {

        obstacleTimer = 0;

        spawnObstacle();

        nextObstacleTime =
            900 +
            Math.random() *
            800;
    }
}

// ============================================================
// DRAW OBSTACLES
// ============================================================


function drawObstacles() {
    for (const obstacle of obstacles) {
        ctx.save();

        // KUNAI TERTANCAP DI TANAH
        if (obstacle.type === "kunai") {
            ctx.translate(
                obstacle.x,
                obstacle.y
            );

            ctx.fillStyle = "#737A82";
            ctx.strokeStyle = "#17191D";
            ctx.lineWidth = 2;

            // Bilah kunai
            ctx.beginPath();
            ctx.moveTo(19, 0);
            ctx.lineTo(29, 20);
            ctx.lineTo(19, 25);
            ctx.lineTo(9, 20);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Gagang
            ctx.fillStyle = "#35383D";
            ctx.fillRect(16, 22, 6, 12);

            // Cincin gagang
            ctx.beginPath();
            ctx.arc(19, 34, 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        // BARIKADE KAYU
        else if (obstacle.type === "barricade") {
            ctx.fillStyle = "#302720";
            ctx.strokeStyle = "#111111";
            ctx.lineWidth = 2;

            // Papan utama
            ctx.fillRect(
                obstacle.x,
                obstacle.y + 12,
                obstacle.width,
                22
            );

            ctx.strokeRect(
                obstacle.x,
                obstacle.y + 12,
                obstacle.width,
                22
            );

            // Ujung kayu runcing
            ctx.beginPath();
            ctx.moveTo(obstacle.x, obstacle.y + 12);
            ctx.lineTo(obstacle.x + 10, obstacle.y);
            ctx.lineTo(obstacle.x + 20, obstacle.y + 12);
            ctx.lineTo(obstacle.x + 30, obstacle.y);
            ctx.lineTo(obstacle.x + 40, obstacle.y + 12);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Serat kayu
            ctx.strokeStyle = "#77604A";
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(obstacle.x + 5, obstacle.y + 22);
            ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y + 22);
            ctx.stroke();
        }

        // PECAHAN BATU RERUNTUHAN
        else if (obstacle.type === "rubble") {
            ctx.fillStyle = "#555157";
            ctx.strokeStyle = "#242126";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
            ctx.lineTo(obstacle.x + 5, obstacle.y + 15);
            ctx.lineTo(obstacle.x + 20, obstacle.y + 5);
            ctx.lineTo(obstacle.x + 31, obstacle.y + 12);
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + 2);
            ctx.lineTo(
                obstacle.x + obstacle.width - 4,
                obstacle.y + obstacle.height
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Retakan batu
            ctx.strokeStyle = "#29272C";
            ctx.beginPath();
            ctx.moveTo(obstacle.x + 22, obstacle.y + 10);
            ctx.lineTo(obstacle.x + 26, obstacle.y + 23);
            ctx.lineTo(obstacle.x + 18, obstacle.y + 30);
            ctx.stroke();
        }

        // PILAR BATU TINGGI
        else if (obstacle.type === "tall") {
            ctx.fillStyle = "#38363B";
            ctx.strokeStyle = "#171619";
            ctx.lineWidth = 2;

            ctx.fillRect(
                obstacle.x + 5,
                obstacle.y + 10,
                obstacle.width - 10,
                obstacle.height - 10
            );

            ctx.fillRect(
                obstacle.x,
                obstacle.y,
                obstacle.width,
                14
            );

            ctx.strokeRect(
                obstacle.x,
                obstacle.y,
                obstacle.width,
                14
            );

            // Retakan pilar
            ctx.strokeStyle = "#777078";
            ctx.beginPath();
            ctx.moveTo(obstacle.x + 20, obstacle.y + 20);
            ctx.lineTo(obstacle.x + 25, obstacle.y + 38);
            ctx.lineTo(obstacle.x + 17, obstacle.y + 52);
            ctx.stroke();
        }

        // BALOK / PERANGKAP ATAS
        else if (obstacle.type === "ceiling") {
            ctx.fillStyle = "#302820";
            ctx.strokeStyle = "#141312";
            ctx.lineWidth = 2;

            // Balok horizontal
            ctx.fillRect(
                obstacle.x,
                obstacle.y,
                obstacle.width,
                obstacle.height
            );

            ctx.strokeRect(
                obstacle.x,
                obstacle.y,
                obstacle.width,
                obstacle.height
            );

            // Penguat besi
            ctx.fillStyle = "#77716A";
            ctx.fillRect(
                obstacle.x + 12,
                obstacle.y + 4,
                5,
                obstacle.height - 8
            );

            ctx.fillRect(
                obstacle.x + obstacle.width - 17,
                obstacle.y + 4,
                5,
                obstacle.height - 8
            );
        }

        ctx.restore();
    }
}


// ============================================================
// POWER UP SPAWN
// ============================================================

function spawnPowerUp() {

    const types = [

        POWERUP_TYPES.SHIELD,

        POWERUP_TYPES.DOUBLE_JUMP,

        POWERUP_TYPES.SPEED
    ];

    const type =
        types[
            Math.floor(
                Math.random() *
                types.length
            )
        ];

    powerUps.push({

        x: WIDTH + 50,

        y:
            250 +
            Math.random() *
            100,

        width: 32,

        height: 32,

        type: type
    });
}

// ============================================================
// UPDATE POWER UPS
// ============================================================

function updatePowerUps(delta) {

    const dt =
        delta / 16.67;

    let currentSpeed =
        gameSpeed;

    if (
        player.speedBoostTime > 0
    ) {

        currentSpeed *= 1.7;
    }

    powerUpTimer +=
        delta;

    if (
        powerUpTimer >=
        5000 +
        Math.random() *
        4000
    ) {

        powerUpTimer = 0;

        spawnPowerUp();
    }

    for (
        let i =
            powerUps.length - 1;

        i >= 0;

        i--
    ) {

        powerUps[i].x -=
            currentSpeed *
            dt;

        if (
            powerUps[i].x +
            powerUps[i].width <
            -50
        ) {

            powerUps.splice(
                i,
                1
            );
        }
    }
}



function drawPowerUps() {
    for (const powerUp of powerUps) {
        ctx.save();

        const cx = powerUp.x + powerUp.width / 2;
        const cy = powerUp.y + powerUp.height / 2;

        let color = "#22D3EE";
        let symbol = "S";

        if (powerUp.type === POWERUP_TYPES.DOUBLE_JUMP) {
            color = "#FDE047";
            symbol = "2X";
        } else if (powerUp.type === POWERUP_TYPES.SPEED) {
            color = "#FB7185";
            symbol = ">>";
        }

        const pulse = Math.sin(performance.now() * 0.006) * 3;

        // Cahaya di sekitar buff
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;

        ctx.fillStyle = "rgba(10,15,25,0.9)";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(cx, cy, 17 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Simbol buff
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(symbol, cx, cy);

        ctx.restore();
    }
}


// ============================================================
// COLLISION
// ============================================================

function checkCollision(a, b) {

    const paddingX = 10;

    const paddingY = 10;

    return (

        a.x + paddingX <
        b.x + b.width &&

        a.x +
        a.width -
        paddingX >
        b.x &&

        a.y + paddingY <
        b.y + b.height &&

        a.y +
        a.height -
        paddingY >
        b.y
    );
}

// ============================================================
// PLAYER HITBOX
// ============================================================

function getPlayerHitbox() {
    
    if (player.isSliding) {
        
        return {
            x: player.x + 8,
            y: player.y + 45,
            width: player.width - 16,
            height: 30
        };
    }
    
    return {
        x: player.x + 8,
        y: player.y + 5,
        width: player.width - 16,
        height: player.height - 10
    };
}

// ============================================================
// OBSTACLE COLLISION
// ============================================================

function checkObstacleCollision() {
    const hitbox = getPlayerHitbox();
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        
        if (!checkCollision(hitbox, obstacle)) continue;
        
        if (player.shieldTime > 0 && player.shieldCooldown <= 0) {
            player.shieldTime = 0;
            player.shieldCooldown = 700;
            
            createHitParticles(obstacle.x, obstacle.y);
            playAudio("shieldBreak");
            
            obstacles.splice(i, 1);
            continue;
        }
        
        die();
        return;
    }
}

//check enemy//



function checkEnemyKunaiCollision() {
    const hitbox = getPlayerHitbox();
    
    for (let i = enemyKunai.length - 1; i >= 0; i--) {
        const kunai = enemyKunai[i];
        
        const kunaiHitbox = {
            x: kunai.x + 4,
            y: kunai.y + 3,
            width: kunai.width - 8,
            height: kunai.height - 6
        };
        
        if (!checkCollision(hitbox, kunaiHitbox)) continue;
        
        if (player.shieldTime > 0 && player.shieldCooldown <= 0) {
            player.shieldTime = 0;
            player.shieldCooldown = 700;
            
            createHitParticles(kunai.x + kunai.width / 2,
                kunai.y + kunai.height / 2);
            playAudio("shieldBreak");
            
            enemyKunai.splice(i, 1);
            continue;
        }
        
        die();
        return;
    }
}




// ============================================================
// POWER UP COLLISION
// ============================================================

// ============================================================
// POWER UP COLLISION
// ============================================================

function checkPowerUpCollision() {

    const hitbox = getPlayerHitbox();

    for (
        let i = powerUps.length - 1;
        i >= 0;
        i--
    ) {

        const powerUp = powerUps[i];

        if (
            checkCollision(
                hitbox,
                powerUp
            )
        ) {

            // Aktifkan buff terlebih dahulu
            activatePowerUp(powerUp.type);

            // Hapus buff dari layar
            powerUps.splice(i, 1);

            // Mainkan suara mengambil buff
            playAudio("pickup");
        }
    }
}

// ============================================================
// ACTIVATE POWER UP
// ============================================================

function activatePowerUp(type) {

    // ========================================================
    // SHIELD
    // ========================================================

    if (
        type ===
        POWERUP_TYPES.SHIELD
    ) {

        player.shieldTime =
            7000;

        player.shieldCooldown =
            0;
    }

    // ========================================================
    // DOUBLE JUMP
    // ========================================================

    if (
        type ===
        POWERUP_TYPES.DOUBLE_JUMP
    ) {

        player.doubleJumpTime =
            8000;

        // Hanya di sini maxJumps
        // berubah dari 1 menjadi 2
        player.maxJumps = 2;
    }

    // ========================================================
    // SPEED
    // ========================================================

    if (
        type ===
        POWERUP_TYPES.SPEED
    ) {

        player.speedBoostTime =
            5000;
    }
}

// ============================================================
// PARTICLES
// ============================================================

function createHitParticles(
    x,
    y
) {

    for (
        let i = 0;
        i < 15;
        i++
    ) {

        particles.push({

            x: x,

            y: y,

            velocityX:
                (Math.random() - 0.5) * 6,

            velocityY:
                (Math.random() - 0.5) * 6,

            life: 500
        });
    }
}

function updateParticles(delta) {

    for (
        let i =
            particles.length - 1;

        i >= 0;

        i--
    ) {

        const particle =
            particles[i];

        particle.x +=
            particle.velocityX;

        particle.y +=
            particle.velocityY;

        particle.velocityY +=
            0.2;

        particle.life -=
            delta;

        if (
            particle.life <= 0
        ) {

            particles.splice(
                i,
                1
            );
        }
    }
}

function drawParticles() {

    for (
        let particle of particles
    ) {

        ctx.save();

        ctx.globalAlpha =
            particle.life / 500;

        ctx.fillStyle =
            "#ffffff";

        ctx.fillRect(
            particle.x,
            particle.y,
            4,
            4
        );

        ctx.restore();
    }
}


 // ============================================================
 // DARK SHINOBI WORLD - BACKGROUND SYSTEM
 // ============================================================

function getWorld() {
    if (score < 700) return "village";
    if (score < 1800) return "bamboo";
    return "ruins";
}

// Transisi bertahap di sekitar pergantian lingkungan
function getWorldBlend() {
    if (score >= 650 && score < 750) {
        return {
            from: "village",
            to: "bamboo",
            amount: (score - 650) / 100
        };
    }

    if (score >= 1750 && score < 1850) {
        return {
            from: "bamboo",
            to: "ruins",
            amount: (score - 1750) / 100
        };
    }

    const world = getWorld();

    return {
        from: world,
        to: world,
        amount: 0
    };
}


const WORLD_COLORS = {
    village: {
        sky: "#111319",
        far: "#24262d",
        mid: "#171a20",
        ground: "#292a2e",
        accent: "#a6a0a0"
    },
    bamboo: {
        sky: "#101515",
        far: "#252d2a",
        mid: "#18211e",
        ground: "#242a27",
        accent: "#a2aaa0"
    },
    ruins: {
        sky: "#151315",
        far: "#30282b",
        mid: "#211c20",
        ground: "#302a2b",
        accent: "#b3a0a0"
    }
};

function mixColor(a, b, amount) {
    const hexToRgb = hex => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16)
    ];

    const ca = hexToRgb(a);
    const cb = hexToRgb(b);

    const result = ca.map((v, i) =>
        Math.round(v + (cb[i] - v) * amount)
    );

    return "#" + result
        .map(v => v.toString(16).padStart(2, "0"))
        .join("");
}

function drawBackground() {
    const blend = getWorldBlend();
    const a = WORLD_COLORS[blend.from];
    const b = WORLD_COLORS[blend.to];
    const t = Math.max(0, Math.min(1, blend.amount));

    const colors = {};

    for (const key in a) {
        colors[key] = mixColor(a[key], b[key], t);
    }

    // Langit malam
    ctx.fillStyle = colors.sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Cahaya bulan
    const moonGlow = ctx.createRadialGradient(
        790, 90, 5,
        790, 90, 100
    );

    moonGlow.addColorStop(0, "rgba(220,225,225,0.18)");
    moonGlow.addColorStop(1, "rgba(220,225,225,0)");

    ctx.fillStyle = moonGlow;
    ctx.fillRect(650, 0, 280, 220);

    ctx.fillStyle = "#c9cccc";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(790, 90, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Bintang kecil
    ctx.fillStyle = "rgba(220,225,230,0.65)";

    for (let i = 0; i < 24; i++) {
        const x = (i * 173 + 47) % WIDTH;
        const y = 25 + (i * 59) % 180;

        ctx.fillRect(x, y, 2, 2);
    }

    const world = getWorld();

    // Latar jauh bergerak lambat
    drawFarSilhouettes(colors.far);

    // Lingkungan utama
    if (world === "village") {
        drawVillage(colors.mid);
    } else if (world === "bamboo") {
        drawBambooForest(colors.mid);
    } else {
        drawTempleRuins(colors.mid);
    }

    // Lapisan depan untuk efek kedalaman
    drawForeground(world);

    // Kabut bergerak
    drawFog();

    // Tanah
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

    // Garis tanah
    ctx.fillStyle = "#090a0c";
    ctx.fillRect(0, GROUND_Y, WIDTH, 7);

    ctx.fillStyle = "rgba(190,195,195,0.12)";
    ctx.fillRect(0, GROUND_Y + 8, WIDTH, 2);
}

// ============================================================
// FAR SILHOUETTES
// ============================================================

function drawFarSilhouettes(color) {
    const offset = (score * 0.100) % 240;

    ctx.fillStyle = color;

    for (let i = -1; i < 6; i++) {
        const x = i * 240 - offset;

        ctx.beginPath();
        ctx.moveTo(x, 350);
        ctx.lineTo(x + 55, 285);
        ctx.lineTo(x + 105, 335);
        ctx.lineTo(x + 160, 270);
        ctx.lineTo(x + 225, 350);
        ctx.lineTo(x + 240, 370);
        ctx.lineTo(x, 370);
        ctx.closePath();
        ctx.fill();
    }
}

// ============================================================
// VILLAGE
// ============================================================

function drawVillage(color) {
    const offset = (score * 0.70
       
    ) % 260;

    ctx.fillStyle = color;

    for (let i = -1; i < 5; i++) {
        const x = i * 260 - offset;
        const baseY = 390;

        // Bangunan
        ctx.fillRect(x + 35, baseY - 95, 100, 95);

        // Atap Jepang
        ctx.beginPath();
        ctx.moveTo(x + 15, baseY - 95);
        ctx.lineTo(x + 85, baseY - 140);
        ctx.lineTo(x + 155, baseY - 95);
        ctx.lineTo(x + 135, baseY - 85);
        ctx.lineTo(x + 85, baseY - 115);
        ctx.lineTo(x + 35, baseY - 85);
        ctx.closePath();
        ctx.fill();

        // Jendela bercahaya redup
        ctx.fillStyle = "rgba(177,143,102,0.28)";
        ctx.fillRect(x + 55, baseY - 70, 13, 20);
        ctx.fillRect(x + 100, baseY - 70, 13, 20);

        ctx.fillStyle = color;
    }
}

// ============================================================
// BAMBOO FOREST
// ============================================================

function drawBambooForest(color) {
    const offset = (score * 0.78) % 100;

    ctx.fillStyle = color;

    for (let i = -1; i < 13; i++) {
        const x = i * 90 - offset;
        const height = 130 + ((i * 37 + 500) % 100);

        // Batang bambu
        ctx.fillRect(x, GROUND_Y - height, 9, height);

        // Ruas bambu
        ctx.fillStyle = "rgba(170,180,170,0.15)";

        for (let j = 0; j < 4; j++) {
            const y = GROUND_Y - height + j * 32;
            ctx.fillRect(x, y, 9, 2);
        }

        ctx.fillStyle = color;

        // Daun bambu
        ctx.beginPath();
        ctx.moveTo(x + 4, GROUND_Y - height + 30);
        ctx.lineTo(x - 24, GROUND_Y - height + 10);
        ctx.lineTo(x + 3, GROUND_Y - height + 40);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 4, GROUND_Y - height + 55);
        ctx.lineTo(x + 30, GROUND_Y - height + 34);
        ctx.lineTo(x + 5, GROUND_Y - height + 64);
        ctx.fill();
    }
}

// ============================================================
// TEMPLE RUINS
// ============================================================

function drawTempleRuins(color) {
    const offset = (score * 0.3) % 300;

    ctx.fillStyle = color;

    for (let i = -1; i < 5; i++) {
        const x = i * 300 - offset;

        // Pilar kuil
        ctx.fillRect(x + 35, 275, 20, 145);
        ctx.fillRect(x + 125, 290, 20, 130);

        // Atap utama
        ctx.beginPath();
        ctx.moveTo(x + 5, 280);
        ctx.lineTo(x + 75, 240);
        ctx.lineTo(x + 170, 280);
        ctx.lineTo(x + 150, 285);
        ctx.lineTo(x + 75, 260);
        ctx.lineTo(x + 25, 290);
        ctx.closePath();
        ctx.fill();

        // Pilar retak / reruntuhan
        ctx.fillRect(x + 195, 340, 22, 80);
        ctx.fillRect(x + 190, 335, 32, 8);

        // Lentera redup
        ctx.fillStyle = "rgba(181,111,73,0.4)";
        ctx.fillRect(x + 80, 345, 24, 30);

        ctx.fillStyle = color;
    }

    // Gerbang torii
    const gateOffset = (score * 0.22) % 500;
    const gx = 650 - gateOffset;

    ctx.fillStyle = "rgba(83,49,48,0.8)";
    ctx.fillRect(gx, 255, 12, 165);
    ctx.fillRect(gx + 100, 255, 12, 165);
    ctx.fillRect(gx - 15, 245, 142, 13);
    ctx.fillRect(gx - 25, 235, 162, 10);
}

// ============================================================
// DARK FOREGROUND
// ============================================================

function drawForeground(world) {
    const offset = (score * 0.7) % 320;

    ctx.fillStyle = "rgba(5,6,8,0.75)";

    for (let i = -1; i < 5; i++) {
        const x = i * 320 - offset;

        if (world === "village") {
            // Tiang dan atap gelap
            ctx.fillRect(x + 30, 330, 12, 90);

            ctx.beginPath();
            ctx.moveTo(x, 330);
            ctx.lineTo(x + 70, 300);
            ctx.lineTo(x + 140, 330);
            ctx.closePath();
            ctx.fill();
        } else if (world === "bamboo") {
            // Bambu dekat kamera
            ctx.fillRect(x + 40, 180, 12, 240);
            ctx.fillRect(x + 180, 230, 9, 190);
        } else {
            // Pilar reruntuhan dekat kamera
            ctx.fillRect(x + 35, 285, 25, 135);
            ctx.fillRect(x + 30, 278, 35, 10);
        }
    }
}

// ============================================================
// MOVING FOG
// ============================================================

function drawFog() {
    ctx.save();

    // Beberapa lapisan kabut transparan
    for (let layer = 0; layer < 3; layer++) {
        const speed = 0.12 + layer * 0.08;
        const offset = (score * speed) % 500;
        const y = 300 + layer * 38;

        const gradient = ctx.createLinearGradient(
            0, y - 35, 0, y + 45
        );

        gradient.addColorStop(0, "rgba(155,160,165,0)");
        gradient.addColorStop(0.5, "rgba(155,160,165,0.10)");
        gradient.addColorStop(1, "rgba(155,160,165,0)");

        ctx.fillStyle = gradient;

        for (let i = -1; i < 4; i++) {
            const x = i * 500 - offset;
            ctx.beginPath();
            ctx.ellipse(
                x + 200,
                y,
                250,
                35,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    ctx.restore();
}

// ============================================================
// SCORE
// ============================================================


function updateScore(delta) {

    score += delta * 0.02;

    scoreElement.textContent =
        `SCORE: ${Math.floor(score)}`;

    // Kecepatan bertambah setiap 100 poin
    const speedLevel = Math.floor(score / 100);

    gameSpeed = Math.min(
        11,
        5 + (speedLevel * 0.25)
    );
}


// ============================================================
// POWER UP STATUS
// ============================================================

function drawPowerUpStatus() {

    let x = 20;

    let y = 55;

    ctx.font =
        "bold 15px Arial";

    ctx.textAlign =
        "left";

    if (
        player.shieldTime > 0
    ) {

        ctx.fillStyle =
            "#00bfff";

        ctx.fillText(
            `SHIELD: ${Math.ceil(
                player.shieldTime / 1000
            )}s`,
            x,
            y
        );

        y += 22;
    }

    if (
        player.doubleJumpTime > 0
    ) {

        ctx.fillStyle =
            "#ffd700";

        ctx.fillText(
            `DOUBLE JUMP: ${Math.ceil(
                player.doubleJumpTime / 1000
            )}s`,
            x,
            y
        );

        y += 22;
    }

    if (
        player.speedBoostTime > 0
    ) {

        ctx.fillStyle =
            "#ff4d4d";

        ctx.fillText(
            `SPEED BOOST: ${Math.ceil(
                player.speedBoostTime / 1000
            )}s`,
            x,
            y
        );
    }
}

// ============================================================
// UPDATE
// ============================================================

function update(delta) {

    if (
        gameState !== STATE.PLAYING
    ) {

        if (
            gameState === STATE.DEAD ||
            gameState === STATE.GAMEOVER
        ) {

            updatePlayer(delta);

            updateParticles(delta);
        }

        return;
    }

    updatePlayer(delta);

    updateAfterImages(delta);

    updateObstacles(delta);
    
    updateEnemyKunai(delta);

    updatePowerUps(delta);

    updateParticles(delta);

    checkObstacleCollision();

    if (
        gameState === STATE.PLAYING
    ) {
        
checkEnemyKunaiCollision();

        checkPowerUpCollision();

        updateScore(delta);
    }
}

// ============================================================
// DRAW
// ============================================================

function draw() {

    ctx.clearRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    drawBackground();

    drawObstacles();
    
    drawEnemyKunai();

    drawPowerUps();

    drawParticles();

    drawPlayer();

    drawPowerUpStatus();

    drawPauseScreen();
}

// ============================================================
// PAUSE SCREEN
// ============================================================

function drawPauseScreen() {

    if (
        gameState !== STATE.PAUSED
    ) {

        return;
    }

    ctx.save();

    ctx.fillStyle =
        "rgba(0,0,0,0.55)";

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );

    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 50px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "PAUSED",
        WIDTH / 2,
        HEIGHT / 2
    );

    ctx.restore();
}

// ============================================================
// GAME LOOP
// ============================================================

function gameLoop(timestamp) {

    const delta =
        Math.min(
            timestamp - lastTime,
            50
        );

    lastTime =
        timestamp;

    update(delta);

    draw();

    requestAnimationFrame(
        gameLoop
    );
}

// ============================================================
// KEYBOARD
// ============================================================

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.code === "Space" ||
            event.code === "ArrowUp"
        ) {

            event.preventDefault();

            jump();
        }

        if (
            event.code === "ArrowDown"
        ) {

            event.preventDefault();

            // Tekan sekali = slide
            slide();
        }

        if (
            event.code === "KeyP"
        ) {

            togglePause();
        }
    }
);

jumpButton.addEventListener("pointerdown", function(e) {
    e.preventDefault();
    jump();
});

slideButton.addEventListener("pointerdown", function(e) {
    e.preventDefault();
    slide();
});

// ============================================================

// ============================================================
// START BUTTON
// ============================================================

startButton.addEventListener(
    "click",
    function() {

        startGame();
       
    }
);

// ============================================================
// RESTART BUTTON
// ============================================================

restartButton.addEventListener(
    "click",
    function() {

        startGame();
        
    }
);

// ============================================================
// PAUSE
// ============================================================

function togglePause() {

    if (
    gameState === STATE.PLAYING
) {

    gameState = STATE.PAUSED;

    pauseBGM();
    stopAllSFX();

    return;
}

    if (
    gameState === STATE.PAUSED
) {

    gameState = STATE.PLAYING;

    playBGM();

    lastTime = performance.now();
    }
}

// ============================================================
// START GAME LOOP
// ============================================================

requestAnimationFrame(
    gameLoop
);
