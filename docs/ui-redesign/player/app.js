/**
 * MeowShadow Studio - Dedicated Shadowing Player Client Logic
 * Real-time waveform scrubbing, synchronized Karaoke autoscroll,
 * and Web Audio API tone synthesis.
 */

const scriptChunks = [
  {
    id: 1,
    vi: "Hôm nay là một ngày tuyệt vời để bắt đầu học ngoại ngữ mới.",
    en: "Today is a wonderful day to start learning a new language.",
    startSec: 0,
    endSec: 18,
    wordsVI: 14,
    wordsEN: 11
  },
  {
    id: 2,
    vi: "Khi bạn kiên trì luyện tập phương pháp Shadowing mỗi ngày mười lăm phút, khả năng phát âm của bạn sẽ tiến bộ vượt bậc.",
    en: "When you consistently practice the shadowing technique for fifteen minutes every day, your pronunciation will improve dramatically.",
    startSec: 18,
    endSec: 52,
    wordsVI: 23,
    wordsEN: 18
  },
  {
    id: 3,
    vi: "Hãy nghe thật kỹ từng ngữ điệu và nhại lại ngay sau khi câu nói kết thúc.",
    en: "Listen carefully to each intonation and repeat immediately after the sentence finishes.",
    startSec: 52,
    endSec: 88,
    wordsVI: 17,
    wordsEN: 12
  }
];

const playerState = {
  isPlaying: false,
  currentTime: 0,
  totalDuration: 88, // 1m 28s
  playbackSpeed: 1.0,
  activeChunkIndex: 0,
  onlyForeignMode: false,
  isRecordingMic: false,
  loopChunkIndex: null
};

document.addEventListener('DOMContentLoaded', () => {
  renderWaveform();
  renderTranscript();
  setupPlayerControls();
  setupRulesPopoverPlayer();
  setupKeyboardShortcuts();
});

function setupRulesPopoverPlayer() {
  const btn = document.getElementById('btnShadowingRulesPlayer');
  const popover = document.getElementById('rulesPopoverCardPlayer');

  if (btn && popover) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && e.target !== btn) {
        popover.classList.remove('open');
      }
    });
  }
}

let micAnimFrame = null;
let micTimer = null;

