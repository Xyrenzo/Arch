import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LikeButton = ({ markerId, initialLikes, initialLiked }) => {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const { user } = useAuth();

  const handleLike = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`http://localhost:3001/api/markers/${markerId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        setLikesCount(data.likesCount);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <button
      onClick={handleLike}
      className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all ${
        liked 
          ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800' 
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
      }`}
    >
      <span className={liked ? 'text-red-500' : 'text-slate-500'}>
        {liked ? '❤️' : '🤍'}
      </span>
      <span className="text-sm font-medium">{likesCount}</span>
    </button>
  );
};

export default LikeButton;