let authToken = null;
let currentWebpages = [];
let currentFiles = [];

document.addEventListener('DOMContentLoaded', async () => {
  authToken = localStorage.getItem('pewallet_token');
  if (!authToken) {
    window.location.href = '/login';
    return;
  }

  // Token verify
  try {
    const res = await fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) {
      localStorage.removeItem('pewallet_token');
      window.location.href = '/login';
      return;
    }
  } catch (err) {
    window.location.href = '/login';
    return;
  }

  // Forms
  document.getElementById('addWebpageForm').addEventListener('submit', handleAddWebpage);
  document.getElementById('editWebpageForm').addEventListener('submit', handleSaveEditedWebpage);
  document.getElementById('settingsForm').addEventListener('submit', handleSaveSettings);
  document.getElementById('addFileForm').addEventListener('submit', handleAddFile);
  document.getElementById('profileForm').addEventListener('submit', handleSaveProfile);

  // Load initial data
  loadAdminWebpages();
  loadAdminSettings();
  loadAdminFiles();
  loadAdminProfile();
});

function handleLogout() {
  localStorage.removeItem('pewallet_token');
  localStorage.removeItem('pewallet_user');
  window.location.href = '/login';
}

function switchAdminTab(tab) {
  const tabs = ['webpages', 'landing', 'files', 'profile'];
  tabs.forEach(t => {
    const cap = t.charAt(0).toUpperCase() + t.slice(1);
    const btn = document.getElementById(`tab${cap}Btn`);
    const panel = document.getElementById(`panel${cap}`);
    if (t === tab) {
      if (btn) btn.classList.add('active');
      if (panel) panel.style.display = 'block';
    } else {
      if (btn) btn.classList.remove('active');
      if (panel) panel.style.display = 'none';
    }
  });
}

