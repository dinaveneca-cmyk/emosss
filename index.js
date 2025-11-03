$ = jQuery;

const AGENDA_URL = "https://golazoplay.com/agenda.json";

document.addEventListener('DOMContentLoaded', function() {
obtenerAgenda();

$(document).on("click", ".submenu-item", function (event) {
  event.preventDefault();
  event.stopPropagation();
  
  const embedUrl = $(this).attr('href');
  const embedName = $(this).find('span').text().replace(' 🎯', '').replace(' ❌', '').trim();
  
  console.log('URL del embed iframe (original):', embedUrl);
  console.log('Nombre del canal:', embedName);
  
  if (embedUrl && embedUrl !== '#' && embedUrl !== '') {
    // Verificar si es URL relativa y convertir si es necesario
    let finalUrl = embedUrl;
    if (embedUrl.startsWith('/')) {
      finalUrl = 'https://golazoplay.com' + embedUrl;
      console.log('URL convertida a absoluta:', finalUrl);
    }
    
    // Mostrar indicador de carga
    showLoadingIndicator(embedName, finalUrl);
    
    // Codificar la URL original (relativa) para pasarla al extractor
    const encodedUrl = encodeURIComponent(embedUrl);
    
    // Redirigir al reproductor pasando la URL original
    setTimeout(() => {
      hideLoadingIndicator();
      window.location.href = `reproductor.html?iframe=${encodedUrl}&name=${encodeURIComponent(embedName)}`;
    }, 1500);
  } else {
    console.error('URL del embed no válida:', embedUrl);
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
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.9); display: flex; flex-direction: column;
  justify-content: center; align-items: center; z-index: 9999;
  color: white; font-family: Arial, sans-serif;
`;

// Mostrar solo el dominio de la URL para que no sea muy largo
const displayUrl = embedUrl.length > 50 ? 
  embedUrl.substring(0, 47) + '...' : embedUrl;

overlay.innerHTML = `
  <div style="width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid #00ff00; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 25px;"></div>
  <div style="font-size: 20px; text-align: center;">
    <div style="margin-bottom: 10px;">🎯 Procesando Canal</div>
    <div style="color: #00ff00; font-weight: bold; font-size: 24px; margin: 15px 0;">${channelName}</div>
    <div style="color: #ffff00; font-size: 14px; margin: 10px 0; word-break: break-all; max-width: 80vw;">
      ${displayUrl}
    </div>
    <div style="color: #ccc; font-size: 14px; margin-top: 15px;">
      <div>📡 Buscando Enlace de internet...</div>
      <div style="margin-top: 5px;">🎬 Preparando reproductor...</div>
    </div>
  </div>
`;

// Agregar animación CSS
if (!document.getElementById('loading-animation-style')) {
  const style = document.createElement('style');
  style.id = 'loading-animation-style';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

document.body.appendChild(overlay);
}

// Función para mostrar indicador de error
function showErrorIndicator(channelName) {
hideLoadingIndicator();

const overlay = document.createElement('div');
overlay.id = 'loading-overlay';
overlay.style.cssText = `
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.9); display: flex; flex-direction: column;
  justify-content: center; align-items: center; z-index: 9999;
  color: white; font-family: Arial, sans-serif;
`;

overlay.innerHTML = `
  <div style="width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid #ff0000; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 25px;"></div>
  <div style="font-size: 20px; text-align: center;">
    <div style="margin-bottom: 10px;">❌ Error</div>
    <div style="color: #ff0000; font-weight: bold; font-size: 24px; margin: 15px 0;">${channelName}</div>
    <div style="color: #ffff00; font-size: 16px; margin: 10px 0;">URL del embed no disponible</div>
    <div style="color: #ccc; font-size: 14px; margin-top: 15px;">
      <div>Verifica la conexión...</div>
    </div>
  </div>
`;

document.body.appendChild(overlay);
}

function hideLoadingIndicator() {
const overlay = document.getElementById('loading-overlay');
if (overlay) {
  overlay.remove();
}
}

function upgrade() {
refrescarAgenda();
console.info("This function is called every 1 minutes");
}

function loadDoc() {
var resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
data = resolvedOptions.timeZone;
return data;
}

function convertToUserTimeZone(utcHour) {
const DateTime = luxon.DateTime;
const utcDateTime = DateTime.fromISO(utcHour, { zone: "America/Lima" });
const localDateTime = utcDateTime.toLocal();
return localDateTime.toFormat("HH:mm");
}

function formatDate(dateString) {
const options = { year: 'numeric', month: 'long', day: 'numeric' };
return new Date(dateString).toLocaleDateString('es-ES', options);
}

async function refrescarAgenda() {
var agendaUrl = AGENDA_URL;
const menuElement = document.getElementById("menu");
const titleAgendaElement = document.getElementById("title-agenda");
var html = "";
loadDoc();

const response = await fetch(agendaUrl);
const result = await response.json();

menuElement.cloneNode(true);

const dateCompleted = formatDate(new Date().toISOString());

titleAgendaElement.innerHTML = "Agenda - " + dateCompleted;

const data = result.data.sort((a, b) =>
  a.attributes.diary_hour.localeCompare(b.attributes.diary_hour)
);

data.forEach(value => {
  let imageUrl = "https://img.golazoplay.com/uploads/sin_imagen_d36205f0e8.png";

  if (value.attributes.country.data != null) {
    imageUrl = "https://img.golazoplay.com" +
      value.attributes.country.data.attributes.image.data.attributes.url;
  }

  html += `
    <li class="toggle-submenu" style="padding: 0.5rem; border-radius: 0.5rem; cursor: pointer;list-style: none;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
          <time datetime="12:00:00" style="width: 3rem; text-align: center; font-weight: 700; font-size: 15px;font-family: arial, Arial, Helvetica, sans-serif;">
            ${convertToUserTimeZone(value.attributes.diary_hour)}
          </time>
          <img src="${imageUrl}" alt="" style="margin-left: 0.5rem; object-fit: cover; height: 1.5rem; width: 1.5rem;">
          <span style="flex: 1; margin-left: 1rem; text-align: left; font-weight: 700; color: #2d3748; font-family: arial, Arial, Helvetica, sans-serif;font-size: 15px;">
            ${value.attributes.diary_description}
          </span>
        </div>
        <span style="margin-left: 0.5rem; color: #a0aec0;"></span>
      </div>
      <ul style="margin-left: 1rem; border-radius: 0.5rem; display: none;">
        ${value.attributes.embeds.data.map(embed => {
          if (embed) {
            const embedUrl = embed.attributes.embed_iframe || "";
            const embedName = embed.attributes.embed_name;
            
            // Verificar si la URL existe y es válida (incluyendo URLs relativas)
            const hasValidUrl = embedUrl && embedUrl !== "" && embedUrl !== "#";
            
            const icon = hasValidUrl 
              ? "https://img.icons8.com/?size=10&id=59862&format=png&color=00AA00" 
              : "https://img.icons8.com/?size=10&id=59862&format=png&color=FF0000";
            const indicator = hasValidUrl ? ' 🎯' : ' ❌';

            // Log para debug
            console.log(`Canal: ${embedName}, URL válida: ${hasValidUrl}, URL: ${embedUrl}`);

            return `
              <div class="submenu" style="padding-top:8px">
                <a href="${embedUrl}" style="font-size: 0.875rem; color: #4a5568; text-decoration: none; transition: color 0.3s;" class="submenu-item">
                  <li style="padding-bottom: 0.5rem; padding-top: 0.5rem; width: 100%; display: flex; align-items: center; list-style: none;">
                    <img src="${icon}" style="margin-right: 0.5rem;" alt="play">
                    <span style="font-family: arial, Arial, Helvetica, sans-serif;font-size: 15px;">
                      ${embedName}${indicator}
                    </span>
                  </li>
                </a>
              </div>
            `;
          }
          return '';
        }).join('')}
      </ul>
    </li>
  `;
});

menuElement.innerHTML = html;
}

async function obtenerAgenda() {
const agendaUrl = AGENDA_URL;
const menuElement = document.getElementById("menu");
const titleAgendaElement = document.getElementById("title-agenda");
let html = "";

menuElement.innerHTML = '';

try {
  const response = await fetch(agendaUrl);
  const result = await response.json();

  const dateCompleted = formatDate(new Date().toISOString());

  titleAgendaElement.innerHTML = "Agenda - " + dateCompleted;

  const data = result.data.sort((a, b) =>
    a.attributes.diary_hour.localeCompare(b.attributes.diary_hour)
  );

  data.forEach(value => {
    const imageUrl = value.attributes.country.data
      ? "https://img.golazoplay.com" + value.attributes.country.data.attributes.image.data.attributes.url
      : "https://img.golazoplay.com/uploads/sin_imagen_d36205f0e8.png";

    html += `
      <li class="toggle-submenu" style="padding: 0.5rem; border-radius: 0.5rem; cursor: pointer;list-style: none">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center;">
            <time datetime="12:00:00" style="width: 3rem; text-align: center; font-weight: 700; font-size: 15px;font-family: arial, Arial, Helvetica, sans-serif;">
              ${convertToUserTimeZone(value.attributes.diary_hour)}
            </time>
            <img src="${imageUrl}" alt="" style="margin-left: 0.5rem; object-fit: cover; height: 1.5rem; width: 1.5rem;">
            <span style="flex: 1; margin-left: 1rem; text-align: left; font-weight: 700; color: #2d3748; font-family: arial, Arial, Helvetica, sans-serif; font-size: 15px;">
              ${value.attributes.diary_description}
            </span>
          </div>
          <span style="margin-left: 0.5rem; color: #a0aec0;"></span>
        </div>
        <ul style="margin-left: 1rem; border-radius: 0.5rem; display: none;">
          ${value.attributes.embeds.data.map(embed => {
            if (embed) {
              const embedUrl = embed.attributes.embed_iframe || "";
              const embedName = embed.attributes.embed_name;
              
              // Verificar si la URL existe y es válida (incluyendo URLs relativas)
              const hasValidUrl = embedUrl && embedUrl !== "" && embedUrl !== "#";
              
              const icon = hasValidUrl 
                ? "https://img.icons8.com/?size=10&id=59862&format=png&color=00AA00" 
                : "https://img.icons8.com/?size=10&id=59862&format=png&color=FF0000";
              const indicator = hasValidUrl ? ' 🎯' : ' ❌';

              // Log para debug
              console.log(`Canal: ${embedName}, URL válida: ${hasValidUrl}, URL: ${embedUrl}`);

              return `
                <div class="submenu" style="padding-top:8px">
                  <a href="${embedUrl}" style="font-size: 0.875rem; color: #4a5568; text-decoration: none; transition: color 0.3s;" class="submenu-item">
                    <li style="padding-bottom: 0.5rem; padding-top: 0.5rem; width: 100%; display: flex; align-items: center;list-style: none">
                      <img src="${icon}" style="margin-right: 0.5rem;" alt="play">
                      <span style="font-family: arial, Arial, Helvetica, sans-serif; font-size: 15px;">
                        ${embedName}${indicator}
                      </span>
                    </li>
                  </a>
                </div>
              `;
            }
            return '';
          }).join('')}
        </ul>
      </li>
    `;
  });

  menuElement.innerHTML = html;
} catch (error) {
  console.error("Error fetching agenda:", error);
}
}
