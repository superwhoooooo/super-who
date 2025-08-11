class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = new Player(300, 50);
        this.currentLevel = 1;
        this.currentRoom = 1;
        this.monsters = [];
        this.bullets = [];
        this.keys = {};
        this.gameState = 'menu';
        this.messages = [];
        
        this.setupEventListeners();
        this.gameLoop();
        
        // Show initial menu message
        this.addMessage('Welcome to the Dungeon Crawler!');
        this.addMessage('Press R to begin your adventure.');
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === ' ' || e.key.startsWith('Arrow') || e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'f') {
                e.preventDefault();
            }
            
            if ((this.gameState === 'gameOver' || this.gameState === 'menu') && e.key.toLowerCase() === 'r') {
                if (this.gameState === 'menu') {
                    this.startGame();
                } else {
                    this.restart();
                }
            } else if (this.gameState === 'gameOver' && e.key === ' ') {
                this.gameState = 'menu';
                this.addMessage('Returned to main menu.');
            } else if (this.gameState === 'playing') {
                if (e.key === ' ') {
                    this.player.attack(this.monsters);
                } else if (e.key.toLowerCase() === 'g') {
                    this.player.switchWeapon();
                } else if (e.key.toLowerCase() === 'f') {
                    this.player.freezeEnemies(this.monsters);
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }
    
    generateRoom() {
        this.monsters = [];
        
        // Progressive difficulty - more monsters and stronger types as rooms increase
        const baseMonsterCount = 3 + (this.currentLevel - 1); // Base increases with level (reduced from 4 to 3)
        const roomMultiplier = Math.floor((this.currentRoom - 1) / 3); // Every 3 rooms add +1 monster (reduced from 2 to 3)
        const levelMultiplier = Math.floor((this.currentLevel - 1) / 3); // Every 3 levels add +1 monster (reduced from 2 to 3)
        const randomVariation = Math.floor(Math.random() * 2) + 1; // 1-2 random monsters (reduced from 1-3)
        let monsterCount = Math.min(baseMonsterCount + roomMultiplier + levelMultiplier + randomVariation, 12); // Cap reduced to 12
        
        // Apply shadow essence monster reduction
        monsterCount = Math.max(1, monsterCount - this.player.monsterReduction); // Always spawn at least 1 monster
        
        for (let i = 0; i < monsterCount; i++) {
            const x = Math.random() * (this.canvas.width - 60) + 30;
            const y = Math.random() * (this.canvas.height - 60) + 30;
            
            if (Math.abs(x - this.player.x) > 100 || Math.abs(y - this.player.y) > 100) {
                // Progressive monster type selection based on room
                let monsterTypes;
                if (this.currentRoom <= 3) {
                    monsterTypes = ['goblin', 'goblin', 'orc']; // Early rooms: mostly goblins
                } else if (this.currentRoom <= 7) {
                    monsterTypes = ['goblin', 'orc', 'orc', 'skeleton']; // Mid rooms: more orcs
                } else if (this.currentRoom <= 12) {
                    monsterTypes = ['orc', 'skeleton', 'skeleton', 'troll']; // Late rooms: stronger enemies
                } else {
                    monsterTypes = ['skeleton', 'troll', 'troll', 'troll']; // Final rooms: mostly trolls
                }
                
                const type = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
                this.monsters.push(new Monster(x, y, type, this.currentRoom + ((this.currentLevel - 1) * 15)));
            }
        }
        
        // Special boss room handling
        if (this.currentRoom === 10) {
            // Clear regular monsters and spawn boss
            this.monsters = [];
            let selectedBossType;
            
            if (this.currentLevel === 1) {
                // Level 1 always spawns ShadowWraith
                selectedBossType = 'ShadowWraith';
            } else if (this.currentLevel === 2) {
                // Level 2 always spawns NecromancerKing
                selectedBossType = 'NecromancerKing';
            } else if (this.currentLevel === 3) {
                // Level 3 always spawns DragonLord
                selectedBossType = 'DragonLord';
            } else if (this.currentLevel === 4) {
                // Level 4 always spawns TrollChieftain
                selectedBossType = 'TrollChieftain';
            } else if (this.currentLevel === 5) {
                // Level 5 always spawns GolemMaster
                selectedBossType = 'GolemMaster';
            } else {
                // Other levels spawn random bosses
                const bossTypes = ['DragonLord', 'NecromancerKing', 'TrollChieftain', 'ShadowWraith', 'GolemMaster'];
                selectedBossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
            }
            
            // Spawn boss in center of room
            const bossX = this.canvas.width / 2 - 15;
            const bossY = this.canvas.height / 2 - 15;
            this.monsters.push(new Boss(bossX, bossY, selectedBossType, this.currentLevel));
            
            this.addMessage(`BOSS ROOM! Level ${this.currentLevel} ${selectedBossType} awaits!`);
        } else {
            this.addMessage(`L${this.currentLevel} Room ${this.currentRoom}/10 - ${this.monsters.length} monsters await!`);
        }
    }
    
    nextRoom() {
        this.currentRoom++;
        this.player.heal(20);
        this.player.restoreMana(10);
        this.generateRoom();
        this.updateRoomDisplay();
        soundManager.roomAdvance();
    }
    
    nextLevel() {
        this.currentLevel++;
        this.currentRoom = 1;
        this.player.heal(50); // More healing between levels
        this.player.restoreMana(25);
        this.player.levelUp(); // Bonus level up for completing a level
        this.generateRoom();
        this.updateRoomDisplay();
        this.addMessage(`LEVEL ${this.currentLevel} BEGINS! You grow stronger!`);
        soundManager.levelAdvance();
    }
    
    updateRoomDisplay() {
        document.getElementById('room').textContent = `L${this.currentLevel} R${this.currentRoom}`;
    }
    
    addMessage(text) {
        this.messages.unshift(text);
        if (this.messages.length > 10) this.messages.pop();
        
        const log = document.getElementById('messageLog');
        log.innerHTML = this.messages.map(msg => `<div>${msg}</div>`).join('');
    }
    
    renderBackground() {
        // Base dark background
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add atmospheric gradient
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 2
        );
        gradient.addColorStop(0, 'rgba(30, 30, 30, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add stone texture pattern
        for (let x = 0; x < this.canvas.width; x += 10) {
            for (let y = 0; y < this.canvas.height; y += 10) {
                if (Math.random() < 0.02) {
                    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
                    this.ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.player.update(this.keys, this.canvas);
        
        this.monsters.forEach(monster => {
            monster.update(this.player);
            monster.checkCollision(this.player);
        });
        
        // Update bullets
        this.bullets.forEach(bullet => {
            bullet.update();
            if (bullet.checkCollision) {
                bullet.checkCollision(this.monsters);
            }
            // Handle boss projectiles hitting player
            if (bullet.constructor.name === 'BossProjectile') {
                bullet.checkCollision(this.player);
            }
        });
        
        // Remove dead bullets
        this.bullets = this.bullets.filter(bullet => bullet.active);
        
        this.monsters = this.monsters.filter(monster => {
            if (monster.health <= 0) {
                this.player.gainExp(monster.expReward);
                this.addMessage(`Defeated ${monster.type}! +${monster.expReward} XP`);
                soundManager.monsterDeath();
                
                // Shadow Wraith special drop: 10% chance for monster reduction
                if (monster.type === 'ShadowWraith' && Math.random() < 0.1) {
                    this.player.monsterReduction += 1;
                    this.addMessage('Shadow essence absorbed! Fewer monsters will spawn in future rooms.');
                    soundManager.victory(); // Special sound for rare drop
                }
                
                // Necromancer King always drops Wizard Staff
                if (monster.type === 'NecromancerKing') {
                    this.player.hasWizardStaff = true;
                    this.addMessage('You obtained the Wizard Staff! Shoots bouncing magic bolts. Press F to freeze enemies!');
                    soundManager.victory();
                }
                
                return false;
            }
            return true;
        });
        
        // Check if player walks into entrance when room is clear
        if (this.monsters.length === 0 && this.player.y > this.canvas.height - 60 && 
            this.player.x > this.canvas.width / 2 - 50 && this.player.x < this.canvas.width / 2 + 30) {
            if (this.currentRoom >= 10) {
                this.nextLevel();
            } else {
                this.nextRoom();
            }
        }
        
        if (this.player.health <= 0) {
            this.gameState = 'gameOver';
            this.addMessage('Game Over! Press R to restart.');
            soundManager.gameOver();
        }
        
        this.player.updateUI();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Enhanced background with pattern
        this.renderBackground();
        
        // Add subtle grid pattern
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.monsters.forEach(monster => monster.render(this.ctx));
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.player.render(this.ctx);
        
        // Draw entrance at bottom when room is clear
        if (this.monsters.length === 0 && this.gameState === 'playing') {
            if (this.currentRoom >= 10) {
                // Level completion entrance
                this.ctx.fillStyle = '#9932CC';
                this.ctx.fillRect(this.canvas.width / 2 - 50, this.canvas.height - 40, 100, 40);
                
                this.ctx.fillStyle = '#1a1a1a';
                this.ctx.fillRect(this.canvas.width / 2 - 45, this.canvas.height - 35, 90, 30);
                
                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = '12px Courier New';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`LEVEL ${this.currentLevel + 1}`, this.canvas.width / 2, this.canvas.height - 18);
                
                this.ctx.fillStyle = '#9932CC';
                this.ctx.font = '10px Courier New';
                this.ctx.fillText('Enter portal to advance', this.canvas.width / 2, this.canvas.height - 50);
            } else {
                // Regular room entrance
                this.ctx.fillStyle = '#2ecc71';
                this.ctx.fillRect(this.canvas.width / 2 - 50, this.canvas.height - 40, 100, 40);
                
                this.ctx.fillStyle = '#1a1a1a';
                this.ctx.fillRect(this.canvas.width / 2 - 45, this.canvas.height - 35, 90, 30);
                
                this.ctx.fillStyle = '#f39c12';
                this.ctx.font = '14px Courier New';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('NEXT ROOM', this.canvas.width / 2, this.canvas.height - 18);
                
                this.ctx.fillStyle = '#27ae60';
                this.ctx.font = '12px Courier New';
                this.ctx.fillText('Walk into entrance', this.canvas.width / 2, this.canvas.height - 50);
            }
        }
        
        // Draw main menu screen
        if (this.gameState === 'menu') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#f39c12';
            this.ctx.font = '42px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SUPERWHO?!', this.canvas.width / 2, this.canvas.height / 2 - 100);
            
            this.ctx.fillStyle = '#3498db';
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('A Pixel Adventure Game', this.canvas.width / 2, this.canvas.height / 2 - 60);
            
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.font = '24px Courier New';
            this.ctx.fillText('Press R to Start', this.canvas.width / 2, this.canvas.height / 2 + 20);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px Courier New';
            this.ctx.fillText('Controls: Arrow Keys - Move, SPACE - Attack, G - Switch Weapon', this.canvas.width / 2, this.canvas.height / 2 + 80);
            
            // Animated subtitle
            const time = Date.now() * 0.003;
            const alpha = 0.5 + 0.5 * Math.sin(time);
            this.ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
            this.ctx.font = '16px Courier New';
            this.ctx.fillText('Defeat monsters, advance through rooms, become legendary!', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
        
        
        // Draw game over screen
        if (this.gameState === 'gameOver') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = '48px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 60);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '24px Courier New';
            this.ctx.fillText(`Level ${this.currentLevel}, Room ${this.currentRoom}/10`, this.canvas.width / 2, this.canvas.height / 2 - 10);
            
            this.ctx.fillStyle = '#f39c12';
            this.ctx.font = '20px Courier New';
            this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 30);
            
            this.ctx.fillStyle = '#3498db';
            this.ctx.font = '18px Courier New';
            this.ctx.fillText('Press SPACE for menu', this.canvas.width / 2, this.canvas.height / 2 + 60);
        }
    }
    
    startGame() {
        this.player = new Player(300, 50);
        this.currentLevel = 1;
        this.currentRoom = 1;
        this.monsters = [];
        this.bullets = [];
        this.gameState = 'playing';
        this.messages = [];
        this.generateRoom();
        this.addMessage('Adventure begins!');
        this.updateRoomDisplay();
        this.player.updateUI();
        this.player.updateWeaponUI();
        
        // Play startup sound
        setTimeout(() => soundManager.gameStart(), 200);
    }
    
    restart() {
        this.player = new Player(300, 50);
        this.currentLevel = 1;
        this.currentRoom = 1;
        this.monsters = [];
        this.bullets = [];
        this.gameState = 'playing';
        this.messages = [];
        this.generateRoom();
        this.addMessage('New game started!');
        this.updateRoomDisplay();
        this.player.updateUI();
        this.player.updateWeaponUI();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 3;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.maxMana = 50;
        this.mana = this.maxMana;
        this.level = 1;
        this.exp = 0;
        this.expToNext = 100;
        this.weapons = {
            sword: new WeaponType('Battle Sword', 22, 32),
            gun: new WeaponType('Pistol', 20, 30),
            staff: new WeaponType('Wizard Staff', 18, 28)
        };
        this.hasWizardStaff = false;
        this.currentWeapon = 'sword';
        this.attackCooldown = 0;
        this.invulnerable = 0;
        this.lastDirection = { x: 0, y: -1 }; // Default facing up
        this.monsterReduction = 0; // Reduces monster spawns per room
        this.freezeCooldown = 0; // Cooldown for freeze ability
    }
    
    update(keys, canvas) {
        let moved = false;
        if (keys['ArrowUp'] && this.y > 0) {
            this.y -= this.speed;
            this.lastDirection = { x: 0, y: -1 };
            moved = true;
        }
        if (keys['ArrowDown'] && this.y < canvas.height - this.height) {
            this.y += this.speed;
            this.lastDirection = { x: 0, y: 1 };
            moved = true;
        }
        if (keys['ArrowLeft'] && this.x > 0) {
            this.x -= this.speed;
            this.lastDirection = { x: -1, y: 0 };
            moved = true;
        }
        if (keys['ArrowRight'] && this.x < canvas.width - this.width) {
            this.x += this.speed;
            this.lastDirection = { x: 1, y: 0 };
            moved = true;
        }
        
        // Occasional footstep sound when moving
        if (moved && Math.random() < 0.1) {
            soundManager.footstep();
        }
        
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.invulnerable > 0) this.invulnerable--;
        if (this.freezeCooldown > 0) this.freezeCooldown--;
    }
    
    attack(monsters) {
        if (this.attackCooldown > 0) return;
        
        if (this.currentWeapon === 'gun') {
            // Shoot bullet in opposite direction of movement (facing direction)
            const bullet = new Bullet(
                this.x + this.width / 2,
                this.y + this.height / 2,
                -this.lastDirection.x,
                -this.lastDirection.y,
                this.weapons.gun.getDamage()
            );
            game.bullets.push(bullet);
            game.addMessage(`Fired ${this.weapons.gun.name}!`);
            soundManager.gunShot();
        } else if (this.currentWeapon === 'staff' && this.hasWizardStaff) {
            // Shoot bouncing magic bolt
            const bouncingBullet = new BouncingBullet(
                this.x + this.width / 2,
                this.y + this.height / 2,
                -this.lastDirection.x,
                -this.lastDirection.y,
                this.weapons.staff.getDamage()
            );
            game.bullets.push(bouncingBullet);
            game.addMessage(`Cast ${this.weapons.staff.name} magic bolt!`);
            soundManager.gunShot(); // TODO: Add magic sound
        } else {
            // Sword: short range melee attack
            if (monsters.length === 0) return;
            
            const attackRange = 35; // Very short range for sword
            let hit = false;
            
            monsters.forEach(monster => {
                const dx = monster.x - this.x;
                const dy = monster.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < attackRange) {
                    const damage = this.weapons.sword.getDamage();
                    monster.takeDamage(damage, 'sword');
                    game.addMessage(`Hit ${monster.type} with ${this.weapons.sword.name} for ${damage} damage!`);
                    soundManager.hit();
                    hit = true;
                }
            });
            
            if (!hit) {
                game.addMessage('Sword swing missed! Get closer!');
                soundManager.miss();
            } else {
                soundManager.swordSwish();
            }
        }
        
        this.attackCooldown = 20;
    }
    
    freezeEnemies(monsters) {
        if (!this.hasWizardStaff || this.freezeCooldown > 0) return;
        
        // Freeze all monsters for 2 seconds (120 frames at 60fps)
        monsters.forEach(monster => {
            monster.frozen = 120;
        });
        
        this.freezeCooldown = 600; // 10 second cooldown
        game.addMessage('Wizard Staff: All enemies frozen for 2 seconds!');
        soundManager.levelUp(); // Use level up sound for special ability
    }
    
    takeDamage(damage) {
        if (this.invulnerable > 0) return;
        
        this.health -= damage;
        if (this.health < 0) this.health = 0;
        this.invulnerable = 30;
        game.addMessage(`Took ${damage} damage!`);
        soundManager.takeDamage();
    }
    
    heal(amount) {
        this.health += amount;
        if (this.health > this.maxHealth) this.health = this.maxHealth;
    }
    
    restoreMana(amount) {
        this.mana += amount;
        if (this.mana > this.maxMana) this.mana = this.maxMana;
    }
    
    gainExp(amount) {
        this.exp += amount;
        while (this.exp >= this.expToNext) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.exp -= this.expToNext;
        this.expToNext = Math.floor(this.expToNext * 1.5);
        this.maxHealth += 20;
        this.health = this.maxHealth;
        this.maxMana += 10;
        this.mana = this.maxMana;
        game.addMessage(`Level up! Now level ${this.level}`);
        soundManager.levelUp();
    }
    
    switchWeapon() {
        // Cycle through available weapons
        const availableWeapons = ['sword', 'gun'];
        if (this.hasWizardStaff) {
            availableWeapons.push('staff');
        }
        
        const currentIndex = availableWeapons.indexOf(this.currentWeapon);
        const nextIndex = (currentIndex + 1) % availableWeapons.length;
        this.currentWeapon = availableWeapons[nextIndex];
        
        this.updateWeaponUI();
        const weapon = this.weapons[this.currentWeapon];
        game.addMessage(`Switched to ${weapon.name}`);
        soundManager.weaponSwitch();
    }
    
    updateUI() {
        document.getElementById('health').textContent = `${this.health}/${this.maxHealth}`;
        document.getElementById('mana').textContent = `${this.mana}/${this.maxMana}`;
        document.getElementById('exp').textContent = `${this.exp}/${this.expToNext}`;
        
        document.getElementById('healthBar').style.width = `${(this.health / this.maxHealth) * 100}%`;
        document.getElementById('manaBar').style.width = `${(this.mana / this.maxMana) * 100}%`;
        document.getElementById('expBar').style.width = `${(this.exp / this.expToNext) * 100}%`;
    }
    
    updateWeaponUI() {
        const weapon = this.weapons[this.currentWeapon];
        document.getElementById('weaponName').textContent = weapon.name;
        document.getElementById('weaponDamage').textContent = `Damage: ${weapon.minDamage}-${weapon.maxDamage}`;
    }
    
    renderFace(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const isHurt = this.invulnerable > 0;
        
        // Eyes (black)
        ctx.fillStyle = '#000000';
        ctx.fillRect(centerX - 6, centerY - 4, 3, 3);
        ctx.fillRect(centerX + 3, centerY - 4, 3, 3);
        
        // Mouth - changes based on state
        ctx.fillStyle = isHurt ? '#ff0000' : '#ffffff';
        if (isHurt) {
            // Hurt expression - open mouth
            ctx.fillRect(centerX - 2, centerY + 2, 4, 2);
        } else if (this.attackCooldown > 0) {
            // Attacking expression - gritted teeth
            ctx.fillRect(centerX - 3, centerY + 1, 6, 1);
            ctx.fillRect(centerX - 2, centerY + 2, 1, 1);
            ctx.fillRect(centerX, centerY + 2, 1, 1);
            ctx.fillRect(centerX + 2, centerY + 2, 1, 1);
        } else {
            // Normal expression - small smile
            ctx.fillRect(centerX - 2, centerY + 1, 4, 1);
        }
        
        // Hero mustache
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(centerX - 4, centerY, 8, 1);
    }
    
    renderWeapon(ctx, centerX, centerY) {
        const weaponOffsetX = 12; // Position weapon further to the right of player
        const weaponOffsetY = 2; // Slightly below center
        
        if (this.currentWeapon === 'gun') {
            // Draw pistol
            ctx.fillStyle = '#444444'; // Dark gray for gun body
            ctx.fillRect(centerX + weaponOffsetX, centerY + weaponOffsetY, 6, 3);
            
            // Gun barrel
            ctx.fillStyle = '#222222'; // Darker for barrel
            ctx.fillRect(centerX + weaponOffsetX + 6, centerY + weaponOffsetY + 1, 3, 1);
            
            // Gun grip
            ctx.fillStyle = '#8B4513'; // Brown grip
            ctx.fillRect(centerX + weaponOffsetX + 1, centerY + weaponOffsetY + 3, 2, 3);
        } else if (this.currentWeapon === 'staff' && this.hasWizardStaff) {
            // Draw wizard staff
            ctx.fillStyle = '#8B4513'; // Brown staff handle
            ctx.fillRect(centerX + weaponOffsetX, centerY + weaponOffsetY - 3, 1, 12);
            
            // Magic crystal at top
            ctx.fillStyle = '#9370DB'; // Purple crystal
            ctx.fillRect(centerX + weaponOffsetX - 1, centerY + weaponOffsetY - 5, 3, 3);
            
            // Crystal glow
            ctx.fillStyle = 'rgba(147, 112, 219, 0.6)';
            ctx.fillRect(centerX + weaponOffsetX - 2, centerY + weaponOffsetY - 6, 5, 5);
            
            // Staff decorations
            ctx.fillStyle = '#FFD700'; // Gold bands
            ctx.fillRect(centerX + weaponOffsetX - 1, centerY + weaponOffsetY, 3, 1);
            ctx.fillRect(centerX + weaponOffsetX - 1, centerY + weaponOffsetY + 4, 3, 1);
        } else {
            // Draw sword
            ctx.fillStyle = '#C0C0C0'; // Silver blade
            ctx.fillRect(centerX + weaponOffsetX, centerY + weaponOffsetY - 2, 1, 8);
            
            // Sword crossguard
            ctx.fillStyle = '#8B4513'; // Brown crossguard
            ctx.fillRect(centerX + weaponOffsetX - 1, centerY + weaponOffsetY + 3, 3, 1);
            
            // Sword handle
            ctx.fillStyle = '#654321'; // Dark brown handle
            ctx.fillRect(centerX + weaponOffsetX, centerY + weaponOffsetY + 4, 1, 3);
            
            // Sword pommel
            ctx.fillStyle = '#8B4513'; // Brown pommel
            ctx.fillRect(centerX + weaponOffsetX, centerY + weaponOffsetY + 7, 1, 1);
        }
    }
    
    render(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Main body with gradient effect
        const bodyColor = this.invulnerable > 0 ? '#ffff99' : '#ffff00';
        ctx.fillStyle = bodyColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add body shading
        ctx.fillStyle = this.invulnerable > 0 ? '#ffff77' : '#ffdd00';
        ctx.fillRect(this.x + 1, this.y + 1, this.width - 2, 2); // Top highlight
        ctx.fillRect(this.x + 1, this.y + 1, 2, this.height - 2); // Left highlight
        
        // Body shadow
        ctx.fillStyle = this.invulnerable > 0 ? '#dddd55' : '#ccbb00';
        ctx.fillRect(this.x + this.width - 2, this.y + 2, 2, this.height - 2); // Right shadow
        ctx.fillRect(this.x + 2, this.y + this.height - 2, this.width - 2, 2); // Bottom shadow
        
        // Belt/armor details
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x + 2, centerY + 1, this.width - 4, 2);
        ctx.fillRect(centerX - 1, centerY, 2, 4);
        
        this.renderFace(ctx);
        
        // Draw red "?" on chest with better styling
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('?', centerX, centerY + 10);
        
        // Add question mark shadow
        ctx.fillStyle = '#aa0000';
        ctx.fillText('?', centerX + 1, centerY + 11);
        
        // Draw weapon in hand
        this.renderWeapon(ctx, centerX, centerY);
        
        // Enhanced attack animation
        if (this.attackCooldown > 15) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 25 + (20 - this.attackCooldown), 0, 2 * Math.PI);
            ctx.stroke();
            
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 28 + (20 - this.attackCooldown), 0, 2 * Math.PI);
            ctx.stroke();
        }
    }
}

