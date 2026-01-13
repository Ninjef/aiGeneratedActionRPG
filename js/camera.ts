// Camera system for infinite world viewport

import type { Entity, Position } from './types';

export class Camera {
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    smoothing: number;
    zoom: number;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.smoothing = 0.1;
        this.zoom = 0.40; // Values < 1 zoom out, showing more of the world
    }

    follow(target: Entity): void {
        // Account for zoom when centering - we need to offset by half the visible world size
        const visibleWidth = this.canvas.width / this.zoom;
        const visibleHeight = this.canvas.height / this.zoom;
        this.targetX = target.x - visibleWidth / 2;
        this.targetY = target.y - visibleHeight / 2;
    }

    update(): void {
        // Smooth camera follow
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(worldX: number, worldY: number): Position {
        return {
            x: (worldX - this.x) * this.zoom,
            y: (worldY - this.y) * this.zoom
        };
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(screenX: number, screenY: number): Position {
        return {
            x: screenX / this.zoom + this.x,
            y: screenY / this.zoom + this.y
        };
    }

    // Check if a point is visible on screen (with padding)
    isVisible(worldX: number, worldY: number, padding: number = 100): boolean {
        const screen = this.worldToScreen(worldX, worldY);
        return screen.x >= -padding && 
               screen.x <= this.canvas.width + padding &&
               screen.y >= -padding && 
               screen.y <= this.canvas.height + padding;
    }

    // Get the visible world bounds
    getVisibleBounds(): { left: number; right: number; top: number; bottom: number } {
        const visibleWidth = this.canvas.width / this.zoom;
        const visibleHeight = this.canvas.height / this.zoom;
        return {
            left: this.x,
            right: this.x + visibleWidth,
            top: this.y,
            bottom: this.y + visibleHeight
        };
    }
}

