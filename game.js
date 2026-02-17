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
        this.width = 30;
        this.height = 30;
        this.x = 100;
        this.y = SCREEN_HEIGHT - 150;
        this.velX = 0;
        this.velY = 0;
        this.isGrounded = false;
        this.color = '#ff0000'; // Mario Red
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

        // Floor Collision (Safety net, though we should rely on platforms)
        if (this.y + this.height > SCREEN_HEIGHT + 200) {
            gameOver();
        }
    }

    jump() {
        if (this.isGrounded) {
            this.velY = JUMP_FORCE;
            this.isGrounded = false;
        }
    }

    draw(ctx, camX) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        
        // Eyes (to see direction)
        ctx.fillStyle = 'white';
        let eyeOffsetX = this.velX >= 0 ? 18 : 4;
        ctx.fillRect(this.x - camX + eyeOffsetX, this.y + 4, 8, 8);
        ctx.fillStyle = 'black';
        let pupilOffsetX = this.velX >= 0 ? 22 : 4;
        ctx.fillRect(this.x - camX + pupilOffsetX, this.y + 6, 4, 4);
    }
}

class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = '#8B4513'; // Ground Brown
        this.grassColor = '#32CD32'; // Grass Green
    }

    draw(ctx, camX) {
        // Ground
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        // Grass Top
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
        this.color = '#800000'; // Goomba maroon
    }

    update() {
        this.x += this.speed * this.dir;
        if (this.x > this.startX + this.range || this.x < this.startX) {
            this.dir *= -1;
        }
    }

    draw(ctx, camX) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x - camX + 5, this.y + 5, 8, 8);
        ctx.fillRect(this.x - camX + 17, this.y + 5, 8, 8);
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - camX + 7, this.y + 7, 4, 4);
        ctx.fillRect(this.x - camX + 19, this.y + 7, 4, 4);
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

// Level Generation
let lastPlatformX = 0;

function generateChunk() {
    // Determine start X (either 0 or after the last platform)
    let startX = lastPlatformX;

    // Generate platforms forward until we have enough buffer
    while (lastPlatformX < cameraX + SCREEN_WIDTH * 2) {
        let gap = Math.random() * 150 + 50; // Random gap 50-200
        let width = Math.random() * 300 + 100; // Platform width 100-400
        let height = 50 + Math.random() * 100; // Random height variation relative to bottom
        let y = SCREEN_HEIGHT - height;

        // Variation in Y (platforms going up and down)
        // Keep it reachable
        let prevY = platforms.length > 0 ? platforms[platforms.length - 1].y : SCREEN_HEIGHT - 100;
        y = prevY + (Math.random() * 160 - 80); 
        // Clamp Y
        if (y > SCREEN_HEIGHT - 50) y = SCREEN_HEIGHT - 50;
        if (y < 200) y = 200;

        let newPlat = new Platform(lastPlatformX + gap, y, width, SCREEN_HEIGHT - y);
        platforms.push(newPlat);
        lastPlatformX += gap + width;

        // Chance to spawn enemy
        if (width > 200 && Math.random() > 0.4) {
            enemies.push(new Enemy(newPlat.x + 50, newPlat.y - 30, width - 100));
        }

        // Chance to spawn coins
        if (Math.random() > 0.3) {
            let numCoins = Math.floor(Math.random() * 5) + 1;
            let startCoinX = newPlat.x + (width - (numCoins * 30)) / 2;
            for(let i=0; i<numCoins; i++) {
                coins.push(new Coin(startCoinX + i * 30, newPlat.y - 50 - (Math.random() * 50)));
            }
        }
    }

    // Cleanup old entities
    platforms = platforms.filter(p => p.x + p.width > cameraX - 200);
    enemies = enemies.filter(e => e.x > cameraX - 200);
    coins = coins.filter(c => c.x > cameraX - 200 && !c.collected);
}

function initGame() {
    player = new Player();
    platforms = [];
    enemies = [];
    coins = [];
    score = 0;
    cameraX = 0;
    lastPlatformX = 0; // Reset generation pointer

    // Create starting platform
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
        // AABB Collision
        if (player.x < plat.x + plat.width &&
            player.x + player.width > plat.x &&
            player.y < plat.y + plat.height &&
            player.y + player.height > plat.y) {
            
            // Resolve Collision
            // Check previous position to determine side of collision
            let prevY = player.y - player.velY;
            
            // Land on top
            if (prevY + player.height <= plat.y) {
                player.y = plat.y - player.height;
                player.velY = 0;
                player.isGrounded = true;
            } 
            // Hit bottom (ceiling)
            else if (prevY >= plat.y + plat.height) {
                player.y = plat.y + plat.height;
                player.velY = 0;
            }
            // Side collision (block movement)
            else {
                if (player.x < plat.x) player.x = plat.x - player.width;
                else player.x = plat.x + plat.width;
                player.velX = 0;
            }
        }
    }

    // Enemy Collision
    for (let enemy of enemies) {
        if (player.x < enemy.x + enemy.width - 5 &&
            player.x + player.width > enemy.x + 5 &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            
            // Check if jumping on top
            if (player.velY > 0 && player.y + player.height - player.velY < enemy.y + 10) {
                // Kill enemy
                enemy.x = -1000; // Move away
                player.velY = -8; // Bounce
                score += 50;
            } else {
                gameOver();
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
    
    // Update Camera (Keep player in middle-left)
    if (player.x > cameraX + 300) {
        cameraX = player.x - 300;
    }

    // Enemies
    enemies.forEach(e => e.update());

    // Coins
    coins.forEach(c => c.update());

    checkCollisions();
    generateChunk();

    // Death by falling
    if (player.y > SCREEN_HEIGHT) {
        gameOver();
    }

    scoreEl.innerText = score;
}

function draw() {
    // Clear Screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Parallax (Simple Clouds/Hills could go here)
    // For now just Sky Blue defined in CSS + Canvas clear

    // Draw Entities relative to Camera
    platforms.forEach(p => p.draw(ctx, cameraX));
    enemies.forEach(e => e.draw(ctx, cameraX));
    coins.forEach(c => c.draw(ctx, cameraX));
    player.draw(ctx, cameraX);
}

function gameLoop() {
    if (gameRunning) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// Button Listeners
document.getElementById('start-btn').addEventListener('click', initGame);
document.getElementById('restart-btn').addEventListener('click', initGame);
