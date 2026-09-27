/**
 * MeowShadow Studio - Batch Render Queue Client Logic
 * Simulates real-time worker task progress with quantitative percentages,
 * step breakdowns, elapsed time, and dynamic ETA updates.
 */

document.addEventListener('DOMContentLoaded', () => {
  simulateActiveQueueProgress();
});

/**
 * Simulates the active batch rendering job progress with dynamic metrics (Fix Issue 11)
 */
function simulateActiveQueueProgress() {
  const activeBar = document.getElementById('activeJobProgress');
  const activeStatus = document.getElementById('activeJobStatus');
  const activePct = document.getElementById('activeProgressPct');
  const activeStep = document.getElementById('activeProgressStep');
  const activeElapsed = document.getElementById('activeElapsedTime');
  const activeEta = document.getElementById('activeEta');
  const activeAction = document.getElementById('activeJobAction');

  if (!activeBar) return;

  let currentPct = 68;
  let elapsed = 1.4;
  let eta = 1.2;

  const interval = setInterval(() => {
    currentPct += 8;
    elapsed += 0.4;
    eta = Math.max(0, (eta - 0.35)).toFixed(1);

    if (currentPct > 100) currentPct = 100;

    // Update progress bar fill
    activeBar.style.width = `${currentPct}%`;

    // Update percentage text
    if (activePct) activePct.textContent = `${currentPct}%`;

    // Update step breakdown
    if (activeStep) {
      if (currentPct < 80) {
        activeStep.textContent = 'Đang ghép câu 3/5';
      } else if (currentPct < 95) {
        activeStep.textContent = 'Đang ghép câu 4/5';
      } else if (currentPct < 100) {
        activeStep.textContent = 'Đang chuẩn hoá EBU R128';
      } else {
        activeStep.textContent = 'Đã ghép 5/5 câu';
      }
    }

    // Update elapsed & ETA timers
    if (activeElapsed) activeElapsed.textContent = `${elapsed.toFixed(1)}s`;
    if (activeEta) {
      if (currentPct >= 100) {
        activeEta.textContent = 'Chuẩn EBU R128';
        activeEta.style.color = 'var(--text-tertiary)';
      } else {
        activeEta.textContent = `ETA: ${eta}s`;
      }
    }

    // Complete state
    if (currentPct >= 100) {
      clearInterval(interval);
      if (activeStatus) {
        activeStatus.className = 'queue-status-badge completed';
        activeStatus.textContent = '✓ Hoàn thành';
      }
      if (activeAction) {
        activeAction.className = 'table-action-btn primary-action';
        activeAction.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span>Luyện Ngay</span>
        `;
      }
    }
  }, 1200);
}
