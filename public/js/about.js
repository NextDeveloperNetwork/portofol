let creatorEmail = '';

document.addEventListener('DOMContentLoaded', () => {
  loadProfileData();
  loadVaultSnapshot();
  loadVaultPreview();
  loadFooterSettings();
  setupCopyEmail();
});

async function loadProfileData() {
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) throw new Error('Could not fetch profile');
    const profile = await res.json();
    if (!profile) return;

    if (profile.name) {
      document.getElementById('profileName').textContent = profile.name;
      const initial = profile.name.trim().charAt(0).toUpperCase();
      document.getElementById('avatarFallback').textContent = initial || 'A';
    }
    if (profile.title) {
      document.getElementById('profileTitle').textContent = profile.title;
    }

    if (profile.avatar_url) {
      const container = document.getElementById('avatarContainer');
      container.innerHTML = `<img src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(profile.name)}" style="width:100%;height:100%;object-fit:cover;">`;
    }

    if (profile.bio) {
      document.getElementById('profileBio').textContent = profile.bio;
    }

    if (profile.email) {
      creatorEmail = profile.email;
      const emailBtn = document.getElementById('emailBtn');
      if (emailBtn) {
        emailBtn.href = `mailto:${encodeURIComponent(profile.email)}`;
      }
    }

    if (profile.skills) {
      let skillsArray = [];
      if (typeof profile.skills === 'string') {
        try { skillsArray = JSON.parse(profile.skills); } catch (e) { skillsArray = [profile.skills]; }
      } else if (Array.isArray(profile.skills)) {
        skillsArray = profile.skills;
      }

      if (skillsArray.length > 0) {
        const skillsEl = document.getElementById('skillsContainer');
        skillsEl.innerHTML = skillsArray.map(s => `<span class="about-skill-chip">${escapeHtml(s)}</span>`).join('');
      }
    }

    const socialEl = document.getElementById('socialLinks');
    let socialHtml = '';
    const waDigits = profile.whatsapp_number ? String(profile.whatsapp_number).replace(/[^\d]/g, '') : '';

    if (waDigits) {
      socialHtml += `
        <a href="https://wa.me/${waDigits}" target="_blank" rel="noopener noreferrer" class="social-circle-btn" title="WhatsApp">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </a>
      `;
    }

    if (profile.instagram_url) {
      socialHtml += `
        <a href="${escapeHtml(profile.instagram_url)}" target="_blank" rel="noopener noreferrer" class="social-circle-btn" title="Instagram">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>
      `;
    }

    if (profile.telegram_url) {
      socialHtml += `
        <a href="${escapeHtml(profile.telegram_url)}" target="_blank" rel="noopener noreferrer" class="social-circle-btn" title="Telegram">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </a>
      `;
    }

    if (profile.github_url) {
      socialHtml += `
        <a href="${escapeHtml(profile.github_url)}" target="_blank" rel="noopener noreferrer" class="social-circle-btn" title="GitHub">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
      `;
    }

    if (profile.linkedin_url) {
      socialHtml += `
        <a href="${escapeHtml(profile.linkedin_url)}" target="_blank" rel="noopener noreferrer" class="social-circle-btn" title="LinkedIn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
            <rect x="2" y="9" width="4" height="12"></rect>
            <circle cx="4" cy="4" r="2"></circle>
          </svg>
        </a>
      `;
    }

    if (profile.twitter_url) {
      socialHtml += `
        <a href="${escapeHtml(profile.twitter_url)}" target="_blank" rel="noopener noreferrer" class="social-circle-btn" title="Twitter / X">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
          </svg>
        </a>
      `;
    }

    if (profile.website_url) {
      socialHtml += `
        <a href="${escapeHtml(profile.website_url)}" target="_blank" rel="noopener noreferrer" class="social-circle-btn" title="Website">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        </a>
      `;
    }

    if (profile.email) {
      socialHtml += `
        <a href="mailto:${escapeHtml(profile.email)}" class="social-circle-btn" title="Email">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </a>
      `;
    }

    socialEl.innerHTML = socialHtml;

    // Contact Me Bento Card
    const contactEl = document.getElementById('contactChannels');
    if (contactEl) {
      const items = [];
      if (waDigits) {
        items.push(`
          <a href="https://wa.me/${waDigits}" target="_blank" rel="noopener noreferrer" class="about-contact-item contact-whatsapp">
            <span class="contact-item-label">WhatsApp</span>
            <span class="contact-item-val">${escapeHtml(profile.whatsapp_number)}</span>
          </a>
        `);
      }
      if (profile.phone_number) {
        items.push(`
          <a href="tel:${escapeHtml(profile.phone_number)}" class="about-contact-item">
            <span class="contact-item-label">Phone</span>
            <span class="contact-item-val">${escapeHtml(profile.phone_number)}</span>
          </a>
        `);
      }
      if (profile.email) {
        items.push(`
          <a href="mailto:${escapeHtml(profile.email)}" class="about-contact-item">
            <span class="contact-item-label">Email</span>
            <span class="contact-item-val">${escapeHtml(profile.email)}</span>
          </a>
        `);
      }
      if (profile.instagram_url) {
        items.push(`
          <a href="${escapeHtml(profile.instagram_url)}" target="_blank" rel="noopener noreferrer" class="about-contact-item contact-instagram">
            <span class="contact-item-label">Instagram</span>
            <span class="contact-item-val">Open Profile &rarr;</span>
          </a>
        `);
      }
      if (profile.telegram_url) {
        items.push(`
          <a href="${escapeHtml(profile.telegram_url)}" target="_blank" rel="noopener noreferrer" class="about-contact-item">
            <span class="contact-item-label">Telegram</span>
            <span class="contact-item-val">Message &rarr;</span>
          </a>
        `);
      }
      if (profile.website_url) {
        items.push(`
          <a href="${escapeHtml(profile.website_url)}" target="_blank" rel="noopener noreferrer" class="about-contact-item">
            <span class="contact-item-label">Website</span>
            <span class="contact-item-val">${escapeHtml(profile.website_url.replace(/^https?:\/\//i, ''))}</span>
          </a>
        `);
      }
      contactEl.innerHTML = items.length > 0
        ? items.join('')
        : '<div style="font-size:0.85rem;color:var(--text-muted);">No contact channels configured yet.</div>';
    }

    // Footer Contact Pills
    const footerContactEl = document.getElementById('footerContactLinks');
    if (footerContactEl) {
      const pills = [];
      if (waDigits) pills.push(`<a href="https://wa.me/${waDigits}" target="_blank" rel="noopener noreferrer" class="footer-contact-pill pill-whatsapp">WhatsApp</a>`);
      if (profile.instagram_url) pills.push(`<a href="${escapeHtml(profile.instagram_url)}" target="_blank" rel="noopener noreferrer" class="footer-contact-pill pill-instagram">Instagram</a>`);
      if (profile.telegram_url) pills.push(`<a href="${escapeHtml(profile.telegram_url)}" target="_blank" rel="noopener noreferrer" class="footer-contact-pill">Telegram</a>`);
      if (profile.email) pills.push(`<a href="mailto:${escapeHtml(profile.email)}" class="footer-contact-pill">Email</a>`);
      if (profile.phone_number) pills.push(`<a href="tel:${escapeHtml(profile.phone_number)}" class="footer-contact-pill">Call</a>`);
      if (profile.github_url) pills.push(`<a href="${escapeHtml(profile.github_url)}" target="_blank" rel="noopener noreferrer" class="footer-contact-pill">GitHub</a>`);
      if (profile.linkedin_url) pills.push(`<a href="${escapeHtml(profile.linkedin_url)}" target="_blank" rel="noopener noreferrer" class="footer-contact-pill">LinkedIn</a>`);
      if (pills.length > 0) footerContactEl.innerHTML = pills.join('');
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

async function loadVaultSnapshot() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const stats = await res.json();
    const webEl = document.getElementById('aboutWebpagesCount');
    const fileEl = document.getElementById('aboutFilesCount');
    if (webEl) webEl.textContent = stats.totalWebpages ?? stats.total_webpages ?? 0;
    if (fileEl) fileEl.textContent = stats.totalFiles ?? stats.total_files ?? 0;
  } catch (err) {
    console.error('Error loading vault snapshot:', err);
  }
}