// ---------------- WEBPAGES ----------------
async function loadAdminWebpages() {
  try {
    const res = await fetch('/api/webpages');
    if (!res.ok) throw new Error('Failed to fetch webpages');
    currentWebpages = await res.json();
    renderAdminWebpages();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAdminWebpages() {
  const tbody = document.getElementById('webpagesTableBody');
  if (currentWebpages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 2rem;">No webpages attached yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentWebpages.map(page => {
    let imgThumb = '';
    if (page.preview_image) {
      imgThumb = `<img src="${escapeHtml(page.preview_image)}" style="width: 52px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;">`;
    } else {
      imgThumb = `<div style="width: 52px; height: 36px; border-radius: 6px; background: ${page.color_gradient || '#4f46e5'};"></div>`;
    }

    return `
      <tr>
        <td>${imgThumb}</td>
        <td>
          <div style="font-weight: 700; color: #0f172a;">${escapeHtml(page.title)}</div>
          <div style="font-size: 0.775rem; color: #64748b; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(page.description || 'No description')}
          </div>
        </td>
        <td><span class="badge-pill" style="background: #eef2ff; color: #4f46e5;">${escapeHtml(page.category || 'App')}</span></td>
        <td><span class="badge-pill" style="background: #ecfdf5; color: #059669;">${escapeHtml(page.badge || 'Live')}</span></td>
        <td>
          <a href="${escapeHtml(page.url)}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: none; font-size: 0.85rem; font-weight: 600;">
            ${escapeHtml(page.url)}
          </a>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button onclick="openEditModal(${page.id})" class="btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 700;">
              Edit Image &amp; Info
            </button>
            <button onclick="handleDeleteWebpage(${page.id})" class="btn-secondary" style="padding: 0.35rem 0.65rem; color: #e11d48; border-color: #fecdd3;" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleAddWebpage(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('title', document.getElementById('webpageTitle').value.trim());
  formData.append('url', document.getElementById('webpageUrl').value.trim());
  formData.append('category', document.getElementById('webpageCategory').value.trim());
  formData.append('badge', document.getElementById('webpageBadge').value.trim());
  formData.append('icon', document.getElementById('webpageIcon').value);
  formData.append('color_gradient', document.getElementById('webpageGradient').value);
  formData.append('description', document.getElementById('webpageDesc').value.trim());
  formData.append('is_featured', document.getElementById('webpageFeatured').checked);
  formData.append('pinned', document.getElementById('webpagePinned').checked);

  const fileInput = document.getElementById('webpageImageFile');
  if (fileInput.files && fileInput.files[0]) {
    formData.append('preview_image_file', fileInput.files[0]);
  }
  const urlImage = document.getElementById('webpageImageUrl').value.trim();
  if (urlImage) {
    formData.append('preview_image', urlImage);
  }

  try {
    const res = await fetch('/api/webpages', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to attach webpage');

    showToast('Webpage attached to wallet successfully!', 'success');
    document.getElementById('addWebpageForm').reset();
    document.getElementById('webpageCategory').value = 'Web App';
    document.getElementById('webpageBadge').value = 'Live';
    loadAdminWebpages();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Edit Modal Functions
function openEditModal(id) {
  const page = currentWebpages.find(p => p.id === id);
  if (!page) return;

  document.getElementById('editPageId').value = page.id;
  document.getElementById('editTitle').value = page.title;
  document.getElementById('editUrl').value = page.url;
  document.getElementById('editCategory').value = page.category || '';
  document.getElementById('editBadge').value = page.badge || '';
  document.getElementById('editDescription').value = page.description || '';
  document.getElementById('editFeatured').checked = !!page.is_featured;
  document.getElementById('editPinned').checked = !!page.pinned;
  document.getElementById('editImageUrl').value = page.preview_image && !page.preview_image.startsWith('/uploads/') ? page.preview_image : '';
  document.getElementById('editImageFile').value = '';

  const previewBox = document.getElementById('editCurrentImgPreview');
  if (page.preview_image) {
    previewBox.innerHTML = `
      <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.4rem;">Current Image:</div>
      <img src="${escapeHtml(page.preview_image)}" style="max-height: 120px; border-radius: 8px; border: 1px solid #e2e8f0; display: block;">
    `;
  } else {
    previewBox.innerHTML = `<div style="font-size: 0.8rem; color: #64748b;">No image currently set (using gradient).</div>`;
  }

  document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('open');
}

async function handleSaveEditedWebpage(e) {
  e.preventDefault();
  const id = document.getElementById('editPageId').value;
  const formData = new FormData();
  formData.append('title', document.getElementById('editTitle').value.trim());
  formData.append('url', document.getElementById('editUrl').value.trim());
  formData.append('category', document.getElementById('editCategory').value.trim());
  formData.append('badge', document.getElementById('editBadge').value.trim());
  formData.append('description', document.getElementById('editDescription').value.trim());
  formData.append('is_featured', document.getElementById('editFeatured').checked);
  formData.append('pinned', document.getElementById('editPinned').checked);

  const fileInput = document.getElementById('editImageFile');
  if (fileInput.files && fileInput.files[0]) {
    formData.append('preview_image_file', fileInput.files[0]);
  }
  const urlImage = document.getElementById('editImageUrl').value.trim();
  if (urlImage) {
    formData.append('preview_image', urlImage);
  }

  try {
    const res = await fetch(`/api/webpages/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update webpage');

    showToast('Webpage and image updated successfully!', 'success');
    closeEditModal();
    loadAdminWebpages();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteWebpage(id) {
  if (!confirm('Are you sure you want to remove this webpage?')) return;

  try {
    const res = await fetch(`/api/webpages/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete');
    }
    showToast('Webpage removed', 'success');
    loadAdminWebpages();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------- LANDING PAGE SETTINGS ----------------
async function loadAdminSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const s = await res.json();
    if (!s) return;

    document.getElementById('setHeroBadge').value = s.hero_badge || '';
    document.getElementById('setHeroPrefix').value = s.hero_title_prefix || '';
    document.getElementById('setHeroHighlight').value = s.hero_title_highlight || '';
    document.getElementById('setHeroSuffix').value = s.hero_title_suffix || '';
    document.getElementById('setHeroDesc').value = s.hero_description || '';
    document.getElementById('setHeroCtaPrimary').value = s.hero_cta_primary || '';
    document.getElementById('setHeroCtaSecondary').value = s.hero_cta_secondary || '';
    document.getElementById('setCardLabel').value = s.wallet_card_label || '';
    document.getElementById('setProtocolTag').value = s.wallet_protocol_tag || '';
    document.getElementById('setFooterBrand').value = s.footer_brand || '';
    document.getElementById('setFooterTagline').value = s.footer_tagline || '';
    document.getElementById('setFooterLinks').value = s.footer_links || '';
    document.getElementById('setFooterText').value = s.footer_text || '';
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const payload = {
    hero_badge: document.getElementById('setHeroBadge').value.trim(),
    hero_title_prefix: document.getElementById('setHeroPrefix').value.trim(),
    hero_title_highlight: document.getElementById('setHeroHighlight').value.trim(),
    hero_title_suffix: document.getElementById('setHeroSuffix').value.trim(),
    hero_description: document.getElementById('setHeroDesc').value.trim(),
    hero_cta_primary: document.getElementById('setHeroCtaPrimary').value.trim(),
    hero_cta_secondary: document.getElementById('setHeroCtaSecondary').value.trim(),
    wallet_card_label: document.getElementById('setCardLabel').value.trim(),
    wallet_protocol_tag: document.getElementById('setProtocolTag').value.trim(),
    footer_brand: document.getElementById('setFooterBrand').value.trim(),
    footer_tagline: document.getElementById('setFooterTagline').value.trim(),
    footer_links: document.getElementById('setFooterLinks').value.trim(),
    footer_text: document.getElementById('setFooterText').value.trim()
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to update landing page settings');
    showToast('Landing page content saved! Visit home to view changes.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------- FILES ----------------
async function loadAdminFiles() {
  try {
    const res = await fetch('/api/files');
    if (!res.ok) throw new Error('Failed to fetch files');
    currentFiles = await res.json();
    renderAdminFiles();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAdminFiles() {
  const tbody = document.getElementById('filesTableBody');
  if (currentFiles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 2rem;">No files uploaded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentFiles.map(file => `
    <tr>
      <td>
        <div style="font-weight: 700; color: #0f172a;">${escapeHtml(file.title || file.original_name)}</div>
        <div style="font-size: 0.775rem; color: #64748b;">${escapeHtml(file.original_name)}</div>
      </td>
      <td><span class="badge-pill" style="background: #f0f9ff; color: #0284c7;">${escapeHtml(file.category || 'Asset')}</span></td>
      <td>${formatBytes(file.file_size)}</td>
      <td>${file.downloads || 0}</td>
      <td style="text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">
        <a href="/api/files/${file.id}/download" class="btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.8rem; font-weight: 700;" title="Download">
          Download
        </a>
        <button onclick="handleDeleteFile(${file.id})" class="btn-secondary" style="padding: 0.35rem 0.65rem; color: #e11d48; border-color: #fecdd3;" title="Delete File">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

async function handleAddFile(e) {
  e.preventDefault();
  const fileInput = document.getElementById('fileInput');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Please select a file to upload', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('title', document.getElementById('fileTitle').value.trim());
  formData.append('category', document.getElementById('fileCategory').value);
  formData.append('description', document.getElementById('fileDescription').value.trim());

  const uploadBtn = document.getElementById('fileUploadBtn');
  const btnText = document.getElementById('fileBtnText');

  try {
    uploadBtn.disabled = true;
    btnText.textContent = 'Uploading...';

    const res = await fetch('/api/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'File upload failed');

    showToast('File stored in wallet vault!', 'success');
    document.getElementById('addFileForm').reset();
    loadAdminFiles();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    uploadBtn.disabled = false;
    btnText.textContent = 'Upload File to Vault';
  }
}

async function handleDeleteFile(id) {
  if (!confirm('Are you sure you want to delete this file from the vault?')) return;

  try {
    const res = await fetch(`/api/files/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete file');
    }
    showToast('File deleted from vault', 'success');
    loadAdminFiles();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------- PROFILE ----------------
async function loadAdminProfile() {
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) throw new Error('Failed to load profile');
    const profile = await res.json();
    if (!profile) return;

    document.getElementById('profileNameInput').value = profile.name || '';
    document.getElementById('profileTitleInput').value = profile.title || '';
    document.getElementById('profileEmailInput').value = profile.email || '';
    document.getElementById('profileWhatsappInput').value = profile.whatsapp_number || '';
    document.getElementById('profilePhoneInput').value = profile.phone_number || '';
    document.getElementById('profileAvatarUrl').value = profile.avatar_url || '';
    document.getElementById('profileInstagramInput').value = profile.instagram_url || '';
    document.getElementById('profileTelegramInput').value = profile.telegram_url || '';
    document.getElementById('profileWebsiteInput').value = profile.website_url || '';
    document.getElementById('profileGithubInput').value = profile.github_url || '';
    document.getElementById('profileLinkedinInput').value = profile.linkedin_url || '';
    document.getElementById('profileTwitterInput').value = profile.twitter_url || '';
    document.getElementById('profileBioInput').value = profile.bio || '';

    if (profile.skills) {
      let skillsArray = [];
      if (typeof profile.skills === 'string') {
        try { skillsArray = JSON.parse(profile.skills); } catch (e) { skillsArray = [profile.skills]; }
      } else if (Array.isArray(profile.skills)) {
        skillsArray = profile.skills;
      }
      document.getElementById('profileSkillsInput').value = skillsArray.join(', ');
    }
  } catch (err) {
    console.error('Error fetching profile:', err);
  }
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const name = document.getElementById('profileNameInput').value.trim();
  const title = document.getElementById('profileTitleInput').value.trim();
  const email = document.getElementById('profileEmailInput').value.trim();
  const whatsapp_number = document.getElementById('profileWhatsappInput').value.trim();
  const phone_number = document.getElementById('profilePhoneInput').value.trim();
  const avatar_url = document.getElementById('profileAvatarUrl').value.trim();
  const instagram_url = document.getElementById('profileInstagramInput').value.trim();
  const telegram_url = document.getElementById('profileTelegramInput').value.trim();
  const website_url = document.getElementById('profileWebsiteInput').value.trim();
  const github_url = document.getElementById('profileGithubInput').value.trim();
  const linkedin_url = document.getElementById('profileLinkedinInput').value.trim();
  const twitter_url = document.getElementById('profileTwitterInput').value.trim();
  const bio = document.getElementById('profileBioInput').value.trim();
  const rawSkills = document.getElementById('profileSkillsInput').value;
  const skills = rawSkills.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name,
        title,
        email,
        phone_number,
        whatsapp_number,
        avatar_url,
        instagram_url,
        telegram_url,
        website_url,
        github_url,
        linkedin_url,
        twitter_url,
        bio,
        skills
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');

    showToast('About Me profile updated successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---------------- UTILS ----------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
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
