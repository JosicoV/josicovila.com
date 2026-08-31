const ENGLISH = Object.freeze({
  pageTitle: 'Josico Vila | Epic and Fantastic Instrumental Music',
  pageDescription: 'Listen to all the instrumental music from Josico Vila. All the epic albums since 2018.',
  signatureAlt: 'Josico Vila signature',
  selectAlbum: 'Select an album...',
  currentAlbum: 'CURRENT ALBUM',
  heroTitle: 'Find the music you imagine.',
  heroSubtitle: 'Explore my discography: search by title, name an instrument, or describe an idea.',
  searchPlaceholder: 'epic with choir, music for dragons, soft medieval flute...',
  searchAria: 'Search music by mood, scene or story',
  browseAlbums: 'Browse the albums',
  musicPlatformsToggle: 'Listen on other platforms',
  musicPlatformsNav: 'Josico Vila on music platforms',
  musicPlatformsTitle: 'Listen on',
  albumsTitle: 'The albums',
  albumsIntro: 'Fifteen records. Pick one and it plays from the top.',
  tracks: 'tracks',
  nowPlaying: 'Now playing',
  radius: 'Radius',
  deform: 'Deform',
  shuffle: 'Shuffle',
  previousTrack: 'Previous track',
  play: 'Play',
  pause: 'Pause',
  nextTrack: 'Next track',
  repeat: 'Repeat',
  mute: 'Mute',
  volume: 'Volume',
  aboutTitle: 'About the artist',
  aboutParagraph1: 'A Spanish music composer who has learned on his own everything he knows about music.',
  aboutParagraph2: 'He loves computers for all the potential they have. And he likes, apart from composing music on them, designing and programming his own web sites and attending to his social media.',
  aboutParagraph3: 'He has written four books and thirteen short stories that can be read at josicovila.es (Spanish).',
  artistPhotoAlt: 'Photo of Josico Vila',
  cookieTextBefore: "This website uses cookies to enhance your experience and for analytics purposes. By clicking 'Accept', you consent to the use of cookies. Read our",
  privacyPolicy: 'Privacy Policy',
  cookieTextAfter: 'for more information.',
  acceptCookies: 'Accept',
  goodMatch: 'Good match?',
  yes: 'Yes',
  no: 'No',
  yesMatchAria: 'Yes, this matches what I was looking for',
  noMatchAria: 'No, this does not match',
  noResults: 'No matching music found.',
  searchedInEnglishAs: 'Searched in English as',
  listening: 'Listening to your words...',
  searchUnavailable: 'Search is unavailable right now.',
  fromAlbum: 'From the album',
  reasonExactTitle: 'Exact title match',
  reasonTitle: 'Title match',
  reasonPartialTitle: 'Partial title match',
  reasonSimilarTitle: 'Similar title',
  reasonAlbum: 'Album match',
  reasonPartialAlbum: 'Partial album match',
  reasonStrongMusical: 'Strong musical match',
  reasonMusicalSimilarity: 'Musical similarity',
});

