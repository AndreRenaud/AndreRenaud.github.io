class CardTable {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.cards = [];

        // Mouse events
        this.canvas.onmousedown = this.handleStart.bind(this);
        this.canvas.onmousemove = this.handleMove.bind(this);
        this.canvas.onmouseup = this.handleEnd.bind(this);

        // Touch events
        document.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleEnd.bind(this), { passive: false });

        this.draggedCard = null;
        this.dragOffset = { x: 0, y: 0 };
        this.dragStart = { x: 0, y: 0 };
        this.lastMoveCoords = { x: 0, y: 0 };
        this.onValidMove = null; // Callback for valid moves
        this.outlines = []; // Store card outlines
        this.onCardClick = null; // New callback for clicks
        this.mouseDownPos = null;
        this.backgroundImage = null;
        this.buttons = []; // Store button definitions

        // Add resize handler
        window.addEventListener('resize', this.handleResize.bind(this));

        // Add orientation change handler
        window.screen.orientation?.addEventListener('change', this.handleResize.bind(this));

        // Initial size setup
        this.handleResize();
    }

    // Get normalized coordinates for both mouse and touch events
    getEventCoords(e) {
        var ratio = this.canvas.width / 1024;
        if (e.touches) {
            if (e.touches.length == 1) {
                e.preventDefault(); // Prevent scrolling on touch, but not zooming
            }
            const rect = this.canvas.getBoundingClientRect();
            if (e.touches.length == 0) {
                return {
                    x: this.lastMoveCoords.x - rect.left / ratio,
                    y: this.lastMoveCoords.y - rect.top / ratio,
                    type: 'touch',
                };
            }
            return {
                x: (e.touches[0].clientX - rect.left) / ratio,
                y: (e.touches[0].clientY - rect.top) / ratio,
                type: 'touch',
            };
        }
        return {
            x: e.offsetX / ratio,
            y: e.offsetY / ratio,
            type: 'mouse',
        };
    }

    moveCardToTop(card) {
        card.zIndex = Math.max(...this.cards.map((c) => c.zIndex)) + 1;
    }

    handleStart(e) {
        const coords = this.getEventCoords(e);
        this.mouseDownPos = { ...coords }; // Store initial position
        this.lastMoveCoords = { ...coords };

        if (this.draggedCard) {
            this.draggedCard.move(this.dragStart.x, this.dragStart.y);
            this.draggedCard = null;
        }

        // Check for button clicks first
        for (const button of this.buttons) {
            if (
                coords.x >= button.x &&
                coords.x <= button.x + button.width &&
                coords.y >= button.y &&
                coords.y <= button.y + button.height
            ) {
                if (coords.type === 'touch') {
                    button.isHovered = true;
                }
                button.onClick?.(button);
                return;
            }
        }

        var foundCard = null;
        // Find the top card that was clicked
        for (const card of this.cards) {
            if (card.contains(coords.x, coords.y) && card.draggable) {
                if (foundCard && foundCard.zIndex > card.zIndex) {
                    // If we've already got a card, and it's higher, skip this one
                    continue;
                }
                foundCard = card;
            }
        }

        if (foundCard) {
            this.draggedCard = foundCard;
            this.dragOffset = {
                x: coords.x - foundCard.x,
                y: coords.y - foundCard.y,
            };
            this.dragStart = { x: foundCard.x, y: foundCard.y };
            foundCard.preDragZIndex = foundCard.zIndex;
            this.moveCardToTop(foundCard);
        }
        this.draw();
    }

    handleMove(e) {
        const coords = this.getEventCoords(e);
        // Update button hover states
        let needsRedraw = false;
        for (const button of this.buttons) {
            const isHovered =
                coords.x >= button.x &&
                coords.x <= button.x + button.width &&
                coords.y >= button.y &&
                coords.y <= button.y + button.height;
            if (isHovered !== button.isHovered) {
                button.isHovered = isHovered;
                needsRedraw = true;
            }
        }
        if (this.draggedCard) {
            const coords = this.getEventCoords(e);
            this.draggedCard.move(
                coords.x - this.dragOffset.x,
                coords.y - this.dragOffset.y,
                this.draggedCard.zIndex,
                0
            );
            needsRedraw = true;
        }
        this.lastMoveCoords = this.getEventCoords(e);
        if (needsRedraw) {
            this.draw();
        }
    }

    handleEnd(e) {
        const coords = this.getEventCoords(e);
        const dx = coords.x - this.mouseDownPos.x;
        const dy = coords.y - this.mouseDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        for (const button of this.buttons) {
            button.isHovered = false;
        }

        if (this.draggedCard) {
            // Put it back where it came from
            this.draggedCard.zIndex = this.draggedCard.preDragZIndex;

            // Check if mouse hasn't moved much (it's a click)
            var moveBack = false;
            if (distance < 5) {
                // 5px threshold for click
                moveBack = true;
                if (this.onCardClick) {
                    if (this.onCardClick(this.draggedCard, coords.x, coords.y)) moveBack = false;
                }
            } else if (this.onValidMove) {
                // If the move is invalid, move the card back
                if (!this.onValidMove(this.draggedCard, coords.x, coords.y)) {
                    moveBack = true;
                }
            }
            if (moveBack) {
                this.draggedCard.move(this.dragStart.x, this.dragStart.y);
            }
        } else {
            // If we weren't moving a card, check if we clicked an outline
            for (const outline of this.outlines) {
                if (
                    outline.onClick &&
                    coords.x >= outline.x &&
                    coords.x <= outline.x + outline.width &&
                    coords.y >= outline.y &&
                    coords.y <= outline.y + outline.height &&
                    distance < 5
                ) {
                    outline.onClick(outline, coords.x, coords.y);
                    break;
                }
            }
        }

        this.mouseDownPos = null;
        this.draggedCard = null;
        this.draw();
    }

    addCard(card) {
        this.cards.push(card);
        this.draw();
    }

    addOutline(x, y, width = 100, color = 'black', onClick = null) {
        const outline = {
            x,
            y,
            width,
            height: width * 1.4, // to match the cards
            color,
            onClick,
        };
        this.outlines.push(outline);
        this.draw();
        return outline;
    }

    removeOutline(outline) {
        const index = this.outlines.indexOf(outline);
        if (index !== -1) {
            this.outlines.splice(index, 1);
            this.draw();
        }
    }

    clearOutlines() {
        this.outlines = [];
        this.draw();
    }

    handleResize() {
        // Get proper dimensions accounting for orientation
        const canvas = this.canvas;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Set canvas size to match window
        canvas.width = windowWidth;
        canvas.height = windowHeight;

        // Force immediate redraw
        window.requestAnimationFrame(() => this.draw());
    }

    width() {
        return this.canvas.width;
    }

    height() {
        return this.canvas.height;
    }

    async setBackground(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;
                this.draw();
                resolve(img);
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    addButton(text, x, y, width = 100, height = 40, bgColor = '#4CAF50', onClick = null) {
        const button = {
            text,
            x,
            y,
            width,
            height,
            bgColor,
            onClick,
            isHovered: false,
        };
        this.buttons.push(button);
        return button;
    }

    removeButton(button) {
        const index = this.buttons.indexOf(button);
        if (index !== -1) {
            this.buttons.splice(index, 1);
            this.draw();
        }
    }

    // Helper to darken/lighten colors for hover effects
    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    draw() {
        // Repeat background if exists
        if (this.backgroundImage) {
            const bg = this.ctx.createPattern(this.backgroundImage, 'repeat');
            this.ctx.fillStyle = bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Coordinates are normalized to 1024x768, but maintain aspect ratio
        var ratio = this.canvas.width / 1024;
        this.ctx.save();
        this.ctx.scale(ratio, ratio);
        // TODO: This messes with coordinates though, so we need to fix them

        // Draw outlines first
        for (const outline of this.outlines) {
            this.ctx.strokeStyle = outline.color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.roundRect(
                outline.x,
                outline.y,
                outline.width,
                outline.height,
                outline.width / 15
            );
            this.ctx.stroke();
        }

        // Draw cards on top of outlines
        const sortedCards = [...this.cards].sort((a, b) => a.zIndex - b.zIndex);
        let needRefresh = false;
        for (const card of sortedCards) {
            const dragging = card === this.draggedCard;
            this.ctx.save();
            card.draw(this.ctx, dragging);
            this.ctx.restore();

            if (card.isAnimating()) {
                needRefresh = true;
            }
        }
        if (needRefresh) {
            window.requestAnimationFrame(() => this.draw());
        }

        // Draw buttons on top of everything
        for (const button of this.buttons) {
            this.ctx.save();

            // Draw button background
            let color = button.bgColor;
            if (button.isHovered) {
                color = this.adjustColor(button.bgColor, -20);
            }
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.roundRect(button.x, button.y, button.width, button.height, 5);
            this.ctx.fill();

            // Draw button text
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                button.text,
                button.x + button.width / 2,
                button.y + button.height / 2
            );

            this.ctx.restore();
        }
        this.ctx.restore();
    }
}

export default CardTable;
