let allWebpages = [];
let allFiles = [];
let activeTab = 'webpages';

document.addEventListener('DOMContentLoaded', () => {
  checkLoginStatus();
  loadSiteSettings();
  loadProfile();
  loadStats();
  loadWebpages();
  loadFiles();
});

// Check if admin is currently signed in
function checkLoginStatus() {
  const token = localStorage.getItem('pewallet_token');
  const slot = document.getElementById('adminNavSlot');
  if (token && slot) {
    slot.innerHTML = `
      <a href="/admin" class="nav-link nav-btn-admin">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
        <span>Manage Wallet</span>
      </a>
    `;
  }
}

// Fetch Site Settings and dynamically inject text into landing page
async function loadSiteSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();
    if (!settings) return;

    if (settings.hero_badge) document.getElementById('heroBadge').textContent = settings.hero_badge;
    if (settings.hero_title_prefix) document.getElementById('heroPrefix').textContent = settings.hero_title_prefix;
    if (settings.hero_title_highlight) document.getElementById('heroHighlight').textContent = settings.hero_title_highlight;
    if (settings.hero_title_suffix) document.getElementById('heroSuffix').textContent = settings.hero_title_suffix;
    if (settings.hero_description) document.getElementById('heroDesc').textContent = settings.hero_description;

    if (settings.hero_cta_primary) {
      const el = document.getElementById('heroCtaPrimary');
      if (el) el.querySelector('span').textContent = settings.hero_cta_primary;
    }
    if (settings.hero_cta_secondary) {
      const el = document.getElementById('heroCtaSecondary');
      if (el) el.querySelector('span').textContent = settings.hero_cta_secondary;
    }

    if (settings.wallet_card_label) {
      const el = document.getElementById('cardVaultLabel');
      if (el) el.textContent = settings.wallet_card_label;
    }
    if (settings.wallet_protocol_tag) {
      const el = document.getElementById('walletProtocolTag');
      if (el) el.textContent = settings.wallet_protocol_tag;
    }
    if (settings.footer_text) {
      const el = document.getElementById('footerText');
      if (el) el.innerHTML = escapeHtml(settings.footer_text);
    }
  } catch (err) {
    console.error('Failed to load site settings:', err);
  }
}

