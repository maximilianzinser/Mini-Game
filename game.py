import pygame
import random
import os

# Initialize Pygame
pygame.init()

# Constants
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
GRAVITY = 0.5
PLAYER_SPEED = 5
JUMP_FORCE = -12
TILE_SIZE = 40

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
SKY_BLUE = (135, 206, 235)
RED = (255, 0, 0)
GROUND_BROWN = (139, 69, 19)
GRASS_GREEN = (50, 205, 50)
GOOMBA_MAROON = (128, 0, 0)
GOLD = (255, 215, 0)

# Screen Setup
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Infinite Plumber - Pygame Edition")
clock = pygame.time.Clock()

# Fonts
font = pygame.font.Font(None, 36)
large_font = pygame.font.Font(None, 72)

# High Score File
HIGH_SCORE_FILE = "highscore.txt"

def load_high_score():
    if os.path.exists(HIGH_SCORE_FILE):
        try:
            with open(HIGH_SCORE_FILE, "r") as f:
                return int(f.read())
        except:
            return 0
    return 0

def save_high_score(score):
    with open(HIGH_SCORE_FILE, "w") as f:
        f.write(str(score))

class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((30, 30))
        self.image.fill(RED)
        
        # Eyes
        pygame.draw.rect(self.image, WHITE, (18, 4, 8, 8))
        pygame.draw.rect(self.image, BLACK, (22, 6, 4, 4))
        
        self.rect = self.image.get_rect()
        self.rect.x = 100
        self.rect.y = SCREEN_HEIGHT - 150
        self.vel_y = 0
        self.vel_x = 0
        self.is_grounded = False

    def update(self, platforms):
        # Apply Gravity
        self.vel_y += GRAVITY
        
        # Move Horizontal
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.vel_x = -PLAYER_SPEED
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.vel_x = PLAYER_SPEED
        else:
            self.vel_x = 0
            
        self.rect.x += self.vel_x
        
        # Horizontal Collision
        hits = pygame.sprite.spritecollide(self, platforms, False)
        for platform in hits:
            if self.vel_x > 0:
                self.rect.right = platform.rect.left
            elif self.vel_x < 0:
                self.rect.left = platform.rect.right
        
        # Move Vertical
        self.rect.y += self.vel_y
        
        # Vertical Collision
        self.is_grounded = False
        hits = pygame.sprite.spritecollide(self, platforms, False)
        for platform in hits:
            if self.vel_y > 0:
                self.rect.bottom = platform.rect.top
                self.vel_y = 0
                self.is_grounded = True
            elif self.vel_y < 0:
                self.rect.top = platform.rect.bottom
                self.vel_y = 0

    def jump(self):
        if self.is_grounded:
            self.vel_y = JUMP_FORCE

    def draw(self, surface, cam_x):
        surface.blit(self.image, (self.rect.x - cam_x, self.rect.y))

class Platform(pygame.sprite.Sprite):
    def __init__(self, x, y, width, height):
        super().__init__()
        self.image = pygame.Surface((width, height))
        self.image.fill(GROUND_BROWN)
        pygame.draw.rect(self.image, GRASS_GREEN, (0, 0, width, 10))
        self.rect = self.image.get_rect()
        self.rect.x = x
        self.rect.y = y

class Enemy(pygame.sprite.Sprite):
    def __init__(self, x, y, range_dist):
        super().__init__()
        self.image = pygame.Surface((30, 30))
        self.image.fill(GOOMBA_MAROON)
        
        # Eyes
        pygame.draw.rect(self.image, WHITE, (5, 5, 8, 8))
        pygame.draw.rect(self.image, WHITE, (17, 5, 8, 8))
        pygame.draw.rect(self.image, BLACK, (7, 7, 4, 4))
        pygame.draw.rect(self.image, BLACK, (19, 7, 4, 4))
        
        self.rect = self.image.get_rect()
        self.rect.x = x
        self.rect.y = y
        self.start_x = x
        self.range_dist = range_dist
        self.speed = 2
        self.direction = 1

    def update(self):
        self.rect.x += self.speed * self.direction
        if self.rect.x > self.start_x + self.range_dist or self.rect.x < self.start_x:
            self.direction *= -1

class Coin(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.image = pygame.Surface((20, 20), pygame.SRCALPHA)
        pygame.draw.circle(self.image, GOLD, (10, 10), 10)
        pygame.draw.circle(self.image, (218, 165, 32), (10, 10), 10, 2)
        self.rect = self.image.get_rect()
        self.rect.x = x
        self.rect.y = y
        self.start_y = y
        self.float_offset = 0

    def update(self):
        self.float_offset = (pygame.time.get_ticks() / 200) 
        self.rect.y = self.start_y + (5 * (self.float_offset % 2 - 1)) # Simple bounce

def main():
    player = Player()
    
    platforms = pygame.sprite.Group()
    enemies = pygame.sprite.Group()
    coins = pygame.sprite.Group()
    
    # Starting Platform
    start_plat = Platform(50, SCREEN_HEIGHT - 100, 500, 100)
    platforms.add(start_plat)
    
    last_platform_x = 550
    camera_x = 0
    score = 0
    high_score = load_high_score()
    
    game_state = "START" # START, PLAYING, GAME_OVER
    
    running = True
    while running:
        # Event Handling
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE or event.key == pygame.K_UP or event.key == pygame.K_w:
                    if game_state == "PLAYING":
                        player.jump()
                    elif game_state == "START" or game_state == "GAME_OVER":
                        # Reset Game
                        player = Player()
                        platforms.empty()
                        enemies.empty()
                        coins.empty()
                        platforms.add(Platform(50, SCREEN_HEIGHT - 100, 500, 100))
                        last_platform_x = 550
                        camera_x = 0
                        score = 0
                        game_state = "PLAYING"

        screen.fill(SKY_BLUE)
        
        if game_state == "START":
            title_text = large_font.render("Infinite Plumber", True, WHITE)
            instr_text = font.render("Press SPACE to Start", True, WHITE)
            screen.blit(title_text, (SCREEN_WIDTH//2 - title_text.get_width()//2, SCREEN_HEIGHT//2 - 50))
            screen.blit(instr_text, (SCREEN_WIDTH//2 - instr_text.get_width()//2, SCREEN_HEIGHT//2 + 20))
            
        elif game_state == "PLAYING":
            # Procedural Generation
            while last_platform_x < camera_x + SCREEN_WIDTH * 2:
                gap = random.randint(50, 200)
                width = random.randint(100, 400)
                height = 50 + random.randint(0, 100)
                y = SCREEN_HEIGHT - height
                
                # Height Variation
                if len(platforms) > 0:
                    prev_y = platforms.sprites()[-1].rect.y
                    y = prev_y + random.randint(-80, 80)
                    y = max(200, min(SCREEN_HEIGHT - 50, y))
                
                new_plat = Platform(last_platform_x + gap, y, width, SCREEN_HEIGHT - y)
                platforms.add(new_plat)
                last_platform_x += gap + width
                
                # Spawn Enemy
                if width > 200 and random.random() > 0.4:
                    enemies.add(Enemy(new_plat.rect.x + 50, new_plat.rect.y - 30, width - 100))
                
                # Spawn Coins
                if random.random() > 0.3:
                    num_coins = random.randint(1, 5)
                    start_coin_x = new_plat.rect.x + (width - (num_coins * 30)) / 2
                    for i in range(num_coins):
                        coins.add(Coin(start_coin_x + i * 30, new_plat.rect.y - 50 - random.randint(0, 50)))

            # Update Entities
            player.update(platforms)
            enemies.update()
            coins.update()
            
            # Camera Follow
            if player.rect.x > camera_x + 300:
                camera_x = player.rect.x - 300
            
            # Draw World (Apply Camera Offset)
            for plat in platforms:
                if plat.rect.right > camera_x:
                    screen.blit(plat.image, (plat.rect.x - camera_x, plat.rect.y))
                    
            for enemy in enemies:
                if enemy.rect.right > camera_x:
                    screen.blit(enemy.image, (enemy.rect.x - camera_x, enemy.rect.y))
                    
            for coin in coins:
                if coin.rect.right > camera_x:
                    screen.blit(coin.image, (coin.rect.x - camera_x, coin.rect.y))
            
            player.draw(screen, camera_x)
            
            # Collisions
            # Enemy
            enemy_hits = pygame.sprite.spritecollide(player, enemies, False)
            for enemy in enemy_hits:
                if player.vel_y > 0 and player.rect.bottom < enemy.rect.centery + 10:
                    enemy.kill()
                    player.vel_y = -8
                    score += 50
                else:
                    game_state = "GAME_OVER"
                    if score > high_score:
                        high_score = score
                        save_high_score(high_score)
            
            # Coin
            coin_hits = pygame.sprite.spritecollide(player, coins, True)
            for coin in coin_hits:
                score += 10
            
            # Death Fall
            if player.rect.y > SCREEN_HEIGHT:
                game_state = "GAME_OVER"
                if score > high_score:
                    high_score = score
                    save_high_score(high_score)
            
            # Cleanup
            for plat in platforms:
                if plat.rect.right < camera_x - 100:
                    plat.kill()
            for enemy in enemies:
                if enemy.rect.right < camera_x - 100:
                    enemy.kill()

            # UI
            score_text = font.render(f"Score: {score}", True, WHITE)
            screen.blit(score_text, (10, 10))
            hs_text = font.render(f"High Score: {high_score}", True, GOLD)
            screen.blit(hs_text, (SCREEN_WIDTH - hs_text.get_width() - 10, 10))

        elif game_state == "GAME_OVER":
            go_text = large_font.render("GAME OVER", True, RED)
            score_text = font.render(f"Final Score: {score}", True, WHITE)
            retry_text = font.render("Press SPACE to Retry", True, WHITE)
            
            screen.blit(go_text, (SCREEN_WIDTH//2 - go_text.get_width()//2, SCREEN_HEIGHT//2 - 60))
            screen.blit(score_text, (SCREEN_WIDTH//2 - score_text.get_width()//2, SCREEN_HEIGHT//2))
            screen.blit(retry_text, (SCREEN_WIDTH//2 - retry_text.get_width()//2, SCREEN_HEIGHT//2 + 40))

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

if __name__ == "__main__":
    main()