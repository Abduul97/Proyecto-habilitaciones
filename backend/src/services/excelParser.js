import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');

let cachedData = {
  eventos: null,
  rubros: null,
  habilitados: null,
  lastLoad: null
};

const CACHE_TTL = 5 * 60 * 1000; // 5 min

function shouldRefresh() {
  return !cachedData.lastLoad || (Date.now() - cachedData.lastLoad > CACHE_TTL);
}

export function parseEventos() {
  if (cachedData.eventos && !shouldRefresh()) return cachedData.eventos;
  
  const filePath = join(DATA_DIR, 'Planilla_de_excele_eventos.xlsx');
  if (!fs.existsSync(filePath)) return [];
  
  const workbook = XLSX.readFile(filePath);
  const eventos = [];
  
  // Palabras que indican que es una fila de header/basura, no un local real
  const palabrasExcluir = [
    'SUB SECRETARIA', 'INSPECCION GENERAL', 'EVENTOS AUTORIZADOS',
    'DIRECCION DE', 'HABILITACIONES', 'LOCAL', 'DOMICILIO', 'EVENTO',
    'HORA', 'ADICIONAL', 'PROV.', 'MUN.', 'COMPROBANTE', 'FIN DE SEMANA'
  ];
  
  function esFilaValida(local, domicilio, evento) {
    if (!local || String(local).trim() === '') return false;
    
    const localUpper = String(local).toUpperCase().trim();
    const domUpper = String(domicilio).toUpperCase().trim();
    const eventoUpper = String(evento).toUpperCase().trim();
    
    // Excluir si contiene palabras de header
    for (const palabra of palabrasExcluir) {
      if (localUpper.includes(palabra) || domUpper.includes(palabra) || eventoUpper.includes(palabra)) {
        return false;
      }
    }
    
    // Debe tener al menos local con contenido real
    return localUpper.length > 2;
  }
  
  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'Hoja1' || sheetName === 'Hoja2') continue;
    
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    // Find header row (contains LOCAL, DOMICILIO, EVENTO)
    let headerIdx = rows.findIndex(row => 
      row.some(cell => String(cell).toUpperCase().includes('LOCAL')) &&
      row.some(cell => String(cell).toUpperCase().includes('DOMICILIO'))
    );
    
    if (headerIdx === -1) continue;
    
    // Parse data rows
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;
      
      const fecha = row[0];
      const local = row[1];
      const domicilio = row[2];
      const evento = row[3];
      const hora = row[4] || '';
      const comprobante = row[5] || '';
      
      if (!esFilaValida(local, domicilio, evento)) continue;
      
      eventos.push({
        id: `${sheetName}-${i}`,
        fecha: parseFecha(fecha),
        local: String(local).trim(),
        domicilio: String(domicilio).trim(),
        evento: String(evento).trim(),
        hora: String(hora).trim(),
        comprobante: String(comprobante).trim(),
        periodo: sheetName
      });
    }
  }
  
  cachedData.eventos = eventos;
  cachedData.lastLoad = Date.now();
  return eventos;
}

function parseFecha(val) {
  if (!val || val === 'xx' || val === 'FECHA') return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
  }
  return String(val);
}