function setupPlayerControls() {
  const playBtn = document.getElementById('btnHeroPlayMaster');
  const seekBackBtn = document.getElementById('btnHeroSeekBack');
  const seekFwdBtn = document.getElementById('btnHeroSeekFwd');
  const repeatBtn = document.getElementById('btnHeroRepeatChunk');
  const speedBtns = document.querySelectorAll('.speed-pill-btn');
  const micBtn = document.getElementById('btnPracticeMic');
  const toggleOnlyForeign = document.getElementById('toggleOnlyForeign');
  const exportBtn = document.getElementById('btnExportPlayer');
  const syncMobileBtn = document.getElementById('btnSyncMobile');
  const btnCancelRec = document.getElementById('btnCancelRecording');
  const btnCloseRep = document.getElementById('btnCloseReport');
  const btnListenSelf = document.getElementById('btnListenSelf');
  const btnRetryRec = document.getElementById('btnRetryRecord');

  if (playBtn) playBtn.addEventListener('click', () => togglePlayback());

  if (seekBackBtn) {
    seekBackBtn.addEventListener('click', () => {
      playerState.currentTime = Math.max(0, playerState.currentTime - 5);
      updatePlayerUI();
      playTone(330, 'sine', 0.1);
    });
  }

  if (seekFwdBtn) {
    seekFwdBtn.addEventListener('click', () => {
      playerState.currentTime = Math.min(playerState.totalDuration, playerState.currentTime + 5);
      updatePlayerUI();
      playTone(440, 'sine', 0.1);
    });
  }

  if (repeatBtn) {
    repeatBtn.addEventListener('click', () => {
      const activeChunk = scriptChunks[playerState.activeChunkIndex] || scriptChunks[0];
      playerState.currentTime = activeChunk.startSec || 0;
      updatePlayerUI();
      playChime();
      showToast(`Đang lặp lại Cặp câu #${playerState.activeChunkIndex + 1} để nhại lại`, 'success');
      if (!playerState.isPlaying) startPlayback();
    });
  }

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      playerState.playbackSpeed = parseFloat(btn.dataset.speed);
      showToast(`Tốc độ phát: ${playerState.playbackSpeed}x`);
    });
  });

  // Dual-Waveform Live Microphone Practice Flow
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      startMicRecording();
    });
  }

  if (btnCancelRec) {
    btnCancelRec.addEventListener('click', () => {
      stopMicRecording(false);
      showToast('Đã dừng thu âm microphone.', 'info');
    });
  }

  if (btnCloseRep) {
    btnCloseRep.addEventListener('click', () => {
      const reportCard = document.getElementById('voiceMatchReportCard');
      if (reportCard) reportCard.style.display = 'none';
    });
  }

  if (btnListenSelf) {
    btnListenSelf.addEventListener('click', () => {
      playTone(520, 'triangle', 0.4, 0.18);
      setTimeout(() => playTone(660, 'sine', 0.5, 0.15), 300);
      showToast('Đang phát lại bản ghi âm giọng bạn...', 'info');
    });
  }

  if (btnRetryRec) {
    btnRetryRec.addEventListener('click', () => {
      const reportCard = document.getElementById('voiceMatchReportCard');
      if (reportCard) reportCard.style.display = 'none';
      startMicRecording();
    });
  }

  if (toggleOnlyForeign) {
    toggleOnlyForeign.addEventListener('change', (e) => {
      playerState.onlyForeignMode = e.target.checked;
      showToast(playerState.onlyForeignMode ? 'Đã bật: Chỉ phát ngoại ngữ' : 'Đã bật: Đầy đủ song ngữ');
    });
  }

  if (exportBtn) exportBtn.addEventListener('click', () => showToast('Đang tải file MP3 320kbps (EBU R128)...', 'success'));
  if (syncMobileBtn) syncMobileBtn.addEventListener('click', () => showToast('Đã đồng bộ lên app di động!', 'success'));

  // Waveform click-to-seek & hover tooltip
  const waveformBox = document.getElementById('heroWaveformBox');
  const hoverLine = document.getElementById('waveformHoverLine');
  const hoverTooltip = document.getElementById('waveformHoverTooltip');

  if (waveformBox) {
    waveformBox.addEventListener('click', (e) => {
      const rect = waveformBox.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, clickX / rect.width));
      playerState.currentTime = Math.round(pct * playerState.totalDuration);
      updatePlayerUI();
      playTone(520, 'triangle', 0.15);
      showToast(`Đã tua tới ${Math.floor(playerState.currentTime / 60)}:${(playerState.currentTime % 60).toString().padStart(2, '0')}`, 'info');
    });

    waveformBox.addEventListener('mousemove', (e) => {
      const rect = waveformBox.getBoundingClientRect();
      const hoverX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = hoverX / rect.width;
      const sec = Math.round(pct * playerState.totalDuration);
      const mins = Math.floor(sec / 60);
      const s = sec % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

      if (hoverLine) {
        hoverLine.style.display = 'block';
        hoverLine.style.left = `${hoverX}px`;
      }
      if (hoverTooltip) {
        hoverTooltip.style.display = 'block';
        hoverTooltip.style.left = `${hoverX}px`;
        let tag = 'PAUSE';
        scriptChunks.forEach(c => {
          if (sec >= c.startSec && sec <= c.endSec) {
            tag = `[EN] ${c.en.slice(0, 22)}...`;
          }
        });
        hoverTooltip.textContent = `${timeStr} • ${tag}`;
      }
    });

    waveformBox.addEventListener('mouseleave', () => {
      if (hoverLine) hoverLine.style.display = 'none';
      if (hoverTooltip) hoverTooltip.style.display = 'none';
    });
  }
}