class Monster {
    constructor(x, y, type, roomLevel) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 18;
        this.height = 18;
        this.speed = 1 + Math.random();
        this.attackCooldown = 0;
        this.lastAttack = 0;
        
        const stats = this.getMonsterStats(type, roomLevel);
        this.maxHealth = stats.health;
        this.health = this.maxHealth;
        this.damage = stats.damage;
        this.expReward = stats.exp;
        this.color = stats.color;
        this.frozen = 0; // Freeze timer
    }
    
    getMonsterStats(type, roomLevel) {
        const baseStats = {
            goblin: { health: 30, damage: 8, exp: 15, color: '#27ae60' },
            orc: { health: 50, damage: 12, exp: 25, color: '#e74c3c' },
            skeleton: { health: 40, damage: 10, exp: 20, color: '#ecf0f1' },
            troll: { health: 80, damage: 18, exp: 40, color: '#8e44ad' }
        };
        
        const base = baseStats[type];
        const multiplier = 1 + (roomLevel - 1) * 0.05; // Significantly reduced scaling
        
        return {
            health: Math.floor(base.health * multiplier),
            damage: Math.floor(base.damage * multiplier),
            exp: Math.floor(base.exp * multiplier),
            color: base.color
        };
    }
    
    update(player) {
        // Handle freeze effect
        if (this.frozen > 0) {
            this.frozen--;
            return; // Skip movement and attack updates when frozen
        }
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        
        if (this.attackCooldown > 0) this.attackCooldown--;
    }
    
    checkCollision(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 25 && this.attackCooldown === 0) {
            player.takeDamage(this.damage);
            this.attackCooldown = 60;
        }
    }
    
    takeDamage(damage, weaponType = null) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;
    }
    
    renderFace(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const isLowHealth = this.health < this.maxHealth * 0.3;
        
        switch(this.type) {
            case 'goblin':
                // Goblin - small beady eyes, big grin
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(centerX - 5, centerY - 3, 2, 2);
                ctx.fillRect(centerX + 3, centerY - 3, 2, 2);
                
                // Pupils
                ctx.fillStyle = '#000000';
                ctx.fillRect(centerX - 4, centerY - 2, 1, 1);
                ctx.fillRect(centerX + 4, centerY - 2, 1, 1);
                
                // Big grin
                ctx.fillStyle = isLowHealth ? '#ff0000' : '#000000';
                ctx.fillRect(centerX - 4, centerY + 1, 8, 1);
                if (!isLowHealth) {
                    ctx.fillRect(centerX - 3, centerY + 2, 1, 1);
                    ctx.fillRect(centerX + 2, centerY + 2, 1, 1);
                }
                
                // Pointy ears
                ctx.fillStyle = this.color;
                ctx.fillRect(centerX - 8, centerY - 4, 2, 3);
                ctx.fillRect(centerX + 6, centerY - 4, 2, 3);
                break;
                
            case 'orc':
                // Orc - angry eyes, tusks
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(centerX - 5, centerY - 4, 3, 2);
                ctx.fillRect(centerX + 2, centerY - 4, 3, 2);
                
                // Angry pupils
                ctx.fillStyle = '#000000';
                ctx.fillRect(centerX - 4, centerY - 3, 1, 1);
                ctx.fillRect(centerX + 3, centerY - 3, 1, 1);
                
                // Snarling mouth
                ctx.fillStyle = '#000000';
                ctx.fillRect(centerX - 3, centerY + 1, 6, 1);
                
                // Tusks
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(centerX - 4, centerY + 2, 1, 2);
                ctx.fillRect(centerX + 3, centerY + 2, 1, 2);
                break;
                
            case 'skeleton':
                // Skeleton - hollow eyes, jaw
                ctx.fillStyle = '#000000';
                ctx.fillRect(centerX - 5, centerY - 4, 3, 4);
                ctx.fillRect(centerX + 2, centerY - 4, 3, 4);
                
                // Glowing dots in eye sockets
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(centerX - 4, centerY - 2, 1, 1);
                ctx.fillRect(centerX + 3, centerY - 2, 1, 1);
                
                // Skull jaw
                ctx.fillStyle = '#000000';
                ctx.fillRect(centerX - 3, centerY + 1, 6, 1);
                ctx.fillRect(centerX - 2, centerY + 2, 1, 1);
                ctx.fillRect(centerX - 1, centerY + 3, 1, 1);
                ctx.fillRect(centerX + 1, centerY + 2, 1, 1);
                ctx.fillRect(centerX + 2, centerY + 3, 1, 1);
                break;
                
            case 'troll':
                // Troll - huge eyes, droopy expression
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(centerX - 6, centerY - 5, 4, 4);
                ctx.fillRect(centerX + 2, centerY - 5, 4, 4);
                
                // Large pupils
                ctx.fillStyle = '#000000';
                ctx.fillRect(centerX - 4, centerY - 3, 2, 2);
                ctx.fillRect(centerX + 4, centerY - 3, 2, 2);
                
                // Droopy mouth
                ctx.fillStyle = isLowHealth ? '#ff0000' : '#000000';
                if (isLowHealth) {
                    ctx.fillRect(centerX - 2, centerY + 2, 4, 2);
                } else {
                    ctx.fillRect(centerX - 1, centerY + 1, 2, 1);
                    ctx.fillRect(centerX - 2, centerY + 2, 1, 1);
                    ctx.fillRect(centerX + 1, centerY + 2, 1, 1);
                }
                
                // Warts
                ctx.fillStyle = '#228b22';
                ctx.fillRect(centerX - 7, centerY - 1, 1, 1);
                ctx.fillRect(centerX + 6, centerY + 1, 1, 1);
                break;
        }
    }
    
    render(ctx) {
        // Main body with shading
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add highlight and shadow for 3D effect
        const highlightColor = this.getBrighterColor(this.color);
        const shadowColor = this.getDarkerColor(this.color);
        
        ctx.fillStyle = highlightColor;
        ctx.fillRect(this.x + 1, this.y + 1, this.width - 2, 1); // Top highlight
        ctx.fillRect(this.x + 1, this.y + 1, 1, this.height - 2); // Left highlight
        
        ctx.fillStyle = shadowColor;
        ctx.fillRect(this.x + this.width - 1, this.y + 1, 1, this.height - 1); // Right shadow
        ctx.fillRect(this.x + 1, this.y + this.height - 1, this.width - 1, 1); // Bottom shadow
        
        // Add type-specific details
        this.renderTypeDetails(ctx);
        
        this.renderFace(ctx);
        
        // Enhanced health bar
        const healthBarWidth = this.width + 4;
        const healthPercent = this.health / this.maxHealth;
        
        // Health bar background with border
        ctx.fillStyle = '#222';
        ctx.fillRect(this.x - 2, this.y - 10, healthBarWidth, 6);
        ctx.fillStyle = '#555';
        ctx.fillRect(this.x - 1, this.y - 9, healthBarWidth - 2, 4);
        
        // Health bar fill with gradient effect
        if (healthPercent > 0.6) {
            ctx.fillStyle = '#2ecc71';
        } else if (healthPercent > 0.3) {
            ctx.fillStyle = '#f39c12';
        } else {
            ctx.fillStyle = '#e74c3c';
        }
        ctx.fillRect(this.x - 1, this.y - 9, (healthBarWidth - 2) * healthPercent, 4);
        
        // Health bar highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(this.x - 1, this.y - 9, (healthBarWidth - 2) * healthPercent, 1);
    }
    
    getBrighterColor(color) {
        const colors = {
            '#27ae60': '#2ecc71',
            '#e74c3c': '#ff6b6b',
            '#ecf0f1': '#ffffff',
            '#8e44ad': '#9b59b6'
        };
        return colors[color] || color;
    }
    
    getDarkerColor(color) {
        const colors = {
            '#27ae60': '#1e8449',
            '#e74c3c': '#c0392b',
            '#ecf0f1': '#bdc3c7',
            '#8e44ad': '#7d3c98'
        };
        return colors[color] || color;
    }
    
    renderTypeDetails(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        switch(this.type) {
            case 'goblin':
                // Add goblin spikes
                ctx.fillStyle = '#2c6e2f';
                ctx.fillRect(centerX - 1, this.y - 1, 2, 2);
                ctx.fillRect(this.x - 1, centerY - 1, 2, 2);
                ctx.fillRect(this.x + this.width - 1, centerY - 1, 2, 2);
                break;
                
            case 'orc':
                // Add armor plating
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 2);
                ctx.fillRect(this.x + 2, this.y + this.height - 4, this.width - 4, 2);
                break;
                
            case 'skeleton':
                // Add bone details
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(centerX - 2, this.y + 2, 4, 1);
                ctx.fillRect(centerX - 2, this.y + this.height - 3, 4, 1);
                break;
                
            case 'troll':
                // Add troll bumps/warts
                ctx.fillStyle = '#654321';
                ctx.fillRect(this.x + 1, this.y + 3, 1, 1);
                ctx.fillRect(this.x + this.width - 2, this.y + 5, 1, 1);
                ctx.fillRect(centerX, this.y + this.height - 4, 1, 1);
                break;
        }
    }
}

