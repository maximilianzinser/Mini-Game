const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const BASE_GAME_WIDTH = 960; // Adjusted for 16:9 aspect ratio (e.g., 960x540)
const BASE_GAME_HEIGHT = 540; // Adjusted for 16:9 aspect ratio

const GAME_ASPECT_RATIO = BASE_GAME_WIDTH / BASE_GAME_HEIGHT;

const GRAVITY = 0.5;
const PLAYER_SPEED = 5;
const JUMP_FORCE = -12;
const TILE_SIZE = 40;

// Dynamic Canvas Sizing
function resizeGame() {
    let newWidth = window.innerWidth;
    let newHeight = window.innerHeight;

    const mobileControlsElement = document.getElementById('mobile-controls');
    // Only consider controls height if they are actually displayed (via CSS media query)
    const isMobileControlsVisible = window.getComputedStyle(mobileControlsElement).display !== 'none';
    const mobileControlsReservedHeight = isMobileControlsVisible ? mobileControlsElement.offsetHeight : 0;
    
    let availableGameHeight = newHeight - mobileControlsReservedHeight;

    let currentAspectRatio = newWidth / availableGameHeight;

    if (currentAspectRatio > GAME_ASPECT_RATIO) {
        // Window is wider than game aspect ratio, constrain by available height
        newWidth = availableGameHeight * GAME_ASPECT_RATIO;
    } else {
        // Window is taller than game aspect ratio, constrain by width
        availableGameHeight = newWidth / GAME_ASPECT_RATIO;
    }

    // Now set the canvas style dimensions
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${availableGameHeight}px`;

    // Internal canvas dimensions remain fixed (e.g., 960x540)
    canvas.width = BASE_GAME_WIDTH;
    canvas.height = BASE_GAME_HEIGHT;
}

window.addEventListener('load', resizeGame);
window.addEventListener('resize', resizeGame);

// Game State
let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem('infinitePlumberHighScore') || 0;
let frameCount = 0;
let cameraX; // cameraX will be initialized in initGame()

// Update UI
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highscore');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');

highScoreEl.innerText = highScore;

// --- SOUND MANAGER ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

class SoundManager {
    constructor() {
        this.bgmOscs = [];
        this.isPlayingBGM = false;
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    playJump() {
        this.playTone(150, 'square', 0.1);
    }

    playCoin() {
        this.playTone(900, 'sine', 0.1);
        setTimeout(() => this.playTone(1200, 'sine', 0.2), 50);
    }

    playHit() {
        this.playTone(100, 'sawtooth', 0.2);
    }
    
    playPowerUp() {
        [440, 554, 659].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.2), i * 100);
        });
    }

    playFireball() {
        this.playTone(300, 'triangle', 0.1);
    }

    startBGM() {
        if (this.isPlayingBGM) return;
        this.isPlayingBGM = true;
        this.playBGMLoop();
    }

    playBGMLoop() {
        if (!this.isPlayingBGM) return;
        // Simple bassline loop
        const sequence = [110, 110, 130, 110, 146, 130];
        let note = 0;
        
        this.bgmInterval = setInterval(() => {
            if (!gameRunning) {
                clearInterval(this.bgmInterval);
                this.isPlayingBGM = false;
                return;
            }
            // Very quiet background bass
            this.playTone(sequence[note % sequence.length], 'triangle', 0.2, 0.05);
            note++;
        }, 300);
    }
}
const sounds = new SoundManager();

// Input Handling
const keys = {
    right: false,
    left: false,
    up: false,
    shoot: false
};

// Keyboard
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        if (!keys.up) player.jump();
        keys.up = true;
    }
    if (e.code === 'KeyF' || e.code === 'ShiftLeft') {
        if (!keys.shoot) player.shoot();
        keys.shoot = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.up = false;
    if (e.code === 'KeyF' || e.code === 'ShiftLeft') keys.shoot = false;
});

// Mobile Controls
function setupMobileControls() {
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump = document.getElementById('btn-jump'); // Map jump to A
    const btnAction = document.getElementById('btn-action'); // Map shoot to Fire
    const btnDown = document.getElementById('btn-down'); // Not used yet but good for ducking

    const addTouch = (elem, key, action) => {
        elem.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; if(action) action(); });
        elem.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
        elem.addEventListener('mousedown', (e) => { e.preventDefault(); keys[key] = true; if(action) action(); });
        elem.addEventListener('mouseup', (e) => { e.preventDefault(); keys[key] = false; });
    };

    addTouch(btnLeft, 'left');
    addTouch(btnRight, 'right');
    addTouch(btnJump, 'up', () => player.jump());
    addTouch(btnAction, 'shoot', () => player.shoot());
    
    // Show controls if likely on mobile (or just always show them as requested via CSS media query, but let's force check)
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.getElementById('mobile-controls').style.display = 'flex';
    }
}
setupMobileControls();


// Background Parallax
class Background {
    constructor() {
        this.clouds = [];
        for(let i=0; i<5; i++) {
            this.clouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * (canvas.height/2),
                speed: 0.2 + Math.random() * 0.3
            });
        }
    }

    draw(ctx, camX) {
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.clouds.forEach(c => {
            let screenX = (c.x - camX * c.speed) % (canvas.width + 200);
            if (screenX < -200) screenX += canvas.width + 200;
            // Draw cloud sprite
            // Assuming we have a cloud sprite, if not draw ellipses
            if (window.SPRITES && SPRITES.cloud) {
                ctx.drawImage(SPRITES.cloud, screenX, c.y);
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.beginPath();
                ctx.arc(screenX, c.y, 30, 0, Math.PI*2);
                ctx.fill();
            }
        });
    }
}
const bg = new Background();


// Entities
class Fireball {
    constructor(x, y, dir) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.velX = dir * 8;
        this.velY = 0;
        this.active = true;
    }

    update() {
        this.x += this.velX;
        this.velY += GRAVITY;
        this.y += this.velY;
        
        // Bounce check
        if (this.y > canvas.height) this.active = false;
        
        platforms.forEach(p => {
             if (this.x < p.x + p.width && this.x + this.width > p.x &&
                 this.y + this.height > p.y && this.y < p.y + p.height) {
                 this.velY = -5; // Bounce
             }
        });
    }

    draw(ctx, camX) {
        if (window.SPRITES && SPRITES.fireball) {
            ctx.drawImage(SPRITES.fireball, this.x - camX, this.y);
        } else {
            ctx.fillStyle = 'orange';
            ctx.beginPath();
            ctx.arc(this.x - camX, this.y, 8, 0, Math.PI*2);
            ctx.fill();
        }
    }
}

class Player {
    constructor() {
        this.width = 36;
        this.height = 42;
        this.x = 100;
        this.y = canvas.height - 300; // Start higher to drop onto platform
        this.velX = 0;
        this.velY = 0;
        this.isGrounded = false;
        this.canDoubleJump = false;
        this.facingRight = true;
        
        this.isBig = false;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.fireballs = [];
    }

    update() {
        // Movement
        if (keys.right) {
            this.velX = PLAYER_SPEED;
            this.facingRight = true;
        } else if (keys.left) {
            this.velX = -PLAYER_SPEED;
            this.facingRight = false;
        } else {
            this.velX = 0;
        }

        // Apply Gravity
        this.velY += GRAVITY;
        this.x += this.velX;
        this.y += this.velY;

        // Floor Collision (Death)
        if (this.y + this.height > canvas.height + 200) {
            sounds.playHit();
            gameOver();
        }
        
        // Invincibility Timer
        if (this.isInvincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) this.isInvincible = false;
        }

        // Update Fireballs
        this.fireballs.forEach(f => f.update());
        this.fireballs = this.fireballs.filter(f => f.active && f.x > cameraX && f.x < cameraX + canvas.width);
    }

    jump() {
        if (this.isGrounded) {
            this.velY = JUMP_FORCE;
            this.isGrounded = false;
            this.canDoubleJump = true;
            sounds.playJump();
        } else if (this.canDoubleJump) {
            this.velY = JUMP_FORCE * 0.8;
            this.canDoubleJump = false;
            sounds.playJump();
            // Spin effect or particle could go here
        }
    }

    shoot() {
        if (this.isBig) { // Only shoot if powered up (or change design to always allow)
             // Let's allow shooting always for fun, or require 'flower' powerup. 
             // Simplification: Always allow for now as requested "Fireballs" feature
             sounds.playFireball();
             this.fireballs.push(new Fireball(this.x + (this.facingRight ? this.width : -16), this.y + 10, this.facingRight ? 1 : -1));
        }
    }
    
    grow() {
        if (!this.isBig) {
            this.isBig = true;
            sounds.playPowerUp();
        }
    }
    
    shrink() {
        if (this.isBig) {
            this.isBig = false;
            this.isInvincible = true;
            this.invincibleTimer = 60;
            sounds.playHit();
        } else {
            sounds.playHit();
            gameOver();
        }
    }
    
    makeInvincible() {
        this.isInvincible = true;
        this.invincibleTimer = 600;
        sounds.playPowerUp();
    }

    draw(ctx, camX) {
        // Draw Fireballs
        this.fireballs.forEach(f => f.draw(ctx, camX));

        // Player Flicker
        if (this.isInvincible && Math.floor(Date.now() / 50) % 2 === 0) ctx.globalAlpha = 0.5;
        
        let sprite = SPRITES.player.idle;
        // Animation Logic
        if (!this.isGrounded) sprite = SPRITES.player.jump;
        else if (Math.abs(this.velX) > 0 && Math.floor(Date.now() / 100) % 2 === 0) sprite = SPRITES.player.jump; // Simple run anim

        ctx.save();
        ctx.translate(this.x - camX + (this.facingRight ? 0 : this.width), this.y);
        if (!this.facingRight) ctx.scale(-1, 1);
        
        ctx.drawImage(sprite, 0, 0, this.width, this.height);
        
        ctx.restore();
        ctx.globalAlpha = 1.0;
    }
}

class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw(ctx, camX) {
        // Tiling
        let sprite = SPRITES.ground;
        if (sprite) {
             for(let bx = 0; bx < this.width; bx += 40) {
                 for(let by = 0; by < this.height; by += 40) {
                     let w = Math.min(40, this.width - bx);
                     let h = Math.min(40, this.height - by);
                     ctx.drawImage(sprite, 0, 0, w, h, this.x - camX + bx, this.y + by, w, h);
                 }
             }
        } else {
             ctx.fillStyle = '#8B4513';
             ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        }
    }
}

class Enemy {
    constructor(x, y, range) {
        this.x = x;
        this.y = y;
        this.width = 36;
        this.height = 36; // Adjusted for sprite
        this.startX = x;
        this.range = range;
        this.speed = 2;
        this.dir = 1;
        this.isDead = false;
    }

    update() {
        if (this.isDead) return;
        this.x += this.speed * this.dir;
        if (this.x > this.startX + this.range || this.x < this.startX) {
            this.dir *= -1;
        }
    }

    draw(ctx, camX) {
        if (this.isDead) return;
        if (SPRITES.goomba) {
            // Simple bounce anim
            let bounceY = Math.abs(Math.sin(Date.now()/100)) * 5;
            ctx.drawImage(SPRITES.goomba, this.x - camX, this.y - bounceY, this.width, this.height);
        } else {
            ctx.fillStyle = 'brown';
            ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        }
    }
}

class FlyingEnemy extends Enemy {
    constructor(x, y, range) {
        super(x, y, range);
        this.color = '#FF4500'; // Orange Red
        this.baseY = y;
        this.angle = 0;
        this.width = 36;
        this.height = 24;
    }
    
    update() {
        if (this.isDead) return;
        this.x -= 2; // Always moves left
        this.angle += 0.05;
        this.y = this.baseY + Math.sin(this.angle) * 50;
    }
    
    draw(ctx, camX) {
        if (this.isDead) return;
        if (SPRITES.bird) {
            let flap = Math.floor(Date.now() / 100) % 2 === 0 ? 0 : 5;
            ctx.drawImage(SPRITES.bird, this.x - camX, this.y + flap, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x - camX + 15, this.y + 15, 15, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type; 
        this.collected = false;
    }
    
    draw(ctx, camX) {
        if (this.collected) return;
        let sprite = this.type === 'mushroom' ? SPRITES.mushroom : SPRITES.star;
        if (sprite) {
            ctx.drawImage(sprite, this.x - camX, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.type === 'mushroom' ? 'red' : 'yellow';
            ctx.fillRect(this.x - camX, this.y, 20, 20);
        }
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.collected = false;
        this.floatOffset = 0;
    }

    update() {
        this.floatOffset = Math.sin(Date.now() / 200) * 5;
    }

    draw(ctx, camX) {
        if (this.collected) return;
        if (SPRITES.coin) {
            ctx.drawImage(SPRITES.coin, this.x - camX, this.y + this.floatOffset, this.width, this.height);
        } else {
            ctx.fillStyle = 'gold';
            ctx.beginPath();
            ctx.arc(this.x - camX + 10, this.y + 10 + this.floatOffset, 10, 0, Math.PI*2);
            ctx.fill();
        }
    }
}

// Global Entities
let player;
let platforms = [];
let enemies = [];
let coins = [];
let powerups = [];

// Level Generation
let lastPlatformX = 0;

function generateChunk() {
    while (lastPlatformX < cameraX + canvas.width * 2) {
        let gap = Math.random() * 150 + 50;
        let width = Math.floor((Math.random() * 300 + 100) / 40) * 40; // Snap to grid
        let height = 50 + Math.random() * 100;
        let y = canvas.height - height;
        y = Math.floor(y / 40) * 40; // Snap y to grid slightly

        let prevY = platforms.length > 0 ? platforms[platforms.length - 1].y : canvas.height - 100;
        y = prevY + (Math.random() * 160 - 80); 
        if (y > canvas.height - 80) y = canvas.height - 80;
        if (y < 200) y = 200;

        let newPlat = new Platform(lastPlatformX + gap, y, width, canvas.height - y);
        platforms.push(newPlat);
        lastPlatformX += gap + width;

        // Enemies
        if (width > 200 && Math.random() > 0.4) {
            enemies.push(new Enemy(newPlat.x + 50, newPlat.y - 36, width - 100));
        } else if (Math.random() > 0.8) {
             // Flying Enemy in the gap
             enemies.push(new FlyingEnemy(newPlat.x - 50, newPlat.y - 100, 0));
        }

        // Coins
        if (Math.random() > 0.3) {
            let numCoins = Math.floor(Math.random() * 5) + 1;
            let startCoinX = newPlat.x + (width - (numCoins * 30)) / 2;
            for(let i=0; i<numCoins; i++) {
                coins.push(new Coin(startCoinX + i * 30, newPlat.y - 50 - (Math.random() * 50)));
            }
        }
        
        // Powerups
        if (Math.random() > 0.8) {
            let type = Math.random() > 0.5 ? 'mushroom' : 'star';
            powerups.push(new PowerUp(newPlat.x + width/2, newPlat.y - 30, type));
        }
    }

    platforms = platforms.filter(p => p.x + p.width > cameraX - 200);
    enemies = enemies.filter(e => e.x > cameraX - 200 && !e.isDead);
    coins = coins.filter(c => c.x > cameraX - 200 && !c.collected);
    powerups = powerups.filter(p => p.x > cameraX - 200 && !p.collected);
}

function initGame() {
    player = new Player();
    platforms = [];
    enemies = [];
    coins = [];
    powerups = [];
    score = 0;
    cameraX = 0; // Initialize cameraX here
    lastPlatformX = 0;

    // Ensure canvas is correctly sized for the new game
    resizeGame();

    let startPlat = new Platform(50, canvas.height - 120, 520, 120);
    platforms.push(startPlat);
    lastPlatformX = 50 + 520;

    generateChunk();
    
    gameRunning = true;
    scoreEl.innerText = score;
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.remove('active');
    gameOverScreen.classList.add('hidden');
    
    sounds.startBGM();
    requestAnimationFrame(gameLoop);
}

function checkCollisions() {
    player.isGrounded = false;

    // Platform Collision
    for (let plat of platforms) {
        if (player.x < plat.x + plat.width &&
            player.x + player.width > plat.x &&
            player.y < plat.y + plat.height &&
            player.y + player.height > plat.y) {
            
            let prevY = player.y - player.velY;
            if (prevY + player.height <= plat.y + 10) { // Tolerance
                player.y = plat.y - player.height;
                player.velY = 0;
                player.isGrounded = true;
                player.canDoubleJump = true; // Reset double jump
            } else if (prevY >= plat.y + plat.height - 10) {
                player.y = plat.y + plat.height;
                player.velY = 0;
            } else {
                if (player.x < plat.x) player.x = plat.x - player.width;
                else player.x = plat.x + plat.width;
                player.velX = 0;
            }
        }
    }

    // Fireball vs Enemies
    player.fireballs.forEach(f => {
        if (!f.active) return;
        enemies.forEach(e => {
            if (!e.isDead && f.x < e.x + e.width && f.x + f.width > e.x &&
                f.y < e.y + e.height && f.y + f.height > e.y) {
                e.isDead = true;
                f.active = false;
                score += 50;
                sounds.playHit();
            }
        });
    });

    // Enemy Collision
    for (let enemy of enemies) {
        if (!enemy.isDead &&
            player.x < enemy.x + enemy.width - 5 &&
            player.x + player.width > enemy.x + 5 &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            
            if (player.isInvincible) {
                 enemy.isDead = true;
                 score += 50;
                 sounds.playHit();
            } else if (player.velY > 0 && player.y + player.height - player.velY < enemy.y + 10) {
                enemy.isDead = true;
                player.velY = -8;
                score += 50;
                sounds.playHit();
            } else {
                player.shrink();
            }
        }
    }

    // Coin Collision
    for (let coin of coins) {
        if (!coin.collected &&
            player.x < coin.x + coin.width &&
            player.x + player.width > coin.x &&
            player.y < coin.y + coin.height &&
            player.y + player.height > coin.y) {
            
            coin.collected = true;
            score += 10;
            sounds.playCoin();
        }
    }
    
    // PowerUp Collision
    for (let p of powerups) {
        if (!p.collected &&
            player.x < p.x + p.width &&
            player.x + player.width > p.x &&
            player.y < p.y + p.height &&
            player.y + player.height > p.y) {
            
            p.collected = true;
            if (p.type === 'mushroom') player.grow();
            if (p.type === 'star') player.makeInvincible();
        }
    }
}

function gameOver() {
    gameRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('infinitePlumberHighScore', highScore);
        highScoreEl.innerText = highScore;
    }
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('active');
    sounds.isPlayingBGM = false;
}

function update() {
    if (!gameRunning) return;

    player.update();
    if (player.x > cameraX + 300) {
        cameraX = player.x - 300;
    }

    enemies.forEach(e => e.update());
    coins.forEach(c => c.update());

    checkCollisions();
    generateChunk();

    scoreEl.innerText = score;
}

function draw() {
    // Clear Background
    bg.draw(ctx, cameraX);

    platforms.forEach(p => p.draw(ctx, cameraX));
    enemies.forEach(e => e.draw(ctx, cameraX));
    coins.forEach(c => c.draw(ctx, cameraX));
    powerups.forEach(p => p.draw(ctx, cameraX));
    player.draw(ctx, cameraX);
}

function gameLoop() {
    if (gameRunning) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

document.getElementById('start-btn').addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    initGame();
});
document.getElementById('restart-btn').addEventListener('click', initGame);
