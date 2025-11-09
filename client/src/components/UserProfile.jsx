import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [followStatus, setFollowStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [userMarkers, setUserMarkers] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser && currentUser.id === parseInt(userId);

  useEffect(() => {
    loadUserProfile();
    loadUserMarkers();
    loadFollowData();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`http://localhost:3001/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setProfileUser(userData);
        
        if (!isOwnProfile) {
          checkFollowStatus(userData.id);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const checkFollowStatus = async (targetUserId) => {
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`http://localhost:3001/api/users/${targetUserId}/follow-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFollowStatus(data.status);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const loadUserMarkers = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`http://localhost:3001/api/users/${userId}/markers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const markers = await response.json();
        setUserMarkers(markers);
      }
    } catch (error) {
      console.error('Error loading user markers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowData = async () => {
    try {
      const token = localStorage.getItem('access');
      const [followersRes, followingRes] = await Promise.all([
        fetch(`http://localhost:3001/api/users/${userId}/followers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3001/api/users/${userId}/following`, {
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
      setFollowers([]);
      setFollowing([]);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) return;

    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`http://localhost:3001/api/users/${userId}/follow`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFollowStatus(data.status);
        loadFollowData();
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`http://localhost:3001/api/users/${userId}/follow`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setFollowStatus(null);
        loadFollowData();
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">Пользователь не найден</p>
        </div>
      </div>
    );
  }

  const canViewContent = isOwnProfile || !profileUser.is_private || followStatus === 'accepted';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Назад</span>
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {profileUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {profileUser.username}
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">@{profileUser.username}</p>
                  
                  <div className="flex space-x-6 mt-4">
                    <div className="text-center">
                      <div className="font-bold text-slate-900 dark:text-white text-xl">
                        {userMarkers.length}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Репорты</div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('followers')}
                      className="text-center hover:opacity-80 transition-opacity"
                    >
                      <div className="font-bold text-slate-900 dark:text-white text-xl">
                        {followers.length}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Подписчики</div>
                    </button>
                    <button 
                      onClick={() => setActiveTab('following')}
                      className="text-center hover:opacity-80 transition-opacity"
                    >
                      <div className="font-bold text-slate-900 dark:text-white text-xl">
                        {following.length}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Подписки</div>
                    </button>
                  </div>
                </div>
              </div>

              {!isOwnProfile && (
                <div>
                  {followStatus === 'accepted' ? (
                    <button
                      onClick={handleUnfollow}
                      className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Отписаться
                    </button>
                  ) : followStatus === 'pending' ? (
                    <button
                      disabled
                      className="px-6 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg cursor-not-allowed"
                    >
                      Запрошено
                    </button>
                  ) : (
                    <button
                      onClick={handleFollow}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Подписаться
                    </button>
                  )}
                </div>
              )}
            </div>

            {profileUser.is_private && !canViewContent && (
              <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg text-center">
                <p className="text-slate-600 dark:text-slate-400">
                  Это приватный аккаунт. Подпишитесь, чтобы видеть контент.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700">
            <div className="flex">
              {['posts', 'followers', 'following'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 text-center border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'posts' && 'Репорты'}
                  {tab === 'followers' && 'Подписчики'}
                  {tab === 'following' && 'Подписки'}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'posts' && (
                <UserPosts 
                  markers={userMarkers} 
                  canView={canViewContent}
                  isPrivate={profileUser.is_private}
                />
              )}

              {activeTab === 'followers' && (
                <UserList 
                  users={followers}
                  canView={canViewContent}
                  isPrivate={profileUser.is_private}
                  title="Подписчики"
                />
              )}

              {activeTab === 'following' && (
                <UserList 
                  users={following}
                  canView={canViewContent}
                  isPrivate={profileUser.is_private}
                  title="Подписки"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserPosts({ markers, canView, isPrivate }) {
  const navigate = useNavigate();

  if (!canView) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 dark:text-slate-500 text-lg">
          {isPrivate ? 'Контент скрыт приватными настройками' : 'Нет репортов'}
        </div>
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 dark:text-slate-500 text-lg">Нет репортов</div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {markers.map(marker => (
        <div key={marker.id} className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">{marker.title}</h3>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {new Date(marker.created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
            {marker.description || 'Без описания'}
          </p>
          <div className="flex items-center space-x-4 text-sm">
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {marker.category}/{marker.subcategory}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full ${
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
  );
}

function UserList({ users, canView, isPrivate, title }) {
  const navigate = useNavigate();

  if (!canView) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 dark:text-slate-500 text-lg">
          {isPrivate ? 'Список скрыт приватными настройками' : `Нет ${title.toLowerCase()}`}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 dark:text-slate-500 text-lg">Нет {title.toLowerCase()}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map(user => (
        <div 
          key={user.id}
          onClick={() => navigate(`/profile/${user.id}`)}
          className="flex items-center space-x-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
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
  );
}