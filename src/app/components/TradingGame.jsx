// components/TradingGame.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

const API = '/api/stats';

const TradingGame = () => {
  // ── State & Refs ────────────────────────────────────────
  const [selectedFunction, setSelectedFunction] = useState('random_combination');
  const [isPlaying, setIsPlaying] = useState(true);
  const [gameState, setGameState] = useState('waiting'); // 'waiting' | 'active' | 'won' | 'lost'
  const [entryPoint, setEntryPoint] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [defaultTime, setDefaultTime] = useState(10);
  const [gameStats, setGameStats] = useState({ wins: 0, losses: 0, total: 0 });
  const [animationTime, setAnimationTime] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [randomCoeffs, setRandomCoeffs] = useState(null);

  const canvasRef = useRef(null);
  const gameTimerRef = useRef(null);
  const animationRef = useRef(null);

  // ── Fetch collective stats on mount ──────────────────────
  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => setGameStats(data))
      .catch(console.error);
  }, []);

  // ── Helpers & Random Coeffs ─────────────────────────────
  const generateRandomCoeffs = () => ({
    amp: Math.random() * 1.0 + 1.0,
    c1: Math.random() * 2 - 1,
    c2: Math.random() * 2 - 1,
    c3: Math.random() * 2 - 1,
    shift: Math.random() * 0.4 - 0.2
  });

  useEffect(() => {
    if (!randomCoeffs) setRandomCoeffs(generateRandomCoeffs());
  }, [randomCoeffs]);

  const functions = {
    random_combination: {
      name: 'Random Combination',
      func: x => {
        if (!randomCoeffs) return 0;
        const { amp, c1, c2, c3, shift } = randomCoeffs;
        return amp * (
          c1 * (Math.sin(x) - 0.5) +
          c2 * (0.6 * Math.sin(x) + 0.4 * Math.sin(2*x) - 0.3) +
          c3 * (Math.sin(x) + 0.3 * Math.sin(3*x) - 0.4)
        ) + shift;
      },
      color: '#9333ea',
      expectedValue: randomCoeffs
        ? randomCoeffs.amp * (
            randomCoeffs.c1 * -0.5 +
            randomCoeffs.c2 * -0.3 +
            randomCoeffs.c3 * -0.4
          ) + randomCoeffs.shift
        : -0.4
    },
    shifted_sine: {
      name: 'Shifted Sine',
      func: x => Math.sin(x) - 0.5,
      color: '#8884d8',
      expectedValue: -0.5
    },
    biased_combination: {
      name: 'Biased Combination',
      func: x => 0.6 * Math.sin(x) + 0.4 * Math.sin(2*x) - 0.3,
      color: '#ffc658',
      expectedValue: -0.3
    },
    asymmetric_wave: {
      name: 'Asymmetric Wave',
      func: x => Math.sin(x) + 0.3 * Math.sin(3*x) - 0.4,
      color: '#ff7300',
      expectedValue: -0.4
    }
  };

  // ── Animation Loop ───────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const animate = () => {
      setAnimationTime(prev => prev + animationSpeed * 0.008);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, animationSpeed]);

  // ── Game Timer ───────────────────────────────────────────
  useEffect(() => {
    if (gameState === 'active' && timeRemaining > 0) {
      gameTimerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 0.1);
      }, 100);
    } else if (gameState === 'active' && timeRemaining <= 0) {
      endGame();
    }
    return () => clearTimeout(gameTimerRef.current);
  }, [gameState, timeRemaining]);

  // ── Canvas Drawing ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // **Draw >0 area (green)**
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    for (let i = 0; i <= width; i++) {
      const xVal = (i / width) * 4 * Math.PI + animationTime;
      const yVal = functions[selectedFunction].func(xVal);
      const yCanvas = height / 2 - (yVal * height / 4);
      ctx.lineTo(i, yVal >= 0 ? yCanvas : height / 2);
    }
    ctx.lineTo(width, height / 2);
    ctx.closePath();
    ctx.fill();

    // **Draw <0 area (red)**
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    for (let i = 0; i <= width; i++) {
      const xVal = (i / width) * 4 * Math.PI + animationTime;
      const yVal = functions[selectedFunction].func(xVal);
      const yCanvas = height / 2 - (yVal * height / 4);
      ctx.lineTo(i, yVal < 0 ? yCanvas : height / 2);
    }
    ctx.lineTo(width, height / 2);
    ctx.closePath();
    ctx.fill();

    // **Grid**
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const y = (i / 6) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // **Y‐axis labels**
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = -2; i <= 2; i++) {
      const y = height / 2 - (i * height / 4);
      ctx.fillText(i.toFixed(1), width - 5, y);
    }

    // **Zero line**
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // **Waveform**
    ctx.strokeStyle = functions[selectedFunction].color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= width; i++) {
      const xVal = (i / width) * 4 * Math.PI + animationTime;
      const yVal = functions[selectedFunction].func(xVal);
      const yCanvas = height / 2 - (yVal * height / 4);
      i === 0 ? ctx.moveTo(i, yCanvas) : ctx.lineTo(i, yCanvas);
    }
    ctx.stroke();

    // **Entry point dot**
    const rightX = 4 * Math.PI + animationTime;
    const rightY = functions[selectedFunction].func(rightX);
    const rightCanvasY = height / 2 - (rightY * height / 4);
    ctx.fillStyle =
      gameState === 'waiting'
        ? '#4444ff'
        : gameState === 'active'
        ? '#ff4444'
        : '#44ff44';
    ctx.beginPath();
    ctx.arc(width - 1, rightCanvasY, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // **Active‐game indicator**
    if (gameState === 'active' && entryPoint !== null) {
      const currentX = entryPoint + ((defaultTime - timeRemaining) / defaultTime) * 10;
      const currentVal = functions[selectedFunction].func(currentX);
      const indicatorX = ((currentX - animationTime) / (4 * Math.PI)) * width;
      const indicatorY = height / 2 - (currentVal * height / 4);
      if (indicatorX >= 0 && indicatorX <= width) {
        ctx.fillStyle = currentVal > 0 ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width - 1, rightCanvasY);
        ctx.lineTo(indicatorX, indicatorY);
        ctx.stroke();
      }
    }
  }, [
    animationTime,
    selectedFunction,
    entryPoint,
    gameState,
    timeRemaining,
    defaultTime,
    randomCoeffs
  ]);

  // ── Handlers ────────────────────────────────────────────
  const handleCanvasClick = () => {
    if (gameState !== 'waiting') return;
    const rightmostX = 4 * Math.PI + animationTime;
    setEntryPoint(rightmostX);
    setGameState('active');
    setTimeRemaining(defaultTime);
  };

  const endGame = () => {
    if (entryPoint === null) return;
    const finalX = entryPoint + 10;
    const finalVal = functions[selectedFunction].func(finalX);
    const won = finalVal > 0;

    // Update remote stats
    const newStats = {
      wins: gameStats.wins + (won ? 1 : 0),
      losses: gameStats.losses + (won ? 0 : 1),
      total: gameStats.total + 1
    };
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStats)
    })
      .then(res => res.json())
      .then(updated => setGameStats(updated))
      .catch(console.error);

    // Update UI state
    setGameState(won ? 'won' : 'lost');
  };

  const resetGame = () => {
    setGameState('waiting');
    setEntryPoint(null);
    setTimeRemaining(defaultTime);
  };

  const resetStats = () => {
    setGameStats({ wins: 0, losses: 0, total: 0 });
  };

  const winRate =
    gameStats.total > 0
      ? ((gameStats.wins / gameStats.total) * 100).toFixed(1)
      : 0;

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Trading Game – Bearish Functions</h2>
        <p className="text-gray-600">
          Click anywhere on the graph to enter a trade at the rightmost point. You win if
          the value is positive after {defaultTime} seconds.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Function:</label>
          <select
            value={selectedFunction}
            onChange={e => setSelectedFunction(e.target.value)}
            className="px-3 py-1 border rounded"
            disabled={gameState === 'active'}
          >
            {Object.entries(functions).map(([key, fn]) => (
              <option key={key} value={key}>
                {fn.name}
              </option>
            ))}
          </select>
          {selectedFunction === 'random_combination' && (
            <button
              onClick={() => setRandomCoeffs(generateRandomCoeffs())}
              className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
              disabled={gameState === 'active'}
            >
              New Random
            </button>
          )}
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <button
          onClick={resetGame}
          className="flex items-center gap-2 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          <RotateCcw size={16} />
          Reset Game
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          <Settings size={16} />
          Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Game Duration (seconds):
              </label>
              <input
                type="number"
                value={defaultTime}
                onChange={e => setDefaultTime(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-1 border rounded"
                min="1"
                max="60"
                disabled={gameState === 'active'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Animation Speed:</label>
              <input
                type="range"
                value={animationSpeed}
                onChange={e => setAnimationSpeed(Number(e.target.value))}
                className="w-full"
                min="0.1"
                max="2"
                step="0.1"
              />
              <span className="text-sm text-gray-600">
                {animationSpeed.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="mb-6">
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          onClick={handleCanvasClick}
          className="w-full border rounded cursor-crosshair bg-gray-50"
          style={{ cursor: gameState === 'waiting' ? 'crosshair' : 'default' }}
        />
      </div>

      {/* Status & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Game Status */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800">Game Status</h3>
          <div className="text-sm mt-2">
            {gameState === 'waiting' &&
              'Click anywhere on the graph to enter at the rightmost point'}
            {gameState === 'active' && (
              <div>
                <div>Time remaining: {timeRemaining.toFixed(1)}s</div>
                <div>
                  Entry value:{' '}
                  {functions[selectedFunction].func(entryPoint)?.toFixed(3)}
                </div>
              </div>
            )}
            {gameState === 'won' && (
              <div className="text-green-600 font-bold">YOU WON! 🎉</div>
            )}
            {gameState === 'lost' && (
              <div className="text-red-600 font-bold">YOU LOST! 📉</div>
            )}
          </div>
        </div>

        {/* Collective Statistics */}
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-800">Collective Statistics</h3>
          <div className="text-sm mt-2">
            <div>Wins: {gameStats.wins}</div>
            <div>Losses: {gameStats.losses}</div>
            <div>Win Rate: {winRate}%</div>
            <button
              onClick={resetStats}
              className="mt-2 text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Reset Stats
            </button>
          </div>
        </div>

        {/* Expected Value */}
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Expected Value</h3>
          <div className="text-sm mt-2">
            <div>Function: {functions[selectedFunction].name}</div>
            <div>Expected: {functions[selectedFunction].expectedValue.toFixed(3)}</div>
            <div className="text-xs text-gray-600 mt-1">
              Theoretical win rate: ~
              {((1 + functions[selectedFunction].expectedValue) * 50).toFixed(1)}%
            </div>
            {selectedFunction === 'random_combination' && randomCoeffs && (
              <div className="text-xs text-gray-600 mt-1">
                Amp: {randomCoeffs.amp.toFixed(2)}, Coeffs: [
                {randomCoeffs.c1.toFixed(2)}, {randomCoeffs.c2.toFixed(2)},{' '}
                {randomCoeffs.c3.toFixed(2)}]
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-100 rounded-lg text-sm">
        <h4 className="font-semibold mb-2">How to Play:</h4>
        <ul className="space-y-1">
          <li>• The wave continuously moves from right to left</li>
          <li>• Click anywhere on the graph to enter a trade at the rightmost point</li>
          <li>
            • You win if the value is positive after {defaultTime} seconds (f(x+10) &gt 0)
          </li>
          <li>• The blue/red dot shows your entry point at the right edge</li>
          <li>• Green areas are above zero (winning), red areas are below zero (losing)</li>
          <li>• These functions are mathematically biased toward negative values!</li>
          <li>• Stats are collective – they show performance across all games</li>
        </ul>
      </div>
    </div>
  );
};

export default TradingGame;
