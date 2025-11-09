import React, { useState, useEffect, useRef } from 'react';

const MiniGame = ({ onClose }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(true);
  const [items, setItems] = useState([]);
  const [basketPosition, setBasketPosition] = useState(50);
  const gameRef = useRef(null);

  const trashItems = [
    { type: 'plastic', emoji: '🥤', points: 10 },
    { type: 'paper', emoji: '📄', points: 8 },
    { type: 'glass', emoji: '🍶', points: 12 },
    { type: 'organic', emoji: '🍎', points: 6 }
  ];

  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setGameActive(false);
    }
  }, [timeLeft, gameActive]);

  useEffect(() => {
    if (!gameActive) return;

    const spawnItem = () => {
      const randomItem = trashItems[Math.floor(Math.random() * trashItems.length)];
      const newItem = {
        id: Date.now() + Math.random(),
        type: randomItem.type,
        emoji: randomItem.emoji,
        points: randomItem.points,
        x: Math.random() * 80 + 10,
        y: 0
      };
      setItems(prev => [...prev, newItem]);
    };

    const itemInterval = setInterval(spawnItem, 800);
    return () => clearInterval(itemInterval);
  }, [gameActive]);

  useEffect(() => {
    if (!gameActive) return;

    const moveItems = () => {
      setItems(prev => {
        const updated = prev.map(item => ({
          ...item,
          y: item.y + 2
        })).filter(item => {
          // Проверка столкновения с корзиной
          if (item.y >= 85) {
            const basketLeft = basketPosition - 5;
            const basketRight = basketPosition + 5;
            if (item.x >= basketLeft && item.x <= basketRight) {
              setScore(prevScore => prevScore + item.points);
              return false;
            }
            return false; // Удаляем если не поймали
          }
          return true;
        });
        return updated;
      });
    };

    const gameLoop = setInterval(moveItems, 50);
    return () => clearInterval(gameLoop);
  }, [gameActive, basketPosition]);

  const handleMouseMove = (e) => {
    if (!gameRef.current || !gameActive) return;
    const rect = gameRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setBasketPosition(Math.max(10, Math.min(90, x)));
  };

  const restartGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    setItems([]);
    setBasketPosition(50);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">🌍 Эко-игра</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
        >
          <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{score}</div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Очки</div>
        </div>
        <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-800 dark:text-green-200">{timeLeft}</div>
          <div className="text-sm text-green-600 dark:text-green-400">Секунды</div>
        </div>
      </div>

      {!gameActive ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎮</div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {timeLeft === 0 ? 'Время вышло!' : 'Игра завершена'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Ваш счет: <span className="font-bold text-blue-600">{score} очков</span>
          </p>
          <button
            onClick={restartGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
          >
            Играть снова
          </button>
        </div>
      ) : (
        <div
          ref={gameRef}
          className="relative w-full h-96 bg-gradient-to-b from-blue-100 to-green-100 dark:from-blue-900 dark:to-green-900 rounded-lg border-2 border-slate-300 dark:border-slate-600 overflow-hidden cursor-pointer"
          onMouseMove={handleMouseMove}
        >
          {/* Падающие предметы */}
          {items.map(item => (
            <div
              key={item.id}
              className="absolute text-2xl transition-all duration-50"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {item.emoji}
            </div>
          ))}

          {/* Корзина */}
          <div
            className="absolute bottom-4 text-3xl transition-all duration-100"
            style={{
              left: `${basketPosition}%`,
              transform: 'translateX(-50%)'
            }}
          >
            🗑️
          </div>

          {/* Инструкция */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            Ловите мусор мышкой!
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2">
        {trashItems.map(item => (
          <div key={item.type} className="text-center p-2 bg-slate-100 dark:bg-slate-700 rounded">
            <div className="text-2xl">{item.emoji}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">+{item.points}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniGame;