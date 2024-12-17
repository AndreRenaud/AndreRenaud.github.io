import { PlayingCard, Suits, SuitColours } from './card.js';

export class FreecellGame {
    constructor(table) {
        this.table = table;
        this.stock = [];
        this.foundations = [[], [], [], []];
        this.freecells = [null, null, null, null];
        this.tableau = [[], [], [], [], [], [], [], []];
        this.table.onValidMove = this.checkValidMove.bind(this);
        this.table.onCardClick = this.handleClick.bind(this);
        this.foundationOutlines = [];
        this.freecellOutlines = [];
        this.tableauOutlines = [];
        this.game_seed = 0;

        this.stockX = 80;
        this.stockY = 60;

        this.newGameButton = table.addButton('New Game', 20, 500, 100, 40, '#abc123', () =>
            this.startNewGame()
        );
        this.restartButton = table.addButton('Restart', 140, 500, 100, 40, '#abc123', () =>
            this.restartGame()
        );
        this.exitButton = table.addButton('Exit', 260, 500, 100, 40, '#abc123', () =>
            window.location.href = '.'
        );
    }

    start(seed) {
        this.game_seed = seed;
        const prng = this.splitmix32(seed * 0xffffffff);
        // Create deck
        const deck = [];
        for (const suit of Object.values(Suits)) {
            for (let rank = 1; rank <= 13; rank++) {
                deck.push(new PlayingCard(suit, rank));
            }
        }

        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(prng() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        // Deal to tableau
        for (let i = 0; i < 8; i++) {
            // Each tableau gets an outline
            const coords = this.tableauCoords(i, 0);
            this.table.addOutline(coords.x, coords.y, 100, 'black');
            for (let j = 0; j < 7; j++) {
                if (deck.length === 0) break;
                const card = deck.pop();
                const coords = this.tableauCoords(i, j);
                card.move(coords.x, coords.y);
                card.flipped = false;
                card.draggable = true;
                this.tableau[i].push(card);
                this.table.addCard(card);
            }
        }

        // Setup freecell and foundation outlines
        for (let i = 0; i < 4; i++) {
            const freecellX = 80 + i * 120;
            const foundationX = 560 + i * 120;
            const y = this.stockY;

            // Add freecell outline
            this.freecellOutlines.push(this.table.addOutline(freecellX, y, 100, 'black'));

            // Add foundation outline
            this.foundationOutlines.push(this.table.addOutline(foundationX, y, 100, 'black'));
        }
    }

    tableauCoords(x, y) {
        return { x: this.stockX + x * 120, y: 220 + y * 20 };
    }

    checkValidMove(card, x, y) {
        if (card.flipped) {
            return false;
        }

        // Check freecells
        for (let i = 0; i < 4; i++) {
            const freecellX = 80 + i * 120;
            const freecellY = this.stockY;
            if (this.isNearPile(x, y, freecellX, freecellY)) {
                if (this.tryMoveToFreecell(card, i)) {
                    return true;
                }
            }
        }

        // Check foundation piles
        for (let i = 0; i < 4; i++) {
            const foundationX = 560 + i * 120;
            const foundationY = this.stockY;
            if (this.isNearPile(x, y, foundationX, foundationY)) {
                if (this.tryMoveToFoundation(card, i)) {
                    return true;
                }
            }
        }

        // Check tableau piles
        for (let i = 0; i < 8; i++) {
            const coords = this.tableauCoords(i, this.tableau[i].length - 1);
            if (this.isNearPile(x, y, coords.x, coords.y)) {
                if (this.tryMoveToTableau(card, i)) {
                    return true;
                }
            }
        }

        // If no valid move, return card to original position
        return false;
    }

    handleClick(card, x, y) {
        // If card is face-up and draggable, try moving it to a foundation
        if (!card.flipped && card.draggable) {
            // Try each foundation pile
            for (let i = 0; i < 4; i++) {
                if (this.tryMoveToFoundation(card, i)) {
                    break;
                }
            }
        }
    }

    isNearPile(x, y, pileX, pileY, threshold = 50) {
        // TODO: Support dynamic card sizes
        return x >= pileX && x <= pileX + 100 && y >= pileY && y <= pileY + 150;
    }

    tryMoveToFreecell(card, freecellIndex) {
        if (this.freecells[freecellIndex] === null) {
            this.removeCardFromCurrentPile(card);
            this.freecells[freecellIndex] = card;
            card.move(80 + freecellIndex * 120, this.stockY);
            card.draggable = true;
            this.table.moveCardToTop(card);
            return true;
        }
        return false;
    }

    tryMoveToFoundation(card, foundationIndex) {
        const foundation = this.foundations[foundationIndex];
        const topCard = foundation[foundation.length - 1];

        if (
            (!topCard && card.rank === 1) || // Empty foundation accepts only Ace
            (topCard && topCard.suit === card.suit && topCard.rank === card.rank - 1)
        ) {
            this.removeCardFromCurrentPile(card);
            foundation.push(card);
            card.move(560 + foundationIndex * 120, this.stockY);
            card.draggable = true;
            this.table.moveCardToTop(card);
            return true;
        }
        return false;
    }

    tryMoveToTableau(card, tableauIndex) {
        const tableau = this.tableau[tableauIndex];
        const topCard = tableau[tableau.length - 1];

        // Find source pile and index
        let sourcePile = null;
        let cardIndex = -1;
        for (const pile of this.tableau) {
            const index = pile.indexOf(card);
            if (index !== -1) {
                sourcePile = pile;
                cardIndex = index;
                break;
            }
        }

        if (
            (!topCard) || // Empty tableau accepts any card
            (topCard &&
                SuitColours[topCard.suit] !== SuitColours[card.suit] &&
                topCard.rank === card.rank + 1)
        ) {
            // Move the card and all cards on top of it
            this.table.moveCardToTop(card);
            if (sourcePile) {
                const cardsToMove = sourcePile.splice(cardIndex);
                tableau.push(...cardsToMove);

                // Update positions for all moved cards
                cardsToMove.forEach((c, i) => {
                    const coords = this.tableauCoords(
                        tableauIndex,
                        tableau.length - cardsToMove.length + i
                    );
                    c.move(coords.x, coords.y);
                    c.draggable = true;
                    this.table.moveCardToTop(c);
                });
            } else {
                // Single card from freecell or foundation
                this.removeCardFromCurrentPile(card);
                tableau.push(card);
                const coords = this.tableauCoords(tableauIndex, tableau.length - 1);
                card.move(coords.x, coords.y);
                card.draggable = true;
            }
            return true;
        }
        return false;
    }

    removeCardFromCurrentPile(card) {
        // Remove from tableau
        for (const pile of this.tableau) {
            const index = pile.indexOf(card);
            if (index !== -1) {
                pile.splice(index, 1);
                return;
            }
        }
        // Remove from foundations
        for (const pile of this.foundations) {
            const index = pile.indexOf(card);
            if (index !== -1) {
                pile.splice(index, 1);
                return;
            }
        }
        // Remove from freecells
        const freecellIndex = this.freecells.indexOf(card);
        if (freecellIndex !== -1) {
            this.freecells[freecellIndex] = null;
        }
    }

    // SplitMix32 PRNG
    // @return {function(): number} A function that returns a random number between 0 and 1
    splitmix32(a) {
        return function () {
            a |= 0;
            a = (a + 0x9e3779b9) | 0;
            let t = a ^ (a >>> 16);
            t = Math.imul(t, 0x21f0aaad);
            t = t ^ (t >>> 15);
            t = Math.imul(t, 0x735a2d97);
            return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
        };
    }

    restartGame() {
        // Clear existing game state
        this.stock = [];
        this.foundations = [[], [], [], []];
        this.freecells = [null, null, null, null];
        this.tableau = [[], [], [], [], [], [], [], []];
        this.table.cards = [];
        this.table.clearOutlines();

        // Start new game with same seed
        this.start(this.game_seed);
    }

    startNewGame() {
        // Clear existing game state
        this.stock = [];
        this.foundations = [[], [], [], []];
        this.freecells = [null, null, null, null];
        this.tableau = [[], [], [], [], [], [], [], []];
        this.table.cards = [];
        this.table.clearOutlines();

        // Start new game
        this.start(Math.random());
    }
}
