import { l } from '../../i18n';

const DISMISS_KEY = 'jvstudio:hide-welcome';

export function showSessionNotice(openProject: () => void): void {
  try {
    if (localStorage.getItem(DISMISS_KEY) === 'true') return;
  } catch {
    // Private browsing may block localStorage; the notice can still be shown safely.
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'session-dialog';
  dialog.setAttribute('aria-labelledby', 'session-notice-title');
  dialog.innerHTML = `
    <img class="session-dialog-logo" src="${import.meta.env.BASE_URL}logo.png" alt="JV Studio · Make music anywhere" />
    <div>
      <h2 id="session-notice-title">${l('Bienvenido. Vamos a hacer música.', 'Welcome. Let’s make music.')}</h2>
      <p>${l(
        '<strong>Recuerda guardar antes de salir.</strong> Tu proyecto permanece aquí mientras trabajas, pero cerrar o recargar el navegador puede borrarlo.',
        '<strong>Remember to save before leaving.</strong> Your project stays here while you work, but closing or reloading the browser can erase it.',
      )}</p>
      <p>${l(
        'Cuando termines, pulsa <strong>Guardar</strong> para descargarlo. La próxima vez podrás recuperarlo con <strong>Abrir</strong>.',
        'When you finish, press <strong>Save</strong> to download it. Next time, use <strong>Open</strong> to bring it back.',
      )}</p>
      <label class="session-dialog-dismiss"><input type="checkbox" data-session-dismiss /> ${l('No volver a mostrar esta bienvenida', 'Do not show this welcome again')}</label>
      <div class="session-dialog-actions">
        <button type="button" data-session-open>${l('Abrir un proyecto', 'Open a project')}</button>
        <button class="primary" type="button" data-session-close autofocus>${l('Entendido, empezar', 'Got it, start')}</button>
      </div>
    </div>
  `;
  document.body.append(dialog);
  dialog.querySelector('[data-session-close]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-session-open]')?.addEventListener('click', () => {
    dialog.close();
    openProject();
  });
  dialog.addEventListener('close', () => {
    const dismiss = dialog.querySelector<HTMLInputElement>('[data-session-dismiss]')?.checked;
    if (dismiss) {
      try { localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* Preference stays session-only. */ }
    }
    dialog.remove();
  }, { once: true });
  dialog.showModal();
}