class Boss {
    constructor(x, y, type, roomLevel) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 30; // Larger than regular monsters
        this.height = 30;
        this.speed = 0.8; // Slower but more powerful
        this.attackCooldown = 0;
        this.lastAttack = 0;
        this.specialCooldown = 0;
        this.lastSpecialAttack = 0;
        
        const stats = this.getBossStats(type);
        this.maxHealth = stats.health;
        this.health = this.maxHealth;
        this.damage = stats.damage;
        this.expReward = stats.exp;
        this.color = stats.color;
        this.specialAbility = stats.special;
        this.frozen = 0; // Freeze timer
    }
    
    getBossStats(type) {
        const bossStats = {
            DragonLord: { 
                health: 200, 
                damage: 25, 
                exp: 200, 
                color: '#8B0000',
                special: 'fireBreath'
            },
            NecromancerKing: { 
                health: 170, 
                damage: 20, 
                exp: 180, 
                color: '#4B0082',
                special: 'summonMinions'
            },
            TrollChieftain: { 
                health: 250, 
                damage: 30, 
                exp: 220, 
                color: '#228B22',
                special: 'groundPound'
            },
            ShadowWraith: { 
                health: 140, 
                damage: 35, 
                exp: 190, 
                color: '#2F2F2F',
                special: 'shadowStrike'
            },
            GolemMaster: { 
                health: 300, 
                damage: 28, 
                exp: 250, 
                color: '#696969',
                special: 'rockThrow'
            }
        };
        
        return bossStats[type];
    }
    
    update(player) {
        // Handle freeze effect
        if (this.frozen > 0) {
            this.frozen--;
            return; // Skip movement, attacks, and special abilities when frozen
        }
        
        // Basic movement toward player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.specialCooldown > 0) this.specialCooldown--;
        
        // Use special ability occasionally
        if (this.specialCooldown === 0 && Math.random() < 0.15) {
            this.useSpecialAbility(player);
            this.specialCooldown = 180; // 3 second cooldown
        }
    }
    
    useSpecialAbility(player) {
        switch(this.specialAbility) {
            case 'fireBreath':
                // Dragon breathes fire in a cone
                game.addMessage(`${this.type} breathes fire!`);
                soundManager.bossSpecial();
                // Deal damage if player is in front
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 80) {
                    player.takeDamage(15);
                }
                break;
                
            case 'summonMinions':
                // Necromancer summons skeleton minions
                game.addMessage(`${this.type} summons skeleton minions!`);
                soundManager.bossSpecial();
                for (let i = 0; i < 2; i++) {
                    const minionX = this.x + (Math.random() - 0.5) * 100;
                    const minionY = this.y + (Math.random() - 0.5) * 100;
                    if (minionX > 0 && minionX < game.canvas.width - 20 && 
                        minionY > 0 && minionY < game.canvas.height - 20) {
                        game.monsters.push(new Monster(minionX, minionY, 'skeleton', 15));
                    }
                }
                break;
                
            case 'groundPound':
                // Troll pounds ground causing area damage
                game.addMessage(`${this.type} pounds the ground!`);
                soundManager.bossSpecial();
                const distanceToPlayer = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
                if (distanceToPlayer < 100) {
                    player.takeDamage(20);
                }
                break;
                
            case 'shadowStrike':
                // Wraith teleports and strikes
                game.addMessage(`${this.type} strikes from the shadows!`);
                soundManager.bossSpecial();
                // Teleport near player
                this.x = player.x + (Math.random() - 0.5) * 60;
                this.y = player.y + (Math.random() - 0.5) * 60;
                player.takeDamage(25);
                break;
                
            case 'rockThrow':
                // Golem throws rocks
                game.addMessage(`${this.type} hurls massive rocks!`);
                soundManager.bossSpecial();
                // Create multiple rock projectiles
                for (let i = 0; i < 3; i++) {
                    const angle = (Math.PI * 2 * i) / 3;
                    const rockX = this.x + Math.cos(angle) * 15;
                    const rockY = this.y + Math.sin(angle) * 15;
                    const dirX = Math.cos(angle);
                    const dirY = Math.sin(angle);
                    game.bullets.push(new BossProjectile(rockX, rockY, dirX, dirY, 15, '#8B4513'));
                }
                break;
        }
    }
    
    checkCollision(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 35 && this.attackCooldown === 0) {
            player.takeDamage(this.damage);
            this.attackCooldown = 90; // Slower attack rate than regular monsters
        }
    }
    
    takeDamage(damage, weaponType = null) {
        // NecromancerKing is immune to sword attacks
        if (this.type === 'NecromancerKing' && weaponType === 'sword') {
            game.addMessage(`${this.type} is immune to sword attacks! Use your gun!`);
            return;
        }
        
        this.health -= damage;
        if (this.health < 0) this.health = 0;
    }
    
    renderFace(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const isLowHealth = this.health < this.maxHealth * 0.3;
        
        switch(this.type) {
            case 'DragonLord':
                // Dragon - fierce glowing eyes, fanged mouth
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(centerX - 8, centerY - 6, 4, 4);
                ctx.fillRect(centerX + 4, centerY - 6, 4, 4);
                
                // Glowing pupils
                ctx.fillStyle = '#FF4500';
                ctx.fillRect(centerX - 6, centerY - 4, 2, 2);
                ctx.fillRect(centerX + 6, centerY - 4, 2, 2);
                
                // Fanged mouth
                ctx.fillStyle = '#000000';
                ctx.fillRect(centerX - 6, centerY + 2, 12, 2);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(centerX - 5, centerY + 4, 2, 3);
                ctx.fillRect(centerX + 3, centerY + 4, 2, 3);
                
                // Horns
                ctx.fillStyle = '#8B0000';
                ctx.fillRect(centerX - 10, centerY - 8, 2, 4);
                ctx.fillRect(centerX + 8, centerY - 8, 2, 4);
                break;
                
            case 'NecromancerKing':
                // Necromancer - hollow glowing eyes, mystical runes
                ctx.fillStyle = '#000000';
                ctx.fillRect(centerX - 7, centerY - 5, 4, 5);
                ctx.fillRect(centerX + 3, centerY - 5, 4, 5);
                
                ctx.fillStyle = '#9370DB';
                ctx.fillRect(centerX - 5, centerY - 3, 1, 1);
                ctx.fillRect(centerX + 5, centerY - 3, 1, 1);
                
                // Mystical mouth
                ctx.fillStyle = '#4B0082';
                ctx.fillRect(centerX - 3, centerY + 2, 6, 1);
                
                // Crown
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(centerX - 6, centerY - 10, 12, 2);
                ctx.fillRect(centerX - 2, centerY - 12, 1, 2);
                ctx.fillRect(centerX + 1, centerY - 12, 1, 2);
                break;
                
            case 'TrollChieftain':
                // Massive troll - huge eyes, tusks, war paint
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(centerX - 8, centerY - 7, 5, 5);
                ctx.fillRect(centerX + 3, centerY - 7, 5, 5);
                
                ctx.fillStyle = '#8B0000';
                ctx.fillRect(centerX - 6, centerY - 5, 2, 2);
                ctx.fillRect(centerX + 5, centerY - 5, 2, 2);
                
                // War paint
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(centerX - 9, centerY - 2, 3, 1);
                ctx.fillRect(centerX + 6, centerY - 2, 3, 1);
                
                // Large tusks
                ctx.fillStyle = '#FFFACD';
                ctx.fillRect(centerX - 6, centerY + 3, 2, 4);
                ctx.fillRect(centerX + 4, centerY + 3, 2, 4);
                break;
                
            case 'ShadowWraith':
                // Ethereal wraith - shifting shadowy features
                const flicker = Math.sin(Date.now() * 0.01) > 0;
                ctx.fillStyle = flicker ? '#800080' : '#4B0082';
                ctx.fillRect(centerX - 6, centerY - 5, 3, 6);
                ctx.fillRect(centerX + 3, centerY - 5, 3, 6);
                
                ctx.fillStyle = '#00FFFF';
                if (flicker) {
                    ctx.fillRect(centerX - 4, centerY - 3, 1, 1);
                    ctx.fillRect(centerX + 5, centerY - 3, 1, 1);
                }
                
                // Ghostly mouth
                ctx.fillStyle = '#2F2F2F';
                ctx.fillRect(centerX - 2, centerY + 2, 4, 2);
                break;
                
            case 'GolemMaster':
                // Stone golem - rocky features, glowing core
                ctx.fillStyle = '#A0522D';
                ctx.fillRect(centerX - 7, centerY - 6, 4, 4);
                ctx.fillRect(centerX + 3, centerY - 6, 4, 4);
                
                ctx.fillStyle = '#FFA500';
                ctx.fillRect(centerX - 5, centerY - 4, 1, 1);
                ctx.fillRect(centerX + 5, centerY - 4, 1, 1);
                
                // Stone mouth
                ctx.fillStyle = '#2F4F4F';
                ctx.fillRect(centerX - 3, centerY + 1, 6, 2);
                
                // Glowing core in forehead
                ctx.fillStyle = '#00BFFF';
                ctx.fillRect(centerX - 1, centerY - 8, 2, 2);
                break;
        }
    }
    
    render(ctx) {
        // Enhanced boss body with multiple layers
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add boss-specific body enhancements
        this.renderBossDetails(ctx);
        
        // Add shading and highlights for 3D effect
        const highlightColor = this.getBossHighlightColor();
        const shadowColor = this.getBossShadowColor();
        
        ctx.fillStyle = highlightColor;
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 2); // Top highlight
        ctx.fillRect(this.x + 2, this.y + 2, 2, this.height - 4); // Left highlight
        
        ctx.fillStyle = shadowColor;
        ctx.fillRect(this.x + this.width - 2, this.y + 2, 2, this.height - 2); // Right shadow
        ctx.fillRect(this.x + 2, this.y + this.height - 2, this.width - 2, 2); // Bottom shadow
        
        this.renderFace(ctx);
        
        // Enhanced boss health bar with animations
        const healthBarWidth = this.width + 16;
        const healthPercent = this.health / this.maxHealth;
        const barX = this.x - 8;
        const barY = this.y - 20;
        
        // Health bar border
        ctx.fillStyle = '#000';
        ctx.fillRect(barX - 1, barY - 1, healthBarWidth + 2, 10);
        
        // Health bar background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, healthBarWidth, 8);
        
        // Health bar fill with color based on health
        if (healthPercent > 0.7) {
            ctx.fillStyle = '#e74c3c';
        } else if (healthPercent > 0.4) {
            ctx.fillStyle = '#f39c12';
        } else {
            ctx.fillStyle = '#c0392b';
        }
        ctx.fillRect(barX, barY, healthBarWidth * healthPercent, 8);
        
        // Health bar glow effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(barX, barY, healthBarWidth * healthPercent, 2);
        
        // Pulsing effect for low health
        if (healthPercent < 0.3) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.5})`;
            ctx.fillRect(barX - 2, barY - 2, healthBarWidth + 4, 12);
        }
        
        // Boss name with enhanced styling
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.strokeText(this.type, this.x + this.width/2, this.y - 25);
        ctx.fillText(this.type, this.x + this.width/2, this.y - 25);
    }
    
    renderBossDetails(ctx) {
        switch(this.type) {
            case 'DragonLord':
                // Dragon scales
                ctx.fillStyle = '#A0522D';
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 2; j++) {
                        ctx.fillRect(this.x + 5 + i * 7, this.y + 8 + j * 7, 5, 5);
                    }
                }
                break;
                
            case 'NecromancerKing':
                // Dark aura effect
                ctx.fillStyle = 'rgba(75, 0, 130, 0.3)';
                ctx.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
                // Mystical runes
                ctx.fillStyle = '#9370DB';
                ctx.fillRect(this.x + 4, this.y + 12, 3, 3);
                ctx.fillRect(this.x + 23, this.y + 12, 3, 3);
                break;
                
            case 'TrollChieftain':
                // Tribal markings
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(this.x + 8, this.y + 6, 14, 2);
                ctx.fillRect(this.x + 8, this.y + 22, 14, 2);
                break;
                
            case 'ShadowWraith':
                // Ethereal glow
                const flicker = Math.sin(Date.now() * 0.02) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(128, 0, 128, ${flicker * 0.4})`;
                ctx.fillRect(this.x - 3, this.y - 3, this.width + 6, this.height + 6);
                break;
                
            case 'GolemMaster':
                // Stone cracks
                ctx.fillStyle = '#2F4F4F';
                ctx.fillRect(this.x + 6, this.y + 4, 18, 1);
                ctx.fillRect(this.x + 12, this.y + 4, 1, 22);
                ctx.fillRect(this.x + 4, this.y + 18, 22, 1);
                break;
        }
    }
    
    getBossHighlightColor() {
        const colors = {
            '#8B0000': '#CD5C5C',
            '#4B0082': '#8A2BE2',
            '#228B22': '#32CD32',
            '#2F2F2F': '#696969',
            '#696969': '#A9A9A9'
        };
        return colors[this.color] || this.color;
    }
    
    getBossShadowColor() {
        const colors = {
            '#8B0000': '#4B0000',
            '#4B0082': '#2F004F',
            '#228B22': '#006400',
            '#2F2F2F': '#000000',
            '#696969': '#2F2F2F'
        };
        return colors[this.color] || this.color;
    }
}

