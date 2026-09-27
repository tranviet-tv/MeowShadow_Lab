/**
 * MeowShadow Studio - Lesson Library Client Logic
 * Handles interactive search filtering and language pill tagging.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupSearchFilter();
  setupLanguageFilterPills();
  setupCardContextMenus();
});

function setupCardContextMenus() {
  const moreBtns = document.querySelectorAll('.card-more-btn');

  moreBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = btn.nextElementSibling;
      // Close any other open dropdowns
      document.querySelectorAll('.card-context-dropdown.open').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      if (dropdown) dropdown.classList.toggle('open');
    });
  });

  document.addEventListener('click', (e) => {
    document.querySelectorAll('.card-context-dropdown.open').forEach(d => {
      if (!d.contains(e.target)) d.classList.remove('open');
    });
  });

  // Handle action buttons inside dropdown
  document.querySelectorAll('.btn-card-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const card = btn.closest('.lesson-card');
      const title = card?.querySelector('.lesson-card-title')?.textContent || 'bài học';
      btn.closest('.card-context-dropdown')?.classList.remove('open');

      if (action === 'rerender') {
        showToast(`Đang gửi yêu cầu Render lại: "${title}"`, 'info');
      } else if (action === 'delete') {
        if (confirm(`Bạn có chắc chắn muốn xoá "${title}"?`)) {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            card.remove();
            showToast(`Đã xoá bài học "${title}"`, 'success');
          }, 200);
        }
      }
    });
  });
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed; bottom:24px; right:28px; z-index:120; display:flex; flex-direction:column; gap:8px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.style.cssText = `background:#161e31; border:1px solid ${type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}; color:${type === 'success' ? '#a7f3d0' : '#f8fafc'}; padding:10px 16px; border-radius:8px; font-size:12px; font-weight:600; box-shadow:0 4px 14px rgba(0,0,0,0.4); animation:fadeIn 0.2s;`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function setupSearchFilter() {
  const searchInput = document.querySelector('.library-search-input');
  const cards = document.querySelectorAll('.lesson-card');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      cards.forEach(card => {
        const title = card.querySelector('.lesson-card-title')?.textContent.toLowerCase() || '';
        const excerpt = card.querySelector('.lesson-card-excerpt')?.textContent.toLowerCase() || '';
        if (title.includes(query) || excerpt.includes(query)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
}

function setupLanguageFilterPills() {
  const pills = document.querySelectorAll('.filter-pill');
  const cards = document.querySelectorAll('.lesson-card');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filterType = pill.textContent.trim();
      cards.forEach(card => {
        const langBadge = card.querySelector('.lesson-lang-badge')?.textContent || '';
        if (filterType.includes('Tất cả')) {
          card.style.display = 'flex';
        } else if (filterType.includes('EN') && langBadge.includes('EN')) {
          card.style.display = 'flex';
        } else if (filterType.includes('JA') && langBadge.includes('JA')) {
          card.style.display = 'flex';
        } else if (filterType.includes('Offline')) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}
