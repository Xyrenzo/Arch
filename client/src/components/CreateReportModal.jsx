import React from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';

const categories = {
  problems: {
    label: '⚠️ Проблемы и жалобы',
    subcategories: [
      { value: 'environmental', label: '🌍 Экологические' },
      { value: 'conflicts', label: '⚡ Конфликты' },
      { value: 'infrastructure', label: '🏗️ Инфраструктура' },
      { value: 'complaints', label: '📝 Жалобы' }
    ]
  },
  transport: {
    label: '🚗 Транспортные средства',
    subcategories: [
      { value: 'buses', label: '🚌 Автобусы' },
      { value: 'scooters', label: '🛴 Самокаты' },
      { value: 'trains', label: '🚆 Поезда' }
    ]
  },
  events: {
    label: '🎪 Ивенты',
    subcategories: [
      { value: 'promotion', label: '🏷️ Акция' },
      { value: 'event', label: '🎪 Мероприятие' },
      { value: 'festival', label: '🎭 Фестиваль' }
    ]
  },
  emergencies: {
    label: '🚨 Экстренные случаи',
    subcategories: [
      { value: 'fire', label: '🔥 Пожар' },
      { value: 'ambulance', label: '🚑 Скорая' },
      { value: 'police', label: '🚓 Полиция' }
    ]
  }
};

function MapLocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
}

export default function CreateReportModal({ onClose }) {
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    category: 'problems',
    subcategory: 'environmental',
    latitude: 43.65,
    longitude: 51.17,
    event_start: '',
    event_end: ''
  });
  const [files, setFiles] = React.useState([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [mapMode, setMapMode] = React.useState(false);
  const { user } = useAuth();

  function handleFile(e) {
    const selectedFiles = Array.from(e.target.files).slice(0, 6);
    setFiles(selectedFiles);
  }

  const handleMapLocationSelect = (lat, lng) => {
    setForm(f => ({
      ...f,
      latitude: lat,
      longitude: lng
    }));
  };

  async function submit(e) {
    e.preventDefault();
    
    if (!user) {
      alert('Необходимо авторизоваться');
      return;
    }

    if (form.category === 'events') {
      if (!form.event_start || !form.event_end) {
        alert('Для ивентов необходимо указать дату начала и окончания');
        return;
      }
      
      const startDate = new Date(form.event_start);
      const endDate = new Date(form.event_end);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 14) {
        alert('Ивент не может длиться более 2 недель');
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('access');
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('subcategory', form.subcategory);
      fd.append('latitude', String(form.latitude));
      fd.append('longitude', String(form.longitude));
      
      if (form.category === 'events') {
        fd.append('event_start', form.event_start);
        fd.append('event_end', form.event_end);
      }
      
      files.forEach(f => fd.append('media', f));
      
      const res = await fetch('https://arch-lpaw.onrender.com/api/markers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      
      if (res.ok) {
        onClose();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Ошибка при создании репорта');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Ошибка при создании репорта');
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentCategory = categories[form.category];
  const isInAktau = form.latitude >= 43.62 && form.latitude <= 43.68 && 
                   form.longitude >= 51.12 && form.longitude <= 51.20;

  if (mapMode) {
    return (
      <div className="fixed inset-0 flex flex-col bg-white dark:bg-slate-800 z-50">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Выберите место на карте</h3>
            <button
              onClick={() => setMapMode(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Готово
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Нажмите на карту для выбора местоположения
          </p>
        </div>
        <div className="flex-1">
          <MapContainer 
            center={[form.latitude, form.longitude]} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapLocationPicker onLocationSelect={handleMapLocationSelect} />
          </MapContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Создать репорт
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

        <form onSubmit={submit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Заголовок *
            </label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Краткое описание проблемы..."
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Подробное описание
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Опишите проблему подробнее..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Категория
              </label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value, subcategory: categories[e.target.value].subcategories[0].value }))}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {Object.entries(categories).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Подкатегория
              </label>
              <select
                value={form.subcategory}
                onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                {currentCategory.subcategories.map(sub => (
                  <option key={sub.value} value={sub.value}>{sub.label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.category === 'events' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Начало ивента *
                </label>
                <input
                  type="datetime-local"
                  value={form.event_start}
                  onChange={e => setForm(f => ({ ...f, event_start: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Окончание ивента *
                </label>
                <input
                  type="datetime-local"
                  value={form.event_end}
                  onChange={e => setForm(f => ({ ...f, event_end: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Координаты (в пределах Актау)
              </label>
              <button
                type="button"
                onClick={() => setMapMode(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Выбрать на карте
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Широта</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={e => setForm(f => ({ ...f, latitude: Number(e.target.value) }))}
                  className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    isInAktau ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Долгота</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={e => setForm(f => ({ ...f, longitude: Number(e.target.value) }))}
                  className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    isInAktau ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'
                  }`}
                />
              </div>
            </div>
            <p className={`text-xs mt-2 ${
              isInAktau ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {isInAktau 
                ? '✅ Координаты в пределах Актау' 
                : '❌ Координаты вне Актау. Диапазон: Широта 43.62-43.68, Долгота 51.12-51.20'
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Медиафайлы (до 6 файлов)
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center transition-colors hover:border-blue-400">
              <input
                type="file"
                multiple
                onChange={handleFile}
                className="hidden"
                id="file-upload"
                accept="image/*,video/*"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-slate-600 dark:text-slate-400">
                  Нажмите для загрузки файлов
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {files.length > 0 ? `Выбрано файлов: ${files.length}` : 'PNG, JPG, MP4 до 30MB'}
                </p>
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles(f => f.filter((_, i) => i !== index))}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18-6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !form.title.trim() || !isInAktau || (form.category === 'events' && (!form.event_start || !form.event_end))}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Отправка...</span>
                </div>
              ) : (
                'Отправить репорт'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}