// Fetch Profile
async function loadProfile() {
  try {
    const res = await fetch('/api/profile');
    if (res.ok) {
      const data = await res.json();
      if (data && data.name) {
        const ownerEl = document.getElementById('cardOwnerName');
        if (ownerEl) ownerEl.textContent = data.name;
      }
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

// Fetch Stats
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const stats = await res.json();
      document.getElementById('statWebpages').textContent = stats.totalWebpages || 0;
      document.getElementById('statFiles').textContent = stats.totalFiles || 0;
      document.getElementById('statDownloads').textContent = stats.totalDownloads || 0;
      document.getElementById('statStorage').textContent = formatBytes(stats.totalSize || 0);

      const totalAssets = (stats.totalWebpages || 0) + (stats.totalFiles || 0);
      document.getElementById('cardAssetCount').innerHTML = `
        <span>${totalAssets}</span>
        <span style="font-size: 1rem; font-weight: 600; color: #64748b;">Assets Loaded</span>
      `;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Fetch Webpages
async function loadWebpages() {
  try {
    const res = await fetch('/api/webpages');
    if (res.ok) {
      allWebpages = await res.json();
      document.getElementById('tabWebpagesCount').textContent = allWebpages.length;
      updateCategoryDropdown();
      renderWebpages(allWebpages);
    }
  } catch (err) {
    console.error('Failed to load webpages:', err);
  }
}

// Fetch Files
async function loadFiles() {
  try {
    const res = await fetch('/api/files');
    if (res.ok) {
      allFiles = await res.json();
      document.getElementById('tabFilesCount').textContent = allFiles.length;
      renderFiles(allFiles);
    }
  } catch (err) {
    console.error('Failed to load files:', err);
  }
}

// Render Webpages Cards with Images
function renderWebpages(items) {
  const container = document.getElementById('webpagesGrid');
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #64748b;">
        <p>No webpages found in this category.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(page => {
    const gradient = page.color_gradient || 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)';
    const badgeHtml = page.badge ? `<span class="badge-pill">${escapeHtml(page.badge)}</span>` : '';
    const featuredHtml = page.is_featured ? `<span class="badge-pill" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a;">★ Featured</span>` : '';
    const iconSvg = getIconSvg(page.icon || 'globe');

    let mediaHeaderHtml = '';
    if (page.preview_image) {
      mediaHeaderHtml = `
        <div class="card-media-banner">
          <img src="${escapeHtml(page.preview_image)}" alt="${escapeHtml(page.title)}" class="card-media-img" onerror="this.onerror=null; this.parentElement.style.background='${gradient}'; this.remove();">
          <div class="card-media-overlay-badges">
            ${featuredHtml}
            ${badgeHtml}
          </div>
          <div class="card-floating-icon">
            ${iconSvg}
          </div>
        </div>
      `;
    } else {
      mediaHeaderHtml = `
        <div class="card-media-banner" style="background: ${gradient};">
          <div class="card-media-overlay-badges">
            ${featuredHtml}
            ${badgeHtml}
          </div>
          <div class="card-floating-icon">
            ${iconSvg}
          </div>
        </div>
      `;
    }

    return `
      <article class="webpage-card">
        ${mediaHeaderHtml}
        <div class="card-body">
          <span class="card-cat-tag">${escapeHtml(page.category || 'App')}</span>
          <h3 class="card-title">${escapeHtml(page.title)}</h3>
          <p class="card-desc">${escapeHtml(page.description || 'No description provided.')}</p>
          <div class="card-footer">
            <span style="font-size: 0.775rem; color: #94a3b8; font-weight: 500;">${formatDate(page.created_at)}</span>
            <a href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer" class="card-launch-btn">
              <span>Launch Site</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Render Files Cards
function renderFiles(items) {
  const container = document.getElementById('filesGrid');
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #64748b;">
        <p>No attached files in vault yet.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(file => {
    return `
      <div class="file-item">
        <div class="file-icon-square">
          ${getFileIconSvg(file.original_name)}
        </div>
        <div style="flex-grow: 1; min-width: 0;">
          <h4 style="font-size: 1rem; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(file.title || file.original_name)}
          </h4>
          <div style="font-size: 0.8rem; color: #64748b; margin: 0.2rem 0 0.5rem 0;">
            <span>${formatBytes(file.file_size)}</span> &bull; 
            <span>${escapeHtml(file.category || 'Document')}</span> &bull; 
            <span>${file.downloads || 0} downloads</span>
          </div>
          <p style="font-size: 0.85rem; color: #475569; margin-bottom: 0.85rem; line-height: 1.4;">
            ${escapeHtml(file.description || file.original_name)}
          </p>
          <a href="/api/files/${file.id}/download" class="file-download-action" onclick="handleFileDownload(${file.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// Switch between Webpages and Files tab
function switchVaultTab(tab) {
  activeTab = tab;
  const webBtn = document.getElementById('tabWebpagesBtn');
  const filesBtn = document.getElementById('tabFilesBtn');
  const webSection = document.getElementById('webpagesSection');
  const filesSection = document.getElementById('filesSection');

  if (tab === 'webpages') {
    webBtn.classList.add('active');
    filesBtn.classList.remove('active');
    webSection.style.display = 'block';
    filesSection.style.display = 'none';
  } else {
    filesBtn.classList.add('active');
    webBtn.classList.remove('active');
    webSection.style.display = 'none';
    filesSection.style.display = 'block';
  }
  handleSearch();
}

function handleSearch() {
  const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
  const category = document.getElementById('categoryFilter').value;

  if (activeTab === 'webpages') {
    const filtered = allWebpages.filter(p => {
      const matchesQuery = !query || 
        p.title.toLowerCase().includes(query) || 
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query));
      const matchesCat = category === 'ALL' || p.category === category;
      return matchesQuery && matchesCat;
    });
    renderWebpages(filtered);
  } else {
    const filtered = allFiles.filter(f => {
      const matchesQuery = !query || 
        f.title.toLowerCase().includes(query) || 
        f.original_name.toLowerCase().includes(query) ||
        (f.description && f.description.toLowerCase().includes(query)) ||
        (f.category && f.category.toLowerCase().includes(query));
      const matchesCat = category === 'ALL' || f.category === category;
      return matchesQuery && matchesCat;
    });
    renderFiles(filtered);
  }
}

function handleCategoryFilter() {
  handleSearch();
}

function updateCategoryDropdown() {
  const select = document.getElementById('categoryFilter');
  const categories = new Set();
  allWebpages.forEach(p => p.category && categories.add(p.category));
  allFiles.forEach(f => f.category && categories.add(f.category));

  select.innerHTML = '<option value="ALL">All Categories</option>' + 
    Array.from(categories).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function handleFileDownload(id) {
  setTimeout(() => {
    loadStats();
    loadFiles();
  }, 1000);
}

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

function getIconSvg(iconName) {
  switch (iconName) {
    case 'cpu':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`;
    case 'server':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`;
    case 'sparkles':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
    case 'trending-up':
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
    default:
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z"/></svg>`;
  }
}

function getFileIconSvg(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
  }
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`;
  }
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
}
