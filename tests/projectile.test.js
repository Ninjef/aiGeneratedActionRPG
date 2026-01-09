import { describe, it, expect, beforeEach } from 'vitest';
import { Projectile, AreaEffect } from '../js/projectile.js';

describe('Projectile', () => {
    describe('constructor', () => {
        it('should create projectile without sourceType by default', () => {
            const proj = new Projectile(0, 0, 0, 100, 10);
            
            expect(proj.sourceType).toBe(null);
        });

        it('should create projectile with sourceType when provided', () => {
            const proj = new Projectile(0, 0, 0, 100, 10, {
                sourceType: 'fireballPower'
            });
            
            expect(proj.sourceType).toBe('fireballPower');
        });

        it('should preserve other options when sourceType is provided', () => {
            const proj = new Projectile(0, 0, 0, 100, 10, {
                sourceType: 'fireballPower',
                radius: 12,
                color: '#ff6b35',
                piercing: true
            });
            
            expect(proj.sourceType).toBe('fireballPower');
            expect(proj.radius).toBe(12);
            expect(proj.color).toBe('#ff6b35');
            expect(proj.piercing).toBe(true);
        });
    });
});

describe('AreaEffect', () => {
    describe('constructor', () => {
        it('should create area effect without creator by default', () => {
            const effect = new AreaEffect(0, 0, 50, 10, 5);
            
            expect(effect.creator).toBe(null);
            expect(effect.damagePlayer).toBe(false);
        });

        it('should create area effect with creator when provided', () => {
            const mockEnemy = { x: 10, y: 10 };
            const effect = new AreaEffect(0, 0, 50, 10, 5, {
                creator: mockEnemy
            });
            
            expect(effect.creator).toBe(mockEnemy);
        });

        it('should create area effect with player damage options', () => {
            const effect = new AreaEffect(0, 0, 50, 10, 5, {
                damagePlayer: true,
                playerDamage: 15
            });
            
            expect(effect.damagePlayer).toBe(true);
            expect(effect.playerDamage).toBe(15);
        });
    });

    describe('affectEnemy', () => {
        it('should not affect creator enemy', () => {
            const mockEnemy = { 
                x: 10, 
                y: 10, 
                radius: 10,
                applySlow: () => {}
            };
            const effect = new AreaEffect(10, 10, 50, 10, 5, {
                creator: mockEnemy
            });
            
            const result = effect.affectEnemy(mockEnemy);
            
            expect(result).toBe(false);
        });

        it('should affect other enemies', () => {
            const creator = { x: 100, y: 100, radius: 10 };
            const otherEnemy = { 
                x: 10, 
                y: 10, 
                radius: 10,
                applySlow: () => {}
            };
            const effect = new AreaEffect(10, 10, 50, 10, 5, {
                creator: creator
            });
            
            const result = effect.affectEnemy(otherEnemy);
            
            expect(result).toBe(true);
        });

        it('should affect enemies when no creator is set', () => {
            const enemy = { 
                x: 10, 
                y: 10, 
                radius: 10,
                applySlow: () => {}
            };
            const effect = new AreaEffect(10, 10, 50, 10, 5);
            
            const result = effect.affectEnemy(enemy);
            
            expect(result).toBe(true);
        });
    });
});



