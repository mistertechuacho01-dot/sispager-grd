/**
 * SISPAGER-GRD - AI Service
 * Integrates with Google Gemini API and provides smart local fallback heuristics
 */

/**
 * Get the configured Gemini API key
 * @returns {string|null}
 */
export function getApiKey() {
  return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || null;
}

/**
 * Save the Gemini API key
 * @param {string} key 
 */
export function saveApiKey(key) {
  if (key) {
    localStorage.setItem('gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('gemini_api_key');
  }
}

/**
 * Calls the Gemini API to generate a lesson learned based on problem and impact.
 * Falls back to local heuristics if the API call fails or no key is present.
 * @param {string} problem 
 * @param {string} impact 
 * @returns {Promise<string>} Generated lesson learned (in uppercase)
 */
export async function generateLesson(problem, impact) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.log('[SISPAGER-GRD] No API key found. Using local AI heuristics.');
    return generateLocalLesson(problem, impact);
  }

  const prompt = `Eres un experto en Gestión de Riesgos de Desastres (GRD) del Instituto Nacional de Defensa Civil (INDECI).
Analiza el siguiente problema y su impacto durante una emergencia, y redacta una Lección Aprendida formal, técnica y concisa (máximo 3 frases) en MAYÚSCULAS y sin tildes si es posible, o con tildes pero completamente en MAYÚSCULAS.
PROBLEMA: ${problem}
IMPACTO: ${impact}
LECCIÓN APRENDIDA (Redacta solo la lección aprendida, sin preámbulos):`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return text.trim().toUpperCase();
    }
    throw new Error('Empty response');
  } catch (err) {
    console.warn('[SISPAGER-GRD] Gemini API failed, falling back to local heuristics:', err);
    return generateLocalLesson(problem, impact);
  }
}

/**
 * Calls the Gemini API to generate recommended actions based on problem, impact and lesson.
 * Falls back to local heuristics if the API call fails or no key is present.
 * @param {string} problem 
 * @param {string} impact 
 * @param {string} lesson 
 * @returns {Promise<Object>} Object containing checked recommendations and text suggestions
 */
