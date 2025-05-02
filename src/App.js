import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [gameState, setGameState] = useState({
    board: initializeBoard(),
    currentPlayer: 1,
    gameOver: false,
    winner: null,
    scores: { player1: 0, player2: 0 },
    lastMoveMerged: false,
    isPaused: false,
    gameTime: 0, // Total game time in seconds
    lastUpdateTime: Date.now() // Timestamp of last update
  });
 
  const timerRef = useRef(null);

  // Initialize the game board
  function initializeBoard() {
    const board = Array(4).fill().map(() => Array(4).fill(0));
    addRandomTile(board);
    addRandomTile(board);
    return board;
  }

  function addRandomTile(board) {
    const emptyCells = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (board[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }

    if (emptyCells.length > 0) {
      const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      board[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  function moveTiles(direction) {
    if (gameState.gameOver || gameState.isPaused) return;

    const board = [...gameState.board.map(row => [...row])];
    let moved = false;
    let merged = false;
    let scoreIncrease = 0;

    // Process movement based on direction
    if (direction === 'up' || direction === 'down') {
      for (let col = 0; col < 4; col++) {
        const column = [];
        for (let row = 0; row < 4; row++) {
          if (board[row][col] !== 0) column.push(board[row][col]);
        }

        if (direction === 'up') {
          for (let i = 0; i < column.length - 1; i++) {
            if (column[i] === column[i + 1]) {
              column[i] *= 2;
              scoreIncrease += column[i];
              column.splice(i + 1, 1);
              merged = true;
            }
          }
          while (column.length < 4) column.push(0);
        } else { // down
          for (let i = column.length - 1; i > 0; i--) {
            if (column[i] === column[i - 1]) {
              column[i] *= 2;
              scoreIncrease += column[i];
              column.splice(i - 1, 1);
              merged = true;
              i--;
            }
          }
          while (column.length < 4) column.unshift(0);
        }

        for (let row = 0; row < 4; row++) {
          if (board[row][col] !== column[row]) moved = true;
          board[row][col] = column[row];
        }
      }
    } else { // left or right
      for (let row = 0; row < 4; row++) {
        const line = board[row].filter(val => val !== 0);

        if (direction === 'left') {
          for (let i = 0; i < line.length - 1; i++) {
            if (line[i] === line[i + 1]) {
              line[i] *= 2;
              scoreIncrease += line[i];
              line.splice(i + 1, 1);
              merged = true;
            }
          }
          while (line.length < 4) line.push(0);
        } else { // right
          for (let i = line.length - 1; i > 0; i--) {
            if (line[i] === line[i - 1]) {
              line[i] *= 2;
              scoreIncrease += line[i];
              line.splice(i - 1, 1);
              merged = true;
              i--;
            }
          }
          while (line.length < 4) line.unshift(0);
        }

        if (JSON.stringify(board[row]) !== JSON.stringify(line)) moved = true;
        board[row] = [...line];
      }
    }

    if (moved) {
      addRandomTile(board);
      const newScores = {...gameState.scores};
      if (gameState.currentPlayer === 1) {
        newScores.player1 += scoreIncrease;
      } else {
        newScores.player2 += scoreIncrease;
      }

      const gameOver = isGameOver(board);
      let winner = null;
      if (gameOver) {
        winner = newScores.player1 > newScores.player2 ? 1 : 
                newScores.player1 < newScores.player2 ? 2 : 0;
      }

      setGameState(prev => ({
        ...prev,
        board: board,
        currentPlayer: merged ? prev.currentPlayer : prev.currentPlayer === 1 ? 2 : 1,
        scores: newScores,
        gameOver,
        winner,
        lastMoveMerged: merged
      }));
    }
  }

  function isGameOver(board) {
    // Check if there are any empty cells
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (board[i][j] === 0) return false;
      }
    }

    // Check if there are any possible merges
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (j < 3 && board[i][j] === board[i][j + 1]) return false;
        if (i < 3 && board[i][j] === board[i + 1][j]) return false;
      }
    }

    return true;
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState.gameOver || gameState.isPaused) return;
      
      switch (e.key) {
        case 'ArrowUp':
          moveTiles('up');
          break;
        case 'ArrowDown':
          moveTiles('down');
          break;
        case 'ArrowLeft':
          moveTiles('left');
          break;
        case 'ArrowRight':
          moveTiles('right');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Start or resume the game timer
  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setGameState(prev => ({
      ...prev,
      lastUpdateTime: Date.now(),
      isPaused: false
    }));

    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.isPaused) return prev;
        
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - prev.lastUpdateTime) / 1000);
        
        return {
          ...prev,
          gameTime: prev.gameTime + elapsedSeconds,
          lastUpdateTime: now
        };
      });
    }, 1000);
  }

  // Pause the game timer
  function pauseTimer() {
    clearInterval(timerRef.current);
    setGameState(prev => ({
      ...prev,
      isPaused: true
    }));
  }

  function togglePause() {
    if (gameState.isPaused) {
      startTimer();
    } else {
      pauseTimer();
    }
  }

  function resetGame() {
    clearInterval(timerRef.current);
    setGameState({
      board: initializeBoard(),
      currentPlayer: 1,
      gameOver: false,
      winner: null,
      scores: { player1: 0, player2: 0 },
      lastMoveMerged: false,
      isPaused: false,
      gameTime: 0,
      lastUpdateTime: Date.now()
    });
    startTimer();
  }

  // Format time display
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Initialize timer on component mount
  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="app">
      <div className="game-header">
        <p className="rules">Same player continues if tiles merge!</p>
        <div className="game-timer">
          <span>Game Time: {formatTime(gameState.gameTime)}</span>
          <button onClick={togglePause} className="pause-button">
            {gameState.isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>


      <div className="game-container">
        <div className="player-info">
          <div className={`player-tag ${gameState.currentPlayer === 1 ? 'active' : ''}`}>
            <h2>Player 1</h2>
            <p>Score: {gameState.scores.player1}</p>
          </div>
          
          <Board board={gameState.board} />
          
          <div className={`player-tag ${gameState.currentPlayer === 2 ? 'active' : ''}`}>
            <h2>Player 2</h2>
            <p>Score: {gameState.scores.player2}</p>
          </div>
        </div>
        
        <div className="game-info">
          <p>Current Turn: Player {gameState.currentPlayer}</p>
          {gameState.lastMoveMerged && <p className="bonus-message">Bonus move!</p>}
          
          {gameState.gameOver && (
            <div className="game-over">
              <h3>Game Over!</h3>
              {gameState.winner === 0 ? (
                <p>It's a tie!</p>
              ) : (
                <p>Player {gameState.winner} wins!</p>
              )}
              <button onClick={resetGame}>Play Again</button>
            </div>
          )}
          
          <div className="controls">
            <p>Controls:</p>
            <p>Arrow Keys to move tiles</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Board({ board }) {
  return (
    <div className="board">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((cell, cellIndex) => (
            <div 
              key={cellIndex} 
              className={`cell cell-${cell || 'empty'}`}
            >
              {cell !== 0 ? cell : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default App;