$ = jQuery;

const AGENDA_URL = "https://golazoplay.com/agenda.json";

document.addEventListener('DOMContentLoaded', function() {
obtenerAgenda();

$(document).on("click", ".submenu-item", function (event) {
  event.preventDefault();
  event.stopPropagation();
  
  const embedUrl = $(this).attr('href');
  const embedName = $(this).find('span').text().replace(' 🎯', '').replace(' ❌', '').trim();
  
  console.log('🎯 Canal seleccionado:', embedName);
  console.log('📡 URL del embed:', embedUrl);
  
  if (embedUrl && embedUrl !== '#' && embedUrl !== '') {
    // Verificar si es URL relativa y convertir si es necesario
    let finalUrl = embedUrl;
    if (embedUrl.startsWith('/')) {
      finalUrl = 'https://golazoplay.com' + embedUrl;
      console.log('🔗 URL absoluta:', finalUrl);
    }
    
    // Mostrar indicador de carga
    showLoadingIndicator(embedName, finalUrl);
    
    // Codificar la URL original (relativa) para pasarla al reproductor
    const encodedUrl = encodeURIComponent(embedUrl);
    
    // Redirigir al reproductor pasando la URL original
    console.log('🚀 Redirigiendo al reproductor...');
    console.log('   - Embed:', embedUrl);
    console.log('   - Canal:', embedName);
    
    setTimeout(() => {
      hideLoadingIndicator();
      window.location.href = `reproductor.html?iframe=${encodedUrl}&name=${encodeURIComponent(embedName)}`;
    }, 1500);
  } else {
    console.error('❌ URL del embed no válida:', embedUrl);
    showErrorIndicator(embedName);
    
    setTimeout(() => {
      hideLoadingIndicator();
    }, 2000);
  }
});

$(document).on("click", ".toggle-submenu", function () {
  var $submenuElement = $(this).closest('li').find('ul');
  
  if (!$submenuElement.is(":visible")) {
    $(".toggle-submenu").not(this).closest('li').find('ul').slideUp();
    $submenuElement.slideDown();
  } else {
    $submenuElement.slideUp();
  }
});

setInterval(upgrade, 60000);
window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Función para mostrar indicador de carga
function showLoadingIndicator(channelName, embedUrl) {
hideLoadingIndicator();

const overlay = document.createElement('div');
overlay.id = 'loading-overlay';
overlay.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  color: white;
`;

overlay.innerHTML = `
  <div style="text-align: center;">
    <div style="border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid #fff; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
    <h2 style="margin: 10px 0; font-size: 24px;">🎬 Cargando ${channelName}</h2>
    <p style="margin: 5px 0; opacity: 0.8; font-size: 14px;">Preparando stream...</p>
    <p style="margin: 5px 0; opacity: 0.6; font-size: 12px;">Usando Cloudflare Worker</p>
    <div style="margin-top: 20px; padding: 10px 20px; background: rgba(255,255,255,0.1); border-radius: 5px; font-family: monospace; font-size: 11px; max-width: 80%; word-break: break-all;">
      ${embedUrl}
    </div>
  </div>
  <style>
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
`;

document.body.appendChild(overlay);
}

// Función para mostrar indicador de error
function showErrorIndicator(channelName) {
hideLoadingIndicator();

const overlay = document.createElement('div');
overlay.id = 'loading-overlay';
overlay.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  color: white;
`;

overlay.innerHTML = `
  <div style="text-align: center;">
    <div style="font-size: 60px; margin-bottom: 20px;">❌</div>
    <h2 style="margin: 10px 0; font-size: 24px; color: #ff4444;">Error</h2>
    <p style="margin: 5px 0; opacity: 0.8;">No se pudo cargar ${channelName}</p>
    <p style="margin: 5px 0; opacity: 0.6; font-size: 14px;">URL no válida o no disponible</p>
  </div>
`;

document.body.appendChild(overlay);
}

// Función para ocultar indicador
function hideLoadingIndicator() {
const overlay = document.getElementById('loading-overlay');
if (overlay) {
  overlay.remove();
}
}

// Función para obtener la agenda
function obtenerAgenda() {
console.log('📅 Obteniendo agenda desde:', AGENDA_URL);

fetch(AGENDA_URL)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('✅ Agenda obtenida:', data);
    procesarAgenda(data);
  })
  .catch(error => {
    console.error('❌ Error al obtener agenda:', error);
    mostrarErrorAgenda();
  });
}

// Función para procesar la agenda
function procesarAgenda(agenda) {
const menuElement = document.getElementById('menu');
const titleElement = document.getElementById('title-agenda');

if (!menuElement) {
  console.error('❌ Elemento #menu no encontrado');
  return;
}

// Limpiar menú
menuElement.innerHTML = '';

// Obtener fecha actual
const ahora = luxon.DateTime.now().setZone('America/Bogota');
const fechaActual = ahora.toFormat('yyyy-MM-dd');

console.log('📅 Fecha actual:', fechaActual);
console.log('🕐 Hora actual:', ahora.toFormat('HH:mm'));

// Título
titleElement.textContent = `Agenda de Partidos - ${ahora.toFormat('dd/MM/yyyy')}`;

// Verificar si hay datos para hoy
if (!agenda[fechaActual]) {
  menuElement.innerHTML = '<li style="color: white; padding: 20px; text-align: center;">No hay partidos programados para hoy</li>';
  return;
}

const partidosHoy = agenda[fechaActual];
const horas = Object.keys(partidosHoy).sort();

console.log(`📊 Partidos encontrados: ${horas.length}`);

// Crear elementos del menú
horas.forEach(hora => {
  const partido = partidosHoy[hora];
  
  const li = document.createElement('li');
  li.innerHTML = `
    <a href="#" class="toggle-submenu">
      <span class="hora">${hora}</span>
      <span class="partido">${partido.partido || 'Partido sin nombre'}</span>
      <span class="liga">${partido.liga || ''}</span>
    </a>
  `;

  // Crear submenú de canales
  if (partido.canales && partido.canales.length > 0) {
    const ul = document.createElement('ul');
    ul.className = 'submenu';
    ul.style.display = 'none';

    partido.canales.forEach(canal => {
      const subLi = document.createElement('li');
      const a = document.createElement('a');
      a.href = canal.url || '#';
      a.className = 'submenu-item';
      a.innerHTML = `<span>${canal.nombre || 'Canal'}</span>`;
      
      subLi.appendChild(a);
      ul.appendChild(subLi);
    });

    li.appendChild(ul);
  }

  menuElement.appendChild(li);
});

console.log('✅ Agenda procesada correctamente');
}

// Función para mostrar error en la agenda
function mostrarErrorAgenda() {
const menuElement = document.getElementById('menu');
const titleElement = document.getElementById('title-agenda');

titleElement.textContent = 'Error al cargar la agenda';
menuElement.innerHTML = `
  <li style="color: #ff4444; padding: 20px; text-align: center;">
    <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
    <div>No se pudo cargar la agenda de partidos</div>
    <div style="font-size: 12px; opacity: 0.7; margin-top: 10px;">Intenta recargar la página</div>
  </li>
`;
}

// Función para actualizar la agenda
function upgrade() {
console.log('🔄 Actualizando agenda...');
obtenerAgenda();
}
