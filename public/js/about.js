document.addEventListener('DOMContentLoaded', () => {
  loadProfileData();
});

async function loadProfileData() {
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) throw new Error('Could not fetch profile');
    const profile = await res.json();
    if (!profile) return;

    // Name & Title
    if (profile.name) {
      document.getElementById('profileName').textContent = profile.name;
      const initial = profile.name.trim().charAt(0).toUpperCase();
      document.getElementById('avatarFallback').textContent = initial || 'A';
    }
    if (profile.title) {
      document.getElementById('profileTitle').textContent = profile.title;
    }

    // Avatar image if available
    if (profile.avatar_url) {
      const container = document.getElementById('avatarContainer');
      container.innerHTML = `<img src="${escapeHtml(profile.avatar_url)}" alt="${escapeHtml(profile.name)}" class="about-avatar">`;
    }

    // Bio
    if (profile.bio) {
      document.getElementById('profileBio').textContent = profile.bio;
    }

    // Email
    if (profile.email) {
      const emailBtn = document.getElementById('emailBtn');
      if (emailBtn) {
        emailBtn.href = `mailto:${encodeURIComponent(profile.email)}`;
      }
    }

    // Skills
    if (profile.skills) {
      let skillsArray = [];
      if (typeof profile.skills === 'string') {
        try { skillsArray = JSON.parse(profile.skills); } catch (e) { skillsArray = [profile.skills]; }
      } else if (Array.isArray(profile.skills)) {
        skillsArray = profile.skills;
      }

      if (skillsArray.length > 0) {
        const skillsEl = document.getElementById('skillsContainer');
        skillsEl.innerHTML = skillsArray.map(s => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('');
      }
    }

    // Social Links
    const socialEl = document.getElementById('socialLinks');
    let socialHtml = '';

    if (profile.github_url) {
      socialHtml += `
        <a href="${escapeHtml(profile.github_url)}" target="_blank" rel="noopener noreferrer" class="social-btn" title="GitHub">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
      `;
    }

    if (profile.linkedin_url) {
      socialHtml += `
        <a href="${escapeHtml(profile.linkedin_url)}" target="_blank" rel="noopener noreferrer" class="social-btn" title="LinkedIn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
            <rect x="2" y="9" width="4" height="12"></rect>
            <circle cx="4" cy="4" r="2"></circle>
          </svg>
        </a>
      `;
    }

    if (profile.twitter_url) {
      socialHtml += `
        <a href="${escapeHtml(profile.twitter_url)}" target="_blank" rel="noopener noreferrer" class="social-btn" title="Twitter / X">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
          </svg>
        </a>
      `;
    }

    if (profile.email) {
      socialHtml += `
        <a href="mailto:${escapeHtml(profile.email)}" class="social-btn" title="Email">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </a>
      `;
    }

    socialEl.innerHTML = socialHtml;
  } catch (err) {
    console.error('Error loading profile:', err);
  }
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