async function loadVaultPreview() {
  const container = document.getElementById('aboutVaultPreview');
  if (!container) return;
  try {
    const [webRes, fileRes] = await Promise.all([fetch('/api/webpages'), fetch('/api/files')]);
    const webpages = webRes.ok ? await webRes.json() : [];
    const files = fileRes.ok ? await fileRes.json() : [];

    const items = [];
    webpages.slice(0, 4).forEach(w => {
      items.push(`
        <a href="${escapeHtml(w.url)}" target="_blank" rel="noopener noreferrer" class="about-vault-tile">
          <div class="about-vault-top">
            <span class="about-vault-type type-web">${escapeHtml(w.category || 'Web App')}</span>
            <span class="about-vault-arrow">&nearr;</span>
          </div>
          <h3>${escapeHtml(w.title)}</h3>
          <p>${escapeHtml(w.description || w.url)}</p>
        </a>
      `);
    });

    files.slice(0, 2).forEach(f => {
      items.push(`
        <a href="/api/files/${f.id}/download" class="about-vault-tile">
          <div class="about-vault-top">
            <span class="about-vault-type type-file">${escapeHtml(f.category || 'File')}</span>
            <span class="about-vault-arrow">&darr;</span>
          </div>
          <h3>${escapeHtml(f.title)}</h3>
          <p>${escapeHtml(f.description || f.original_name)}</p>
        </a>
      `);
    });

    container.innerHTML = items.length > 0
      ? items.join('')
      : '<div style="font-size:0.85rem;color:var(--text-muted);">No vault assets added yet.</div>';
  } catch (err) {
    console.error('Error loading vault preview:', err);
  }
}

