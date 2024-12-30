// card.js

const Suits = Object.freeze({
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
    SPADES: '♠',
});

const SuitColours = {
    '♥': 'red',
    '♦': 'red',
    '♣': 'black',
    '♠': 'black',
};

const RankSymbols = {
    1: 'A',
    11: 'J',
    12: 'Q',
    13: 'K',
};

// Locations of the center of each symbol on a card
// Specified as ratios of the card width/height, with 0,0 being the center
const SymbolPositions = {
    1: [[0, 0]],
    2: [
        [0, -0.3],
        [0, 0.3],
    ],
    3: [
        [0, -0.3],
        [0, 0],
        [0, 0.3],
    ],
    4: [
        [-0.2, -0.3],
        [0.2, -0.3],
        [-0.2, 0.3],
        [0.2, 0.3],
    ],
    5: [
        [-0.2, -0.3],
        [0.2, -0.3],
        [-0.2, 0.3],
        [0.2, 0.3],
        [0, 0],
    ],
    6: [
        [-0.2, -0.3],
        [-0.2, 0],
        [-0.2, 0.3],
        [0.2, -0.3],
        [0.2, 0],
        [0.2, 0.3],
    ],
    7: [
        [-0.2, -0.3],
        [-0.2, 0],
        [-0.2, 0.3],
        [0.2, -0.3],
        [0.2, 0],
        [0.2, 0.3],
        [0, -0.15],
    ],
    8: [
        [-0.2, -0.3],
        [-0.2, 0],
        [-0.2, 0.3],
        [0.2, -0.3],
        [0.2, 0],
        [0.2, 0.3],
        [0, -0.15],
        [0, 0.15],
    ],
    9: [
        [-0.2, -0.3],
        [-0.2, -0.1],
        [-0.2, 0.1],
        [-0.2, 0.3],
        [0.2, -0.3],
        [0.2, -0.1],
        [0.2, 0.1],
        [0.2, 0.3],
        [0, 0],
    ],
    10: [
        [-0.2, -0.3],
        [-0.2, -0.1],
        [-0.2, 0.1],
        [-0.2, 0.3],
        [0.2, -0.3],
        [0.2, -0.1],
        [0.2, 0.1],
        [0.2, 0.3],
        [0, -0.2],
        [0, 0.2],
    ],
};

class PlayingCard {
    static backgroundImages = new Map();
    static faceImages = new Map();
    static renderedImages = new Map(); // Cache for rendered images

