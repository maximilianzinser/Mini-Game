const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const GRAVITY = 0.5;
const PLAYER_SPEED = 5;
const JUMP_FORCE = -12;
const TILE_SIZE = 40;

canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;

// Game State
let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem('infinitePlumberHighScore') || 0;
let frameCount = 0;
let cameraX = 0;

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
    playJump() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }

    playCoin() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }

    playHit() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    }
    
    playPowerUp() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        // Simple arpeggio
        [440, 554, 659].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const startTime = audioCtx.currentTime + i * 0.1;
            gain.gain.setValueAtTime(0.1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.2);
        });
    }
}
const sounds = new SoundManager();

// Input Handling
const keys = {
    right: false,
    left: false,
    up: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        if (!keys.up) { // Prevent rapid fire holding
             player.jump();
        }
        keys.up = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.up = false;
});

// Entities
class Player {
    constructor() {
        this.baseWidth = 30;
        this.baseHeight = 30;
        this.width = 30;
        this.height = 30;
        this.x = 100;
        this.y = SCREEN_HEIGHT - 150;
        this.velX = 0;
        this.velY = 0;
        this.isGrounded = false;
        this.color = '#ff0000'; // Mario Red
        
        // Power-up states
        this.isBig = false;
        this.isInvincible = false;
        this.invincibleTimer = 0;
    }

    update() {
        // Movement
        if (keys.right) this.velX = PLAYER_SPEED;
        else if (keys.left) this.velX = -PLAYER_SPEED;
        else this.velX = 0;

        // Apply Gravity
        this.velY += GRAVITY;
        
        // Apply Velocity
        this.x += this.velX;
        this.y += this.velY;

        // Floor Collision
        if (this.y + this.height > SCREEN_HEIGHT + 200) {
            sounds.playHit();
            gameOver();
        }
        
        // Invincibility Timer
        if (this.isInvincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
            }
        }
    }

    jump() {
        if (this.isGrounded) {
            this.velY = JUMP_FORCE;
            this.isGrounded = false;
            sounds.playJump();
        }
    }
    
    grow() {
        if (!this.isBig) {
            this.isBig = true;
            this.width = 40;
            this.height = 50;
            this.y -= 20; // Pop up so we don't clip ground
            sounds.playPowerUp();
        }
    }
    
    shrink() {
        if (this.isBig) {
            this.isBig = false;
            this.width = this.baseWidth;
            this.height = this.baseHeight;
            this.isInvincible = true;
            this.invincibleTimer = 60; // 1 second i-frames
            sounds.playHit();
        } else {
            sounds.playHit();
            gameOver();
        }
    }
    
    makeInvincible() {
        this.isInvincible = true;
        this.invincibleTimer = 600; // 10 seconds
        sounds.playPowerUp();
    }

    draw(ctx, camX) {
        if (this.isInvincible && Math.floor(Date.now() / 50) % 2 === 0) {
             // Flicker effect
             ctx.globalAlpha = 0.5;
        }
        
        ctx.fillStyle = this.isInvincible ? '#00ffff' : this.color;
        ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        ctx.globalAlpha = 1.0;
        
        // Eyes
        ctx.fillStyle = 'white';
        let eyeOffsetX = this.velX >= 0 ? (this.width - 12) : 4;
        let eyeY = this.isBig ? 10 : 4;
        ctx.fillRect(this.x - camX + eyeOffsetX, this.y + eyeY, 8, 8);
        ctx.fillStyle = 'black';
        let pupilOffsetX = this.velX >= 0 ? (this.width - 8) : 4;
        ctx.fillRect(this.x - camX + pupilOffsetX, this.y + eyeY + 2, 4, 4);
    }
}

class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = '#8B4513';
        this.grassColor = '#32CD32';
    }

    draw(ctx, camX) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        ctx.fillStyle = this.grassColor;
        ctx.fillRect(this.x - camX, this.y, this.width, 10);
    }
}

class Enemy {
    constructor(x, y, range) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.startX = x;
        this.range = range;
        this.speed = 2;
        this.dir = 1;
        this.color = '#800000'; // Goomba
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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x - camX + 5, this.y + 5, 8, 8);
        ctx.fillRect(this.x - camX + 17, this.y + 5, 8, 8);
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - camX + 7, this.y + 7, 4, 4);
        ctx.fillRect(this.x - camX + 19, this.y + 7, 4, 4);
    }
}