export function parseRubros() {
  if (cachedData.rubros && !shouldRefresh()) return cachedData.rubros;
  
  const filePath = join(DATA_DIR, 'Activ__de_Bajo_Riesgo.xlsx');
  if (!fs.existsSync(filePath)) return { rubros: [], requisitos: {} };
  
  const workbook = XLSX.readFile(filePath);
  const rubros = [];
  const requisitos = {};
  
  // Parse main sheet
  const mainSheet = workbook.Sheets['Riesgo Bajo'];
  if (mainSheet) {
    const rows = XLSX.utils.sheet_to_json(mainSheet);
    for (const row of rows) {
      const codigo = row['CODIGO '] || row['CODIGO'];
      const rubro = row['RUBROS'];
      if (!codigo || !rubro) continue;
      
      // Determinar tipo de local y requisitos específicos
      const reqComun = row['Requisitos local comercial comun'];
      const reqKiosco = row['Requisitos local comercial kiosco'];
      const reqAlimentos = row['Requisitos local comercial rubro alimentos '];
      const reqEspecial = row['Local comercial otros rubros con requisitos particulares'];
      
      let tipoLocal = 'comun';
      let reqAsignado = reqComun;
      
      if (reqKiosco) {
        tipoLocal = 'kiosco';
        reqAsignado = reqKiosco;
      } else if (reqAlimentos) {
        tipoLocal = 'alimentos';
        reqAsignado = reqAlimentos;
      } else if (reqEspecial) {
        tipoLocal = 'especial';
        reqAsignado = reqEspecial;
      }
      
      rubros.push({
        codigo: String(codigo).trim(),
        nombre: String(rubro).trim(),
        requisitos: reqAsignado || null,
        tipoLocal,
        // Guardar todos los requisitos aplicables
        requisitosAplicables: {
          comun: reqComun || null,
          kiosco: reqKiosco || null,
          alimentos: reqAlimentos || null,
          especial: reqEspecial || null
        }
      });
    }
  }
  
  // Parse requirement sheets - extraer TODOS los requisitos numerados
  for (const sheetName of workbook.SheetNames) {
    if (!sheetName.startsWith('Req-') && !sheetName.startsWith('Rep-')) continue;
    
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    const reqNum = sheetName.replace('Req-', '').replace('Rep-', '');
    const reqKey = `Requisitos ${parseInt(reqNum)}`;
    const reqDetails = [];
    let titulo = '';
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      
      // Buscar título del requisito (columna 3, primera fila con contenido largo)
      if (i === 0 && row[3] && typeof row[3] === 'string' && row[3].includes('REQUISITOS PARA')) {
        titulo = row[3].trim();
      }
      
      // Buscar requisitos numerados en la última columna con contenido
      const lastCol = row[row.length - 1] || row[3];
      if (lastCol && typeof lastCol === 'string') {
        // Detectar si empieza con número y paréntesis: "1)", "2)", etc.
        const match = lastCol.match(/^(\d+)[)\.\-]\s*(.+)/);
        if (match) {
          reqDetails.push({
            numero: parseInt(match[1]),
            texto: match[2].trim()
          });
        }
        // También capturar artículos de ordenanzas
        else if (lastCol.startsWith('Art.') || lastCol.startsWith('Según Ord')) {
          reqDetails.push({
            numero: reqDetails.length + 100, // Numeración alta para ordenanzas
            texto: lastCol.trim(),
            esOrdenanza: true
          });
        }
      }
    }
    
    requisitos[reqKey] = {
      titulo: titulo || `Requisitos tipo ${reqNum}`,
      items: reqDetails.sort((a, b) => a.numero - b.numero),
      cantidadRequisitos: reqDetails.filter(r => !r.esOrdenanza).length,
      tieneOrdenanzas: reqDetails.some(r => r.esOrdenanza)
    };
  }
  
  cachedData.rubros = { rubros, requisitos };
  return cachedData.rubros;
}