    static loadImage(src) {
        if (!this.backgroundImages.has(src)) {
            this.backgroundImages.set(
                src,
                new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = src;
                })
            );
        }
        return this.backgroundImages.get(src);
    }

    static loadFaceImage(rank, suit) {
        const src = `images/${rank.toLowerCase()}-${suit}.png`;
        if (!this.faceImages.has(src)) {
            this.faceImages.set(
                src,
                new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = src;
                })
            );
        }
        return this.faceImages.get(src);
    }

    constructor(suit, rank, width = 100, background = 'images/card-background-1.png') {
        if (background) {
            // Start loading the background image
            PlayingCard.loadImage(background)
                .then((img) => (this.backgroundImage = img))
                .catch((err) => console.warn('Failed to load card background:', err));
        }

        switch (rank) {
            case 'A':
                rank = 1;
                break;
            case 'J':
                rank = 11;
                break;
            case 'Q':
                rank = 12;
                break;
            case 'K':
                rank = 13;
                break;
        }
        if (rank < 1) {
            rank = 1;
        }
        if (rank > 13) {
            rank = 13;
        }
        this.suit = suit;
        this.rank = rank;

        // Load face card image if needed
        if (rank >= 11 && rank <= 13) {
            const rankName = RankSymbols[rank];
            const suitIndex = Object.values(Suits).indexOf(suit);
            PlayingCard.loadFaceImage(rankName, suitIndex)
                .then((img) => (this.faceImage = img))
                .catch((err) => console.warn('Failed to load face card image:', err));
        }

        this.faceImage = null;

        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.targetDuration = 0;
        this.moveStart = Date.now();

        this.width = width;

        this.visible = true;

        this.flipped = false;

        this.zIndex = 0;
        this.preDragZIndex = 0; // zIndex before it started dragging - so we can restore it

        this.draggable = true;

        this.background = background;
        this.backgroundImage = null;
    }

    move(x, y, z = this.zIndex, duration = 200) {
        this.moveStart = Date.now();
        this.zIndex = z;
        this.targetDuration = duration;
        if (duration <= 0) {
            this.x = x;
            this.y = y;
            this.targetX = x;
            this.targetY = y;
            this.zIndex = z;
        } else {
            this.targetX = x;
            this.targetY = y;
        }
    }

    contains(x, y) {
        return (
            this.visible &&
            x >= this.x &&
            x <= this.x + this.width &&
            y >= this.y &&
            y <= this.y + this.height()
        );
    }

    height() {
        // They're typically 88x63, which is about 1.4 times wider than tall
        return this.width * 1.4;
    }

    isAnimating() {
        return this.targetX != this.x || this.targetY != this.y;
    }

    draw(ctx, dragging = false) {
        if (this.targetX != this.x || this.targetY != this.y) {
            const elapsed = Date.now() - this.moveStart;
            if (elapsed < this.targetDuration) {
                const progress = elapsed / this.targetDuration;
                this.x = this.x + (this.targetX - this.x) * progress;
                this.y = this.y + (this.targetY - this.y) * progress;
            } else {
                this.x = this.targetX;
                this.y = this.targetY;
            }
        }

        if (!this.visible) {
            return;
        }

        const cacheKey = `${this.suit}-${this.rank}-${this.width}`;
        if (!PlayingCard.renderedImages.has(cacheKey)) {
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = this.width;
            offscreenCanvas.height = this.height();
            const offscreenCtx = offscreenCanvas.getContext('2d');

            // Draw card border
            offscreenCtx.strokeStyle = 'black';
            offscreenCtx.fillStyle = 'white';
            offscreenCtx.strokeWidth = 2;
            offscreenCtx.beginPath();
            offscreenCtx.roundRect(0, 0, this.width, this.height(), this.width / 15);
            offscreenCtx.stroke();
            offscreenCtx.fill();
            var symbol = RankSymbols[this.rank] || this.rank;
            const xoffset = this.width * 0.1;
            const yoffset = xoffset * 1.5;
            var symbolWidth = this.width * 0.2;
            offscreenCtx.textAlign = 'center';
            offscreenCtx.textBaseline = 'middle';

            // Draw card rank and suit
            offscreenCtx.fillStyle = SuitColours[this.suit];
            offscreenCtx.font = `${symbolWidth}px Arial`;
            offscreenCtx.fillText(symbol, xoffset, yoffset);
            offscreenCtx.font = `${symbolWidth}px Arial`;
            offscreenCtx.fillText(this.suit, xoffset, yoffset * 2);

            // Draw card rank and suit upside down
            offscreenCtx.save();
            offscreenCtx.translate(this.width, this.height());
            offscreenCtx.rotate(Math.PI);
            offscreenCtx.fillText(symbol, xoffset, yoffset);
            offscreenCtx.fillText(this.suit, xoffset, yoffset * 2);
            offscreenCtx.restore();

            // Draw face card image or symbols
            if (this.rank >= 11 && this.rank <= 13 && this.faceImage) {
                // Draw face card image in center
                const padding = this.width * 0.1;
                const imageWidth = this.width - padding * 2;
                const imageHeight = this.height() - padding * 2;
                offscreenCtx.drawImage(this.faceImage, padding, padding, imageWidth, imageHeight);
            } else {
                // Draw regular symbols for number cards
                if (this.rank == 1) {
                    // Ace has a bigger symbol
                    symbolWidth = this.width * 0.6;
                    offscreenCtx.font = `${symbolWidth}px Arial`;
                } else {
                    symbolWidth = this.width * 0.35;
                    offscreenCtx.font = `${symbolWidth}px Arial`;
                }
                var positions = SymbolPositions[this.rank];
                if (positions) {
                    for (const pos of positions) {
                        offscreenCtx.save();
                        const xoffset = pos[0] * this.width + this.width / 2;
                        const yoffset = pos[1] * this.height() + this.height() / 2;
                        offscreenCtx.translate(xoffset, yoffset);
                        // Symbols below the middle should be upside down
                        if (pos[1] > 0) {
                            offscreenCtx.rotate(Math.PI);
                        }
                        offscreenCtx.fillText(this.suit, 0, 0);
                        offscreenCtx.restore();
                    }
                }
            }

            PlayingCard.renderedImages.set(cacheKey, offscreenCanvas);
        }

        const cachedImage = PlayingCard.renderedImages.get(cacheKey);

        // Set semi transparent & pop up if dragging
        if (dragging) {
            const scale = 1.2;
            ctx.scale(scale, scale);
            // Adjust the xOffset so that the cards don't get moved by the scaling
            const xOffset = -this.x + this.x / scale - (this.width * (scale - 1)) / 2;
            const yOffset = -this.y + this.y / scale - (this.height() * (scale - 1)) / 2;
            ctx.translate(xOffset, yOffset);
            ctx.globalAlpha = 0.8;
        } else {
            ctx.globalAlpha = 1;
            // Add drop shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.roundRect(this.x + 5, this.y + 5, this.width, this.height(), this.width / 15);
            ctx.fill();
        }

        if (this.flipped) {
            // Draw card back with image or fallback color
            if (this.backgroundImage) {
                // TODO: Clip rounded corners
                ctx.drawImage(this.backgroundImage, this.x, this.y, this.width, this.height());
            } else {
                ctx.fillStyle = 'blue';
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height(), this.width / 15);
                ctx.fill();
            }
        } else {
            ctx.drawImage(cachedImage, this.x, this.y, this.width, this.height());
        }
    }
}

export { PlayingCard, Suits, SuitColours };
