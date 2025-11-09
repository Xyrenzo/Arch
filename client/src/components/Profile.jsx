import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile({ onClose }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    confirmPassword: ''
  });
  const [userStats, setUserStats] = useState({
    posts: 0,
    likes: 0,
    followers: 0,
    following: 0
  });
  const [userMarkers, setUserMarkers] = useState([]);
  const [likedMarkers, setLikedMarkers] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [showLiked, setShowLiked] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserStats();
      loadUserMarkers();
      loadLikedMarkers();
      loadFollowData();
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      const token = localStorage.getItem('access');
      
      const markersRes = await fetch(`https://arch-lpaw.onrender.com/api/users/${user.id}/markers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const markers = await markersRes.json();
      
      const followersRes = await fetch(`https://arch-lpaw.onrender.com/api/users/${user.id}/followers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const followers = await followersRes.json();
      
      const followingRes = await fetch(`https://arch-lpaw.onrender.com/api/users/${user.id}/following`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const following = await followingRes.json();

      setUserStats({
        posts: markers.length,
        likes: likedMarkers.length,
        followers: followers.length,
        following: following.length
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadUserMarkers = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`https://arch-lpaw.onrender.com/api/users/${user.id}/markers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const markers = await response.json();
        setUserMarkers(markers);
      }
    } catch (error) {
      console.error('Error loading user markers:', error);
    }
  };

  const loadLikedMarkers = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`https://arch-lpaw.onrender.com/api/users/${user.id}/likes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const markers = await response.json();
        setLikedMarkers(markers);
        setUserStats(prev => ({ ...prev, likes: markers.length }));
      }
    } catch (error) {
      console.error('Error loading liked markers:', error);
    }
  };

  const loadFollowData = async () => {
    try {
      const token = localStorage.getItem('access');
      const [followersRes, followingRes] = await Promise.all([
        fetch(`https://arch-lpaw.onrender.com/api/users/${user.id}/followers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`https://arch-lpaw.onrender.com/api/users/${user.id}/following`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (followersRes.ok) {
        const followersData = await followersRes.json();
        setFollowers(Array.isArray(followersData) ? followersData : []);
      }
      if (followingRes.ok) {
        const followingData = await followingRes.json();
        setFollowing(Array.isArray(followingData) ? followingData : []);
      }
    } catch (error) {
      console.error('Error loading follow data:', error);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('access');
      const updateData = {};
      
      if (form.username !== user.username) updateData.username = form.username;
      if (form.email !== user.email) updateData.email = form.email;
      if (form.password) {
        if (form.password !== form.confirmPassword) {
          alert('Пароли не совпадают');
          return;
        }
        updateData.password = form.password;
      }
      
      if (Object.keys(updateData).length > 0) {
        const response = await fetch(`https://arch-lpaw.onrender.com/api/users/${user.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
          setIsEditing(false);
          setForm({ ...form, password: '', confirmPassword: '' });
          alert('Профиль успешно обновлен');
          window.location.reload();
        } else {
          alert('Ошибка при обновлении профиля');
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Ошибка при обновлении профиля');
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const token = localStorage.getItem('access');
      const response = await fetch(`https://arch-lpaw.onrender.com/api/users/${user.id}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        alert('Аватар успешно обновлен');
        window.location.reload();
      } else {
        alert('Ошибка при загрузке аватара');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Ошибка при загрузке аватара');
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Профиль
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex h-[500px]">
          <div className="w-48 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <nav className="p-4 space-y-2">
              {[
                { id: 'info', label: '👤 Личная информация' },
                { id: 'privacy', label: '🔒 Конфиденциальность' },
                { id: 'public', label: '📊 Публичная информация' },
                { id: 'premium', label: '⭐ Кастомизация' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="text-center">
                  <label className="cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <div className="w-24 h-24 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center hover:opacity-80 transition-opacity">
                      <span className="text-white text-2xl font-bold">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Нажмите для смены аватара</div>
                  </label>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.username}</h2>
                  <p className="text-slate-600 dark:text-slate-400">@{user?.username}</p>
                  
                  <div className="flex justify-center space-x-6 mt-4">
                    <button 
                      onClick={() => setShowFollowers(true)}
                      className="text-center hover:opacity-80 transition-opacity"
                    >
                      <div className="font-bold text-slate-900 dark:text-white">{userStats.followers}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Подписчики</div>
                    </button>
                    <button 
                      onClick={() => setShowFollowing(true)}
                      className="text-center hover:opacity-80 transition-opacity"
                    >
                      <div className="font-bold text-slate-900 dark:text-white">{userStats.following}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Подписки</div>
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Логин
                      </label>
                      <input
                        value={form.username}
                        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Новый пароль
                      </label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Подтвердите пароль
                      </label>
                      <input
                        type="password"
                        value={form.confirmPassword}
                        onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-slate-300 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">Логин</div>
                          <div className="text-slate-600 dark:text-slate-400">{user?.username}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">Email</div>
                          <div className="text-slate-600 dark:text-slate-400">{user?.email || 'Не указан'}</div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Редактировать профиль
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 dark:text-white">Настройки конфиденциальности</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <span className="text-slate-700 dark:text-slate-300">Скрыть все мои посты</span>
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <span className="text-slate-700 dark:text-slate-300">Приватный профиль</span>
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <span className="text-slate-700 dark:text-slate-300">Скрыть подписки</span>
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'public' && (
              <div className="space-y-6">
                <h4 className="font-semibold text-slate-900 dark:text-white">Публичная информация</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{userStats.posts}</div>
                    <div className="text-slate-600 dark:text-slate-400">Репорты</div>
                  </div>
                  
                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{userStats.likes}</div>
                    <div className="text-slate-600 dark:text-slate-400">Лайки</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => setShowPosts(true)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <div className="font-medium text-slate-900 dark:text-white">Мои репорты</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Просмотреть все созданные репорты</div>
                  </button>
                  
                  <button 
                    onClick={() => setShowLiked(true)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <div className="font-medium text-slate-900 dark:text-white">Понравившиеся посты</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Репорты, которые вам понравились</div>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'premium' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⭐</span>
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Премиум функции</h4>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Доступно только для премиальных пользователей и компаний
                </p>
                <button className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-semibold">
                  Получить премиум
                </button>
              </div>
            )}
          </div>
        </div>

        {showFollowers && (
          <UserListModal 
            title="Подписчики"
            users={followers}
            onClose={() => setShowFollowers(false)}
          />
        )}

        {showFollowing && (
          <UserListModal 
            title="Подписки"
            users={following}
            onClose={() => setShowFollowing(false)}
          />
        )}

        {showPosts && (
          <MarkersListModal 
            title="Мои репорты"
            markers={userMarkers}
            onClose={() => setShowPosts(false)}
          />
        )}

        {showLiked && (
          <MarkersListModal 
            title="Понравившиеся репорты"
            markers={likedMarkers}
            onClose={() => setShowLiked(false)}
          />
        )}

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}

function UserListModal({ title, users, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-96">
          {users.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              Список пуст
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="flex items-center space-x-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-white">{user.username}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MarkersListModal({ title, markers, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-96">
          {markers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              Список пуст
            </div>
          ) : (
            <div className="space-y-4">
              {markers.map(marker => (
                <div key={marker.id} className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">{marker.title}</h4>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(marker.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                    {marker.description || 'Без описания'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {marker.category}/{marker.subcategory}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      marker.status === 'sent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      marker.status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {marker.status === 'sent' ? 'Отправлено' : marker.status === 'processing' ? 'В обработке' : 'Рассмотрено'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}