// EventBus tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, GameEvents } from '../../js/events/EventBus.js';

describe('EventBus', () => {
    let eventBus;
    
    beforeEach(() => {
        eventBus = new EventBus();
    });
    
    describe('on()', () => {
        it('should subscribe to an event', () => {
            const callback = vi.fn();
            eventBus.on('test', callback);
            
            eventBus.emit('test');
            
            expect(callback).toHaveBeenCalledTimes(1);
        });
        
        it('should pass data to the callback', () => {
            const callback = vi.fn();
            eventBus.on('test', callback);
            
            const data = { foo: 'bar', num: 42 };
            eventBus.emit('test', data);
            
            expect(callback).toHaveBeenCalledWith(data);
        });
        
        it('should allow multiple listeners for the same event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            
            eventBus.on('test', callback1);
            eventBus.on('test', callback2);
            
            eventBus.emit('test');
            
            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });
        
        it('should return an unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.on('test', callback);
            
            unsubscribe();
            eventBus.emit('test');
            
            expect(callback).not.toHaveBeenCalled();
        });
        
        it('should throw if callback is not a function', () => {
            expect(() => eventBus.on('test', 'not a function')).toThrow();
            expect(() => eventBus.on('test', null)).toThrow();
        });
    });
    
    describe('once()', () => {
        it('should only call callback once', () => {
            const callback = vi.fn();
            eventBus.once('test', callback);
            
            eventBus.emit('test');
            eventBus.emit('test');
            eventBus.emit('test');
            
            expect(callback).toHaveBeenCalledTimes(1);
        });
        
        it('should pass data to the callback', () => {
            const callback = vi.fn();
            eventBus.once('test', callback);
            
            const data = { value: 123 };
            eventBus.emit('test', data);
            
            expect(callback).toHaveBeenCalledWith(data);
        });
        
        it('should return an unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.once('test', callback);
            
            unsubscribe();
            eventBus.emit('test');
            
            expect(callback).not.toHaveBeenCalled();
        });
    });
    
    describe('off()', () => {
        it('should unsubscribe a callback', () => {
            const callback = vi.fn();
            eventBus.on('test', callback);
            
            eventBus.off('test', callback);
            eventBus.emit('test');
            
            expect(callback).not.toHaveBeenCalled();
        });
        
        it('should return true if callback was removed', () => {
            const callback = vi.fn();
            eventBus.on('test', callback);
            
            const result = eventBus.off('test', callback);
            
            expect(result).toBe(true);
        });
        
        it('should return false if callback was not found', () => {
            const callback = vi.fn();
            
            const result = eventBus.off('test', callback);
            
            expect(result).toBe(false);
        });
        
        it('should only remove the specific callback', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            
            eventBus.on('test', callback1);
            eventBus.on('test', callback2);
            eventBus.off('test', callback1);
            
            eventBus.emit('test');
            
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledTimes(1);
        });
    });
    
    describe('emit()', () => {
        it('should not throw if no listeners exist', () => {
            expect(() => eventBus.emit('nonexistent')).not.toThrow();
        });
        
        it('should handle callback errors gracefully', () => {
            const errorCallback = vi.fn(() => {
                throw new Error('Test error');
            });
            const normalCallback = vi.fn();
            
            eventBus.on('test', errorCallback);
            eventBus.on('test', normalCallback);
            
            // Should not throw
            expect(() => eventBus.emit('test')).not.toThrow();
            
            // Both callbacks should have been attempted
            expect(errorCallback).toHaveBeenCalled();
            expect(normalCallback).toHaveBeenCalled();
        });
        
        it('should handle listeners unsubscribing during emit', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn(() => {
                eventBus.off('test', callback3);
            });
            const callback3 = vi.fn();
            
            eventBus.on('test', callback1);
            eventBus.on('test', callback2);
            eventBus.on('test', callback3);
            
            eventBus.emit('test');
            
            // All callbacks should have been called since we iterate over a copy
            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
            expect(callback3).toHaveBeenCalled();
        });
    });
    
    describe('removeAllListeners()', () => {
        it('should remove all listeners for a specific event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const callback3 = vi.fn();
            
            eventBus.on('event1', callback1);
            eventBus.on('event1', callback2);
            eventBus.on('event2', callback3);
            
            eventBus.removeAllListeners('event1');
            
            eventBus.emit('event1');
            eventBus.emit('event2');
            
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
            expect(callback3).toHaveBeenCalled();
        });
        
        it('should remove all listeners when no event specified', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            
            eventBus.on('event1', callback1);
            eventBus.on('event2', callback2);
            
            eventBus.removeAllListeners();
            
            eventBus.emit('event1');
            eventBus.emit('event2');
            
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });
    });
    
    describe('listenerCount()', () => {
        it('should return 0 for no listeners', () => {
            expect(eventBus.listenerCount('test')).toBe(0);
        });
        
        it('should return correct count', () => {
            eventBus.on('test', () => {});
            eventBus.on('test', () => {});
            eventBus.once('test', () => {});
            
            expect(eventBus.listenerCount('test')).toBe(3);
        });
    });
    
    describe('eventNames()', () => {
        it('should return empty array when no events registered', () => {
            expect(eventBus.eventNames()).toEqual([]);
        });
        
        it('should return all registered event names', () => {
            eventBus.on('event1', () => {});
            eventBus.on('event2', () => {});
            eventBus.once('event3', () => {});
            
            const names = eventBus.eventNames();
            
            expect(names).toContain('event1');
            expect(names).toContain('event2');
            expect(names).toContain('event3');
            expect(names.length).toBe(3);
        });
    });
    
    describe('debug mode', () => {
        it('should log events when debug is enabled', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            eventBus.setDebug(true);
            eventBus.emit('test', { data: 'value' });
            
            expect(consoleSpy).toHaveBeenCalledWith('[EventBus] test', { data: 'value' });
            
            consoleSpy.mockRestore();
        });
        
        it('should not log events when debug is disabled', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            eventBus.setDebug(false);
            eventBus.emit('test');
            
            expect(consoleSpy).not.toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });
});

