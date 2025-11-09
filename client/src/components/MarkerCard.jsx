import React, { useState, useEffect } from 'react';
import MiniGame from './MiniGame';
import LikeButton from './LikeButton';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  sent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
};

const statusLabels = {
  sent: 'Отправлено',
  processing: 'В обработке',
  resolved: 'Рассмотрено'
};

const categoryConfig = {
  problems: {
    label: '⚠️ Проблемы и жалобы',
    subcategories: {
      environmental: { label: '🌍 Экологические', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      conflicts: { label: '⚡ Конфликты', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
      infrastructure: { label: '🏗️ Инфраструктура', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      complaints: { label: '📝 Жалобы', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
    }
  },
  transport: {
    label: '🚗 Транспортные средства',
    subcategories: {
      buses: { label: '🚌 Автобусы', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      scooters: { label: '🛴 Самокаты', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
      trains: { label: '🚆 Поезда', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' }
    }
  },
  emergencies: {
    label: '🚨 Экстренные случаи',
    subcategories: {
      fire: { label: '🔥 Пожар', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
      ambulance: { label: '🚑 Скорая', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      police: { label: '🚓 Полиция', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
    }
  },
  events: {
    label: '🎪 Ивенты',
    subcategories: {
      promotion: { label: '🏷️ Акция', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      event: { label: '🎪 Мероприятие', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
      festival: { label: '🎭 Фестиваль', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' }
    }
  }
};

export default function MarkerCard({ marker, onClose, onUpdate }) {
  const media = marker.media ? JSON.parse(marker.media) : [];
  const [showGame, setShowGame] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [author, setAuthor] = useState(null);
  const { user } = useAuth();

  const canDelete = user && (user.id === marker.reporter_id || user.role === 'admin');

  useEffect(() => {
    if (marker.reporter_id) {
      loadAuthorInfo();
    }
  }, [marker.reporter_id]);

  const loadAuthorInfo = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`https://arch-lpaw.onrender.com/api/users/${marker.reporter_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setAuthor(userData);
      } else {
        console.error('Failed to load author info');
      }
    } catch (error) {
      console.error('Error loading author info:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот репорт?')) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`https://arch-lpaw.onrender.com/api/markers/${marker.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onClose();
        if (onUpdate) onUpdate();
      } else {
        alert('Ошибка при удалении репорта');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Ошибка при удалении репорта');
    } finally {
      setDeleting(false);
    }
  };

  const calculateEventTime = () => {
    if (marker.category !== 'events' || !marker.event_start || !marker.event_end) {
      return null;
    }

    const now = new Date();
    const start = new Date(marker.event_start);
    const end = new Date(marker.event_end);

    if (now < start) {
      const diff = start - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      const duration = end - start;
      const durationDays = Math.floor(duration / (1000 * 60 * 60 * 24));
      const durationHours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      return {
        type: 'upcoming',
        timeToStart: `Через ${days}д ${hours}ч`,
        duration: `${durationDays}д ${durationHours}ч`
      };
    } else if (now >= start && now <= end) {
      const diff = end - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return {
        type: 'ongoing',
        timeLeft: `Осталось ${days}д ${hours}ч`
      };
    } else {
      return {
        type: 'ended',
        message: 'Завершен'
      };
    }
  };

  const eventInfo = calculateEventTime();
  const categoryInfo = categoryConfig[marker.category];
  const subcategoryInfo = categoryInfo?.subcategories[marker.subcategory];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in max-w-md w-full">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="text-2xl mt-1 flex-shrink-0">
              {marker.subcategory === 'environmental' ? '🌱' :
               marker.subcategory === 'conflicts' ? '⚡' :
               marker.subcategory === 'fire' ? '🔥' :
               marker.subcategory === 'ambulance' ? '🚑' :
               marker.subcategory === 'police' ? '🚓' :
               marker.category === 'transport' ? '🚗' :
               marker.category === 'events' ? '🎪' : '⚠️'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">
                {marker.title || 'Без заголовка'}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {categoryInfo?.label || marker.category}
                </span>
                {subcategoryInfo && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${subcategoryInfo.color}`}>
                    {subcategoryInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {author && (
          <div 
            onClick={() => window.location.href = `/profile/${author.id}`}
            className="flex items-center space-x-3 mt-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {author.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 dark:text-white text-sm">
                {author.username}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Автор репорта
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Статус:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[marker.status]}`}>
            {statusLabels[marker.status]}
          </span>
        </div>

        {eventInfo && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-blue-600 dark:text-blue-300">🎪</span>
              <div>
                {eventInfo.type === 'upcoming' && (
                  <>
                    <div className="font-medium text-blue-800 dark:text-blue-200">
                      Начнется: {eventInfo.timeToStart}
                    </div>
                    <div className="text-blue-600 dark:text-blue-300 text-xs">
                      Продолжительность: {eventInfo.duration}
                    </div>
                  </>
                )}
                {eventInfo.type === 'ongoing' && (
                  <div className="font-medium text-blue-800 dark:text-blue-200">
                    Идет сейчас • {eventInfo.timeLeft}
                  </div>
                )}
                {eventInfo.type === 'ended' && (
                  <div className="font-medium text-blue-800 dark:text-blue-200">
                    {eventInfo.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {marker.description || 'Описание отсутствует'}
          </p>
        </div>

        {media.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">Медиа:</h4>
            <div className="grid gap-2">
              {media.map((m, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                  {m.type === 'image' ? (
                    <img 
                      src={`https://arch-lpaw.onrender.com${m.url}`} 
                      alt="" 
                      className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <video 
                      src={`https://arch-lpaw.onrender.com${m.url}`} 
                      controls 
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-4">
            {author && (
              <div 
                onClick={() => window.location.href = `/profile/${author.id}`}
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {author.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {author.username}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <LikeButton 
              markerId={marker.id}
              initialLikes={marker.likes_count || 0}
              initialLiked={marker.user_liked || false}
            />

            {marker.subcategory === 'environmental' && (
              <button
                onClick={() => setShowGame(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm hover:from-green-600 hover:to-emerald-700 transition-all"
              >
                <span>🌍</span>
                <span>Эко-игра</span>
              </button>
            )}
          </div>
        </div>

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Удаление...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Удалить репорт</span>
              </>
            )}
          </button>
        )}
      </div>

      {showGame && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 rounded-xl">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <MiniGame onClose={() => setShowGame(false)} />
          </div>
        </div>
      )}
    </div>
  );
}