class BossProjectile {
    constructor(x, y, dirX, dirY, damage, color) {
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.speed = 4;
        this.damage = damage;
        this.width = 6;
        this.height = 6;
        this.color = color;
        this.active = true;
    }
    
    update() {
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;
        
        if (this.x < 0 || this.x > 800 || this.y < 0 || this.y > 600) {
            this.active = false;
        }
    }
    
    checkCollision(player) {
        if (!this.active) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 20) {
            player.takeDamage(this.damage);
            game.addMessage(`Boss projectile hit for ${this.damage} damage!`);
            this.active = false;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
}

class WeaponType {
    constructor(name, minDamage, maxDamage) {
        this.name = name;
        this.minDamage = minDamage;
        this.maxDamage = maxDamage;
    }
    
    getDamage() {
        return Math.floor(Math.random() * (this.maxDamage - this.minDamage + 1)) + this.minDamage;
    }
}

class Weapon {
    constructor(x, y, roomLevel) {
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height = 15;
        
        const weapons = [
            { name: 'Iron Sword', min: 12, max: 18, rarity: 0.4 },
            { name: 'Steel Blade', min: 15, max: 22, rarity: 0.25 },
            { name: 'Enchanted Sword', min: 18, max: 28, rarity: 0.15 },
            { name: 'Dragon Slayer', min: 25, max: 35, rarity: 0.08 },
            { name: 'Legendary Blade', min: 30, max: 45, rarity: 0.05 }
        ];
        
        let selectedWeapon = weapons[0];
        const roll = Math.random() + (roomLevel * 0.02);
        
        for (let i = weapons.length - 1; i >= 0; i--) {
            if (roll >= weapons[i].rarity) {
                selectedWeapon = weapons[i];
                break;
            }
        }
        
        const levelBonus = Math.floor(roomLevel / 2);
        this.weaponType = new WeaponType(
            selectedWeapon.name,
            selectedWeapon.min + levelBonus,
            selectedWeapon.max + levelBonus
        );
    }
    
