// EventBus - Simple pub/sub event system for game events
// Enables loose coupling between game systems and supports event-driven architecture

type EventCallback<T = any> = (data: T) => void;
type UnsubscribeFunction = () => void;

/**
 * EventBus provides a centralized event system for the game.
 * Allows different game systems to communicate without direct dependencies.
 * 
 * Usage:
 *   const eventBus = new EventBus();
 *   eventBus.on('enemy:killed', (data) => console.log('Enemy killed!', data));
 *   eventBus.emit('enemy:killed', { enemy, damage, source });
 */
export class EventBus {
    // Map of event names to arrays of callback functions
    private _listeners: Map<string, EventCallback[]>;
    
    // Map of event names to one-time listeners
    private _onceListeners: Map<string, EventCallback[]>;
    
    // Debug mode - logs all events when enabled
    private _debug: boolean;

    constructor() {
        this._listeners = new Map();
        this._onceListeners = new Map();
        this._debug = false;
    }
    
    /**
     * Enable or disable debug mode
     * @param enabled - Whether to enable debug logging
     */
    setDebug(enabled: boolean): void {
        this._debug = enabled;
    }
    
    /**
     * Subscribe to an event
     * @param event - Event name (e.g., 'enemy:killed', 'player:damaged')
     * @param callback - Function to call when event is emitted
     * @returns Unsubscribe function for convenience
     */
    on<T = any>(event: string, callback: EventCallback<T>): UnsubscribeFunction {
        if (typeof callback !== 'function') {
            throw new Error('EventBus.on: callback must be a function');
        }
        
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        
        this._listeners.get(event)!.push(callback);
        
        // Return unsubscribe function for convenience
        return () => this.off(event, callback);
    }
    
    /**
     * Subscribe to an event only once (auto-unsubscribes after first emit)
     * @param event - Event name
     * @param callback - Function to call when event is emitted
     * @returns Unsubscribe function for convenience
     */
    once<T = any>(event: string, callback: EventCallback<T>): UnsubscribeFunction {
        if (typeof callback !== 'function') {
            throw new Error('EventBus.once: callback must be a function');
        }
        
        if (!this._onceListeners.has(event)) {
            this._onceListeners.set(event, []);
        }
        
        this._onceListeners.get(event)!.push(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this._onceListeners.get(event);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * Unsubscribe from an event
     * @param event - Event name
     * @param callback - The callback function to remove
     * @returns True if callback was found and removed
     */
    off<T = any>(event: string, callback: EventCallback<T>): boolean {
        const listeners = this._listeners.get(event);
        if (!listeners) return false;
        
        const index = listeners.indexOf(callback);
        if (index !== -1) {
            listeners.splice(index, 1);
            return true;
        }
        
        return false;
    }
    
    /**
     * Emit an event to all subscribers
     * @param event - Event name
     * @param data - Data to pass to callbacks
     */
    emit<T = any>(event: string, data: T | null = null): void {
        if (this._debug) {
            console.log(`[EventBus] ${event}`, data);
        }
        
        // Call regular listeners
        const listeners = this._listeners.get(event);
        if (listeners) {
            // Create a copy in case a listener unsubscribes during iteration
            const listenersCopy = [...listeners];
            for (const callback of listenersCopy) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in listener for "${event}":`, error);
                }
            }
        }
        
        // Call one-time listeners and remove them
        const onceListeners = this._onceListeners.get(event);
        if (onceListeners && onceListeners.length > 0) {
            const onceListenersCopy = [...onceListeners];
            this._onceListeners.set(event, []); // Clear before calling in case of errors
            for (const callback of onceListenersCopy) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[EventBus] Error in once-listener for "${event}":`, error);
                }
            }
        }
    }
    
    /**
     * Remove all listeners for a specific event
     * @param event - Event name (if not provided, removes all listeners)
     */
    removeAllListeners(event?: string): void {
        if (event) {
            this._listeners.delete(event);
            this._onceListeners.delete(event);
        } else {
            this._listeners.clear();
            this._onceListeners.clear();
        }
    }
    
    /**
     * Get the count of listeners for an event
     * @param event - Event name
     * @returns Number of listeners
     */
    listenerCount(event: string): number {
        const regular = this._listeners.get(event)?.length || 0;
        const once = this._onceListeners.get(event)?.length || 0;
        return regular + once;
    }
    
    /**
     * Get all registered event names
     * @returns Array of event names
     */
    eventNames(): string[] {
        const names = new Set([
            ...this._listeners.keys(),
            ...this._onceListeners.keys()
        ]);
        return [...names];
    }
}

// Pre-defined event names for type safety and documentation
export const GameEvents = {
    // Enemy events
    ENEMY_DAMAGED: 'enemy:damaged',
    ENEMY_KILLED: 'enemy:killed',
    ENEMY_SPAWNED: 'enemy:spawned',
    
    // Player events
    PLAYER_DAMAGED: 'player:damaged',
    PLAYER_HEALED: 'player:healed',
    PLAYER_LEVEL_UP: 'player:levelUp',
    PLAYER_XP_GAINED: 'player:xpGained',
    
    // Power events
    POWER_CAST: 'power:cast',
    POWER_LEVEL_UP: 'power:levelUp',
    POWER_ACQUIRED: 'power:acquired',
    
    // Game state events
    GAME_START: 'game:start',
    GAME_OVER: 'game:over',
    GAME_PAUSED: 'game:paused',
    GAME_RESUMED: 'game:resumed',
    
    // Crystal events
    CRYSTAL_COLLECTED: 'crystal:collected',
    CRYSTAL_SPAWNED: 'crystal:spawned',
    
    // SpawnBlock events
    SPAWN_BLOCK_CREATED: 'spawnBlock:created',
    SPAWN_BLOCK_DESTROYED: 'spawnBlock:destroyed'
} as const;