export function parseHabilitados() {
  if (cachedData.habilitados && !shouldRefresh()) return cachedData.habilitados;
  
  const filePath = join(DATA_DIR, 'Habilitado_tattito.xlsx');
  if (!fs.existsSync(filePath)) return [];
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Hoja1'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  
  const habilitados = [];
  
  // Categorías y sus filas de inicio
  const categorias = [
    { nombre: 'BAR-PUB', inicio: 7, fin: 74 },
    { nombre: 'BOLICHE', inicio: 75, fin: 90 },
    { nombre: 'SALON DE FIESTAS', inicio: 91, fin: 127 },
    { nombre: 'CLUB-CENTRO VECINAL', inicio: 128, fin: 999 }
  ];
  
  function getCategoria(rowIndex) {
    for (const cat of categorias) {
      if (rowIndex >= cat.inicio && rowIndex <= cat.fin) return cat.nombre;
    }
    return 'OTRO';
  }
  
  function parseExcelDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'number') {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
    }
    return String(val);
  }
  
  function calcularEstado(diasRestantes) {
    if (diasRestantes === null || isNaN(diasRestantes)) return 'sin_datos';
    if (diasRestantes < 0) return 'vencido';
    if (diasRestantes <= 30) return 'por_vencer';
    return 'vigente';
  }
  
  function limpiarTexto(val) {
    if (!val) return null;
    return String(val).trim();
  }
  
  let currentLocal = null;
  let lastNombre = null;
  let id = 0;
  
  for (let i = 8; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(cell => cell === null || cell === '')) continue;
    
    const col0 = limpiarTexto(row[0]); // Local
    const col1 = limpiarTexto(row[1]); // Domicilio
    const col2 = limpiarTexto(row[2]); // Cobertura médica
    const col3 = limpiarTexto(row[3]); // Seguro resp. civil
    const col4 = row[4]; // Fecha vencimiento
    const col5 = row[5]; // Fecha alerta
    const col6 = row[6]; // Días restantes
    const col7 = limpiarTexto(row[7]); // Capacidad ocupación
    const col8 = limpiarTexto(row[8]); // Teléfono
    
    // Detectar si es título de sección (ignorar) - son los que NO tienen domicilio
    const esTituloSeccion = col0 && !col1 && !col2 && !col3 && 
        (col0 === 'BAR- PUB-' || col0 === 'BOLICHES' || 
         col0 === 'SALON DE FIESTA' || col0 === 'CLUB- CENTRO VECINALES');
    if (esTituloSeccion) continue;
    
    // Fila con cobertura médica (col2 tiene valor) = primera fila del local
    if (col2 && !col3) {
      // Guardar el anterior si existe
      if (currentLocal) {
        habilitados.push(currentLocal);
      }
      
      id++;
      lastNombre = col0;
      currentLocal = {
        id,
        nombre: col0 || 'Sin nombre',
        domicilio: col1 || '',
        categoria: getCategoria(i),
        coberturaMedica: {
          empresa: col2,
          vencimiento: parseExcelDate(col4),
          alerta: parseExcelDate(col5),
          diasRestantes: typeof col6 === 'number' ? Math.round(col6) : null,
          estado: calcularEstado(col6)
        },
        seguroRespCivil: {
          empresa: null,
          vencimiento: null,
          alerta: null,
          diasRestantes: null,
          estado: 'sin_datos'
        },
        capacidad: col7,
        telefono: col8,
        estadoGeneral: 'sin_datos'
      };
    }
    // Fila con seguro (col3 tiene valor) = segunda fila del mismo local
    else if (col3 && currentLocal && (col0 === lastNombre || col0 === currentLocal.nombre)) {
      currentLocal.seguroRespCivil = {
        empresa: col3,
        vencimiento: parseExcelDate(col4),
        alerta: parseExcelDate(col5),
        diasRestantes: typeof col6 === 'number' ? Math.round(col6) : null,
        estado: calcularEstado(col6)
      };
      
      // Si hay capacidad/tel en esta fila y no en la anterior
      if (col7 && !currentLocal.capacidad) currentLocal.capacidad = col7;
      if (col8 && !currentLocal.telefono) currentLocal.telefono = col8;
      
      // Calcular estado general (el peor de ambos)
      const estados = ['vencido', 'por_vencer', 'vigente', 'sin_datos'];
      const estadoMedica = estados.indexOf(currentLocal.coberturaMedica.estado);
      const estadoSeguro = estados.indexOf(currentLocal.seguroRespCivil.estado);
      currentLocal.estadoGeneral = estados[Math.min(estadoMedica, estadoSeguro)];
    }
  }
  
  // No olvidar el último
  if (currentLocal) {
    habilitados.push(currentLocal);
  }
  
  cachedData.habilitados = habilitados;
  return cachedData.habilitados;
}

export function searchAll(query) {
  const q = query.toLowerCase();
  const results = {
    eventos: [],
    rubros: [],
    habilitados: []
  };
  
  const eventos = parseEventos();
  results.eventos = eventos.filter(e => 
    e.local.toLowerCase().includes(q) ||
    e.domicilio.toLowerCase().includes(q) ||
    e.evento.toLowerCase().includes(q)
  ).slice(0, 10);
  
  const { rubros } = parseRubros();
  results.rubros = rubros.filter(r =>
    r.nombre.toLowerCase().includes(q) ||
    r.codigo.includes(q)
  ).slice(0, 10);
  
  const habilitados = parseHabilitados();
  results.habilitados = habilitados.filter(h =>
    String(h.nombre).toLowerCase().includes(q) ||
    String(h.domicilio).toLowerCase().includes(q)
  ).slice(0, 10);
  
  return results;
}