    render(ctx) {
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
    }
}

class Bullet {
    constructor(x, y, dirX, dirY, damage) {
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.speed = 8;
        this.damage = damage;
        this.width = 4;
        this.height = 4;
        this.active = true;
    }
    
    update() {
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;
        
        // Remove bullet if it goes off screen
        if (this.x < 0 || this.x > 800 || this.y < 0 || this.y > 600) {
            this.active = false;
        }
    }
    
    checkCollision(monsters) {
        if (!this.active) return;
        
        monsters.forEach(monster => {
            const dx = monster.x - this.x;
            const dy = monster.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 15) {
                monster.takeDamage(this.damage, 'gun');
                game.addMessage(`Bullet hit ${monster.type} for ${this.damage} damage!`);
                soundManager.hit();
                this.active = false;
            }
        });
    }
    
    render(ctx) {
        if (!this.active) return;
        
        // Enhanced bullet with glow effect
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // Add bullet glow
        ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.fillRect(this.x - this.width/2 - 1, this.y - this.height/2 - 1, this.width + 2, this.height + 2);
        
        // Add bullet trail effect
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        const trailX = this.x - this.dirX * 8;
        const trailY = this.y - this.dirY * 8;
        ctx.fillRect(trailX - 1, trailY - 1, 2, 2);
        
        ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
        const trail2X = this.x - this.dirX * 16;
        const trail2Y = this.y - this.dirY * 16;
        ctx.fillRect(trail2X, trail2Y, 1, 1);
    }
}