async function loadFooterSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();
    if (!settings) return;

    if (settings.footer_brand) {
      const el = document.getElementById('footerBrand');
      if (el) el.textContent = settings.footer_brand;
    }
    if (settings.footer_tagline) {
      const el = document.getElementById('footerTagline');
      if (el) el.textContent = settings.footer_tagline;
    }
    if (settings.footer_links) {
      const el = document.getElementById('footerLinks');
      if (el) {
        const parsed = settings.footer_links
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .map(line => {
            const [label, ...rest] = line.split('|');
            const url = (rest.join('|') || '#').trim();
            const isExternal = /^https?:\/\//i.test(url);
            const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            return `<a href="${escapeHtml(url)}"${attrs}>${escapeHtml((label || url).trim())}</a>`;
          });
        if (parsed.length > 0) el.innerHTML = parsed.join('');
      }
    }
    if (settings.footer_text) {
      const el = document.getElementById('footerText');
      if (el) el.innerHTML = escapeHtml(settings.footer_text);
    }
  } catch (err) {
    console.error('Error loading footer settings:', err);
  }
}

function setupCopyEmail() {
  const btn = document.getElementById('copyEmailBtn');
  const label = document.getElementById('copyEmailLabel');
  if (!btn || !label) return;

  btn.addEventListener('click', async () => {
    if (!creatorEmail) return;
    try {
      await navigator.clipboard.writeText(creatorEmail);
      label.textContent = 'Copied!';
      setTimeout(() => { label.textContent = 'Copy Email'; }, 1800);
    } catch {
      label.textContent = creatorEmail;
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