class FlyingEnemy extends Enemy {
    constructor(x, y, range) {
        super(x, y, range);
        this.color = '#FF4500'; // Orange Red
        this.baseY = y;
        this.angle = 0;
    }
    
    update() {
        if (this.isDead) return;
        this.x -= 2; // Always moves left
        this.angle += 0.1;
        this.y = this.baseY + Math.sin(this.angle) * 50;
    }
    
    draw(ctx, camX) {
        if (this.isDead) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - camX + 15, this.y + 15, 15, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x - camX - 5, this.y + 5, 10, 10);
        ctx.fillRect(this.x - camX + 25, this.y + 5, 10, 10);
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type; // 'mushroom' or 'star'
        this.collected = false;
    }
    
    draw(ctx, camX) {
        if (this.collected) return;
        if (this.type === 'mushroom') {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x - camX, this.y, 20, 20);
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x - camX + 5, this.y + 5, 5, 5);
            ctx.fillRect(this.x - camX + 12, this.y + 10, 5, 5);
        } else if (this.type === 'star') {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.moveTo(this.x - camX + 10, this.y);
            ctx.lineTo(this.x - camX + 13, this.y + 7);
            ctx.lineTo(this.x - camX + 20, this.y + 7);
            ctx.lineTo(this.x - camX + 15, this.y + 12);
            ctx.lineTo(this.x - camX + 17, this.y + 20);
            ctx.lineTo(this.x - camX + 10, this.y + 15);
            ctx.lineTo(this.x - camX + 3, this.y + 20);
            ctx.lineTo(this.x - camX + 5, this.y + 12);
            ctx.lineTo(this.x - camX, this.y + 7);
            ctx.lineTo(this.x - camX + 7, this.y + 7);
            ctx.closePath();
            ctx.fill();
        }
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.collected = false;
        this.floatOffset = 0;
    }

    update() {
        this.floatOffset = Math.sin(Date.now() / 200) * 5;
    }

    draw(ctx, camX) {
        if (this.collected) return;
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.beginPath();
        ctx.arc(this.x - camX + this.radius, this.y + this.floatOffset + this.radius, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.stroke();
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
    let startX = lastPlatformX;

    while (lastPlatformX < cameraX + SCREEN_WIDTH * 2) {
        let gap = Math.random() * 150 + 50;
        let width = Math.random() * 300 + 100;
        let height = 50 + Math.random() * 100;
        let y = SCREEN_HEIGHT - height;

        let prevY = platforms.length > 0 ? platforms[platforms.length - 1].y : SCREEN_HEIGHT - 100;
        y = prevY + (Math.random() * 160 - 80); 
        if (y > SCREEN_HEIGHT - 50) y = SCREEN_HEIGHT - 50;
        if (y < 200) y = 200;

        let newPlat = new Platform(lastPlatformX + gap, y, width, SCREEN_HEIGHT - y);
        platforms.push(newPlat);
        lastPlatformX += gap + width;

        // Enemies
        if (width > 200 && Math.random() > 0.4) {
            enemies.push(new Enemy(newPlat.x + 50, newPlat.y - 30, width - 100));
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
        if (Math.random() > 0.9) {
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
    cameraX = 0;
    lastPlatformX = 0;

    let startPlat = new Platform(50, SCREEN_HEIGHT - 100, 500, 100);
    platforms.push(startPlat);
    lastPlatformX = 50 + 500;

    generateChunk();
    
    gameRunning = true;
    scoreEl.innerText = score;
    startScreen.classList.remove('active');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.remove('active');
    gameOverScreen.classList.add('hidden');
    
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
            if (prevY + player.height <= plat.y) {
                player.y = plat.y - player.height;
                player.velY = 0;
                player.isGrounded = true;
            } else if (prevY >= plat.y + plat.height) {
                player.y = plat.y + plat.height;
                player.velY = 0;
            } else {
                if (player.x < plat.x) player.x = plat.x - player.width;
                else player.x = plat.x + plat.width;
                player.velX = 0;
            }
        }
    }

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
            player.x < coin.x + coin.radius * 2 &&
            player.x + player.width > coin.x &&
            player.y < coin.y + coin.radius * 2 &&
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
    // Resume audio context on user interaction
    if (audioCtx.state === 'suspended') audioCtx.resume();
    initGame();
});
document.getElementById('restart-btn').addEventListener('click', initGame);