class BouncingBullet {
    constructor(x, y, dirX, dirY, damage) {
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.speed = 6;
        this.damage = damage;
        this.width = 5;
        this.height = 5;
        this.active = true;
        this.bounces = 0;
        this.maxBounces = 1;
    }
    
    update() {
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;
        
        // Bounce off walls if haven't used all bounces
        if (this.bounces < this.maxBounces) {
            if (this.x <= 0 || this.x >= 800) {
                this.dirX = -this.dirX;
                this.bounces++;
                this.x = Math.max(0, Math.min(800, this.x));
            }
            if (this.y <= 0 || this.y >= 600) {
                this.dirY = -this.dirY;
                this.bounces++;
                this.y = Math.max(0, Math.min(600, this.y));
            }
        } else {
            // Remove bullet if it goes off screen after bouncing
            if (this.x < 0 || this.x > 800 || this.y < 0 || this.y > 600) {
                this.active = false;
            }
        }
    }
    
    checkCollision(monsters) {
        if (!this.active) return;
        
        monsters.forEach(monster => {
            const dx = monster.x - this.x;
            const dy = monster.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 15) {
                const actualDamage = this.bounces > 0 ? this.damage * 2 : this.damage;
                monster.takeDamage(actualDamage, 'staff');
                const bounceText = this.bounces > 0 ? " (bounced 2x damage!)" : "";
                game.addMessage(`Magic bolt hit ${monster.type} for ${actualDamage} damage!${bounceText}`);
                soundManager.hit();
                this.active = false;
            }
        });
    }
    
    render(ctx) {
        if (!this.active) return;
        
        // Purple magic bolt
        ctx.fillStyle = '#9370DB';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // Magic glow
        ctx.fillStyle = 'rgba(147, 112, 219, 0.6)';
        ctx.fillRect(this.x - this.width/2 - 1, this.y - this.height/2 - 1, this.width + 2, this.height + 2);
        
        // Magic sparkles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(this.x - 1, this.y - 1, 2, 2);
        
        // Magic trail
        ctx.fillStyle = 'rgba(147, 112, 219, 0.4)';
        const trailX = this.x - this.dirX * 6;
        const trailY = this.y - this.dirY * 6;
        ctx.fillRect(trailX - 1, trailY - 1, 2, 2);
    }
}

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initAudio();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
            this.enabled = false;
        }
    }
    
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    // Quirky sound effects
    swordSwish() {
        // Whoosh sound - frequency sweep
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.15);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }
    
    gunShot() {
        // Pew pew laser sound
        this.playTone(600, 0.1, 'square', 0.3);
        setTimeout(() => this.playTone(400, 0.05, 'square', 0.2), 50);
    }
    
    weaponSwitch() {
        // Mechanical click-whirr
        this.playTone(300, 0.05, 'triangle', 0.4);
        setTimeout(() => this.playTone(500, 0.05, 'triangle', 0.3), 60);
        setTimeout(() => this.playTone(400, 0.1, 'sine', 0.2), 120);
    }
    
    hit() {
        // Bonk sound
        this.playTone(150, 0.1, 'triangle', 0.4);
        setTimeout(() => this.playTone(100, 0.05, 'square', 0.3), 50);
    }
    
    miss() {
        // Disappointed whoosh
        this.playTone(200, 0.2, 'sine', 0.15);
    }
    
    takeDamage() {
        // Ouch - descending tone
        this.playTone(400, 0.3, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(200, 0.2, 'triangle', 0.2), 100);
    }
    
    monsterDeath() {
        // Satisfying defeat sound
        this.playTone(100, 0.4, 'triangle', 0.4);
        setTimeout(() => this.playTone(150, 0.2, 'sine', 0.3), 200);
        setTimeout(() => this.playTone(200, 0.1, 'sine', 0.2), 400);
    }
    
    levelUp() {
        // Triumphant ascending tones
        const notes = [262, 330, 392, 523]; // C, E, G, C octave
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, 'triangle', 0.4), i * 100);
        });
    }
    
    roomAdvance() {
        // Portal/teleport sound
        this.playTone(800, 0.2, 'sine', 0.3);
        setTimeout(() => this.playTone(1200, 0.15, 'triangle', 0.25), 100);
        setTimeout(() => this.playTone(600, 0.3, 'sine', 0.2), 200);
    }
    
    gameOver() {
        // Sad descending tones
        const notes = [400, 350, 300, 200, 150];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.4, 'triangle', 0.3), i * 150);
        });
    }
    
    gameStart() {
        // Cheerful startup sound
        this.playTone(523, 0.2, 'sine', 0.3);
        setTimeout(() => this.playTone(659, 0.2, 'sine', 0.3), 200);
        setTimeout(() => this.playTone(784, 0.3, 'triangle', 0.4), 400);
    }
    
    footstep() {
        // Subtle step sound
        this.playTone(80 + Math.random() * 20, 0.05, 'triangle', 0.1);
    }
    
    victory() {
        // Epic victory fanfare
        const victoryNotes = [523, 659, 784, 1047]; // C, E, G, C octave
        victoryNotes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.5, 'triangle', 0.4), i * 200);
        });
        
        // Additional harmony notes
        setTimeout(() => {
            const harmonyNotes = [392, 494, 659]; // G, B, E
            harmonyNotes.forEach((freq, i) => {
                setTimeout(() => this.playTone(freq, 0.8, 'sine', 0.3), i * 150);
            });
        }, 400);
        
        // Final triumphant chord
        setTimeout(() => {
            this.playTone(523, 1.0, 'triangle', 0.4); // C
            this.playTone(659, 1.0, 'triangle', 0.3); // E  
            this.playTone(784, 1.0, 'triangle', 0.3); // G
        }, 1200);
    }
    
    bossSpecial() {
        // Dramatic boss special ability sound
        this.playTone(200, 0.1, 'sawtooth', 0.4);
        setTimeout(() => this.playTone(150, 0.15, 'triangle', 0.3), 100);
        setTimeout(() => this.playTone(300, 0.2, 'square', 0.5), 200);
        setTimeout(() => this.playTone(100, 0.3, 'sine', 0.2), 350);
    }
    
    levelAdvance() {
        // Epic level completion fanfare
        const levelNotes = [392, 523, 659, 784, 1047]; // G, C, E, G, C
        levelNotes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.4, 'triangle', 0.4), i * 150);
        });
        
        // Triumphant ending chord
        setTimeout(() => {
            this.playTone(523, 0.8, 'triangle', 0.5); // C
            this.playTone(659, 0.8, 'triangle', 0.4); // E
            this.playTone(784, 0.8, 'triangle', 0.4); // G
            this.playTone(1047, 0.8, 'triangle', 0.3); // C octave
        }, 800);
    }
}

let game;
let soundManager;

window.addEventListener('load', () => {
    soundManager = new SoundManager();
    game = new Game();
    
    // Enable audio context on first user interaction
    document.addEventListener('click', () => {
        if (soundManager.audioContext && soundManager.audioContext.state === 'suspended') {
            soundManager.audioContext.resume();
        }
    }, { once: true });
});