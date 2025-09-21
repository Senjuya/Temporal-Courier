class TemporalCourier {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.currentEra = 'medieval';
        this.gameState = 'playing';
        this.butterflyEffects = {};
        
        // Time powers
        this.powers = {
            slowTime: { active: false, cooldown: 0, maxCooldown: 300 },
            rewind: { active: false, cooldown: 0, maxCooldown: 480 },
            clone: { active: false, cooldown: 0, maxCooldown: 600 }
        };
        
        // Game world
        this.gravity = 0.5;
        this.timeScale = 1.0;
        this.rewindHistory = [];
        this.maxHistory = 180; // 3 seconds at 60fps
        
        // Initialize game objects
        this.initializePlayer();
        this.initializePackage();
        this.initializeLevels();
        this.initializeControls();
        
        // UI elements
        this.updateUI();
        
        // Start game loop
        this.gameLoop();
    }
    
    initializePlayer() {
        this.player = {
            x: 100,
            y: 400,
            width: 16,
            height: 24,
            vx: 0,
            vy: 0,
            grounded: false,
            carrying: false,
            color: '#4a90e2'
        };
        
        this.temporalClones = [];
    }
    
    initializePackage() {
        this.package = {
            x: 150,
            y: 400,
            width: 12,
            height: 12,
            vx: 0,
            vy: 0,
            carried: false,
            fragile: true,
            color: '#e94560'
        };
    }
    
    initializeLevels() {
        this.eras = {
            medieval: {
                name: 'Medieval Era',
                platforms: [
                    { x: 0, y: 580, width: 1000, height: 20 }, // Ground
                    { x: 200, y: 500, width: 100, height: 20 },
                    { x: 400, y: 420, width: 100, height: 20 },
                    { x: 600, y: 340, width: 100, height: 20 },
                    { x: 800, y: 260, width: 100, height: 20 }
                ],
                exit: { x: 850, y: 200, width: 40, height: 60 },
                spikes: [
                    { x: 320, y: 565, width: 60, height: 15 },
                    { x: 520, y: 565, width: 80, height: 15 }
                ],
                colors: { bg: '#2d5016', platform: '#8b4513', accent: '#654321' },
                effects: []
            },
            industrial: {
                name: 'Industrial Era',
                platforms: [
                    { x: 0, y: 580, width: 1000, height: 20 },
                    { x: 150, y: 480, width: 120, height: 20 },
                    { x: 350, y: 380, width: 120, height: 20 },
                    { x: 550, y: 480, width: 120, height: 20 },
                    { x: 750, y: 280, width: 120, height: 20 }
                ],
                exit: { x: 800, y: 220, width: 40, height: 60 },
                spikes: [
                    { x: 280, y: 565, width: 40, height: 15 },
                    { x: 680, y: 565, width: 60, height: 15 }
                ],
                colors: { bg: '#2c2c2c', platform: '#666666', accent: '#ff6b35' },
                movingPlatforms: [
                    { x: 400, y: 300, width: 80, height: 16, vx: 1, range: 100, start: 400 }
                ],
                effects: []
            },
            future: {
                name: 'Future Era',
                platforms: [
                    { x: 0, y: 580, width: 1000, height: 20 },
                    { x: 100, y: 450, width: 80, height: 20 },
                    { x: 250, y: 350, width: 80, height: 20 },
                    { x: 450, y: 250, width: 80, height: 20 },
                    { x: 650, y: 350, width: 80, height: 20 },
                    { x: 800, y: 200, width: 100, height: 20 }
                ],
                exit: { x: 820, y: 140, width: 40, height: 60 },
                spikes: [
                    { x: 190, y: 565, width: 50, height: 15 },
                    { x: 540, y: 565, width: 100, height: 15 }
                ],
                colors: { bg: '#0a0a2e', platform: '#6a0dad', accent: '#00ffff' },
                lasers: [
                    { x: 350, y: 200, width: 4, height: 150, active: true }
                ],
                effects: []
            }
        };
        
        this.currentLevel = this.eras[this.currentEra];
    }
    
    initializeControls() {
        this.keys = {};
        
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            switch(e.code) {
                case 'KeyS': this.activatePower('slowTime'); break;
                case 'KeyR': this.activatePower('rewind'); break;
                case 'KeyC': this.activatePower('clone'); break;
                case 'KeyE': this.interactWithPackage(); break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Power button controls
        document.getElementById('slowTimeBtn').addEventListener('click', () => this.activatePower('slowTime'));
        document.getElementById('rewindBtn').addEventListener('click', () => this.activatePower('rewind'));
        document.getElementById('cloneBtn').addEventListener('click', () => this.activatePower('clone'));
    }
    
    activatePower(powerType) {
        const power = this.powers[powerType];
        if (power.cooldown > 0) return;
        
        switch(powerType) {
            case 'slowTime':
                power.active = true;
                power.cooldown = power.maxCooldown;
                this.timeScale = 0.3;
                setTimeout(() => {
                    power.active = false;
                    this.timeScale = 1.0;
                }, 2000);
                break;
                
            case 'rewind':
                if (this.rewindHistory.length > 60) {
                    this.rewindTime();
                    power.cooldown = power.maxCooldown;
                }
                break;
                
            case 'clone':
                this.spawnClone();
                power.cooldown = power.maxCooldown;
                break;
        }
    }
    
    rewindTime() {
        const rewindFrames = 90;
        const targetFrame = Math.max(0, this.rewindHistory.length - rewindFrames);
        
        if (targetFrame < this.rewindHistory.length) {
            const state = this.rewindHistory[targetFrame];
            this.player.x = state.player.x;
            this.player.y = state.player.y;
            this.player.vx = 0;
            this.player.vy = 0;
            
            if (!this.player.carrying && state.package) {
                this.package.x = state.package.x;
                this.package.y = state.package.y;
                this.package.vx = 0;
                this.package.vy = 0;
            }
        }
    }
    
    spawnClone() {
        if (this.rewindHistory.length > 30) {
            this.temporalClones.push({
                history: [...this.rewindHistory],
                frame: 0,
                x: this.player.x,
                y: this.player.y,
                active: true,
                color: 'rgba(74, 144, 226, 0.5)'
            });
        }
    }
    
    interactWithPackage() {
        const dx = this.player.x - this.package.x;
        const dy = this.player.y - this.package.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < 30) {
            if (this.player.carrying) {
                // Drop package
                this.player.carrying = false;
                this.package.carried = false;
                this.package.x = this.player.x;
                this.package.y = this.player.y - 20;
                this.package.vx = this.player.vx * 0.5;
                this.package.vy = -2;
            } else {
                // Pick up package
                this.player.carrying = true;
                this.package.carried = true;
            }
        }
    }
    
    update() {
        const deltaTime = this.timeScale;
        
        // Record history for rewind/clone
        this.recordHistory();
        
        // Update cooldowns
        Object.values(this.powers).forEach(power => {
            if (power.cooldown > 0) power.cooldown--;
        });
        
        // Update player
        this.updatePlayer(deltaTime);
        
        // Update package
        this.updatePackage(deltaTime);
        
        // Update temporal clones
        this.updateClones();
        
        // Update moving platforms
        this.updateMovingPlatforms(deltaTime);
        
        // Check collisions and game state
        this.checkCollisions();
        this.checkWinCondition();
        
        // Apply butterfly effects
        this.applyButterflyEffects();
    }
    
    recordHistory() {
        this.rewindHistory.push({
            player: { x: this.player.x, y: this.player.y },
            package: { x: this.package.x, y: this.package.y }
        });
        
        if (this.rewindHistory.length > this.maxHistory) {
            this.rewindHistory.shift();
        }
    }
    
    updatePlayer(deltaTime) {
        // Input handling
        let moveX = 0;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) moveX -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) moveX += 1;
        
        // Apply movement
        this.player.vx += moveX * 0.8 * deltaTime;
        this.player.vx *= 0.8; // Friction
        
        // Jumping
        if ((this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space']) && this.player.grounded) {
            this.player.vy = -12 * deltaTime;
            this.player.grounded = false;
        }
        
        // Gravity
        this.player.vy += this.gravity * deltaTime;
        
        // Update position
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        // Boundary checks
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x > this.canvas.width - this.player.width) {
            this.player.x = this.canvas.width - this.player.width;
        }
    }
    
    updatePackage(deltaTime) {
        if (this.package.carried) {
            this.package.x = this.player.x;
            this.package.y = this.player.y - 20;
            this.package.vx = 0;
            this.package.vy = 0;
        } else {
            // Physics
            this.package.vy += this.gravity * deltaTime;
            this.package.x += this.package.vx;
            this.package.y += this.package.vy;
            
            // Friction
            this.package.vx *= 0.9;
        }
    }
    
    updateClones() {
        this.temporalClones = this.temporalClones.filter(clone => {
            if (clone.frame < clone.history.length) {
                const state = clone.history[clone.frame];
                clone.x = state.player.x;
                clone.y = state.player.y;
                clone.frame++;
                return true;
            }
            return false;
        });
    }
    
    updateMovingPlatforms(deltaTime) {
        if (this.currentLevel.movingPlatforms) {
            this.currentLevel.movingPlatforms.forEach(platform => {
                platform.x += platform.vx * deltaTime;
                
                if (platform.x <= platform.start || platform.x >= platform.start + platform.range) {
                    platform.vx *= -1;
                }
            });
        }
    }
    
    checkCollisions() {
        this.player.grounded = false;
        let packageGrounded = false;
        
        // Platform collisions
        const allPlatforms = [...this.currentLevel.platforms];
        if (this.currentLevel.movingPlatforms) {
            allPlatforms.push(...this.currentLevel.movingPlatforms);
        }
        
        allPlatforms.forEach(platform => {
            // Player collision
            if (this.rectCollision(this.player, platform)) {
                if (this.player.vy > 0 && this.player.y < platform.y) {
                    this.player.y = platform.y - this.player.height;
                    this.player.vy = 0;
                    this.player.grounded = true;
                }
            }
            
            // Package collision
            if (!this.package.carried && this.rectCollision(this.package, platform)) {
                if (this.package.vy > 0 && this.package.y < platform.y) {
                    this.package.y = platform.y - this.package.height;
                    this.package.vy = 0;
                    packageGrounded = true;
                }
            }
        });
        
        // Spike collisions
        this.currentLevel.spikes.forEach(spike => {
            if (this.rectCollision(this.player, spike)) {
                this.respawnPlayer();
            }
        });
        
        // Laser collisions
        if (this.currentLevel.lasers) {
            this.currentLevel.lasers.forEach(laser => {
                if (laser.active && this.rectCollision(this.player, laser)) {
                    this.respawnPlayer();
                }
            });
        }
    }
    
    checkWinCondition() {
        const exit = this.currentLevel.exit;
        if (this.player.carrying && this.rectCollision(this.player, exit)) {
            this.completeLevel();
        }
    }
    
    completeLevel() {
        // Apply butterfly effect
        this.applyButterflyEffect();
        
        // Advance to next era
        const eras = Object.keys(this.eras);
        const currentIndex = eras.indexOf(this.currentEra);
        const nextIndex = (currentIndex + 1) % eras.length;
        
        this.currentEra = eras[nextIndex];
        this.currentLevel = this.eras[this.currentEra];
        
        // Reset positions
        this.player.x = 100;
        this.player.y = 400;
        this.package.x = 150;
        this.package.y = 400;
        this.player.carrying = false;
        this.package.carried = false;
        
        // Clear temporal effects
        this.temporalClones = [];
        this.rewindHistory = [];
        
        this.updateUI();
    }
    
    applyButterflyEffect() {
        const effects = this.butterflyEffects[this.currentEra] || [];
        
        // Add new effect based on delivery success
        const newEffect = {
            type: 'successful_delivery',
            era: this.currentEra,
            timestamp: Date.now()
        };
        
        if (!this.butterflyEffects[this.currentEra]) {
            this.butterflyEffects[this.currentEra] = [];
        }
        this.butterflyEffects[this.currentEra].push(newEffect);
    }
    
    applyButterflyEffects() {
        // Modify level based on previous actions
        Object.keys(this.butterflyEffects).forEach(era => {
            if (era !== this.currentEra) {
                const effects = this.butterflyEffects[era];
                effects.forEach(effect => {
                    if (effect.type === 'successful_delivery') {
                        // Add positive changes to current level
                        this.addButterflyEffectToLevel();
                    }
                });
            }
        });
    }
    
    addButterflyEffectToLevel() {
        // Example: add helpful platform in future levels
        if (Math.random() < 0.3 && this.currentLevel.effects.length < 2) {
            this.currentLevel.platforms.push({
                x: 300 + Math.random() * 400,
                y: 200 + Math.random() * 200,
                width: 60,
                height: 16
            });
            this.currentLevel.effects.push('helper_platform');
        }
    }
    
    respawnPlayer() {
        this.player.x = 100;
        this.player.y = 400;
        this.player.vx = 0;
        this.player.vy = 0;
        
        if (this.player.carrying) {
            this.package.x = 150;
            this.package.y = 400;
            this.package.vx = 0;
            this.package.vy = 0;
            this.player.carrying = false;
            this.package.carried = false;
        }
    }
    
    rectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    render() {
        // Clear canvas with era-specific background
        this.ctx.fillStyle = this.currentLevel.colors.bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background details
        this.drawBackground();
        
        // Draw platforms
        this.ctx.fillStyle = this.currentLevel.colors.platform;
        const allPlatforms = [...this.currentLevel.platforms];
        if (this.currentLevel.movingPlatforms) {
            allPlatforms.push(...this.currentLevel.movingPlatforms);
        }
        
        allPlatforms.forEach(platform => {
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            
            // Add platform details
            this.ctx.fillStyle = this.currentLevel.colors.accent;
            this.ctx.fillRect(platform.x, platform.y, platform.width, 2);
            this.ctx.fillStyle = this.currentLevel.colors.platform;
        });
        
        // Draw spikes
        this.ctx.fillStyle = '#ff4757';
        this.currentLevel.spikes.forEach(spike => {
            for (let i = 0; i < spike.width; i += 8) {
                this.ctx.beginPath();
                this.ctx.moveTo(spike.x + i, spike.y + spike.height);
                this.ctx.lineTo(spike.x + i + 4, spike.y);
                this.ctx.lineTo(spike.x + i + 8, spike.y + spike.height);
                this.ctx.closePath();
                this.ctx.fill();
            }
        });
        
        // Draw lasers
        if (this.currentLevel.lasers) {
            this.currentLevel.lasers.forEach(laser => {
                if (laser.active) {
                    this.ctx.fillStyle = '#ff006e';
                    this.ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
                    
                    // Laser glow effect
                    this.ctx.fillStyle = 'rgba(255, 0, 110, 0.3)';
                    this.ctx.fillRect(laser.x - 2, laser.y, laser.width + 4, laser.height);
                }
            });
        }
        
        // Draw exit
        const exit = this.currentLevel.exit;
        this.ctx.fillStyle = '#27ae60';
        this.ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillRect(exit.x + 5, exit.y + 5, exit.width - 10, exit.height - 10);
        
        // Draw temporal clones
        this.temporalClones.forEach(clone => {
            this.ctx.fillStyle = clone.color;
            this.ctx.fillRect(clone.x, clone.y, this.player.width, this.player.height);
        });
        
        // Draw package
        if (!this.package.carried) {
            this.ctx.fillStyle = this.package.color;
            this.ctx.fillRect(this.package.x, this.package.y, this.package.width, this.package.height);
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(this.package.x, this.package.y, this.package.width, this.package.height);
        }
        
        // Draw player
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw carried package
        if (this.player.carrying) {
            this.ctx.fillStyle = this.package.color;
            this.ctx.fillRect(this.package.x, this.package.y, this.package.width, this.package.height);
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(this.package.x, this.package.y, this.package.width, this.package.height);
        }
        
        // Draw time effects
        if (this.powers.slowTime.active) {
            this.ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw UI overlays
        this.drawTimeDistortion();
    }
    
    drawBackground() {
        // Era-specific background elements
        switch(this.currentEra) {
            case 'medieval':
                this.drawMedievalBackground();
                break;
            case 'industrial':
                this.drawIndustrialBackground();
                break;
            case 'future':
                this.drawFutureBackground();
                break;
        }
    }
    
    drawMedievalBackground() {
        // Castle silhouette
        this.ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
        this.ctx.fillRect(700, 100, 200, 300);
        this.ctx.fillRect(720, 60, 30, 40);
        this.ctx.fillRect(780, 80, 30, 20);
        this.ctx.fillRect(850, 70, 30, 30);
    }
    
    drawIndustrialBackground() {
        // Factory smokestacks
        this.ctx.fillStyle = 'rgba(102, 102, 102, 0.4)';
        for (let i = 0; i < 4; i++) {
            const x = 200 + i * 150;
            this.ctx.fillRect(x, 50, 20, 200);
            // Smoke
            this.ctx.fillStyle = 'rgba(80, 80, 80, 0.2)';
            this.ctx.fillRect(x - 5, 30, 30, 20);
            this.ctx.fillStyle = 'rgba(102, 102, 102, 0.4)';
        }
    }
    
    drawFutureBackground() {
        // Neon city skyline
        this.ctx.fillStyle = 'rgba(106, 13, 173, 0.3)';
        for (let i = 0; i < 6; i++) {
            const x = i * 120;
            const height = 100 + Math.random() * 200;
            this.ctx.fillRect(x, 400 - height, 80, height);
            
            // Neon accents
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            this.ctx.fillRect(x + 10, 410 - height, 60, 2);
            this.ctx.fillStyle = 'rgba(106, 13, 173, 0.3)';
        }
    }
    
    drawTimeDistortion() {
        // Visual feedback for time powers
        if (this.powers.rewind.cooldown > this.powers.rewind.maxCooldown - 60) {
            this.ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(this.player.x - 20, this.player.y - 20, 
                               this.player.width + 40, this.player.height + 40);
            this.ctx.setLineDash([]);
        }
    }
    
    updateUI() {
        document.getElementById('eraDisplay').textContent = this.currentLevel.name;
        
        // Update power button states
        Object.keys(this.powers).forEach(powerType => {
            const btn = document.getElementById(powerType + 'Btn');
            const power = this.powers[powerType];
            
            btn.classList.remove('active', 'disabled');
            if (power.active) {
                btn.classList.add('active');
            } else if (power.cooldown > 0) {
                btn.classList.add('disabled');
            }
        });
        
        // Update status
        const status = document.getElementById('status');
        if (this.player.carrying) {
            status.textContent = 'Package Secured - Find Exit';
        } else {
            status.textContent = 'Collect Package First';
        }
    }
    
    gameLoop() {
        this.update();
        this.render();
        this.updateUI();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TemporalCourier();
});