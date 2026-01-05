import { describe, it, expect, beforeEach } from 'vitest';
import { Camera } from '../js/camera.js';

// Mock canvas object for testing
function createMockCanvas(width = 800, height = 600) {
    return {
        width,
        height
    };
}

describe('Camera', () => {
    let camera;
    let mockCanvas;

    beforeEach(() => {
        mockCanvas = createMockCanvas(800, 600);
        camera = new Camera(mockCanvas);
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(camera.x).toBe(0);
            expect(camera.y).toBe(0);
            expect(camera.targetX).toBe(0);
            expect(camera.targetY).toBe(0);
            expect(camera.smoothing).toBe(0.1);
            expect(camera.zoom).toBe(0.40);
        });

        it('should store canvas reference', () => {
            expect(camera.canvas).toBe(mockCanvas);
        });
    });

    describe('follow', () => {
        it('should set target to center on given position', () => {
            camera.follow({ x: 100, y: 100 });
            
            // With zoom 0.40, visible width = 800 / 0.40 = 2000
            // visible height = 600 / 0.40 = 1500
            // targetX should be 100 - 2000/2 = 100 - 1000 = -900
            // targetY should be 100 - 1500/2 = 100 - 750 = -650
            expect(camera.targetX).toBe(-900);
            expect(camera.targetY).toBe(-650);
        });

        it('should account for different zoom levels', () => {
            camera.zoom = 1.0;
            camera.follow({ x: 100, y: 100 });
            
            // With zoom 1.0, visible width = 800, height = 600
            expect(camera.targetX).toBe(100 - 400);
            expect(camera.targetY).toBe(100 - 300);
        });

        it('should center on origin correctly', () => {
            camera.follow({ x: 0, y: 0 });
            
            const visibleWidth = mockCanvas.width / camera.zoom;
            const visibleHeight = mockCanvas.height / camera.zoom;
            expect(camera.targetX).toBe(-visibleWidth / 2);
            expect(camera.targetY).toBe(-visibleHeight / 2);
        });
    });

    describe('update', () => {
        it('should smoothly move camera toward target', () => {
            camera.targetX = 100;
            camera.targetY = 100;
            camera.x = 0;
            camera.y = 0;
            
            camera.update();
            
            // With smoothing 0.1, should move 10% of the way
            expect(camera.x).toBe(10);
            expect(camera.y).toBe(10);
        });

        it('should continue to approach target over multiple updates', () => {
            camera.targetX = 100;
            camera.targetY = 0;
            camera.x = 0;
            camera.y = 0;
            
            for (let i = 0; i < 10; i++) {
                camera.update();
            }
            
            // Should be closer to target after multiple updates
            expect(camera.x).toBeGreaterThan(50);
            expect(camera.x).toBeLessThan(100);
        });

        it('should stay at target when already there', () => {
            camera.targetX = 50;
            camera.targetY = 50;
            camera.x = 50;
            camera.y = 50;
            
            camera.update();
            
            expect(camera.x).toBe(50);
            expect(camera.y).toBe(50);
        });
    });

    describe('worldToScreen', () => {
        it('should convert world coordinates to screen coordinates', () => {
            camera.x = 0;
            camera.y = 0;
            camera.zoom = 1;
            
            const screen = camera.worldToScreen(100, 50);
            expect(screen.x).toBe(100);
            expect(screen.y).toBe(50);
        });

        it('should account for camera position', () => {
            camera.x = 50;
            camera.y = 25;
            camera.zoom = 1;
            
            const screen = camera.worldToScreen(100, 50);
            expect(screen.x).toBe(50);  // 100 - 50
            expect(screen.y).toBe(25);  // 50 - 25
        });

        it('should apply zoom scaling', () => {
            camera.x = 0;
            camera.y = 0;
            camera.zoom = 0.5;
            
            const screen = camera.worldToScreen(100, 100);
            expect(screen.x).toBe(50);  // 100 * 0.5
            expect(screen.y).toBe(50);  // 100 * 0.5
        });

        it('should combine camera offset and zoom', () => {
            camera.x = 100;
            camera.y = 100;
            camera.zoom = 0.5;
            
            // (worldX - cameraX) * zoom = (200 - 100) * 0.5 = 50
            const screen = camera.worldToScreen(200, 200);
            expect(screen.x).toBe(50);
            expect(screen.y).toBe(50);
        });
    });

    describe('screenToWorld', () => {
        it('should convert screen coordinates to world coordinates', () => {
            camera.x = 0;
            camera.y = 0;
            camera.zoom = 1;
            
            const world = camera.screenToWorld(100, 50);
            expect(world.x).toBe(100);
            expect(world.y).toBe(50);
        });

        it('should account for camera position', () => {
            camera.x = 50;
            camera.y = 25;
            camera.zoom = 1;
            
            const world = camera.screenToWorld(100, 50);
            expect(world.x).toBe(150);  // 100 + 50
            expect(world.y).toBe(75);   // 50 + 25
        });

        it('should apply inverse zoom scaling', () => {
            camera.x = 0;
            camera.y = 0;
            camera.zoom = 0.5;
            
            const world = camera.screenToWorld(50, 50);
            expect(world.x).toBe(100);  // 50 / 0.5
            expect(world.y).toBe(100);  // 50 / 0.5
        });

        it('should be inverse of worldToScreen', () => {
            camera.x = 123;
            camera.y = 456;
            camera.zoom = 0.75;
            
            const originalWorld = { x: 500, y: 300 };
            const screen = camera.worldToScreen(originalWorld.x, originalWorld.y);
            const backToWorld = camera.screenToWorld(screen.x, screen.y);
            
            expect(backToWorld.x).toBeCloseTo(originalWorld.x);
            expect(backToWorld.y).toBeCloseTo(originalWorld.y);
        });
    });

    describe('isVisible', () => {
        beforeEach(() => {
            camera.x = 0;
            camera.y = 0;
            camera.zoom = 1;
        });

        it('should return true for points on screen', () => {
            expect(camera.isVisible(400, 300)).toBe(true);  // Center
            expect(camera.isVisible(0, 0)).toBe(true);      // Top-left
            expect(camera.isVisible(800, 600)).toBe(true);  // Bottom-right (with padding)
        });

        it('should return false for points far off screen', () => {
            expect(camera.isVisible(-200, 300)).toBe(false);
            expect(camera.isVisible(1100, 300)).toBe(false);
            expect(camera.isVisible(400, -200)).toBe(false);
            expect(camera.isVisible(400, 900)).toBe(false);
        });

        it('should use default padding of 100', () => {
            // Just outside screen but within padding
            expect(camera.isVisible(-50, 300)).toBe(true);
            expect(camera.isVisible(850, 300)).toBe(true);
            // Outside padding
            expect(camera.isVisible(-150, 300)).toBe(false);
        });

        it('should respect custom padding', () => {
            expect(camera.isVisible(-150, 300, 200)).toBe(true);
            expect(camera.isVisible(-150, 300, 100)).toBe(false);
        });
    });

    describe('getVisibleBounds', () => {
        it('should return correct bounds at zoom 1', () => {
            camera.x = 0;
            camera.y = 0;
            camera.zoom = 1;
            
            const bounds = camera.getVisibleBounds();
            expect(bounds.left).toBe(0);
            expect(bounds.top).toBe(0);
            expect(bounds.right).toBe(800);
            expect(bounds.bottom).toBe(600);
        });

        it('should return larger bounds when zoomed out', () => {
            camera.x = 0;
            camera.y = 0;
            camera.zoom = 0.5;
            
            const bounds = camera.getVisibleBounds();
            expect(bounds.left).toBe(0);
            expect(bounds.top).toBe(0);
            expect(bounds.right).toBe(1600);   // 800 / 0.5
            expect(bounds.bottom).toBe(1200);  // 600 / 0.5
        });

        it('should account for camera position', () => {
            camera.x = 100;
            camera.y = 50;
            camera.zoom = 1;
            
            const bounds = camera.getVisibleBounds();
            expect(bounds.left).toBe(100);
            expect(bounds.top).toBe(50);
            expect(bounds.right).toBe(900);
            expect(bounds.bottom).toBe(650);
        });

        it('should combine position and zoom', () => {
            camera.x = 100;
            camera.y = 100;
            camera.zoom = 0.40;
            
            const bounds = camera.getVisibleBounds();
            expect(bounds.left).toBe(100);
            expect(bounds.top).toBe(100);
            expect(bounds.right).toBe(100 + 2000);  // 800 / 0.40 = 2000
            expect(bounds.bottom).toBe(100 + 1500); // 600 / 0.40 = 1500
        });
    });
});

