import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { parseEventos, parseRubros, parseHabilitados } from './excelParser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_FILE = join(__dirname, '../../data/database.json');

let db = {
  eventos: [],
  rubros: [],
  requisitos: {},
  habilitados: [],
  initialized: false,
  lastModified: null
};

function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      db = { ...data, initialized: true };
      return true;
    } catch (e) {
      console.error('Error loading database:', e);
    }
  }
  return false;
}

function saveDB() {
  db.lastModified = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export function initDatabase() {
  if (loadDB() && db.initialized) {
    console.log('Database loaded from file');
    return;
  }
  
  // Initialize from Excel files
  console.log('Initializing database from Excel files...');
  db.eventos = parseEventos();
  const rubrosData = parseRubros();
  db.rubros = rubrosData.rubros;
  db.requisitos = rubrosData.requisitos;
  db.habilitados = parseHabilitados();
  db.initialized = true;
  saveDB();
  console.log(`Database initialized: ${db.eventos.length} eventos, ${db.rubros.length} rubros, ${db.habilitados.length} habilitados`);
}

// ============ EVENTOS ============
export function getEventos(filters = {}) {
  let result = [...db.eventos];
  
  if (filters.local) {
    result = result.filter(e => e.local.toLowerCase().includes(filters.local.toLowerCase()));
  }
  if (filters.fecha) {
    result = result.filter(e => e.fecha && e.fecha.includes(filters.fecha));
  }
  if (filters.pagado !== undefined) {
    const pagado = filters.pagado === 'true' || filters.pagado === true;
    result = result.filter(e => e.pagado === pagado);
  }
  if (filters.desde) {
    result = result.filter(e => e.fecha && e.fecha >= filters.desde);
  }
  if (filters.hasta) {
    result = result.filter(e => e.fecha && e.fecha <= filters.hasta);
  }
  
  return result;
}

export function getEventoById(id) {
  return db.eventos.find(e => e.id === id);
}

export function createEvento(data) {
  const id = `manual-${Date.now()}`;
  const evento = {
    id,
    fecha: data.fecha || null,
    local: data.local,
    domicilio: data.domicilio || '',
    evento: data.evento || '',
    hora: data.hora || '',
    comprobante: data.comprobante || '',
    comprobantePDF: data.comprobantePDF || null,
    pagado: data.pagado || false,
    periodo: 'manual',
    createdAt: new Date().toISOString()
  };
  db.eventos.unshift(evento);
  saveDB();
  return evento;
}

export function updateEvento(id, data) {
  const idx = db.eventos.findIndex(e => e.id === id);
  if (idx === -1) return null;
  
  db.eventos[idx] = { ...db.eventos[idx], ...data, updatedAt: new Date().toISOString() };
  saveDB();
  return db.eventos[idx];
}

export function deleteEvento(id) {
  const idx = db.eventos.findIndex(e => e.id === id);
  if (idx === -1) return false;
  
  db.eventos.splice(idx, 1);
  saveDB();
  return true;
}

// ============ HABILITADOS ============
export function getHabilitados(filters = {}) {
  let result = [...db.habilitados];
  
  if (filters.q) {
    const search = filters.q.toLowerCase();
    result = result.filter(h => 
      h.nombre.toLowerCase().includes(search) ||
      h.domicilio.toLowerCase().includes(search)
    );
  }
  if (filters.categoria) {
    result = result.filter(h => h.categoria === filters.categoria);
  }
  if (filters.estado) {
    result = result.filter(h => h.estadoGeneral === filters.estado);
  }
  
  return result;
}

export function getHabilitadoById(id) {
  return db.habilitados.find(h => h.id === id);
}

export function createHabilitado(data) {
  const id = Math.max(...db.habilitados.map(h => h.id), 0) + 1;
  
  const habilitado = {
    id,
    nombre: data.nombre,
    domicilio: data.domicilio || '',
    categoria: data.categoria || 'BAR-PUB',
    coberturaMedica: {
      empresa: data.coberturaMedicaEmpresa || null,
      vencimiento: data.coberturaMedicaVenc || null,
      alerta: null,
      diasRestantes: calcularDiasRestantes(data.coberturaMedicaVenc),
      estado: calcularEstado(calcularDiasRestantes(data.coberturaMedicaVenc))
    },
    seguroRespCivil: {
      empresa: data.seguroEmpresa || null,
      vencimiento: data.seguroVenc || null,
      alerta: null,
      diasRestantes: calcularDiasRestantes(data.seguroVenc),
      estado: calcularEstado(calcularDiasRestantes(data.seguroVenc))
    },
    capacidad: data.capacidad || null,
    telefono: data.telefono || null,
    estadoGeneral: 'sin_datos',
    createdAt: new Date().toISOString()
  };
  
  habilitado.estadoGeneral = calcularEstadoGeneral(habilitado);
  db.habilitados.unshift(habilitado);
  saveDB();
  return habilitado;
}

export function updateHabilitado(id, data) {
  const idx = db.habilitados.findIndex(h => h.id === id);
  if (idx === -1) return null;
  
  const hab = db.habilitados[idx];
  
  // Update basic fields
  if (data.nombre) hab.nombre = data.nombre;
  if (data.domicilio) hab.domicilio = data.domicilio;
  if (data.categoria) hab.categoria = data.categoria;
  if (data.capacidad !== undefined) hab.capacidad = data.capacidad;
  if (data.telefono !== undefined) hab.telefono = data.telefono;
  
  // Update cobertura medica
  if (data.coberturaMedicaEmpresa !== undefined) {
    hab.coberturaMedica.empresa = data.coberturaMedicaEmpresa;
  }
  if (data.coberturaMedicaVenc !== undefined) {
    hab.coberturaMedica.vencimiento = data.coberturaMedicaVenc;
    hab.coberturaMedica.diasRestantes = calcularDiasRestantes(data.coberturaMedicaVenc);
    hab.coberturaMedica.estado = calcularEstado(hab.coberturaMedica.diasRestantes);
  }
  
  // Update seguro
  if (data.seguroEmpresa !== undefined) {
    hab.seguroRespCivil.empresa = data.seguroEmpresa;
  }
  if (data.seguroVenc !== undefined) {
    hab.seguroRespCivil.vencimiento = data.seguroVenc;
    hab.seguroRespCivil.diasRestantes = calcularDiasRestantes(data.seguroVenc);
    hab.seguroRespCivil.estado = calcularEstado(hab.seguroRespCivil.diasRestantes);
  }
  
  hab.estadoGeneral = calcularEstadoGeneral(hab);
  hab.updatedAt = new Date().toISOString();
  
  saveDB();
  return hab;
}

export function deleteHabilitado(id) {
  const idx = db.habilitados.findIndex(h => h.id === id);
  if (idx === -1) return false;
  
  db.habilitados.splice(idx, 1);
  saveDB();
  return true;
}

// ============ RUBROS ============
export function getRubros(filters = {}) {
  let result = [...db.rubros];
  
  if (filters.q) {
    result = result.filter(r => 
      r.nombre.toLowerCase().includes(filters.q.toLowerCase()) ||
      r.codigo.includes(filters.q)
    );
  }
  if (filters.tipo) {
    result = result.filter(r => r.tipoLocal === filters.tipo);
  }
  
  return result;
}

export function getRubroById(codigo) {
  const rubro = db.rubros.find(r => r.codigo === codigo);
  if (!rubro) return null;
  
  const reqKey = rubro.requisitos;
  const reqData = db.requisitos[reqKey] || null;
  
  return {
    ...rubro,
    requisitosDetalle: reqData ? reqData.items.map(r => r.texto) : [],
    requisitosTitulo: reqData ? reqData.titulo : null,
    requisitosCompleto: reqData
  };
}

export function getRequisitos() {
  return db.requisitos;
}

// ============ STATS ============
export function getEventosStats() {
  const eventos = db.eventos;
  const locales = [...new Set(eventos.map(e => e.local))];
  const tiposEvento = [...new Set(eventos.map(e => e.evento).filter(Boolean))];
  
  return {
    total: eventos.length,
    localesUnicos: locales.length,
    tiposEvento: tiposEvento.length,
    localesTop: locales.slice(0, 10)
  };
}

export function getHabilitadosStats() {
  const habilitados = db.habilitados;
  
  const porEstado = {
    vigente: habilitados.filter(h => h.estadoGeneral === 'vigente').length,
    por_vencer: habilitados.filter(h => h.estadoGeneral === 'por_vencer').length,
    vencido: habilitados.filter(h => h.estadoGeneral === 'vencido').length,
    sin_datos: habilitados.filter(h => h.estadoGeneral === 'sin_datos').length
  };
  
  const porCategoria = {};
  habilitados.forEach(h => {
    porCategoria[h.categoria] = (porCategoria[h.categoria] || 0) + 1;
  });
  
  const alertas = habilitados.filter(h => 
    h.estadoGeneral === 'por_vencer' || h.estadoGeneral === 'vencido'
  ).map(h => ({
    id: h.id,
    nombre: h.nombre,
    categoria: h.categoria,
    estado: h.estadoGeneral,
    diasMedica: h.coberturaMedica.diasRestantes,
    diasSeguro: h.seguroRespCivil.diasRestantes
  }));
  
  return {
    total: habilitados.length,
    porEstado,
    porCategoria,
    alertas: alertas.slice(0, 20),
    totalAlertas: alertas.length
  };
}

// ============ HELPERS ============
function calcularDiasRestantes(fechaVenc) {
  if (!fechaVenc) return null;
  const venc = new Date(fechaVenc);
  const hoy = new Date();
  const diff = Math.floor((venc - hoy) / (1000 * 60 * 60 * 24));
  return diff;
}

function calcularEstado(diasRestantes) {
  if (diasRestantes === null) return 'sin_datos';
  if (diasRestantes < 0) return 'vencido';
  if (diasRestantes <= 30) return 'por_vencer';
  return 'vigente';
}

function calcularEstadoGeneral(hab) {
  const estados = ['vencido', 'por_vencer', 'vigente', 'sin_datos'];
  const estadoMedica = estados.indexOf(hab.coberturaMedica.estado);
  const estadoSeguro = estados.indexOf(hab.seguroRespCivil.estado);
  return estados[Math.min(estadoMedica, estadoSeguro)];
}

// Export db for direct access if needed
export function getDB() {
  return db;
}
