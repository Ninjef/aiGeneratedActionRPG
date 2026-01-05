// Camera system for infinite world viewport

export class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.smoothing = 0.1;
        this.zoom = 0.40; // Values < 1 zoom out, showing more of the world
    }

    follow(target) {
        // Account for zoom when centering - we need to offset by half the visible world size
        const visibleWidth = this.canvas.width / this.zoom;
        const visibleHeight = this.canvas.height / this.zoom;
        this.targetX = target.x - visibleWidth / 2;
        this.targetY = target.y - visibleHeight / 2;
    }

    update() {
        // Smooth camera follow
        this.x += (this.targetX - this.x) * this.smoothing;
        this.y += (this.targetY - this.y) * this.smoothing;
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.x) * this.zoom,
            y: (worldY - this.y) * this.zoom
        };
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: screenX / this.zoom + this.x,
            y: screenY / this.zoom + this.y
        };
    }

    // Check if a point is visible on screen (with padding)
    isVisible(worldX, worldY, padding = 100) {
        const screen = this.worldToScreen(worldX, worldY);
        return screen.x >= -padding && 
               screen.x <= this.canvas.width + padding &&
               screen.y >= -padding && 
               screen.y <= this.canvas.height + padding;
    }

    // Get the visible world bounds
    getVisibleBounds() {
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

