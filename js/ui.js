// UI management

import { POWERS, PowerManager } from './powers.js';
import { PASSIVE_UPGRADES } from './passiveUpgrades.js';

export class UI {
    constructor() {
        this.crystalDisplay = {
            heat: document.getElementById('heat-count'),
            cold: document.getElementById('cold-count'),
            force: document.getElementById('force-count'),
            total: document.getElementById('total-crystals')
        };
        
        // XP display elements
        this.xpDisplay = {
            level: document.getElementById('player-level'),
            barFill: document.getElementById('xp-bar-fill'),
            text: document.getElementById('xp-text')
        };
        
        this.powersDisplay = document.getElementById('powers-display');
        this.passiveUpgradesDisplay = document.getElementById('passive-upgrades-display');
        this.levelUpModal = document.getElementById('level-up-modal');
        this.powerOptions = document.getElementById('power-options');
        this.passiveUpgradeModal = document.getElementById('passive-upgrade-modal');
        this.passiveOptions = document.getElementById('passive-options');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.startScreen = document.getElementById('start-screen');
        this.survivalTime = document.getElementById('survival-time');
        this.enemiesDefeated = document.getElementById('enemies-defeated');
        
        this.onPowerSelected = null;
        this.onRestart = null;
        this.onStart = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('restart-btn').addEventListener('click', () => {
            if (this.onRestart) this.onRestart();
        });
        
        document.getElementById('start-btn').addEventListener('click', () => {
            if (this.onStart) this.onStart();
        });
    }

    updateCrystals(crystals) {
        this.crystalDisplay.heat.textContent = crystals.heat;
        this.crystalDisplay.cold.textContent = crystals.cold;
        this.crystalDisplay.force.textContent = crystals.force;
        this.crystalDisplay.total.textContent = crystals.heat + crystals.cold + crystals.force;
    }

    updatePowers(powers) {
        this.powersDisplay.innerHTML = '';
        
        for (const power of powers) {
            const def = POWERS[power.id];
            const div = document.createElement('div');
            div.className = `power-item ${def.category}`;
            div.textContent = `${def.name} Lv.${power.level}`;
            this.powersDisplay.appendChild(div);
        }
    }

    updateXpBar(current, max, level) {
        this.xpDisplay.level.textContent = level;
        const percent = Math.min(100, (current / max) * 100);
        this.xpDisplay.barFill.style.width = `${percent}%`;
        this.xpDisplay.text.textContent = `${Math.floor(current)} / ${max}`;
    }

    updatePassiveUpgrades(passiveUpgrades) {
        this.passiveUpgradesDisplay.innerHTML = '';
        
        for (const upgrade of passiveUpgrades) {
            const def = PASSIVE_UPGRADES[upgrade.id];
            if (!def) continue;
            
            const div = document.createElement('div');
            div.className = `passive-item ${def.category || 'neutral'}`;
            const stackText = upgrade.stacks > 1 ? ` x${upgrade.stacks}` : '';
            div.textContent = `${def.name}${stackText}`;
            div.title = def.description;
            this.passiveUpgradesDisplay.appendChild(div);
        }
    }

    showPassiveUpgrade(options, player, callback) {
        this.passiveUpgradeModal.classList.remove('hidden');
        this.passiveOptions.innerHTML = '';
        
        for (const option of options) {
            const div = document.createElement('div');
            div.className = `passive-option ${option.category || 'neutral'}`;
            
            // Check if player already has this upgrade
            const existing = player.passiveUpgrades.find(u => u.id === option.id);
            const stackText = existing && option.stackable ? 
                ` (Stack ${existing.stacks || 1} → ${(existing.stacks || 1) + 1})` : '';
            
            div.innerHTML = `
                <h3>${option.name}</h3>
                <p>${option.description}${stackText}</p>
            `;
            
            div.addEventListener('click', () => {
                this.passiveUpgradeModal.classList.add('hidden');
                callback(option);
            });
            
            this.passiveOptions.appendChild(div);
        }
    }

    hidePassiveUpgrade() {
        this.passiveUpgradeModal.classList.add('hidden');
    }

    showLevelUp(options, existingPowers, callback) {
        this.levelUpModal.classList.remove('hidden');
        this.powerOptions.innerHTML = '';
        
        for (const option of options) {
            const div = document.createElement('div');
            div.className = `power-option ${option.category}`;
            
            const levelText = option.currentLevel > 0 
                ? `Level ${option.currentLevel} → ${option.currentLevel + 1}`
                : 'New!';
            
            div.innerHTML = `
                <h3>${option.name}</h3>
                <p>${option.description}</p>
                <div class="level">${levelText}</div>
            `;
            
            div.addEventListener('click', () => {
                this.levelUpModal.classList.add('hidden');
                callback(option);
            });
            
            this.powerOptions.appendChild(div);
        }
    }

    hideLevelUp() {
        this.levelUpModal.classList.add('hidden');
    }

    showGameOver(survivalTime, enemiesDefeated) {
        this.gameOverModal.classList.remove('hidden');
        this.survivalTime.textContent = Math.floor(survivalTime);
        this.enemiesDefeated.textContent = enemiesDefeated;
    }

    hideGameOver() {
        this.gameOverModal.classList.add('hidden');
    }

    showStartScreen() {
        this.startScreen.classList.remove('hidden');
    }

    hideStartScreen() {
        this.startScreen.classList.add('hidden');
    }
}

