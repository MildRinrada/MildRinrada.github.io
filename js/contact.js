// "Send me a message" form, delivered by EmailJS straight from the browser, so the site never shows an email
// address. Configure site.contact.emailjs in data/town.js; while it is empty the form is not shown at all.
//
// The EmailJS template receives: {{from_name}}, {{reply_to}}, {{company}}, {{message}} and {{page}}.

const API = 'https://api.emailjs.com/api/v1.0/email/send';
const COOLDOWN = 60_000; // one message a minute from the same browser

export const contactReady = (cfg) => Boolean(cfg?.serviceId && cfg?.templateId && cfg?.publicKey);

export function contactForm({ cfg, el, t, company, onSent }) {
  if (!contactReady(cfg)) return null;
  const status = el('p', { class: 'cf-status', role: 'status', 'aria-live': 'polite' });
  const field = (name, label, input) => el('label', { class: 'cf-field' }, el('span', { text: label }), input);
  const form = el(
    'form',
    { class: 'contact-form', id: 'contact-form', novalidate: true },
    el('h3', { class: 'cf-title', text: t('contact.title') }),
    field('name', t('contact.name'), el('input', { name: 'from_name', required: true, maxlength: '80', autocomplete: 'name' })),
    field('email', t('contact.email'), el('input', { name: 'reply_to', type: 'email', required: true, maxlength: '120', autocomplete: 'email' })),
    field('company', t('contact.company'), el('input', { name: 'company', maxlength: '80', autocomplete: 'organization', value: company || null })),
    field('message', t('contact.message'), el('textarea', { name: 'message', rows: '4', required: true, maxlength: '2000' })),
    // bots fill every field; people never see this one
    el('input', { class: 'cf-trap', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' }),
    el('div', { class: 'cf-actions' }, el('button', { class: 'btn btn-primary', type: 'submit', text: t('contact.send') }), status),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector('button[type=submit]');
    status.className = 'cf-status';
    if (data.website) return; // a bot
    if (!data.from_name.trim() || !/^\S+@\S+\.\S+$/.test(data.reply_to) || !data.message.trim()) {
      status.textContent = t('contact.invalid');
      status.classList.add('is-error');
      return;
    }
    let last = 0;
    try {
      last = Number(localStorage.getItem('contact-sent') || 0);
    } catch {
      /* private mode */
    }
    if (Date.now() - last < COOLDOWN) {
      status.textContent = t('contact.wait');
      status.classList.add('is-error');
      return;
    }
    button.disabled = true;
    button.textContent = t('contact.sending');
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: cfg.serviceId,
          template_id: cfg.templateId,
          user_id: cfg.publicKey,
          template_params: { from_name: data.from_name.trim(), reply_to: data.reply_to.trim(), company: data.company.trim(), message: data.message.trim(), page: location.href },
        }),
      });
      if (!r.ok) throw new Error(`EmailJS ${r.status}`);
      try {
        localStorage.setItem('contact-sent', String(Date.now()));
      } catch {
        /* private mode */
      }
      form.replaceChildren(el('p', { class: 'cf-done', text: t('contact.sent') }));
      onSent?.();
    } catch {
      status.textContent = t('contact.error');
      status.classList.add('is-error');
      button.disabled = false;
      button.textContent = t('contact.send');
    }
  });
  return form;
}
