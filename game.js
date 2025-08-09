class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = new Player(300, 50);
        this.currentRoom = 1;
        this.monsters = [];
        this.bullets = [];
        this.keys = {};
        this.gameState = 'playing';
        this.messages = [];
        
        this.setupEventListeners();
        this.generateRoom();
        this.gameLoop();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                this.player.attack(this.monsters);
            } else if (e.key.toLowerCase() === 'g') {
                this.player.switchWeapon();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }
    
    generateRoom() {
        this.monsters = [];
        
        const monsterCount = Math.floor(Math.random() * 3) + 2 + Math.floor(this.currentRoom / 3);
        
        for (let i = 0; i < monsterCount; i++) {
            const x = Math.random() * (this.canvas.width - 60) + 30;
            const y = Math.random() * (this.canvas.height - 60) + 30;
            
            if (Math.abs(x - this.player.x) > 100 || Math.abs(y - this.player.y) > 100) {
                const monsterTypes = ['goblin', 'orc', 'skeleton', 'troll'];
                const type = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
                this.monsters.push(new Monster(x, y, type, this.currentRoom));
            }
        }
        
        this.addMessage(`Entered room ${this.currentRoom}. ${this.monsters.length} monsters await!`);
    }
    
    nextRoom() {
        this.currentRoom++;
        this.player.heal(20);
        this.player.restoreMana(10);
        this.generateRoom();
        document.getElementById('room').textContent = this.currentRoom;
    }
    
    addMessage(text) {
        this.messages.unshift(text);
        if (this.messages.length > 10) this.messages.pop();
        
        const log = document.getElementById('messageLog');
        log.innerHTML = this.messages.map(msg => `<div>${msg}</div>`).join('');
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
            bullet.checkCollision(this.monsters);
        });
        
        // Remove dead bullets
        this.bullets = this.bullets.filter(bullet => bullet.active);
        
        this.monsters = this.monsters.filter(monster => {
            if (monster.health <= 0) {
                this.player.gainExp(monster.expReward);
                this.addMessage(`Defeated ${monster.type}! +${monster.expReward} XP`);
                return false;
            }
            return true;
        });
        
        // Check if player walks into entrance when room is clear
        if (this.monsters.length === 0 && this.player.y > this.canvas.height - 60 && 
            this.player.x > this.canvas.width / 2 - 50 && this.player.x < this.canvas.width / 2 + 30) {
            this.nextRoom();
        }
        
        if (this.player.health <= 0) {
            this.gameState = 'gameOver';
            this.addMessage('Game Over! Refresh to restart.');
        }
        
        this.player.updateUI();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.monsters.forEach(monster => monster.render(this.ctx));
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.player.render(this.ctx);
        
        // Draw entrance at bottom when room is clear
        if (this.monsters.length === 0 && this.gameState === 'playing') {
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
            sword: new WeaponType('Battle Sword', 15, 25),
            gun: new WeaponType('Pistol', 20, 30)
        };
        this.currentWeapon = 'sword';
        this.attackCooldown = 0;
        this.invulnerable = 0;
        this.lastDirection = { x: 0, y: -1 }; // Default facing up
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
        
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.invulnerable > 0) this.invulnerable--;
    }
    
    attack(monsters) {
        if (this.attackCooldown > 0) return;
        
        if (this.currentWeapon === 'gun') {
            // Shoot bullet in movement direction
            const bullet = new Bullet(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.lastDirection.x,
                this.lastDirection.y,
                this.weapons.gun.getDamage()
            );
            game.bullets.push(bullet);
            game.addMessage(`Fired ${this.weapons.gun.name}!`);
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
                    monster.takeDamage(damage);
                    game.addMessage(`Hit ${monster.type} with ${this.weapons.sword.name} for ${damage} damage!`);
                    hit = true;
                }
            });
            
            if (!hit) {
                game.addMessage('Sword swing missed! Get closer!');
            }
        }
        
        this.attackCooldown = 20;
    }
    
    takeDamage(damage) {
        if (this.invulnerable > 0) return;
        
        this.health -= damage;
        if (this.health < 0) this.health = 0;
        this.invulnerable = 30;
        game.addMessage(`Took ${damage} damage!`);
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
    }
    
    switchWeapon() {
        this.currentWeapon = this.currentWeapon === 'sword' ? 'gun' : 'sword';
        this.updateWeaponUI();
        const weapon = this.weapons[this.currentWeapon];
        game.addMessage(`Switched to ${weapon.name}`);
    }
    
    updateUI() {
        document.getElementById('level').textContent = this.level;
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
    
    render(ctx) {
        ctx.fillStyle = this.invulnerable > 0 ? '#ff6666' : '#3498db';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        if (this.attackCooldown > 15) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 30, 0, 2 * Math.PI);
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
    }
    
    getMonsterStats(type, roomLevel) {
        const baseStats = {
            goblin: { health: 30, damage: 8, exp: 15, color: '#27ae60' },
            orc: { health: 50, damage: 12, exp: 25, color: '#e74c3c' },
            skeleton: { health: 40, damage: 10, exp: 20, color: '#ecf0f1' },
            troll: { health: 80, damage: 18, exp: 40, color: '#8e44ad' }
        };
        
        const base = baseStats[type];
        const multiplier = 1 + (roomLevel - 1) * 0.3;
        
        return {
            health: Math.floor(base.health * multiplier),
            damage: Math.floor(base.damage * multiplier),
            exp: Math.floor(base.exp * multiplier),
            color: base.color
        };
    }
    
    update(player) {
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
    
    takeDamage(damage) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        const healthBarWidth = this.width;
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#555';
        ctx.fillRect(this.x, this.y - 8, healthBarWidth, 4);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x, this.y - 8, healthBarWidth * healthPercent, 4);
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
        if (this.x < 0 || this.x > 600 || this.y < 0 || this.y > 600) {
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
                monster.takeDamage(this.damage);
                game.addMessage(`Bullet hit ${monster.type} for ${this.damage} damage!`);
                this.active = false;
            }
        });
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
}

let game;
window.addEventListener('load', () => {
    game = new Game();
});