// UI management

import { POWERS, PowerManager } from './powers.js';

export class UI {
    constructor() {
        this.crystalDisplay = {
            heat: document.getElementById('heat-count'),
            cold: document.getElementById('cold-count'),
            force: document.getElementById('force-count'),
            total: document.getElementById('total-crystals')
        };
        
        this.powersDisplay = document.getElementById('powers-display');
        this.levelUpModal = document.getElementById('level-up-modal');
        this.powerOptions = document.getElementById('power-options');
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

