const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }
  
  return response.json();
}

export const api = {
  // Eventos
  getEventos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/eventos${query ? `?${query}` : ''}`);
  },
  getEventosStats: () => request('/eventos/stats'),
  createEvento: (data) => request('/eventos', { method: 'POST', body: JSON.stringify(data) }),
  updateEvento: (id, data) => request(`/eventos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvento: (id) => request(`/eventos/${id}`, { method: 'DELETE' }),
  
  // Rubros
  getRubros: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rubros${query ? `?${query}` : ''}`);
  },
  getRubro: (codigo) => request(`/rubros/${codigo}`),
  getRequisitos: () => request('/rubros/requisitos'),
  
  // Habilitados
  getHabilitados: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/habilitados${query ? `?${query}` : ''}`);
  },
  getHabilitado: (id) => request(`/habilitados/${id}`),
  getHabilitadosStats: () => request('/habilitados/stats'),
  getHabilitadosVencidos: () => request('/habilitados/vencidos'),
  createHabilitado: (data) => request('/habilitados', { method: 'POST', body: JSON.stringify(data) }),
  updateHabilitado: (id, data) => request(`/habilitados/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHabilitado: (id) => request(`/habilitados/${id}`, { method: 'DELETE' }),
  
  // Chat
  sendMessage: (message) => request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message })
  }),
  
  // Health
  health: () => request('/health')
};
