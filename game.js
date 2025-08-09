class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = new Player(300, 300);
        this.currentRoom = 1;
        this.monsters = [];
        this.weapons = [];
        this.keys = {};
        this.gameState = 'playing';
        this.messages = [];
        
        this.setupEventListeners();
        this.generateRoom();
        this.gameLoop();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                this.player.attack(this.monsters);
            } else if (e.key.toLowerCase() === 'e' && this.monsters.length === 0) {
                this.nextRoom();
            } else if (e.key.toLowerCase() === 'r') {
                this.player.pickupWeapon(this.weapons);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    generateRoom() {
        this.monsters = [];
        this.weapons = [];
        
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
        
        if (Math.random() < 0.3 + (this.currentRoom * 0.05)) {
            const x = Math.random() * (this.canvas.width - 60) + 30;
            const y = Math.random() * (this.canvas.height - 60) + 30;
            this.weapons.push(new Weapon(x, y, this.currentRoom));
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
        
        this.monsters = this.monsters.filter(monster => {
            if (monster.health <= 0) {
                this.player.gainExp(monster.expReward);
                this.addMessage(`Defeated ${monster.type}! +${monster.expReward} XP`);
                return false;
            }
            return true;
        });
        
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
        
        this.weapons.forEach(weapon => weapon.render(this.ctx));
        this.monsters.forEach(monster => monster.render(this.ctx));
        this.player.render(this.ctx);
        
        if (this.monsters.length === 0 && this.gameState === 'playing') {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.font = '20px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Room Clear! Press E to advance', this.canvas.width / 2, 50);
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
        this.weapon = new WeaponType('Rusty Sword', 10, 15);
        this.attackCooldown = 0;
        this.invulnerable = 0;
    }
    
    update(keys, canvas) {
        if (keys['w'] && this.y > 0) this.y -= this.speed;
        if (keys['s'] && this.y < canvas.height - this.height) this.y += this.speed;
        if (keys['a'] && this.x > 0) this.x -= this.speed;
        if (keys['d'] && this.x < canvas.width - this.width) this.x += this.speed;
        
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.invulnerable > 0) this.invulnerable--;
    }
    
    attack(monsters) {
        if (this.attackCooldown > 0) return;
        
        const attackRange = 50;
        monsters.forEach(monster => {
            const dx = monster.x - this.x;
            const dy = monster.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < attackRange) {
                const damage = this.weapon.getDamage();
                monster.takeDamage(damage);
                game.addMessage(`Hit ${monster.type} for ${damage} damage!`);
            }
        });
        
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
    
    pickupWeapon(weapons) {
        const pickupRange = 30;
        for (let i = weapons.length - 1; i >= 0; i--) {
            const weapon = weapons[i];
            const dx = weapon.x - this.x;
            const dy = weapon.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < pickupRange) {
                this.weapon = weapon.weaponType;
                weapons.splice(i, 1);
                game.addMessage(`Picked up ${this.weapon.name}!`);
                this.updateWeaponUI();
                break;
            }
        }
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
        document.getElementById('weaponName').textContent = this.weapon.name;
        document.getElementById('weaponDamage').textContent = `Damage: ${this.weapon.minDamage}-${this.weapon.maxDamage}`;
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

let game;
window.addEventListener('load', () => {
    game = new Game();
});