describe('GameEvents', () => {
    it('should have enemy events defined', () => {
        expect(GameEvents.ENEMY_DAMAGED).toBe('enemy:damaged');
        expect(GameEvents.ENEMY_KILLED).toBe('enemy:killed');
        expect(GameEvents.ENEMY_SPAWNED).toBe('enemy:spawned');
    });
    
    it('should have player events defined', () => {
        expect(GameEvents.PLAYER_DAMAGED).toBe('player:damaged');
        expect(GameEvents.PLAYER_HEALED).toBe('player:healed');
        expect(GameEvents.PLAYER_LEVEL_UP).toBe('player:levelUp');
        expect(GameEvents.PLAYER_XP_GAINED).toBe('player:xpGained');
    });
    
    it('should have power events defined', () => {
        expect(GameEvents.POWER_CAST).toBe('power:cast');
        expect(GameEvents.POWER_LEVEL_UP).toBe('power:levelUp');
        expect(GameEvents.POWER_ACQUIRED).toBe('power:acquired');
    });
    
    it('should have game state events defined', () => {
        expect(GameEvents.GAME_START).toBe('game:start');
        expect(GameEvents.GAME_OVER).toBe('game:over');
        expect(GameEvents.GAME_PAUSED).toBe('game:paused');
        expect(GameEvents.GAME_RESUMED).toBe('game:resumed');
    });
    
    it('should have crystal events defined', () => {
        expect(GameEvents.CRYSTAL_COLLECTED).toBe('crystal:collected');
        expect(GameEvents.CRYSTAL_SPAWNED).toBe('crystal:spawned');
    });
    
    it('should have spawn block events defined', () => {
        expect(GameEvents.SPAWN_BLOCK_CREATED).toBe('spawnBlock:created');
        expect(GameEvents.SPAWN_BLOCK_DESTROYED).toBe('spawnBlock:destroyed');
    });
});

