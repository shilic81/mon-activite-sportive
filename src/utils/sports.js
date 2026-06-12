export const SPORT_CONFIG = {
  Run: { label: 'Course', icon: '🏃', color: '#fc4c02' },
  Ride: { label: 'Vélo', icon: '🚴', color: '#4a9eff' },
  Swim: { label: 'Natation', icon: '🏊', color: '#2dd4a0' },
  Hike: { label: 'Randonnée', icon: '🥾', color: '#f59e0b' },
  Walk: { label: 'Marche', icon: '🚶', color: '#a78bfa' },
  TrailRun: { label: 'Trail', icon: '⛰️', color: '#f97316' },
  VirtualRide: { label: 'Vélo virtuel', icon: '🖥️', color: '#60a5fa' },
  VirtualRun: { label: 'Course virtuelle', icon: '🏃', color: '#fb923c' },
  WeightTraining: { label: 'Musculation', icon: '🏋️', color: '#c084fc' },
  Yoga: { label: 'Yoga', icon: '🧘', color: '#86efac' },
  Crossfit: { label: 'CrossFit', icon: '💪', color: '#fbbf24' },
  Kayaking: { label: 'Kayak', icon: '🛶', color: '#22d3ee' },
  Surfing: { label: 'Surf', icon: '🏄', color: '#06b6d4' },
  Soccer: { label: 'Football', icon: '⚽', color: '#4ade80' },
  Tennis: { label: 'Tennis', icon: '🎾', color: '#84cc16' },
  Skiing: { label: 'Ski', icon: '⛷️', color: '#e0f2fe' },
  Snowboard: { label: 'Snowboard', icon: '🏂', color: '#bae6fd' },
  RockClimbing: { label: 'Escalade', icon: '🧗', color: '#fb7185' },
  Rowing: { label: 'Aviron', icon: '🚣', color: '#67e8f9' },
  Workout: { label: 'Entraînement', icon: '🏅', color: '#d1d5db' },
  Other: { label: 'Autre', icon: '⚡', color: '#9ca3af' }
}

export const getSportConfig = (type) => SPORT_CONFIG[type] || SPORT_CONFIG.Other

export const formatDistance = (meters) => {
  if (!meters) return '—'
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`
}

export const formatDuration = (seconds) => {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const formatPace = (speedMs, type) => {
  if (!speedMs || speedMs === 0) return '—'
  if (type?.toLowerCase().includes('ride') || type?.toLowerCase().includes('cycling')) {
    return `${(speedMs * 3.6).toFixed(1)} km/h`
  }
  const paceSecPerKm = 1000 / speedMs
  const min = Math.floor(paceSecPerKm / 60)
  const sec = Math.round(paceSecPerKm % 60)
  return `${min}:${sec.toString().padStart(2, '0')} /km`
}
