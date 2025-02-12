
class ChessGame {
    constructor() {
        this.board = this.createInitialBoard();
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.validMoves = [];
        this.capturedPieces = { white: [], black: [] };
        this.moveHistory = [];
        this.kings = { white: [7, 4], black: [0, 4] };
        this.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        };
        this.lastMove = null;
        this.isGameOver = false;
        this.enPassantTarget = null;
        this.setupBoard();
        this.updateStatus();
    }

    createInitialBoard() {
        return [
            ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
            ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
            ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
        ];
    }

    setupBoard() {
        const chessboard = document.getElementById('chessboard');
        chessboard.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                if (row === 7) {
                    const fileNotation = document.createElement('span');
                    fileNotation.className = 'notation file-notation';
                    fileNotation.textContent = String.fromCharCode(97 + col);
                    square.appendChild(fileNotation);
                }
                if (col === 0) {
                    const rankNotation = document.createElement('span');
                    rankNotation.className = 'notation rank-notation';
                    rankNotation.textContent = 8 - row;
                    square.appendChild(rankNotation);
                }

                if (this.board[row][col]) {
                    const piece = document.createElement('span');
                    piece.textContent = this.board[row][col];
                    piece.className = `piece ${this.isPieceWhite(this.board[row][col]) ? 'white-piece' : 'black-piece'}`;
                    square.appendChild(piece);
                }

                if (this.lastMove && 
                    ((row === this.lastMove.from[0] && col === this.lastMove.from[1]) ||
                     (row === this.lastMove.to[0] && col === this.lastMove.to[1]))) {
                    square.classList.add('last-move');
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                chessboard.appendChild(square);
            }
        }

        if (this.isInCheck(this.currentPlayer)) {
            const [kingRow, kingCol] = this.kings[this.currentPlayer];
            const kingSquare = document.querySelector(`[data-row="${kingRow}"][data-col="${kingCol}"]`);
            kingSquare.classList.add('check');
        }
    }

    isPieceWhite(piece) {
        return '♔♕♖♗♘♙'.includes(piece);
    }

    handleSquareClick(row, col) {
        if (this.isGameOver) return;

        const piece = this.board[row][col];
        this.clearHighlights();

        if (this.selectedPiece) {
            const [selectedRow, selectedCol] = this.selectedPiece;
            const isValidMove = this.validMoves.some(([r, c]) => r === row && c === col);
            
            if (isValidMove) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.selectedPiece = null;
                this.validMoves = [];
                return;
            }
            this.selectedPiece = null;
        }

        if (piece && ((this.currentPlayer === 'white' && this.isPieceWhite(piece)) ||
                    (this.currentPlayer === 'black' && !this.isPieceWhite(piece)))) {
            this.selectedPiece = [row, col];
            this.validMoves = this.getValidMoves(row, col);
            this.highlightSquares();
        }
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        let moves = [];

        switch (piece) {
            case '♙': case '♟': // Pawns
                moves = this.getPawnMoves(row, col);
                break;
            case '♖': case '♜': // Rooks
                moves = this.getRookMoves(row, col);
                break;
            case '♘': case '♞': // Knights
                moves = this.getKnightMoves(row, col);
                break;
            case '♗': case '♝': // Bishops
                moves = this.getBishopMoves(row, col);
                break;
            case '♕': case '♛': // Queens
                moves = [...this.getRookMoves(row, col), ...this.getBishopMoves(row, col)];
                break;
            case '♔': case '♚': // Kings
                moves = this.getKingMoves(row, col);
                break;
        }

        return moves.filter(([toRow, toCol]) => {
            const tempBoard = this.board.map(row => [...row]);
            tempBoard[toRow][toCol] = tempBoard[row][col];
            tempBoard[row][col] = null;

            const tempKings = { ...this.kings };
            if (piece === '♔' || piece === '♚') {
                tempKings[this.currentPlayer] = [toRow, toCol];
            }

            return !this.isSquareUnderAttack(
                tempKings[this.currentPlayer][0],
                tempKings[this.currentPlayer][1],
                this.currentPlayer,
                tempBoard
            );
        });
    }

    getPawnMoves(row, col) {
        const moves = [];
        const direction = this.isPieceWhite(this.board[row][col]) ? -1 : 1;
        const startRow = this.isPieceWhite(this.board[row][col]) ? 6 : 1;

        // Forward move
        if (row + direction >= 0 && row + direction < 8 && !this.board[row + direction][col]) {
            moves.push([row + direction, col]);
            // Double move from start
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }
        }

        // Captures
        for (const dcol of [-1, 1]) {
            if (col + dcol >= 0 && col + dcol < 8) {
                const target = this.board[row + direction][col + dcol];
                if (target && this.isPieceWhite(target) !== this.isPieceWhite(this.board[row][col])) {
                    moves.push([row + direction, col + dcol]);
                }
                // En passant
                if (this.enPassantTarget && 
                    row + direction === this.enPassantTarget[0] && 
                    col + dcol === this.enPassantTarget[1]) {
                    moves.push([row + direction, col + dcol]);
                }
            }
        }
        
        return moves;
    }

    getRookMoves(row, col) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const r = row + i * dr;
                const c = col + i * dc;
                if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
                if (!this.board[r][c]) {
                    moves.push([r, c]);
                } else {
                    if (this.isPieceWhite(this.board[r][c]) !== this.isPieceWhite(this.board[row][col])) {
                        moves.push([r, c]);
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getKnightMoves(row, col) {
        const moves = [];
        const directions = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

        for (const [dr, dc] of directions) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                if (!this.board[r][c] || this.isPieceWhite(this.board[r][c]) !== this.isPieceWhite(this.board[row][col])) {
                    moves.push([r, c]);
                }
            }
        }

        return moves;
    }

    getBishopMoves(row, col) {
        const moves = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const r = row + i * dr;
                const c = col + i * dc;
                if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
                if (!this.board[r][c]) {
                    moves.push([r, c]);
                } else {
                    if (this.isPieceWhite(this.board[r][c]) !== this.isPieceWhite(this.board[row][col])) {
                        moves.push([r, c]);
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getKingMoves(row, col) {
        const moves = [];
        const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

        for (const [dr, dc] of directions) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                if (!this.board[r][c] || this.isPieceWhite(this.board[r][c]) !== this.isPieceWhite(this.board[row][col])) {
                    moves.push([r, c]);
                }
            }
        }

        // Castling
        if (this.canCastleKingSide(this.currentPlayer)) {
            moves.push([row, col + 2]);
        }
        if (this.canCastleQueenSide(this.currentPlayer)) {
            moves.push([row, col - 2]);
        }

        return moves;
    }

    canCastleKingSide(player) {
        const row = player === 'white' ? 7 : 0;
        return this.castlingRights[player].kingSide &&
            !this.board[row][5] &&
            !this.board[row][6] &&
            !this.isSquareUnderAttack(row, 4, player) &&
            !this.isSquareUnderAttack(row, 5, player) &&
            !this.isSquareUnderAttack(row, 6, player);
    }

    canCastleQueenSide(player) {
        const row = player === 'white' ? 7 : 0;
        return this.castlingRights[player].queenSide &&
            !this.board[row][1] &&
            !this.board[row][2] &&
            !this.board[row][3] &&
            !this.isSquareUnderAttack(row, 4, player) &&
            !this.isSquareUnderAttack(row, 3, player) &&
            !this.isSquareUnderAttack(row, 2, player);
    }

    isSquareUnderAttack(row, col, player) {
        const opponentColor = player === 'white' ? 'black' : 'white';
        
        // Check for pawn attacks
        const pawnDirection = player === 'white' ? -1 : 1;
        const pawnAttacks = [[-1, 1], [-1, -1]];
        
        for (const [dr, dc] of pawnAttacks) {
            const r = row + (dr * (player === 'white' ? 1 : -1));
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const piece = this.board[r][c];
                if (piece === (player === 'white' ? '♟' : '♙')) {
                    return true;
                }
            }
        }

        // Check for knight attacks
        const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of knightMoves) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const piece = this.board[r][c];
                if (piece === (player === 'white' ? '♞' : '♘')) {
                    return true;
                }
            }
        }

        // Check for king attacks
        const kingMoves = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        for (const [dr, dc] of kingMoves) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const piece = this.board[r][c];
                if (piece === (player === 'white' ? '♚' : '♔')) {
                    return true;
                }
            }
        }

        // Check for sliding pieces (queen, rook, bishop)
        const directions = {
            straight: [[-1, 0], [1, 0], [0, -1], [0, 1]],
            diagonal: [[-1, -1], [-1, 1], [1, -1], [1, 1]]
        };

        // Check straight lines (rook and queen)
        for (const [dr, dc] of directions.straight) {
            for (let i = 1; i < 8; i++) {
                const r = row + i * dr;
                const c = col + i * dc;
                if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
                const piece = this.board[r][c];
                if (piece) {
                    if ((player === 'white' && (piece === '♜' || piece === '♛')) ||
                        (player === 'black' && (piece === '♖' || piece === '♕'))) {
                        return true;
                    }
                    break;
                }
            }
        }

        // Check diagonals (bishop and queen)
        for (const [dr, dc] of directions.diagonal) {
            for (let i = 1; i < 8; i++) {
                const r = row + i * dr;
                const c = col + i * dc;
                if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
                const piece = this.board[r][c];
                if (piece) {
                    if ((player === 'white' && (piece === '♝' || piece === '♛')) ||
                        (player === 'black' && (piece === '♗' || piece === '♕'))) {
                        return true;
                    }
                    break;
                }
            }
        }

        return false;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const move = {
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: this.board[fromRow][fromCol],
            capturedPiece: this.board[toRow][toCol]
        };

        // Handle castling
        if ((this.board[fromRow][fromCol] === '♔' || this.board[fromRow][fromCol] === '♚') &&
            Math.abs(toCol - fromCol) === 2) {
            // Kingside castling
            if (toCol > fromCol) {
                this.board[fromRow][toCol - 1] = this.board[fromRow][7];
                this.board[fromRow][7] = null;
            }
            // Queenside castling
            else {
                this.board[fromRow][toCol + 1] = this.board[fromRow][0];
                this.board[fromRow][0] = null;
            }
        }

        // Handle en passant capture
        if ((this.board[fromRow][fromCol] === '♙' || this.board[fromRow][fromCol] === '♟') &&
            fromCol !== toCol && !this.board[toRow][toCol]) {
            const captureRow = fromRow;
            move.capturedPiece = this.board[captureRow][toCol];
            this.board[captureRow][toCol] = null;
        }

        // Make the move
        this.board[toRow][toCol] = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;

        // Update king position
        if (this.board[toRow][toCol] === '♔' || this.board[toRow][toCol] === '♚') {
            this.kings[this.currentPlayer] = [toRow, toCol];
        }

        // Update castling rights
        if (this.board[toRow][toCol] === '♔') {
            this.castlingRights.white = { kingSide: false, queenSide: false };
        } else if (this.board[toRow][toCol] === '♚') {
            this.castlingRights.black = { kingSide: false, queenSide: false };
        } else if (fromRow === 7 && fromCol === 0) {
            this.castlingRights.white.queenSide = false;
        } else if (fromRow === 7 && fromCol === 7) {
            this.castlingRights.white.kingSide = false;
        } else if (fromRow === 0 && fromCol === 0) {
            this.castlingRights.black.queenSide = false;
        } else if (fromRow === 0 && fromCol === 7) {
            this.castlingRights.black.kingSide = false;
        }

        // Handle pawn promotion
        if ((this.board[toRow][toCol] === '♙' && toRow === 0) ||
            (this.board[toRow][toCol] === '♟' && toRow === 7)) {
            this.showPromotionModal(toRow, toCol);
        }

        // Update en passant target
        if ((this.board[toRow][toCol] === '♙' && fromRow === 6 && toRow === 4) ||
            (this.board[toRow][toCol] === '♟' && fromRow === 1 && toRow === 3)) {
            this.enPassantTarget = [toRow, toCol];
        } else {
            this.enPassantTarget = null;
        }

        // Add captured piece to the collection
        if (move.capturedPiece) {
            const capturedColor = this.isPieceWhite(move.capturedPiece) ? 'white' : 'black';
            this.capturedPieces[capturedColor].push(move.capturedPiece);
            this.updateCapturedPieces();
        }

        // Add move to history
        this.moveHistory.push(move);
        this.lastMove = move;

        // Check for checkmate or stalemate
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        if (this.isInCheck(this.currentPlayer)) {
            if (this.isCheckmate(this.currentPlayer)) {
                this.isGameOver = true;
                this.showGameOverModal(`Checkmate! ${this.currentPlayer === 'white' ? 'Black' : 'White'} wins!`);
            }
        } else if (this.isStalemate(this.currentPlayer)) {
            this.isGameOver = true;
            this.showGameOverModal('Stalemate! The game is a draw.');
        }

        this.updateStatus();
        this.setupBoard();
    }

    showPromotionModal(row, col) {
        const promotionModal = document.getElementById('promotionModal');
        promotionModal.innerHTML = '';
        const pieces = this.currentPlayer === 'white' ? ['♕', '♖', '♗', '♘'] : ['♛', '♜', '♝', '♞'];

        pieces.forEach(piece => {
            const promotionPiece = document.createElement('span');
            promotionPiece.className = `promotion-piece ${this.isPieceWhite(piece) ? 'white-piece' : 'black-piece'}`;
            promotionPiece.textContent = piece;
            promotionPiece.addEventListener('click', () => {
                this.board[row][col] = piece;
                promotionModal.style.display = 'none';
                this.setupBoard();
            });
            promotionModal.appendChild(promotionPiece);
        });

        promotionModal.style.display = 'block';
    }

    showGameOverModal(message) {
        const gameOverModal = document.getElementById('gameOverModal');
        const gameOverMessage = document.getElementById('gameOverMessage');
        gameOverMessage.textContent = message;
        gameOverModal.style.display = 'block';
    }

    isCheckmate(player) {
        if (!this.isInCheck(player)) return false;

        // Check if any piece can make a legal move
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && this.isPieceWhite(piece) === (player === 'white')) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    isStalemate(player) {
        if (this.isInCheck(player)) return false;

        // Check if any piece can make a legal move
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && this.isPieceWhite(piece) === (player === 'white')) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    isInCheck(player) {
        const [kingRow, kingCol] = this.kings[player];
        return this.isSquareUnderAttack(kingRow, kingCol, player);
    }

    highlightSquares() {
        if (this.selectedPiece) {
            const [row, col] = this.selectedPiece;
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            square.classList.add('selected');
        }

        this.validMoves.forEach(([row, col]) => {
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            square.classList.add('valid-move');
        });
    }

    clearHighlights() {
        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            square.classList.remove('selected', 'valid-move');
        });
    }

    updateStatus() {
        const status = document.getElementById('status');
        if (this.isGameOver) {
            return;
        }
        if (this.isInCheck(this.currentPlayer)) {
            status.textContent = `${this.currentPlayer === 'white' ? 'White' : 'Black'}'s turn - CHECK!`;
        } else {
            status.textContent = `${this.currentPlayer === 'white' ? 'White' : 'Black'}'s turn`;
        }
    }

    updateCapturedPieces() {
        const capturedWhite = document.getElementById('capturedWhite');
        const capturedBlack = document.getElementById('capturedBlack');
        
        capturedWhite.innerHTML = this.capturedPieces.white
            .map(piece => `<span class="piece white-piece">${piece}</span>`)
            .join('');
        capturedBlack.innerHTML = this.capturedPieces.black
            .map(piece => `<span class="piece black-piece">${piece}</span>`)
            .join('');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new ChessGame();
});