export async function generateRecommendations(problem, impact, lesson) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.log('[SISPAGER-GRD] No API key found. Using local AI heuristics.');
    return generateLocalRecommendations(problem, impact, lesson);
  }

  const prompt = `Eres un experto en Gestión de Riesgos de Desastres (GRD).
Analiza el siguiente problema, su impacto y la lección aprendida, y genera recomendaciones específicas de acción (Plan de Acción).
PROBLEMA: ${problem}
IMPACTO: ${impact}
LECCIÓN: ${lesson}

Responde ÚNICAMENTE en formato JSON con la siguiente estructura (todas las cadenas de texto deben estar en MAYÚSCULAS):
{
  "procedure": true/false, // Si se debe preparar un procedimiento
  "normative": true/false, // Si se debe incluir en un proyecto normativo
  "diffusion": true/false, // Si requiere difusión inmediata
  "instructive": true/false, // Si se debe preparar un instructivo
  "coordinateWith": "nombre de entidades con las que coordinar",
  "conveneEntities": "entidades de primera respuesta a convocar",
  "other": "otra recomendación específica"
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      // Clean JSON formatting if Gemini wrapped it in markdown code blocks
      const cleanText = text.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(cleanText);
      return {
        procedure: !!parsed.procedure,
        normative: !!parsed.normative,
        diffusion: !!parsed.diffusion,
        instructive: !!parsed.instructive,
        coordinateWith: (parsed.coordinateWith || '').toUpperCase(),
        conveneEntities: (parsed.conveneEntities || '').toUpperCase(),
        other: (parsed.other || '').toUpperCase()
      };
    }
    throw new Error('Empty response');
  } catch (err) {
    console.warn('[SISPAGER-GRD] Gemini API failed, falling back to local heuristics:', err);
    return generateLocalRecommendations(problem, impact, lesson);
  }
}

// ─── Local Heuristic Fallbacks ────────────────────────────────────────────────

function generateLocalLesson(problem, impact) {
  const text = (problem + ' ' + impact).toLowerCase();
  
  if (text.includes('edan') || text.includes('evaluacion') || text.includes('daños')) {
    return 'ES INDISPENSABLE CAPACITAR PERIÓDICAMENTE AL PERSONAL LOCAL EN EL REGISTRO DE FICHAS EDAN Y ESTABLECER BRIGADAS DE EVALUACIÓN MULTIDISCIPLINARIAS PARA EVITAR RETRASOS EN LA ATENCIÓN DE DAMNIFICADOS.';
  }
  if (text.includes('comunicacion') || text.includes('radio') || text.includes('satelital') || text.includes('señal')) {
    return 'SE REQUIERE LA IMPLEMENTACIÓN DE REDES DE COMUNICACIÓN REDUNDANTES (HF/VHF/SATELITAL) Y SIMULACROS DE ENLACE DE EMERGENCIA PARA EVITAR EL AISLAMIENTO OPERATIVO DEL COER DURANTE EVENTOS EXTREMOS.';
  }
  if (text.includes('almacen') || text.includes('vencid') || text.includes('ayuda') || text.includes('kits')) {
    return 'LA IMPLEMENTACIÓN DE SISTEMAS DIGITALES DE CONTROL DE INVENTARIO CON ALERTAS TEMPRANAS DE VENCIMIENTO Y AUDITORÍAS TRIMESTRALES EN LOS ALMACENES ADELANTADOS GARANTIZA LA APTITUD DE LA AYUDA HUMANITARIA.';
  }
  if (text.includes('maquinaria') || text.includes('via') || text.includes('bloqueo') || text.includes('acceso')) {
    return 'ES CRÍTICO MANTENER CONVENIOS MARCO VIGENTES CON EMPRESAS PRIVADAS PROVEEDORAS DE MAQUINARIA PESADA EN CADA PROVINCIA PARA GARANTIZAR LA REHABILITACIÓN INMEDIATA DE VÍAS DE ACCESO BLOQUEADAS.';
  }
  if (text.includes('simulacro') || text.includes('preparacion') || text.includes('evacuacion') || text.includes('ruta')) {
    return 'LA ACTUALIZACIÓN ANUAL Y LA DIFUSIÓN ACTIVA DE LOS PLANES DE EVACUACIÓN FAMILIAR Y ESCOLAR, COMPLEMENTADA CON SIMULACROS VECINALES, OPTIMIZA LOS TIEMPOS DE RESPUESTA ANTE ALERTAS DE DESASTRE.';
  }
  if (text.includes('muro') || text.includes('defensa') || text.includes('obra') || text.includes('contencion')) {
    return 'TODA OBRA DE INFRAESTRUCTURA DE PROTECCIÓN O REDUCCIÓN DE RIESGOS DEBE CONTAR CON ESTUDIOS GEOTÉCNICOS Y ANÁLISIS DE IMPACTO DE CAMBIO CLIMÁTICO ESPECÍFICOS DEL SITIO ANTES DE SU EJECUCIÓN.';
  }

  return 'LA PLANIFICACIÓN LOGÍSTICA PREVIA, LA SIMPLIFICACIÓN DE TRÁMITES ADMINISTRATIVOS POST-DESASTRE Y LA COORDINACIÓN ESTRECHA CON GOBIERNOS REGIONALES OPTIMIZAN LA EFICIENCIA DE LA RESPUESTA OPERATIVA.';
}

function generateLocalRecommendations(problem, impact, lesson) {
  const text = (problem + ' ' + impact + ' ' + lesson).toLowerCase();

  if (text.includes('edan') || text.includes('evaluacion')) {
    return {
      procedure: false,
      normative: false,
      diffusion: false,
      instructive: true,
      coordinateWith: 'INDECI, COER REGIONAL, GOBIERNOS LOCALES',
      conveneEntities: 'BRIGADAS EDAN DE GOBIERNOS LOCALES',
      other: 'ESTABLECER UN CALENDARIO DE ENTRENAMIENTO BIENAL EN EVALUACIÓN DE DAÑOS Y ANÁLISIS DE NECESIDADES.'
    };
  }
  if (text.includes('comunicacion') || text.includes('radio') || text.includes('señal')) {
    return {
      procedure: true,
      normative: false,
      diffusion: true,
      instructive: false,
      coordinateWith: 'MINISTERIO DE TRANSPORTES Y COMUNICACIONES (MTC), COER',
      conveneEntities: 'CUERPO GENERAL DE BOMBEROS VOLUNTARIOS, POLICÍA NACIONAL DEL PERÚ',
      other: 'ADQUIRIR MÓDULOS DE COMUNICACIÓN HF MÓVILES PARA ZONAS RURALES AISLADAS.'
    };
  }
  if (text.includes('almacen') || text.includes('ayuda') || text.includes('kits')) {
    return {
      procedure: true,
      normative: false,
      diffusion: false,
      instructive: true,
      coordinateWith: 'OFICINA DE LOGÍSTICA DE INDECI, MINISTERIO DE DESARROLLO E INCLUSIÓN SOCIAL',
      conveneEntities: 'CRUZ ROJA PERUANA, CÁRITAS PERÚ',
      other: 'CREAR UNA APLICACIÓN PARA LA TRAZABILIDAD Y REGISTRO EN TIEMPO REAL DE LA AYUDA ENTREGADA.'
    };
  }
  if (text.includes('maquinaria') || text.includes('via') || text.includes('acceso')) {
    return {
      procedure: true,
      normative: true,
      diffusion: false,
      instructive: false,
      coordinateWith: 'PROVÍAS NACIONAL, PROVÍAS DESCENTRALIZADO, GOBIERNO REGIONAL',
      conveneEntities: 'COMPAÑÍAS DE INGENIERÍA DEL EJÉRCITO DEL PERÚ',
      other: 'ESTABLECER CONVENIOS PRE-APROBADOS CON PROVEEDORES LOCALES DE MAQUINARIA PESADA.'
    };
  }
  
  return {
    procedure: true,
    normative: false,
    diffusion: true,
    instructive: false,
    coordinateWith: 'OFICINA DE GESTIÓN DEL RIESGO DE DESASTRES, INDECI',
    conveneEntities: 'PRIMERA RESPUESTA (BOMBEROS, PNP, FUERZAS ARMADAS)',
    other: 'ELABORAR UN PLAN DE TRABAJO CONJUNTO CON LAS ENTIDADES DE PRIMERA RESPUESTA PARA ACTUALIZAR MAPAS DE VULNERABILIDAD.'
  };
}
