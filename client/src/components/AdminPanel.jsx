import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AdminPanel() {
  const [markers, setMarkers] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('markers');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkAdminAccess();
      loadData();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('access');
      const response = await fetch('http://localhost:3001/api/admin/check', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Admin access check failed:', error);
      window.location.href = '/';
    }
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem('access');
      
      const markersResponse = await fetch('http://localhost:3001/api/markers?categories=problems,transport,emergencies,events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const markersData = await markersResponse.json();
      setMarkers(markersData.reverse());

      const usersResponse = await fetch('http://localhost:3001/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMarkerStatus = async (markerId, newStatus) => {
    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`http://localhost:3001/api/markers/${markerId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setMarkers(prev => prev.map(m => 
          m.id === markerId ? { ...m, status: newStatus } : m
        ));
      }
    } catch (error) {
      console.error('Error updating marker status:', error);
    }
  };

  const deleteMarker = async (markerId) => {
    if (!confirm('Вы уверены, что хотите удалить этот репорт?')) return;

    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`http://localhost:3001/api/markers/${markerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMarkers(prev => prev.filter(m => m.id !== markerId));
      }
    } catch (error) {
      console.error('Error deleting marker:', error);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    try {
      const token = localStorage.getItem('access');
      const response = await fetch(`http://localhost:3001/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Загрузка админ панели...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Панель администратора
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Управление репортами и пользователями системы
          </p>
        </div>

        <div className="mb-6">
          <div className="flex space-x-1 bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
            {[
              { id: 'markers', label: '📊 Репорты', count: markers.length },
              { id: 'users', label: '👥 Пользователи', count: users.length },
              { id: 'analytics', label: '📈 Аналитика' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          {activeTab === 'markers' && (
            <MarkersTable 
              markers={markers}
              onUpdateStatus={updateMarkerStatus}
              onDelete={deleteMarker}
            />
          )}

          {activeTab === 'users' && (
            <UsersTable 
              users={users}
              onDelete={deleteUser}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard markers={markers} users={users} />
          )}
        </div>
      </div>
    </div>
  );
}

function MarkersTable({ markers, onUpdateStatus, onDelete }) {
  const [filter, setFilter] = useState('all');

  const filteredMarkers = markers.filter(marker => {
    if (filter === 'all') return true;
    return marker.status === filter;
  });

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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Управление репортами
        </h2>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
        >
          <option value="all">Все статусы</option>
          <option value="sent">Отправлено</option>
          <option value="processing">В обработке</option>
          <option value="resolved">Рассмотрено</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-600">
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">ID</th>
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Заголовок</th>
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Категория</th>
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Статус</th>
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Дата</th>
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredMarkers.map(marker => (
              <tr key={marker.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750">
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">#{marker.id}</td>
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{marker.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                      {marker.description || 'Без описания'}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {marker.category}/{marker.subcategory}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <select
                    value={marker.status}
                    onChange={(e) => onUpdateStatus(marker.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${statusColors[marker.status]}`}
                  >
                    <option value="sent">Отправлено</option>
                    <option value="processing">В обработке</option>
                    <option value="resolved">Рассмотрено</option>
                  </select>
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-sm">
                  {new Date(marker.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onDelete(marker.id)}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                      title="Удалить"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMarkers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 dark:text-slate-500 text-lg">Нет репортов</div>
            <div className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              {markers.length === 0 ? 'Репортов пока нет' : 'Попробуйте изменить фильтр'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTable({ users, onDelete }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
        Управление пользователями
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-600">
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">ID</th>
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Пользователь</th>
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Роль</th>
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Дата регистрации</th>
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Репортов</th>
              <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750">
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">#{user.id}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{user.username}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                  }`}>
                    {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-sm">
                  {new Date(user.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                  {user.markers_count || 0}
                </td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => onDelete(user.id)}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                        title="Удалить пользователя"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 dark:text-slate-500 text-lg">Нет пользователей</div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsDashboard({ markers, users }) {
  const stats = {
    totalMarkers: markers.length,
    sentMarkers: markers.filter(m => m.status === 'sent').length,
    processingMarkers: markers.filter(m => m.status === 'processing').length,
    resolvedMarkers: markers.filter(m => m.status === 'resolved').length,
    totalUsers: users.length,
    adminUsers: users.filter(u => u.role === 'admin').length
  };

  const categoryStats = markers.reduce((acc, marker) => {
    acc[marker.category] = (acc[marker.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
        Аналитика системы
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Всего репортов" value={stats.totalMarkers} color="blue" />
        <StatCard title="Отправлено" value={stats.sentMarkers} color="red" />
        <StatCard title="В обработке" value={stats.processingMarkers} color="yellow" />
        <StatCard title="Рассмотрено" value={stats.resolvedMarkers} color="green" />
        <StatCard title="Пользователи" value={stats.totalUsers} color="purple" />
        <StatCard title="Админы" value={stats.adminUsers} color="indigo" />
      </div>

      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Распределение по категориям
        </h3>
        <div className="space-y-3">
          {Object.entries(categoryStats).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300 capitalize">{category}</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(count / stats.totalMarkers) * 100}%` }}
                  ></div>
                </div>
                <span className="text-slate-600 dark:text-slate-400 text-sm w-8 text-right">
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${colorClasses[color]} mb-3`}>
        <span className="text-lg font-semibold">{value}</span>
      </div>
      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</div>
    </div>
  );
}