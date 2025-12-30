import { getRubros, getRequisitos, getEventos, getHabilitados } from './database.js';

const INTENTS = {
  REQUISITOS: ['requisito', 'necesito', 'qué necesito', 'documentos', 'tramite', 'habilitar'],
  BUSCAR_RUBRO: ['rubro', 'actividad', 'código', 'codigo', 'buscar'],
  EVENTOS: ['evento', 'fiesta', 'autorización', 'autorizacion', 'fin de semana'],
  HABILITADOS: ['habilitado', 'espectáculo', 'espectaculo', 'local'],
  SALUDO: ['hola', 'buenos días', 'buenas tardes', 'buen día'],
  AYUDA: ['ayuda', 'help', 'qué puedo', 'cómo funciona']
};

function detectIntent(message) {
  const lower = message.toLowerCase();
  
  for (const [intent, keywords] of Object.entries(INTENTS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return intent;
    }
  }
  return 'GENERAL';
}

function extractRubroQuery(message) {
  // Extract potential rubro codes (5 digits)
  const codeMatch = message.match(/\b\d{5}\b/);
  if (codeMatch) return codeMatch[0];
  
  // Extract keywords after common phrases
  const patterns = [
    /para\s+(?:abrir\s+)?(?:un[a]?\s+)?(.+)/i,
    /sobre\s+(.+)/i,
    /rubro\s+(?:de\s+)?(.+)/i,
    /actividad\s+(?:de\s+)?(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[1].trim();
  }
  
  return message;
}

export function processMessage(message) {
  const intent = detectIntent(message);
  
  switch (intent) {
    case 'SALUDO':
      return {
        text: '¡Hola! Soy el asistente de Habilitaciones Municipales. Puedo ayudarte con:\n\n' +
              '• Requisitos para habilitar tu comercio\n' +
              '• Buscar rubros y códigos de actividad\n' +
              '• Consultar eventos autorizados\n' +
              '• Ver locales habilitados\n\n' +
              '¿En qué puedo ayudarte?',
        suggestions: ['¿Qué necesito para abrir un kiosco?', 'Buscar rubro farmacia', 'Eventos del fin de semana']
      };
      
    case 'AYUDA':
      return {
        text: 'Puedo ayudarte con consultas sobre habilitaciones comerciales. Algunos ejemplos:\n\n' +
              '• "¿Qué requisitos necesito para una farmacia?"\n' +
              '• "Buscar rubro 52410"\n' +
              '• "¿Qué eventos hay autorizados?"\n' +
              '• "Locales habilitados en calle X"',
        suggestions: ['Requisitos para local de comidas', 'Buscar rubro veterinaria', 'Ver requisitos generales']
      };
      
    case 'REQUISITOS':
      return handleRequisitos(message);
      
    case 'BUSCAR_RUBRO':
      return handleBuscarRubro(message);
      
    case 'EVENTOS':
      return handleEventos(message);
      
    case 'HABILITADOS':
      return handleHabilitados(message);
      
    default:
      return handleGeneral(message);
  }
}

function handleRequisitos(message) {
  const query = extractRubroQuery(message);
  const rubros = getRubros({});
  const requisitos = getRequisitos();
  
  // Search for matching rubros
  const matches = rubros.filter(r => 
    r.nombre.toLowerCase().includes(query.toLowerCase()) ||
    r.codigo.includes(query)
  );
  
  if (matches.length === 0) {
    return {
      text: `No encontré rubros que coincidan con "${query}". Intenta con otro término o código.`,
      suggestions: ['Ver todos los rubros', 'Buscar farmacia', 'Buscar alimentos']
    };
  }
  
  if (matches.length === 1) {
    const rubro = matches[0];
    const reqKey = rubro.requisitos;
    const reqData = requisitos[reqKey] || null;
    
    let response = `**${rubro.nombre}** (Código: ${rubro.codigo})\n\n`;
    response += `Tipo de local: ${rubro.tipoLocal}\n`;
    response += `Requisitos: ${reqKey || 'Generales'}\n\n`;
    
    if (reqData && reqData.items && reqData.items.length > 0) {
      response += `**${reqData.titulo || 'Requisitos'}:**\n\n`;
      reqData.items.filter(r => !r.esOrdenanza).forEach((req) => {
        response += `${req.numero}. ${req.texto}\n\n`;
      });
      
      // Agregar ordenanzas si hay
      const ordenanzas = reqData.items.filter(r => r.esOrdenanza);
      if (ordenanzas.length > 0) {
        response += `\n**Ordenanzas aplicables:**\n`;
        ordenanzas.forEach(ord => {
          response += `• ${ord.texto}\n`;
        });
      }
    }
    
    return {
      text: response,
      data: { rubro, requisitos: reqData },
      suggestions: ['Ver otros rubros similares', 'Consultar otro rubro']
    };
  }
  
  // Multiple matches
  let response = `Encontré ${matches.length} rubros relacionados:\n\n`;
  matches.slice(0, 5).forEach(r => {
    response += `• **${r.codigo}** - ${r.nombre}\n`;
  });
  
  if (matches.length > 5) {
    response += `\n...y ${matches.length - 5} más. Sé más específico para mejores resultados.`;
  }
  
  return {
    text: response,
    data: { matches: matches.slice(0, 10) },
    suggestions: matches.slice(0, 3).map(r => `Requisitos para ${r.codigo}`)
  };
}

function handleBuscarRubro(message) {
  const query = extractRubroQuery(message);
  const rubros = getRubros({});
  
  const matches = rubros.filter(r => 
    r.nombre.toLowerCase().includes(query.toLowerCase()) ||
    r.codigo.includes(query)
  );
  
  if (matches.length === 0) {
    return {
      text: `No encontré rubros para "${query}".`,
      suggestions: ['Ver lista de rubros', 'Buscar otro término']
    };
  }
  
  let response = `Rubros encontrados para "${query}":\n\n`;
  matches.slice(0, 8).forEach(r => {
    response += `• **${r.codigo}** - ${r.nombre} (${r.requisitos || 'Req. generales'})\n`;
  });
  
  return {
    text: response,
    data: { matches },
    suggestions: matches.slice(0, 2).map(r => `Ver requisitos ${r.codigo}`)
  };
}

function handleEventos(message) {
  const q = message.toLowerCase();
  const eventos = getEventos({});
  
  const matches = eventos.filter(e => 
    e.local.toLowerCase().includes(q) ||
    e.domicilio.toLowerCase().includes(q) ||
    e.evento.toLowerCase().includes(q)
  ).slice(0, 10);
  
  if (matches.length === 0) {
    return {
      text: 'No encontré eventos con esos criterios. Los eventos se autorizan por fin de semana.',
      suggestions: ['Ver eventos recientes', 'Buscar por local']
    };
  }
  
  let response = `Eventos encontrados:\n\n`;
  matches.slice(0, 5).forEach(e => {
    response += `• **${e.local}** - ${e.domicilio}\n  ${e.evento} | ${e.hora}\n\n`;
  });
  
  return {
    text: response,
    data: { eventos: matches },
    suggestions: ['Ver más eventos', 'Buscar otro local']
  };
}

function handleHabilitados(message) {
  const q = message.toLowerCase();
  const habilitados = getHabilitados({});
  
  const matches = habilitados.filter(h => 
    h.nombre.toLowerCase().includes(q) ||
    h.domicilio.toLowerCase().includes(q)
  ).slice(0, 10);
  
  if (matches.length === 0) {
    return {
      text: 'No encontré locales habilitados con esos criterios.',
      suggestions: ['Ver todos los habilitados', 'Buscar por dirección']
    };
  }
  
  let response = `Locales habilitados:\n\n`;
  matches.slice(0, 5).forEach(h => {
    response += `• **${h.nombre}** - ${h.domicilio}\n  Categoría: ${h.categoria} | Estado: ${h.estadoGeneral}\n\n`;
  });
  
  return {
    text: response,
    data: { habilitados: matches }
  };
}

function handleGeneral(message) {
  const q = message.toLowerCase();
  const rubros = getRubros({});
  const eventos = getEventos({});
  const habilitados = getHabilitados({});
  
  const rubrosMatch = rubros.filter(r => 
    r.nombre.toLowerCase().includes(q) || r.codigo.includes(q)
  ).slice(0, 10);
  
  const eventosMatch = eventos.filter(e => 
    e.local.toLowerCase().includes(q) || e.evento.toLowerCase().includes(q)
  ).slice(0, 10);
  
  const habilitadosMatch = habilitados.filter(h => 
    h.nombre.toLowerCase().includes(q) || h.domicilio.toLowerCase().includes(q)
  ).slice(0, 10);
  
  const totalResults = rubrosMatch.length + eventosMatch.length + habilitadosMatch.length;
  
  if (totalResults === 0) {
    return {
      text: 'No encontré información relacionada. ¿Podrías ser más específico?\n\n' +
            'Puedo ayudarte con requisitos de habilitación, buscar rubros, eventos autorizados y locales habilitados.',
      suggestions: ['¿Qué puedo consultar?', 'Ver requisitos generales', 'Buscar rubro']
    };
  }
  
  let response = `Encontré ${totalResults} resultados:\n\n`;
  
  if (rubrosMatch.length > 0) {
    response += `**Rubros (${rubrosMatch.length}):**\n`;
    rubrosMatch.slice(0, 3).forEach(r => {
      response += `• ${r.codigo} - ${r.nombre}\n`;
    });
    response += '\n';
  }
  
  if (eventosMatch.length > 0) {
    response += `**Eventos (${eventosMatch.length}):**\n`;
    eventosMatch.slice(0, 3).forEach(e => {
      response += `• ${e.local} - ${e.evento}\n`;
    });
    response += '\n';
  }
  
  if (habilitadosMatch.length > 0) {
    response += `**Habilitados (${habilitadosMatch.length}):**\n`;
    habilitadosMatch.slice(0, 3).forEach(h => {
      response += `• ${h.nombre}\n`;
    });
  }
  
  return {
    text: response,
    data: { rubros: rubrosMatch, eventos: eventosMatch, habilitados: habilitadosMatch },
    suggestions: ['Ver más detalles', 'Nueva búsqueda']
  };
}
