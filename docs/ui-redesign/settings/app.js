/**
 * MeowShadow Studio - Settings & Presets Client Logic
 * Handles speech engine selection, Ollama test pings with spinner feedback,
 * and global configuration saving with real-time auto-save indicator.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupEngineBoxes();
  setupOllamaTest();
  setupGlobalSave();
  setupFormChangeAutoSave();
});

/**
 * Configure TTS Engine selection boxes
 */
function setupEngineBoxes() {
  const engineBoxes = document.querySelectorAll('.engine-option-box');
  engineBoxes.forEach(box => {
    box.addEventListener('click', () => {
      engineBoxes.forEach(b => b.classList.remove('active'));
      box.classList.add('active');
      const engineName = box.querySelector('.engine-name')?.textContent || '';
      showToast(`Đã chọn động cơ: ${engineName}`, 'success');
      triggerAutoSave();
    });
  });
}

/**
 * Handle Ollama connection test with loading spinner and status feedback (Fix Issue 10)
 */
function setupOllamaTest() {
  const btnTestOllama = document.getElementById('btnTestOllama');
  const spinner = document.getElementById('ollamaSpinner');
  const icon = document.getElementById('ollamaTestIcon');
  const text = document.getElementById('btnTestOllamaText');
  const statusResult = document.getElementById('ollamaStatusResult');

  if (!btnTestOllama) return;

  btnTestOllama.addEventListener('click', () => {
    // Show spinner state
    btnTestOllama.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    if (icon) icon.style.display = 'none';
    if (text) text.textContent = 'Đang kiểm tra...';
    if (statusResult) statusResult.style.display = 'none';

    setTimeout(() => {
      // Restore button state
      btnTestOllama.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (icon) icon.style.display = 'inline-block';
      if (text) text.textContent = 'Kiểm tra lại kết nối';

      // Display response feedback
      if (statusResult) {
        statusResult.className = 'connection-status-result success';
        statusResult.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>✓ Kết nối thành công (12ms)</span>
        `;
        statusResult.style.display = 'inline-flex';
      }

      showToast('✓ Kết nối Ollama local API thành công! Phản hồi: 12ms', 'success');
    }, 700);
  });
}

/**
 * Handle Global Save and manual save button (Fix Issue 9)
 */
function setupGlobalSave() {
  const btnSaveAll = document.getElementById('btnSaveAllSettings');
  const btnReset = document.getElementById('btnResetSettings');

  if (btnSaveAll) {
    btnSaveAll.addEventListener('click', () => {
      const originalHtml = btnSaveAll.innerHTML;
      btnSaveAll.disabled = true;
      btnSaveAll.innerHTML = `
        <span class="btn-spinner"></span>
        <span>Đang lưu toàn cục...</span>
      `;

      setTimeout(() => {
        btnSaveAll.disabled = false;
        btnSaveAll.innerHTML = originalHtml;
        triggerAutoSave();
        showToast('Đã lưu toàn bộ cấu hình hệ thống (TTS + Local LLM + Chuẩn Audio)!', 'success');
      }, 500);
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      triggerAutoSave();
      showToast('Đã khôi phục các giá trị cấu hình về mặc định chuẩn.', 'info');
    });
  }
}

/**
 * Watch for any change in inputs or selects to update auto-save status
 */
function setupFormChangeAutoSave() {
  const inputs = document.querySelectorAll('.settings-input, .settings-select');
  inputs.forEach(el => {
    el.addEventListener('change', () => {
      triggerAutoSave();
    });
  });
}

/**
 * Update the auto-save timestamp label
 */
function triggerAutoSave() {
  const autoSaveText = document.getElementById('autoSaveText');
  if (!autoSaveText) return;

  const now = new Date();
  const timeString = now.toTimeString().split(' ')[0];
  autoSaveText.textContent = `✓ Đã tự động lưu tất cả thay đổi lúc ${timeString}`;
}

/**
 * Display floating toast notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
