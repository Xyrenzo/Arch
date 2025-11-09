import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MarkerCard from '../components/MarkerCard';
import CreateReportModal from '../components/CreateReportModal';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../context/AuthContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const center = [43.65, 51.17];

const createCustomIcon = (color, emoji) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color}; 
        border: 3px solid white; 
        border-radius: 50%; 
        width: 40px; 
        height: 40px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        box-shadow: 0 2px 10px rgba(0,0,0,0.3); 
        font-size: 16px;
        font-weight: bold;
      ">
        ${emoji}
      </div>
    `,
    className: 'custom-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

const categoryStyles = {
  problems: {
    environmental: createCustomIcon('#10b981', '🌱'),
    conflicts: createCustomIcon('#6b7280', '⚡'),
    infrastructure: createCustomIcon('#ef4444', '⚠️'),
    complaints: createCustomIcon('#dc2626', '❗'),
    default: createCustomIcon('#ef4444', '⚠️')
  },
  transport: {
    buses: createCustomIcon('#3b82f6', '🚌'),
    scooters: createCustomIcon('#3b82f6', '🛴'),
    trains: createCustomIcon('#3b82f6', '🚆'),
    default: createCustomIcon('#3b82f6', '🚗')
  },
  emergencies: {
    fire: createCustomIcon('#f97316', '🔥'),
    ambulance: createCustomIcon('#ffffff', '➕'),
    police: createCustomIcon('#dc2626', '🚓'),
    default: createCustomIcon('#f97316', '🚨')
  },
  events: {
    promotion: createCustomIcon('#8b5cf6', '🏷️'),
    event: createCustomIcon('#8b5cf6', '🎪'),
    festival: createCustomIcon('#8b5cf6', '🎭'),
    default: createCustomIcon('#8b5cf6', '🎪')
  }
};

function LocationPicker({ onLocationSelect, isSelecting }) {
  const [tempMarker, setTempMarker] = useState(null);
  
  useMapEvents({
    click(e) {
      if (isSelecting) {
        const { lat, lng } = e.latlng;
        setTempMarker([lat, lng]);
        onLocationSelect(lat, lng);
      }
    },
  });

  if (!isSelecting || !tempMarker) return null;

  return (
    <Marker 
      position={tempMarker}
      icon={L.divIcon({
        html: '📍',
        className: 'temp-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      })}
    />
  );
}

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

export default function MapPage() {
  const [filters, setFilters] = useState({ 
    categories: [],
    subcategories: []
  });
  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { user, loading } = useAuth();

  const loadMarkers = async () => {
    try {
      const token = localStorage.getItem('access');
      const qs = new URLSearchParams();
      if (filters.categories.length) qs.set('categories', filters.categories.join(','));
      if (filters.subcategories.length) qs.set('subcategories', filters.subcategories.join(','));
    
      const response = await fetch(`https://arch-lpaw.onrender.com/api/markers-with-likes?${qs.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    
      if (response.ok) {
        const data = await response.json();
         setMarkers(data);
      }
    } catch (error) {
      console.error('Error loading markers:', error);
    }
  };
  useEffect(() => {
    if (filters.categories.length > 0 || filters.subcategories.length > 0) {
      loadMarkers();
    } else {
      setMarkers([]);
    }
  }, [filters]);

  const toggleCategory = (cat) => {
    setFilters(f => {
      const exists = f.categories.includes(cat);
      const newCategories = exists 
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat];
      
      const categorySubs = Object.keys(categoryConfig[cat]?.subcategories || {});
      const newSubcategories = exists
        ? f.subcategories.filter(s => !categorySubs.includes(s))
        : [...f.subcategories, ...categorySubs];
      
      return { 
        categories: newCategories,
        subcategories: newSubcategories
      };
    });
  };

  const toggleSubcategory = (sub) => {
    setFilters(f => ({
      ...f,
      subcategories: f.subcategories.includes(sub) 
        ? f.subcategories.filter(s => s !== sub)
        : [...f.subcategories, sub]
    }));
  };

  const clearFilters = () => {
    setFilters({ categories: [], subcategories: [] });
    setMarkers([]);
  };

  const getMarkerIcon = (marker) => {
    const categoryStyle = categoryStyles[marker.category];
    if (!categoryStyle) return categoryStyles.problems.default;
    
    return categoryStyle[marker.subcategory] || categoryStyle.default;
  };

  const handleCreateReport = () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setOpenCreate(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg md:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
            </button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Arch Community
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCreateReport}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:block">Создать</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto transition-transform duration-300 ${
          showFilters ? 'absolute inset-y-0 left-0 z-30 md:relative' : 'hidden md:block'
        }`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Фильтры</h2>
              <div className="flex items-center space-x-2">
                {(filters.categories.length > 0 || filters.subcategories.length > 0) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Очистить
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-slate-700 dark:text-slate-300 text-sm">Категории</h3>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <div key={key} className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(key)}
                      onChange={() => toggleCategory(key)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 transition-all"
                    />
                    <span className="flex-1 text-slate-700 dark:text-slate-300 font-medium text-sm">
                      {config.label}
                    </span>
                  </label>

                  {filters.categories.includes(key) && (
                    <div className="ml-4 space-y-2 animate-fade-in">
                      {Object.entries(config.subcategories).map(([subKey, subConfig]) => (
                        <label key={subKey} className="flex items-center space-x-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all duration-200">
                          <input
                            type="checkbox"
                            checked={filters.subcategories.includes(subKey)}
                            onChange={() => toggleSubcategory(subKey)}
                            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 transition-all"
                          />
                          <span className={`flex-1 text-xs px-2 py-1 rounded-full ${subConfig.color} transition-all ${
                            filters.subcategories.includes(subKey) ? 'ring-2 ring-purple-400' : ''
                          }`}>
                            {subConfig.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {(filters.categories.length > 0 || filters.subcategories.length > 0) && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">Активные фильтры</h3>
                <div className="flex flex-wrap gap-1">
                  {filters.categories.map(cat => (
                    <span key={cat} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {categoryConfig[cat]?.label}
                    </span>
                  ))}
                  {filters.subcategories.map(sub => {
                    const parentCat = Object.keys(categoryConfig).find(cat => 
                      categoryConfig[cat]?.subcategories[sub]
                    );
                    const subConfig = categoryConfig[parentCat]?.subcategories[sub];
                    return subConfig ? (
                      <span key={sub} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${subConfig.color}`}>
                        {subConfig.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {filters.categories.length === 0 && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Выберите категории для отображения меток на карте
                </p>
              </div>
            )}
          </div>
        </aside>
        
        <main className="flex-1 relative">
          <MapContainer 
            center={center} 
            zoom={13} 
            className="w-full h-full"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {openCreate && (
              <LocationPicker 
                onLocationSelect={(lat, lng) => {}}
                isSelecting={openCreate}
              />
            )}

            {markers.map(m => (
              <Marker 
                key={m.id} 
                position={[m.latitude, m.longitude]} 
                icon={getMarkerIcon(m)}
                eventHandlers={{
                  click: () => setSelected(m)
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h4 className="font-semibold text-sm mb-1">{m.title}</h4>
                    <p className="text-xs text-slate-600 mb-2">
                      {categoryConfig[m.category]?.label} / {categoryConfig[m.category]?.subcategories[m.subcategory]?.label}
                    </p>
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      m.status === 'sent' ? 'bg-red-100 text-red-800' :
                      m.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {m.status === 'sent' ? 'Отправлено' : m.status === 'processing' ? 'В обработке' : 'Рассмотрено'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {selected && (
            <div className="absolute top-2 right-2 left-2 md:left-auto md:right-2 md:top-2 z-40 max-w-full md:max-w-md">
              <MarkerCard 
                marker={selected} 
                onClose={() => setSelected(null)}
                onUpdate={loadMarkers}
              />
            </div>
          )}
        </main>
      </div>

      {openCreate && (
        <CreateReportModal 
          onClose={() => {
            setOpenCreate(false);
            loadMarkers();
          }} 
        />
      )}
      
      {showAuth && (
        <AuthModal 
          onClose={() => setShowAuth(false)}
          onSuccess={loadMarkers}
        />
      )}

      {showFilters && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}