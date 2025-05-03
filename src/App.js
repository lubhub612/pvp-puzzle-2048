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
    lastUpdateTime: Date.now(), // Timestamp of last update
    playerTimes: { player1: 0, player2: 0 },
    recentAchievement: null, // Track the most recent achievement
    hasWon: false, // New state to track if someone reached 2048
  });
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('2048-best-score');
    return saved ? parseInt(saved) : 0;
  });
  const [animations, setAnimations] = useState({
    movingTiles: [],
    mergingTiles: []
  });
   const [lastDirection, setLastDirection] = useState(null);
   const [directionHighlight, setDirectionHighlight] = useState(false);
   const [scoreUpdated, setScoreUpdated] = useState(false);
   const [newBest, setNewBest] = useState(false); 
   const [streaks, setStreaks] = useState(() => {
    const saved = localStorage.getItem('2048-streaks');
    return saved ? JSON.parse(saved) : {
      128: 0,
      256: 0,
      512: 0,
      1024: 0,
      2048: 0
    };
  });

  const [sessionStreaks, setSessionStreaks] = useState({
    128: 0,
    256: 0,
    512: 0,
    1024: 0,
    2048: 0
  });

  const [achievements, setAchievements] = useState([]); 

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

    setLastDirection(direction);
    setDirectionHighlight(true);
    setTimeout(() => setDirectionHighlight(false), 200);

    const board = [...gameState.board.map(row => [...row])];
    let moved = false;
    let merged = false;
    let scoreIncrease = 0;
    let reached2048 = false; 
    let newAchievement = null;
    const movingTiles = [];
    const mergingTiles = [];

    // Process movement based on direction
    if (direction === 'up' || direction === 'down') {
      for (let col = 0; col < 4; col++) {
        const column = [];
        const originalPositions = [];
        for (let row = 0; row < 4; row++) {
          if (board[row][col] !== 0) {
            column.push(board[row][col]);
            originalPositions.push(row); 
          }
        }

        if (direction === 'up') {
          for (let i = 0; i < column.length - 1; i++) {
            if (column[i] === column[i + 1]) {
              // Track merge animation
              mergingTiles.push({
                fromRow: i + 1,
                toRow: i,
                col,
                value: column[i] * 2
              });
              column[i] *= 2;
              const newValue = column[i];
          if ([128, 256, 512, 1024, 2048].includes(newValue)) {
            const newAchievements = {...streaks};
            newAchievements[newValue] += 1;
            setStreaks(newAchievements);
            setSessionStreaks(prev => ({
              ...prev,
              [newValue]: prev[newValue] + 1
            }));
            localStorage.setItem('2048-streaks', JSON.stringify(newAchievements));
           newAchievement = { 
              value: newValue, 
              player: gameState.currentPlayer,
              timestamp: Date.now()
            };
            setAchievements(prev => [...prev, newAchievement]);
            if (newValue === 2048) {
              reached2048 = true;
            }
          }
              scoreIncrease += column[i];
              column.splice(i + 1, 1);
              merged = true;
            }
          }
          while (column.length < 4) column.push(0);

          for (let i = 0; i < column.length; i++) {
            if (column[i] !== 0 && originalPositions[i] !== i) {
              movingTiles.push({
                fromRow: originalPositions[i],
                toRow: i,
                col,
                value: column[i]
              });
            }
          }
         
        } else { // down
          for (let i = column.length - 1; i > 0; i--) {
            
            if (column[i] === column[i - 1]) {
              mergingTiles.push({
                fromRow: i - 1,
                toRow: i,
                col,
                value: column[i] * 2
              });
              column[i] *= 2;
              const newValue = column[i];
          if ([128, 256, 512, 1024, 2048].includes(newValue)) {
            const newAchievements = {...streaks};
            newAchievements[newValue] += 1;
            setStreaks(newAchievements);
            setSessionStreaks(prev => ({
              ...prev,
              [newValue]: prev[newValue] + 1
            }));
            localStorage.setItem('2048-streaks', JSON.stringify(newAchievements));
            newAchievement = { 
              value: newValue, 
              player: gameState.currentPlayer,
              timestamp: Date.now()
            };
            setAchievements(prev => [...prev, newAchievement]);
            if (newValue === 2048) {
              reached2048 = true;
            }
          }
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
        const originalPositions = [];
        if (direction === 'left') {
          for (let i = 0; i < line.length - 1; i++) {
            if (line[i] === line[i + 1]) {
              mergingTiles.push({
                fromCol: i + 1,
                toCol: i,
                row,
                value: line[i] * 2
              });
              line[i] *= 2;
              const newValue = line[i];
          if ([128, 256, 512, 1024, 2048].includes(newValue)) {
            const newAchievements = {...streaks};
            newAchievements[newValue] += 1;
            setStreaks(newAchievements);
            setSessionStreaks(prev => ({
              ...prev,
              [newValue]: prev[newValue] + 1
            }));
            localStorage.setItem('2048-streaks', JSON.stringify(newAchievements));
            
            newAchievement = { 
              value: newValue, 
              player: gameState.currentPlayer,
              timestamp: Date.now()
            };
            setAchievements(prev => [...prev, newAchievement]);
            if (newValue === 2048) {
              reached2048 = true;
            }
          }
              scoreIncrease += line[i];
              line.splice(i + 1, 1);
              merged = true;
            }
          }
          while (line.length < 4) line.push(0);
          for (let i = 0; i < line.length; i++) {
            if (line[i] !== 0 && originalPositions[i] !== i) {
              movingTiles.push({
                fromCol: originalPositions[i],
                toCol: i,
                row,
                value: line[i]
              });
            }
          }
        } else { // right
          for (let i = line.length - 1; i > 0; i--) {
            if (line[i] === line[i - 1]) {
              mergingTiles.push({
                fromCol: i - 1,
                toCol: i,
                row,
                value: line[i] * 2
              });
              line[i] *= 2;
              const newValue = line[i];
          if ([128, 256, 512, 1024, 2048].includes(newValue)) {
            const newAchievements = {...streaks};
            newAchievements[newValue] += 1;
            setStreaks(newAchievements);
            setSessionStreaks(prev => ({
              ...prev,
              [newValue]: prev[newValue] + 1
            }));
            localStorage.setItem('2048-streaks', JSON.stringify(newAchievements));
            
            newAchievement = { 
              value: newValue, 
              player: gameState.currentPlayer,
              timestamp: Date.now()
            };
            setAchievements(prev => [...prev, newAchievement]);
            if (newValue === 2048) {
              reached2048 = true;
            }
          }
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

    // Check for 2048 tile on the board
    if (!reached2048) {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if (board[row][col] === 2048) {
            reached2048 = true;
            break;
          }
        }
        if (reached2048) break;
      }
    }

    setAnimations({
      movingTiles,
      mergingTiles
    });

    if (moved) {
      updateTimers();
      addRandomTile(board);
      const newScores = {...gameState.scores};
      if (gameState.currentPlayer === 1) {
        newScores.player1 += scoreIncrease;
      } else {
        newScores.player2 += scoreIncrease;
      }
      const currentPlayerKey = `player${gameState.currentPlayer}`;
      newScores[currentPlayerKey] += scoreIncrease;
      setGameState(prev => ({
        ...prev,
        recentAchievement: newAchievement,
        // ... (rest of state updates)
      }));

      if (newScores[currentPlayerKey] > bestScore) {
        const newBestScore = newScores[currentPlayerKey];
        setBestScore(newBestScore);
        localStorage.setItem('2048-best-score', newBestScore.toString());
      }

      if (newAchievement) {
        setTimeout(() => {
          setGameState(prev => ({ ...prev, recentAchievement: null }));
        }, 2000);
      }

      const gameOver = isGameOver(board);
      let winner = null;
      if (reached2048) {
        winner = gameState.currentPlayer;
        setGameState(prev => ({
          ...prev,
          hasWon: true,
          winner
        }));
        return; // Game ends immediately when 2048 is reached
      } else if (gameOver) {
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
        lastMoveMerged: merged,
      }));
      setTimeout(() => {
        setAnimations({ movingTiles: [], mergingTiles: [] });
       }, 200); 
    } else {
      if(isGameOver(board)){
        const newScores = {...gameState.scores};
        if (gameState.currentPlayer === 1) {
          newScores.player1 += scoreIncrease;
        } else {
          newScores.player2 += scoreIncrease;
        }
         let winner = newScores.player1 > newScores.player2 ? 1 : 
                newScores.player1 < newScores.player2 ? 2 : 0;
      
        setGameState(prev => ({
          ...prev,
          scores: newScores,
          gameOver : true,
          winner,
          lastMoveMerged: false,
        }));
        setTimeout(() => {
          setAnimations({ movingTiles: [], mergingTiles: [] });
         }, 200); 
    }
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
        const currentPlayerKey = `player${prev.currentPlayer}`;
        return {
          ...prev,
          playerTimes: {
            ...prev.playerTimes,
            [currentPlayerKey]: prev.playerTimes[currentPlayerKey] + elapsedSeconds
          },
          gameTime: prev.gameTime + elapsedSeconds,
          lastUpdateTime: now
        };
      });
    }, 1000);
  }

  function updateTimers() {
    const now = Date.now();
    const elapsed = Math.floor((now - gameState.lastUpdateTime) / 1000);
    
    setGameState(prev => {
      const currentPlayerKey = `player${prev.currentPlayer}`;
      return {
        ...prev,
        playerTimes: {
          ...prev.playerTimes,
          [currentPlayerKey]: prev.playerTimes[currentPlayerKey] + elapsed
        },
        gameTime: prev.gameTime + elapsed,
        lastUpdateTime: now
      };
    });
  }

  // Pause the game timer
  function pauseTimer() {
    clearInterval(timerRef.current);
    updateTimers();
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
      playerTimes: { player1: 0, player2: 0 },
      lastUpdateTime: Date.now()
    });
    setAnimations({ movingTiles: [], mergingTiles: [] });
    setLastDirection(null);
    setDirectionHighlight(false);
    setScoreUpdated(false);
    setNewBest(false); 
    setSessionStreaks({
      128: 0,
      256: 0,
      512: 0,
      1024: 0,
      2048: 0
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

  const getDirectionHighlightStyle = () => {
    if (!directionHighlight || !lastDirection) return {};
    
    const baseStyle = {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: '6px',
      pointerEvents: 'none',
      opacity: 0.3,
      animation: 'pulse 0.2s ease-out',
    };

    switch (lastDirection) {
      case 'up':
        return {
          ...baseStyle,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0))',
          top: 0,
        };
      case 'down':
        return {
          ...baseStyle,
          background: 'linear-gradient(to top, rgba(255,255,255,0.8), rgba(255,255,255,0))',
          bottom: 0,
        };
      case 'left':
        return {
          ...baseStyle,
          background: 'linear-gradient(to right, rgba(255,255,255,0.8), rgba(255,255,255,0))',
          left: 0,
        };
      case 'right':
        return {
          ...baseStyle,
          background: 'linear-gradient(to left, rgba(255,255,255,0.8), rgba(255,255,255,0))',
          right: 0,
        };
      default:
        return {};
    }
  };

  
 
  // New component to display achievements
  function AchievementTracker() {
    return (
      <div className="achievement-tracker">
        <h3>Tile All Streaks</h3>
        <div className="achievement-bars">
          {Object.entries(streaks).map(([value, count]) => (
            <div key={value} className="achievement-bar">
              <span className="tile-value">{
                value === '128' ? '128' :
                value === '256' ? '256' :
                value === '512' ? '512' :
                value === '1024' ? '1024' : '2048'
              }</span>
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${Math.min(100, count * 10)}%` }}
                ></div>
              </div>
              <span className="count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function CurrentSessionStreaks() {
    return (
      <div className="session-streaks">
        <h3>Current Session</h3>
        <div className="streak-bars">
          {Object.entries(sessionStreaks).map(([value, count]) => (
            <div key={value} className="streak-bar">
              <span className="tile-value">{value}</span>
              <span className="count">{count}</span>
              <div className="streak-visual">
                {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
                  <div key={i} className="streak-dot"></div>
                ))}
                {count > 5 && <span className="plus-more">+{count - 5}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Achievement badge component
  const AchievementBadge = ({ value, player, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    const badgeColors = {
      128: { bg: '#f2b179', text: '#776e65' },
      256: { bg: '#f59563', text: '#f9f6f2' },
      512: { bg: '#f67c5f', text: '#f9f6f2' },
      1024: { bg: '#f65e3b', text: '#f9f6f2' },
      2048: { bg: '#edc22e', text: '#776e65' }
    };
  
    const badgeIcons = {
      128: '🥉',  // Bronze
      256: '🥈',  // Silver
      512: '🌟',  // Star
      1024: '💎', // Diamond
      2048: '🏆'  // Trophy
    };
  
    useEffect(() => {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onDismiss, 300); // Wait for animation to finish
      }, 3000);
  
      return () => clearTimeout(timer);
    }, [onDismiss]);
  
    return (
      <div className={`badge-container ${isExiting ? 'exiting' : ''}`}>
        <div 
          className="achievement-badge"
          style={{ 
            backgroundColor: badgeColors[value].bg,
            color: badgeColors[value].text
          }}
        >
          <div className="badge-icon">{badgeIcons[value]}</div>
          <div className="badge-content">
            <div className="badge-value">{value}</div>
            <div className="badge-player">Player {player}</div>
          </div>
          <div className="badge-ribbon"></div>
        </div>
        <div className="badge-shadow"></div>
      </div>
    );
  };

  const AchievementDisplay = ({ achievements }) => {
    const [activeAchievements, setActiveAchievements] = useState([]);
  
    const addAchievement = (achievement) => {
      setActiveAchievements(prev => [...prev, achievement]);
    };
  
    const removeAchievement = (achievementToRemove) => {
      setActiveAchievements(prev => 
        prev.filter(achievement => achievement !== achievementToRemove)
      );
    };
  
    // Add new achievements when they come in
    useEffect(() => {
      if (achievements.length > 0) {
        const latest = achievements[achievements.length - 1];
        addAchievement(latest);
      }
    }, [achievements]);
  
    return (
      <div className="achievement-display">
        {activeAchievements.map((achievement, index) => (
          <AchievementBadge
            key={`${achievement.value}-${index}`}
            value={achievement.value}
            player={achievement.player}
            onDismiss={() => removeAchievement(achievement)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="app">
      
      <div className="game-header">
      <div className="best-score">
          <h3>Best Score: {bestScore}</h3>
        </div>
      <p className="rules">Same player continues if tiles merge!</p>
        <h1>2048</h1>
        <div className="game-timers">
          <span>Game Time: {formatTime(gameState.gameTime)}</span>
          <span>P1 Time: {formatTime(gameState.playerTimes.player1)}</span>
          <span>P2 Time: {formatTime(gameState.playerTimes.player2)}</span>
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
          
          <Board board={gameState.board} animations={animations} />
          <div className={`player-tag ${gameState.currentPlayer === 2 ? 'active' : ''}`}>
            <h2>Player 2</h2>
            <p>Score: {gameState.scores.player2}</p>
          </div>
          {directionHighlight && (
          <div className="direction-highlight" style={getDirectionHighlightStyle()}></div>
        )}
        <CurrentSessionStreaks />
        <AchievementTracker />
        <AchievementDisplay  achievements={achievements}/>
        <div className="direction-hints">
        <button 
          className={`direction-btn up ${lastDirection === 'up' && directionHighlight ? 'active' : ''}`} 
          onClick={() => moveTiles('up')}
        >
          ↑
        </button>
        <div className="horizontal-buttons">
          <button 
            className={`direction-btn left ${lastDirection === 'left' && directionHighlight ? 'active' : ''}`} 
            onClick={() => moveTiles('left')}
          >
            ←
          </button>
          <button 
            className={`direction-btn down ${lastDirection === 'down' && directionHighlight ? 'active' : ''}`} 
            onClick={() => moveTiles('down')}
          >
            ↓
          </button>
          <button 
            className={`direction-btn right ${lastDirection === 'right' && directionHighlight ? 'active' : ''}`} 
            onClick={() => moveTiles('right')}
          >
            →
          </button>
        </div>
      </div>
{/* Achievement Popup */}
{gameState.recentAchievement && (
        <div className="achievement-popup">
          Player {gameState.recentAchievement.player} reached {gameState.recentAchievement.value}!
        </div>
      )}
          
        </div>
        
        <div className="game-info">
          <p>Current Turn: Player {gameState.currentPlayer}</p>
          {gameState.lastMoveMerged && <p className="bonus-message">Bonus move!</p>}
         {(gameState.hasWon || gameState.gameOver) && (
        <div className="popup-overlay">
          <div className="game-over-popup">
            <div className="popup-content">
              {gameState.hasWon ? (
                <>
                  <h2>Player {gameState.winner} Wins!</h2>
                  <p className="win-message">Reached 2048!</p>
                  <div className="trophy">🏆</div>
                </>
              ) : (
                <>
                  <h2>Game Over!</h2>
                  {gameState.winner === 0 ? (
                    <p>It's a tie!</p>
                  ) : (
                    <p>Player {gameState.winner} wins by score!</p>
                  )}
                </>
              )}
              <button 
                onClick={resetGame} 
                className="popup-button"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
          {gameState.hasWon && (
        <div className="game-over">
          <h2>Player {gameState.winner} Wins!</h2>
          <p>Reached 2048!</p>
          <button onClick={resetGame}>Play Again</button>
        </div>
      )}
      
      {gameState.gameOver && !gameState.hasWon && (
        <div className="game-over">
          <h2>Game Over!</h2>
          {gameState.winner === 0 ? (
            <p>It's a tie!</p>
          ) : (
            <p>Player {gameState.winner} wins by score!</p>
          )}
          <button onClick={resetGame}>Play Again</button>
        </div>
      )}
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

function Board({ board, animations }) {
  const getTileColor = (value) => {
    const colors = {
      0: '#cdc1b4',
      2: '#eee4da',
      4: '#ede0c8',
      8: '#f2b179',
      16: '#f59563',
      32: '#f67c5f',
      64: '#f65e3b',
      128: '#edcf72',
      256: '#edcc61',
      512: '#edc850',
      1024: '#edc53f',
      2048: '#edc22e',
      4096: '#3d3a33', // New color for 4096
      8192: '#ff0000'  // Special color for 8192
    };
    return colors[value] || '#3c3a32';
  };
  
  const getTextColor = (value) => {
    return value > 4 ? 'var(--text-light)' : 'var(--text-dark)';
  };

  const getFontSize = (value) => {
    const sizes = {
      0: '45px',
      2: '45px',
      4: '45px',
      8: '45px',
      16: '45px',
      32: '45px',
      64: '45px',
      128: '40px',
      256: '40px',
      512: '40px',
      1024: '35px',
      2048: '35px',
      4096: '30px',
      8192: '30px'
    };
    return sizes[value] || '30px';
  };

  return (
    <div className="board">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((cell, cellIndex) => {
            // Check if this cell is part of any animation
            const isMoving = animations.movingTiles.some(
              tile => tile.toRow === rowIndex && tile.col === cellIndex
            );
            const isMerging = animations.mergingTiles.some(
              tile => tile.toRow === rowIndex && tile.col === cellIndex
            );
            
            return (
              <div 
                key={cellIndex} 
                className={`
                  cell 
                  cell-${cell || 'empty'}
                  ${isMoving ? 'moving' : ''}
                  ${isMerging ? 'merging' : ''}
                `}
                
              >
                {cell !== 0 ? cell : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default App;