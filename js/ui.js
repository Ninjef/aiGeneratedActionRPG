// UI management

import { POWERS } from './powers.js';
import { PASSIVE_UPGRADES } from './passiveUpgrades.js';
import { Player } from './player.js';

export class UI {
    constructor() {
        // XP display elements
        this.xpDisplay = {
            level: document.getElementById('player-level'),
            barFill: document.getElementById('xp-bar-fill'),
            text: document.getElementById('xp-text')
        };
        
        this.powersDisplay = document.getElementById('powers-display');
        this.passiveUpgradesDisplay = document.getElementById('passive-upgrades-display');
        this.passiveUpgradeModal = document.getElementById('passive-upgrade-modal');
        this.passiveOptions = document.getElementById('passive-options');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.startScreen = document.getElementById('start-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.survivalTime = document.getElementById('survival-time');
        this.enemiesDefeated = document.getElementById('enemies-defeated');
        
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

    updatePowers(powers) {
        this.powersDisplay.innerHTML = '';
        
        for (const power of powers) {
            const def = POWERS[power.id];
            if (!def) continue;
            
            const div = document.createElement('div');
            div.className = `power-item ${def.category}`;
            
            // Calculate progress toward next level
            const runesForCurrentLevel = Player.getTotalRunesForLevel(power.level);
            const runesForNextLevel = Player.getTotalRunesForLevel(power.level + 1);
            const runesNeeded = runesForNextLevel - runesForCurrentLevel;
            const runesProgress = power.runesCollected - runesForCurrentLevel;
            
            // Show power name, level, and rune progress
            div.innerHTML = `
                <span class="power-name">${def.name} Lv.${power.level}</span>
                <span class="power-progress">[${runesProgress}/${runesNeeded}]</span>
            `;
            div.title = `${def.description}\n\nCollect ${runesNeeded - runesProgress} more runes to level up.`;
            
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

    showPauseScreen() {
        this.pauseScreen.classList.remove('hidden');
    }

    hidePauseScreen() {
        this.pauseScreen.classList.add('hidden');
    }
}