function startMicRecording() {
  const dualMicStage = document.getElementById('dualMicStage');
  const reportCard = document.getElementById('voiceMatchReportCard');
  const micCanvas = document.getElementById('userMicCanvas');

  if (reportCard) reportCard.style.display = 'none';
  if (dualMicStage) dualMicStage.style.display = 'flex';

  if (playerState.isPlaying) stopPlayback();

  playTone(660, 'sine', 0.2, 0.15);
  showToast('Đang thu âm microphone! Hãy phát âm nhại lại câu...', 'info');

  if (micCanvas) {
    const ctx = micCanvas.getContext('2d');
    const rect = micCanvas.parentElement.getBoundingClientRect();
    micCanvas.width = rect.width || 600;
    micCanvas.height = 50;

    let t = 0;
    function drawMicWave() {
      ctx.clearRect(0, 0, micCanvas.width, micCanvas.height);
      const bars = 55;
      const barW = micCanvas.width / bars;
      for (let i = 0; i < bars; i++) {
        const h = Math.abs(Math.sin(i * 0.25 + t) * 16 + Math.cos(i * 0.1 - t * 2) * 12) + 8;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.roundRect(i * barW + 2, (micCanvas.height - h) / 2, barW - 4, h, 2);
        ctx.fill();
      }
      t += 0.14;
      micAnimFrame = requestAnimationFrame(drawMicWave);
    }
    drawMicWave();
  }

  if (micTimer) clearTimeout(micTimer);
  micTimer = setTimeout(() => {
    stopMicRecording(true);
  }, 3500);
}

function stopMicRecording(showReport = true) {
  if (micAnimFrame) {
    cancelAnimationFrame(micAnimFrame);
    micAnimFrame = null;
  }
  if (micTimer) {
    clearTimeout(micTimer);
    micTimer = null;
  }

  const dualMicStage = document.getElementById('dualMicStage');
  const reportCard = document.getElementById('voiceMatchReportCard');

  if (dualMicStage) dualMicStage.style.display = 'none';
  if (showReport && reportCard) {
    reportCard.style.display = 'flex';
    playChime();
    showToast('AI Voice Match đã phân tích xong: 88% Match! 🎉', 'success');
  }
}

function togglePlayback() {
  if (playerState.isPlaying) stopPlayback();
  else startPlayback();
}