const SPANISH = Object.freeze({
  ...ENGLISH,
  pageTitle: 'Josico Vila | Música instrumental épica y fantástica',
  pageDescription: 'Escucha toda la música instrumental de Josico Vila. Todos sus álbumes épicos desde 2018.',
  signatureAlt: 'Firma de Josico Vila',
  selectAlbum: 'Selecciona un álbum...',
  currentAlbum: 'ÁLBUM ACTUAL',
  heroTitle: 'Encuentra la música que imaginas.',
  heroSubtitle: 'Explora mi discografía: busca por título, menciona instrumentos o describe una idea.',
  searchPlaceholder: 'épica con coro, música para dragones, flauta medieval suave...',
  searchAria: 'Buscar música por estado de ánimo, escena o historia',
  browseAlbums: 'Explora los álbumes',
  musicPlatformsToggle: 'Escuchar en otras plataformas',
  musicPlatformsNav: 'Josico Vila en plataformas musicales',
  musicPlatformsTitle: 'Escúchame en',
  albumsTitle: 'Los álbumes',
  albumsIntro: 'Quince discos. Elige uno y empezará a sonar desde el principio.',
  tracks: 'temas',
  nowPlaying: 'Sonando',
  radius: 'Radio',
  deform: 'Deformación',
  shuffle: 'Aleatorio',
  previousTrack: 'Tema anterior',
  play: 'Reproducir',
  pause: 'Pausar',
  nextTrack: 'Tema siguiente',
  repeat: 'Repetir',
  mute: 'Silenciar',
  volume: 'Volumen',
  aboutTitle: 'Sobre el artista',
  aboutParagraph1: 'Compositor español que ha aprendido de forma autodidacta todo lo que sabe sobre música.',
  aboutParagraph2: 'Le apasionan los ordenadores por todo el potencial que ofrecen. Además de componer música con ellos, le gusta diseñar y programar sus propios sitios web y mantener activas sus redes sociales.',
  aboutParagraph3: 'Ha escrito cuatro libros y trece relatos que pueden leerse en josicovila.es.',
  artistPhotoAlt: 'Foto de Josico Vila',
  cookieTextBefore: "Este sitio web utiliza cookies para mejorar tu experiencia y con fines analíticos. Al pulsar 'Aceptar', consientes su uso. Consulta nuestra",
  privacyPolicy: 'Política de privacidad',
  cookieTextAfter: 'para obtener más información.',
  acceptCookies: 'Aceptar',
  goodMatch: '¿Encaja?',
  yes: 'Sí',
  no: 'No',
  yesMatchAria: 'Sí, encaja con lo que estaba buscando',
  noMatchAria: 'No, no encaja con lo que estaba buscando',
  noResults: 'No se ha encontrado música que encaje.',
  searchedInEnglishAs: 'Búsqueda en inglés:',
  listening: 'Escuchando tus palabras...',
  searchUnavailable: 'La búsqueda no está disponible en este momento.',
  fromAlbum: 'Del álbum',
  reasonExactTitle: 'Coincidencia exacta con el título',
  reasonTitle: 'Coincidencia con el título',
  reasonPartialTitle: 'Coincidencia parcial con el título',
  reasonSimilarTitle: 'Título similar',
  reasonAlbum: 'Coincidencia con el álbum',
  reasonPartialAlbum: 'Coincidencia parcial con el álbum',
  reasonStrongMusical: 'Coincidencia musical destacada',
  reasonMusicalSimilarity: 'Similitud musical',
});

export function languageFromBrowser(value) {
  return String(value || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
}

const browserLanguage = typeof navigator === 'undefined' ? 'en' : navigator.language;
export const language = languageFromBrowser(browserLanguage);
const active = language === 'es' ? SPANISH : ENGLISH;

export function text(key, fallback = '') {
  return active[key] || fallback;
}

export function applyTranslations(root = document) {
  document.documentElement.lang = language;
  document.title = text('pageTitle');

  root.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = text(element.dataset.i18n, element.textContent);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    element.setAttribute('placeholder', text(element.dataset.i18nPlaceholder, element.getAttribute('placeholder') || ''));
  });
  root.querySelectorAll('[data-i18n-aria]').forEach(element => {
    element.setAttribute('aria-label', text(element.dataset.i18nAria, element.getAttribute('aria-label') || ''));
  });
  root.querySelectorAll('[data-i18n-alt]').forEach(element => {
    element.setAttribute('alt', text(element.dataset.i18nAlt, element.getAttribute('alt') || ''));
  });

  const selector = root.querySelector('.custom-select');
  if (selector) selector.dataset.currentLabel = text('currentAlbum');

  root.querySelectorAll('meta[data-i18n-content]').forEach(element => {
    element.setAttribute('content', text(element.dataset.i18nContent, element.getAttribute('content') || ''));
  });
}
