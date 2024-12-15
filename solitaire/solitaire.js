import { PlayingCard, Suits, SuitColours } from './card.js';

export class SolitaireGame {
    constructor(table) {
        this.table = table;
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];
        this.table.onValidMove = this.checkValidMove.bind(this);
        this.table.onCardClick = this.handleClick.bind(this);
        this.foundationOutlines = [];
        this.stockOutline = null; // Add property for stock outline
        this.turn_count = 1;
        this.newGameButton = table.addButton('New Game', 20, 500, 100, 40, '#abc123', () =>
            this.startNewGame()
        );
        this.restartButton = table.addButton('Restart', 140, 500, 100, 40, '#abc123', () =>
            this.restartGame()
        );
        this.game_seed = 0;

        this.stockX = 80;
        this.stockY = 60;
    }

    restartGame() {
        // Clear existing game state
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];
        this.table.cards = [];
        this.table.clearOutlines();

        // Start new game with same seed
        this.start(this.turn_count, this.game_seed);
    }

    startNewGame() {
        // Clear existing game state
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];
        this.table.cards = [];
        this.table.clearOutlines();

        // Start new game
        this.start(this.turn_count, Math.random());
    }

    tableauCoords(x, y) {
        return { x: this.stockX + x * 120, y: 220 + y * 20 };
    }

    flipLastCard(pileIndex) {
        if (pileIndex < 0 || pileIndex >= this.tableau.length) {
            return;
        }
        const pile = this.tableau[pileIndex];

        if (pile.length > 0) {
            pile[pile.length - 1].flipped = false;
            pile[pile.length - 1].draggable = true;
        }
    }

    checkValidMove(card, x, y) {
        if (card.flipped) {
            return false;
        }
        // Which tableau did this card come from originally?
        // TODO: This is super inefficient
        var originalTableauIndex = -1;
        for (const pile of this.tableau) {
            const index = pile.indexOf(card);
            if (index !== -1) {
                originalTableauIndex = this.tableau.indexOf(pile);
                break;
            }
        }

        // Check foundation piles
        for (let i = 0; i < 4; i++) {
            const foundationX = 400 + i * 120;
            const foundationY = this.stockY;
            if (this.isNearPile(x, y, foundationX, foundationY)) {
                if (this.tryMoveToFoundation(card, i, originalTableauIndex)) {
                    return true;
                }
            }
        }

        // Check tableau piles
        for (let i = 0; i < 7; i++) {
            var coords = this.tableauCoords(i, this.tableau[i].length - 1);
            if (this.isNearPile(x, y, coords.x, coords.y)) {
                if (this.tryMoveToTableau(card, i)) {
                    this.flipLastCard(originalTableauIndex);
                    return true;
                }
            }
        }

        // If no valid move, return card to original position
        return false;
    }

    handleClick(card, x, y) {
        // Check if clicked card is from stock pile
        if (this.stock.includes(card) && card === this.stock[this.stock.length - 1]) {
            // Turn over the top `turn_count` cards
            for (let i = 0; i < this.turn_count && this.stock.length > 0; i++) {
                // Move top card from stock to waste
                const topCard = this.stock.pop();
                topCard.flipped = false;
                topCard.draggable = false;
                topCard.move(220 + i * 20, 50); // Position to right of stock pile
                this.table.moveCardToTop(topCard);
                this.waste.push(topCard);
            }
            this.fixupPiles();
            this.table.draw();
            return;
        }

        // If card is face-up and draggable, try moving it to a foundation
        if (!card.flipped && card.draggable) {
            // Try each foundation pile
            let tableauIndex = -1;
            // Get original tableau index for flipping next card if it's from the tableau not the stack
            for (let j = 0; j < this.tableau.length; j++) {
                if (this.tableau[j].includes(card)) {
                    tableauIndex = j;
                    break;
                }
            }
            for (let i = 0; i < 4; i++) {
                if (this.tryMoveToFoundation(card, i, tableauIndex)) {
                    break;
                }
            }
        }
    }

    isNearPile(x, y, pileX, pileY, threshold = 50) {
        // TODO: Support dynamic card sizes
        return x >= pileX && x <= pileX + 100 && y >= pileY && y <= pileY + 150;
    }

    tryMoveToFoundation(card, foundationIndex, tableauIndex = -1) {
        const foundation = this.foundations[foundationIndex];
        const topCard = foundation[foundation.length - 1];

        if (
            (!topCard && card.rank === 1) || // Empty foundation accepts only Ace
            (topCard && topCard.suit === card.suit && topCard.rank === card.rank - 1)
        ) {
            this.removeCardFromCurrentPile(card);
            foundation.push(card);
            card.move(400 + foundationIndex * 120, this.stockY);
            card.draggable = true;
            this.table.moveCardToTop(card);

            if (tableauIndex !== -1) {
                this.flipLastCard(tableauIndex);
            }
            // Check for win after successful foundation move
            if (this.checkWin()) {
                console.log('won with', card);
            }
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
            (!topCard && card.rank === 13) || // Empty tableau accepts only King
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
                // Single card from waste or foundation
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

    // fixupPiles makes sure the layout & draggability of all piles are correct
    fixupPiles() {
        // Make sure the top 'turn_count' cards are positioned properly
        const turns = Math.min(this.turn_count, this.waste.length);
        for (let i = 0; i < turns; i++) {
            const card = this.waste[this.waste.length - i - 1];
            card.flipped = false;
            card.move(220 + (turns - i - 1) * 20, this.stockY); // Position to right of stock pile
        }
        // Make sure the top card is draggable, and none of the others are
        for (let i = 0; i < this.waste.length; i++) {
            this.waste[i].draggable = i == this.waste.length - 1;
        }
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
        // Remove from waste
        const wasteIndex = this.waste.indexOf(card);
        if (wasteIndex !== -1) {
            this.waste.splice(wasteIndex, 1);
            this.fixupPiles();
        }
    }

    resetStock() {
        // Move all waste cards back to stock
        while (this.waste.length > 0) {
            const card = this.waste.pop();
            card.flipped = true;
            card.draggable = true;
            card.move(this.stockX, this.stockY);
            this.stock.push(card);
            this.table.moveCardToTop(card);
        }
        this.table.draw();
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

    // @param {seed} number from 0-1 to set the random state of the game
    start(turn_count, seed) {
        this.game_seed = seed;
        const prng = this.splitmix32(seed * 0xffffffff);
        // Create deck
        this.turn_count = turn_count;
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
        for (let i = 0; i < 7; i++) {
            // Each tableau gets an outline
            const coords = this.tableauCoords(i, 0);

            this.table.addOutline(coords.x, coords.y, 100, 'black');
            for (let j = i; j < 7; j++) {
                const card = deck.pop();
                const coords = this.tableauCoords(j, i);
                card.move(coords.x, coords.y);
                card.flipped = i !== j;
                card.draggable = i === j;
                this.tableau[j].push(card);
                this.table.addCard(card);
            }
        }

        // Setup stock pile outline and cards
        this.stockOutline = this.table.addOutline(
            this.stockX,
            this.stockY,
            100,
            'black',
            (outline, x, y) => {
                if (this.stock.length === 0 && this.waste.length > 0) {
                    this.resetStock();
                }
            }
        );

        while (deck.length > 0) {
            const card = deck.pop();
            card.move(this.stockX, this.stockY);
            card.flipped = true;
            this.stock.push(card);
            this.table.addCard(card);
        }

        // Setup foundation areas with outlines
        for (let i = 0; i < 4; i++) {
            const foundationX = 400 + i * 120;
            const foundationY = this.stockY;

            // Add visible outline
            const outline = this.table.addOutline(foundationX, foundationY, 100, 'black');
            this.foundationOutlines.push(outline);

            // Add invisible placeholder card (optional, you may remove this)
            const placeholder = new PlayingCard(Object.values(Suits)[i], 'A');
            placeholder.move(foundationX, foundationY);
            placeholder.visible = false;
            this.table.addCard(placeholder);
        }
    }

    checkWin() {
        // Check if all foundation piles have 13 cards
        const won = this.foundations.every(
            (foundation) => foundation.length === 13 && foundation[12].rank === 13 // Top card is King
        );
        if (!won) {
            return false;
        }
        // Make all the cards not-flipped, not draggable, and throw them off the screen to a random place
        for (const pile of this.foundations) {
            pile.forEach((c) => {
                c.flipped = false;
                c.draggable = false;
                let x = this.table.width() + Math.random() * this.table.width();
                let y = this.table.height() + Math.random() * this.table.height();
                if (Math.random() < 0.5) {
                    x = -x;
                }
                if (Math.random() < 0.5) {
                    y = -y;
                }
                c.move(x, y, c.zIndex, 5000);
            });
        }
        return true;
    }
}