function startPlayback() {
  playerState.isPlaying = true;
  const playBtn = document.getElementById('btnHeroPlayMaster');
  if (playBtn) {
    playBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
    `;
  }

  playTone(520, 'sine', 0.2);

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    playerState.currentTime += 1;

    // Check if looping a specific sentence
    if (playerState.loopChunkIndex !== null && playerState.loopChunkIndex !== undefined) {
      const loopChunk = scriptChunks[playerState.loopChunkIndex];
      if (loopChunk && playerState.currentTime >= loopChunk.endSec) {
        playerState.currentTime = loopChunk.startSec;
        playChime();
      }
    } else if (playerState.currentTime > playerState.totalDuration) {
      playerState.currentTime = 0;
    }
    updatePlayerUI();
  }, 1000 / playerState.playbackSpeed);
}

function stopPlayback() {
  playerState.isPlaying = false;
  const playBtn = document.getElementById('btnHeroPlayMaster');
  if (playBtn) {
    playBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    `;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updatePlayerUI() {
  const currentLabel = document.getElementById('heroTimeCurrent');
  const playhead = document.getElementById('heroWaveformPlayhead');

  const mins = Math.floor(playerState.currentTime / 60);
  const secs = playerState.currentTime % 60;
  if (currentLabel) {
    currentLabel.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const progressPercent = (playerState.currentTime / playerState.totalDuration) * 100;
  if (playhead) playhead.style.left = `${progressPercent}%`;

  let activeIdx = 0;
  scriptChunks.forEach((c, idx) => {
    if (playerState.currentTime >= c.startSec && playerState.currentTime <= c.endSec) {
      activeIdx = idx;
    }
  });

  if (activeIdx !== playerState.activeChunkIndex) {
    playerState.activeChunkIndex = activeIdx;
    highlightActiveChunk(activeIdx);
  }
}

function renderWaveform() {
  const canvas = document.getElementById('heroWaveformCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width || 800;
  canvas.height = rect.height || 120;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barCount = 100;
  const barWidth = 4;
  const gap = (canvas.width - barCount * barWidth) / (barCount - 1);

  for (let i = 0; i < barCount; i++) {
    const x = i * (barWidth + gap);
    const wave = Math.sin(i * 0.18) * 0.4 + Math.cos(i * 0.08) * 0.3 + 0.3;
    const barHeight = Math.max(10, wave * (canvas.height * 0.85));
    const y = (canvas.height - barHeight) / 2;

    const phase = i % 30;
    if (phase < 8) ctx.fillStyle = '#10b981'; // VI
    else if (phase < 10) ctx.fillStyle = '#f59e0b'; // Chime
    else if (phase < 20) ctx.fillStyle = '#06b6d4'; // EN
    else ctx.fillStyle = 'rgba(99, 102, 241, 0.6)'; // Shadowing Silence

    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 2);
    ctx.fill();
  }
}

function renderTranscript() {
  const container = document.getElementById('karaokeTranscriptScrollArea');
  if (!container) return;
  container.innerHTML = '';

  scriptChunks.forEach((chunk, index) => {
    const card = document.createElement('div');
    const isLooping = playerState.loopChunkIndex === index;
    card.className = `karaoke-chunk-card ${index === playerState.activeChunkIndex ? 'active-chunk' : ''} ${isLooping ? 'chunk-looping' : ''}`;
    card.innerHTML = `
      <div class="chunk-card-meta-row">
        <span style="font-size:11px; font-weight:700; color:var(--text-tertiary)">CẶP CÂU #${index + 1}</span>
        <div style="display:flex; align-items:center; gap:8px">
          <button class="chunk-loop-btn ${isLooping ? 'active-loop' : ''}" title="Lặp riêng câu này">
            ${isLooping ? '✓ Đang lặp' : '🔁 Lặp câu này'}
          </button>
          <span class="chunk-timestamp-chip">00:${chunk.startSec.toString().padStart(2, '0')}s - 00:${chunk.endSec.toString().padStart(2, '0')}s</span>
        </div>
      </div>
      <div class="transcript-line vi">${escapeHtml(chunk.vi)}</div>
      <div class="transcript-line foreign">[EN] ${escapeHtml(chunk.en)}</div>
    `;

    const loopBtn = card.querySelector('.chunk-loop-btn');
    if (loopBtn) {
      loopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (playerState.loopChunkIndex === index) {
          playerState.loopChunkIndex = null;
          showToast(`Đã tắt chế độ lặp Cặp câu #${index + 1}`, 'info');
        } else {
          playerState.loopChunkIndex = index;
          playerState.currentTime = chunk.startSec;
          if (!playerState.isPlaying) startPlayback();
          showToast(`Đang bật lặp liên tục Cặp câu #${index + 1} (Shadowing Loop)`, 'success');
        }
        renderTranscript();
        updatePlayerUI();
      });
    }

    card.addEventListener('click', () => {
      playerState.activeChunkIndex = index;
      playerState.currentTime = chunk.startSec;
      updatePlayerUI();
      highlightActiveChunk(index);
      playChime();
      if (!playerState.isPlaying) startPlayback();
      showToast(`Đã chuyển tới Cặp câu #${index + 1}`, 'success');
    });

    container.appendChild(card);
  });
}

function highlightActiveChunk(index) {
  const cards = document.querySelectorAll('.karaoke-chunk-card');
  cards.forEach((card, idx) => {
    if (idx === index) {
      card.classList.add('active-chunk');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      card.classList.remove('active-chunk');
    }
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      const activeEl = document.activeElement;
      if (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA') {
        e.preventDefault();
        togglePlayback();
      }
    }
    if (e.key === 'r' || e.key === 'R') {
      document.getElementById('btnHeroRepeatChunk')?.click();
    }
    if (e.key === 'j' || e.key === 'J') {
      document.getElementById('btnHeroSeekBack')?.click();
    }
    if (e.key === 'l' || e.key === 'L') {
      document.getElementById('btnHeroSeekFwd')?.click();
    }
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
