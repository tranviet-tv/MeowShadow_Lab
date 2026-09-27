/**
 * MeowShadow Studio - High-Tech Redesign Client Logic
 * Multi-page navigation router, dedicated Shadowing player engine,
 * real-time audio waveform visualizer, and Web Audio API synthesizer.
 */

// Application Master State Store
const state = {
  currentView: 'viewStudio', // 'viewStudio', 'viewPlayer', 'viewLibrary', 'viewSettings', 'viewBatchQueue'
  activeScriptView: 'syntax', // 'syntax' or 'cards'
  targetLang: 'en', // 'en' or 'ja'
  selectedVoiceVI: 'vi-VN-HoaiMyNeural',
  selectedVoiceEN: 'en-US-JennyNeural',
  selectedVoiceJA: 'ja-JP-NanamiNeural',
  activeVoiceTab: 'en',
  silenceVI: 1.5,
  silenceEN: 3.5,
  enableChime: true,
  currentPreset: 'standard',
  isPlayingPreview: null,
  
  // Dedicated Player State
  isPlayerPlaying: false,
  playbackCurrentTime: 0,
  playbackTotalDuration: 102, // 1m 42s
  playbackSpeed: 1.0,
  activeChunkIndex: 0,
  onlyForeignMode: false,
  isRecordingMic: false
};

// Bilingual Lesson Chunks Dataset
let scriptChunks = [
  {
    id: 'chunk-1',
    vi: 'Hôm nay là một ngày tuyệt vời để bắt đầu học ngoại ngữ mới.',
    en: 'Today is a wonderful day to start learning a new language.',
    ja: '今日は新しい外国語を学び始めるのに素晴らしい日です。',
    startSec: 0,
    endSec: 28
  },
  {
    id: 'chunk-2',
    vi: 'Khi bạn kiên trì luyện tập phương pháp Shadowing mỗi ngày mười lăm phút, khả năng phát âm của bạn sẽ tiến bộ vượt bậc.',
    en: 'When you consistently practice the shadowing technique for fifteen minutes every day, your pronunciation will improve dramatically.',
    ja: '毎日15分間シャドーイングの練習を一歩一歩続けると、発音は飛躍的に向上します。',
    startSec: 29,
    endSec: 68
  },
  {
    id: 'chunk-3',
    vi: 'Hãy nghe thật kỹ từng ngữ điệu và nhại lại ngay sau khi câu nói kết thúc.',
    en: 'Listen carefully to each intonation and repeat immediately after the sentence finishes.',
    ja: 'イントネーションを注意深く聴き、文が終わったらすぐに真似して声に出しましょう。',
    startSec: 69,
    endSec: 102
  }
];

// Web Audio API Context for Native Synthesizer & Previews
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a pleasant acoustic chime or preview tone using Web Audio API
 */
function playTone(freq = 440, type = 'sine', duration = 0.3, gainLevel = 0.15) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

/**
 * Play pedagogical transition cue chime (Ding)
 */
function playChime() {
  playTone(880, 'sine', 0.4, 0.12);
  setTimeout(() => playTone(1320, 'sine', 0.5, 0.1), 100);
}

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  setupNavigationRouter();
  setupViewTabs();
  setupLanguageTabs();
  setupVoiceSelection();
  setupPacingControls();
  setupSyntaxEditor();
  setupInteractiveCards();
  setupAiIntake();
  setupSynthesisPipeline();
  setupDedicatedPlayer();
  setupLibraryInteractions();
  setupKeyboardShortcuts();
  calculateLiveMetrics();
});

/* ==========================================================================
   Multi-Page Navigation Router
   ========================================================================== */
function setupNavigationRouter() {
  const navItems = document.querySelectorAll('.sidebar .nav-item');
  const btnHeaderQuickPlayer = document.getElementById('btnHeaderQuickPlayer');
  const btnBackToStudio = document.getElementById('btnBackToStudio');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.dataset.target;
      if (targetView) {
        switchView(targetView);
      }
    });
  });

  if (btnHeaderQuickPlayer) {
    btnHeaderQuickPlayer.addEventListener('click', () => {
      switchView('viewPlayer');
    });
  }

  if (btnBackToStudio) {
    btnBackToStudio.addEventListener('click', () => {
      switchView('viewStudio');
    });
  }
}

function switchView(targetViewId) {
  state.currentView = targetViewId;

  // Toggle active view container
  document.querySelectorAll('.view-container').forEach(view => {
    if (view.id === targetViewId) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Toggle sidebar active nav item
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    if (item.dataset.target === targetViewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Toggle bottom action bar visibility (Only visible in Studio Soạn Thảo)
  const bottomBar = document.getElementById('masterStudioBottomBar');
  if (bottomBar) {
    bottomBar.style.display = targetViewId === 'viewStudio' ? 'flex' : 'none';
  }

  // Handle specific view activation hooks
  if (targetViewId === 'viewPlayer') {
    renderHeroWaveform();
    renderKaraokeTranscriptList();
  }
}

/* ==========================================================================
   View Switching in Studio (Syntax Script vs Interactive Cards)
   ========================================================================== */
function setupViewTabs() {
  const syntaxTabBtn = document.getElementById('viewTabSyntax');
  const cardsTabBtn = document.getElementById('viewTabCards');
  const syntaxEditor = document.getElementById('syntaxCodeEditor');
  const cardsContainer = document.getElementById('interactiveCardsContainer');

  if (syntaxTabBtn && cardsTabBtn) {
    syntaxTabBtn.addEventListener('click', () => {
      state.activeScriptView = 'syntax';
      syntaxTabBtn.classList.add('active');
      cardsTabBtn.classList.remove('active');
      syntaxEditor.style.display = 'flex';
      cardsContainer.style.display = 'none';
      renderSyntaxCodeFromChunks();
    });

    cardsTabBtn.addEventListener('click', () => {
      state.activeScriptView = 'cards';
      cardsTabBtn.classList.add('active');
      syntaxTabBtn.classList.remove('active');
      syntaxEditor.style.display = 'none';
      cardsContainer.style.display = 'flex';
      renderInteractiveCards();
    });
  }
}

/* ==========================================================================
   Target Language Selection (English vs Japanese)
   ========================================================================== */
function setupLanguageTabs() {
  const langTabs = document.querySelectorAll('.lang-tab');
  langTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      langTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const lang = tab.dataset.lang;
      state.targetLang = lang;
      
      const enVoiceTabTitle = document.getElementById('enVoiceTabTitle');
      if (enVoiceTabTitle) {
        enVoiceTabTitle.textContent = lang === 'en' ? 'NGOẠI NGỮ [EN]' : 'NGOẠI NGỮ [JA]';
      }

      const playerLangTag = document.getElementById('playerLangTag');
      if (playerLangTag) {
        playerLangTag.textContent = lang === 'en' ? 'EN - General American' : 'JA - Tokyo Accent';
      }

      updateVoiceListForLang(lang);
      if (state.activeScriptView === 'cards') {
        renderInteractiveCards();
      } else {
        renderSyntaxCodeFromChunks();
      }
      renderKaraokeTranscriptList();
      showToast(`Đã chuyển mục tiêu học sang: ${lang === 'en' ? 'Tiếng Anh (EN)' : 'Tiếng Nhật (JA)'}`, 'success');
    });
  });
}

/* ==========================================================================
   Voice Engine & Preview Logic
   ========================================================================== */
const voiceDatabase = {
  vi: [
    { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My', gender: 'female', meta: 'Nữ • Truyền cảm, chuẩn giọng đọc thời sự', role: 'vi' },
    { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh', gender: 'male', meta: 'Nam • Trầm ấm, rõ chữ, tự nhiên', role: 'vi' }
  ],
  en: [
    { id: 'en-US-JennyNeural', name: 'Jenny (Natural)', gender: 'female', meta: 'Nữ • General American, chuẩn âm đuôi', role: 'foreign' },
    { id: 'en-US-GuyNeural', name: 'Guy (Natural)', gender: 'male', meta: 'Nam • Chuẩn General American, nhịp tự nhiên', role: 'foreign' },
    { id: 'en-US-AriaNeural', name: 'Aria (Expressive)', gender: 'female', meta: 'Nữ • Diễn cảm cao độ, phù hợp hội thoại', role: 'foreign' },
    { id: 'en-US-BrianNeural', name: 'Brian (British)', gender: 'male', meta: 'Nam • Chuẩn Received Pronunciation (UK)', role: 'foreign' }
  ],
  ja: [
    { id: 'ja-JP-NanamiNeural', name: 'Nanami (Natural)', gender: 'female', meta: 'Nữ • Chuẩn Tokyo, phát âm cao độ tự nhiên', role: 'foreign' },
    { id: 'ja-JP-KeitaNeural', name: 'Keita (Natural)', gender: 'male', meta: 'Nam • Trầm ấm, ngữ điệu chuẩn Nhật', role: 'foreign' }
  ]
};

function setupVoiceSelection() {
  const tabVI = document.getElementById('voiceTabVI');
  const tabForeign = document.getElementById('voiceTabForeign');

  if (tabVI && tabForeign) {
    tabVI.addEventListener('click', () => {
      tabVI.classList.add('active');
      tabForeign.classList.remove('active');
      state.activeVoiceTab = 'vi';
      renderVoiceCards('vi');
    });

    tabForeign.addEventListener('click', () => {
      tabForeign.classList.add('active');
      tabVI.classList.remove('active');
      state.activeVoiceTab = state.targetLang;
      renderVoiceCards(state.targetLang);
    });
  }

  renderVoiceCards(state.targetLang);
}

function updateVoiceListForLang(lang) {
  if (state.activeVoiceTab !== 'vi') {
    state.activeVoiceTab = lang;
    renderVoiceCards(lang);
  }
}

function renderVoiceCards(category) {
  const container = document.getElementById('voiceCardsList');
  if (!container) return;
  container.innerHTML = '';

  const list = voiceDatabase[category] || voiceDatabase.en;
  const currentSelectedId = category === 'vi' 
    ? state.selectedVoiceVI 
    : (state.targetLang === 'en' ? state.selectedVoiceEN : state.selectedVoiceJA);

  list.forEach(voice => {
    const isSelected = voice.id === currentSelectedId;
    const card = document.createElement('div');
    card.className = `voice-card ${isSelected ? 'selected' : ''}`;
    card.dataset.voiceId = voice.id;

    card.innerHTML = `
      <div class="voice-card-left">
        <div class="voice-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        </div>
        <div class="voice-details">
          <div class="voice-name-row">
            <span class="voice-name">${voice.name}</span>
            <span class="voice-tag-badge ${voice.gender}">${voice.gender === 'female' ? 'Nữ' : 'Nam'}</span>
          </div>
          <span class="voice-meta">${voice.meta}</span>
        </div>
      </div>
      <div class="voice-card-right">
        <button class="preview-audio-btn" data-voice="${voice.id}" title="Nghe thử chất giọng">
          <div class="mini-equalizer">
            <div class="equalizer-bar"></div>
            <div class="equalizer-bar"></div>
            <div class="equalizer-bar"></div>
          </div>
          <span>Nghe thử</span>
        </button>
        <div class="select-indicator">
          ${isSelected ? `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>` : ''}
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.preview-audio-btn')) return;

      if (category === 'vi') {
        state.selectedVoiceVI = voice.id;
        document.getElementById('voiceTabSelectedVI').textContent = voice.name;
      } else {
        if (state.targetLang === 'en') {
          state.selectedVoiceEN = voice.id;
        } else {
          state.selectedVoiceJA = voice.id;
        }
        document.getElementById('voiceTabSelectedForeign').textContent = voice.name;
      }
      renderVoiceCards(category);
      showToast(`Đã chọn giọng: ${voice.name}`, 'success');
    });

    const previewBtn = card.querySelector('.preview-audio-btn');
    previewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleVoiceAudioPreview(voice, previewBtn);
    });

    container.appendChild(card);
  });
}

function handleVoiceAudioPreview(voice, buttonElement) {
  if (state.isPlayingPreview) {
    document.querySelectorAll('.preview-audio-btn').forEach(b => b.classList.remove('playing'));
    if (state.isPlayingPreview === voice.id) {
      state.isPlayingPreview = null;
      return;
    }
  }

  state.isPlayingPreview = voice.id;
  buttonElement.classList.add('playing');

  const baseFreq = voice.gender === 'female' ? 440 : 220;
  playTone(baseFreq, 'triangle', 0.2, 0.15);
  setTimeout(() => playTone(baseFreq * 1.25, 'triangle', 0.2, 0.15), 180);
  setTimeout(() => playTone(baseFreq * 1.5, 'triangle', 0.35, 0.15), 360);

  setTimeout(() => {
    buttonElement.classList.remove('playing');
    state.isPlayingPreview = null;
  }, 900);
}

/* ==========================================================================
   Pacing Presets & Sliders Logic
   ========================================================================== */
function setupPacingControls() {
  const presetCards = document.querySelectorAll('.preset-card');
  const sliderVI = document.getElementById('sliderSilenceVI');
  const inputVI = document.getElementById('inputSilenceVI');
  const sliderEN = document.getElementById('sliderSilenceEN');
  const inputEN = document.getElementById('inputSilenceEN');
  const chimeToggle = document.getElementById('chimeToggleSidebar');

  if (sliderVI && inputVI) {
    sliderVI.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      inputVI.value = val.toFixed(1);
      state.silenceVI = val;
      calculateLiveMetrics();
    });

    inputVI.addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 1.5;
      val = Math.max(0.5, Math.min(5.0, val));
      inputVI.value = val.toFixed(1);
      sliderVI.value = val;
      state.silenceVI = val;
      calculateLiveMetrics();
    });
  }

  if (sliderEN && inputEN) {
    sliderEN.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      inputEN.value = val.toFixed(1);
      state.silenceEN = val;
      calculateLiveMetrics();
    });

    inputEN.addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 3.5;
      val = Math.max(1.0, Math.min(8.0, val));
      inputEN.value = val.toFixed(1);
      sliderEN.value = val;
      state.silenceEN = val;
      calculateLiveMetrics();
    });
  }

  if (chimeToggle) {
    chimeToggle.addEventListener('change', (e) => {
      state.enableChime = e.target.checked;
      if (state.enableChime) {
        playChime();
        showToast('Đã bật chuông báo ngắt nhịp (Ding)', 'success');
      } else {
        showToast('Đã tắt chuông báo');
      }
    });
  }

  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      presetCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const preset = card.dataset.preset;
      state.currentPreset = preset;

      if (preset === 'standard') {
        state.silenceVI = 1.5;
        state.silenceEN = 3.5;
      } else if (preset === 'fast') {
        state.silenceVI = 1.0;
        state.silenceEN = 2.0;
      } else if (preset === 'focus') {
        state.silenceVI = 2.0;
        state.silenceEN = 4.5;
      }

      if (sliderVI) sliderVI.value = state.silenceVI;
      if (inputVI) inputVI.value = state.silenceVI.toFixed(1);
      if (sliderEN) sliderEN.value = state.silenceEN;
      if (inputEN) inputEN.value = state.silenceEN.toFixed(1);

      calculateLiveMetrics();
      showToast(`Đã áp dụng mẫu nhịp: ${card.querySelector('.preset-name').textContent}`, 'success');
    });
  });
}

/* ==========================================================================
   Syntax Code Editor & Formatting
   ========================================================================== */
function setupSyntaxEditor() {
  renderSyntaxCodeFromChunks();

  const pillVI = document.getElementById('pillInsertVI');
  const pillEN = document.getElementById('pillInsertEN');
  const pillCUE = document.getElementById('pillInsertCUE');
  const btnFormat = document.getElementById('btnFormatScript');
  const btnCopy = document.getElementById('btnCopyScript');
  const btnClear = document.getElementById('btnClearScript');

  if (pillVI) {
    pillVI.addEventListener('click', () => insertTokenAtEditor('[VI] '));
  }
  if (pillEN) {
    pillEN.addEventListener('click', () => insertTokenAtEditor(`[${state.targetLang.toUpperCase()}] `));
  }
  if (pillCUE) {
    pillCUE.addEventListener('click', () => {
      insertTokenAtEditor('[CUE 🔔] ');
      playChime();
    });
  }
  if (btnFormat) {
    btnFormat.addEventListener('click', () => {
      renderSyntaxCodeFromChunks();
      showToast('Đã căn lề chuẩn cú pháp song ngữ', 'success');
    });
  }
  if (btnCopy) {
    btnCopy.addEventListener('click', () => copyRawScriptToClipboard());
  }
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      const confirmClear = confirm('Cảnh báo an toàn: Bạn có chắc chắn muốn xóa toàn bộ kịch bản hiện tại không?');
      if (confirmClear) {
        scriptChunks = [];
        renderSyntaxCodeFromChunks();
        renderInteractiveCards();
        renderKaraokeTranscriptList();
        calculateLiveMetrics();
        showToast('Đã làm trống kịch bản');
      }
    });
  }
}

function renderSyntaxCodeFromChunks() {
  const contentArea = document.getElementById('editorContentArea');
  const gutter = document.getElementById('lineNumbersGutter');
  if (!contentArea || !gutter) return;

  contentArea.innerHTML = '';
  gutter.innerHTML = '';

  let lineCount = 1;
  const langKey = state.targetLang;
  const langTag = langKey.toUpperCase();

  scriptChunks.forEach((chunk, index) => {
    const viLine = document.createElement('div');
    viLine.className = 'script-line';
    viLine.innerHTML = `<span class="token-vi">[VI]</span>${escapeHtml(chunk.vi)}`;
    contentArea.appendChild(viLine);
    addLineGutterNumber(gutter, lineCount++);

    const foreignLine = document.createElement('div');
    foreignLine.className = 'script-line';
    foreignLine.innerHTML = `<span class="token-en">[${langTag}]</span>${escapeHtml(chunk[langKey] || chunk.en)}`;
    contentArea.appendChild(foreignLine);
    addLineGutterNumber(gutter, lineCount++);

    if (index < scriptChunks.length - 1) {
      const sep = document.createElement('div');
      sep.className = 'script-line empty-separator';
      contentArea.appendChild(sep);
      addLineGutterNumber(gutter, lineCount++);
    }
  });

  calculateLiveMetrics();
}

function addLineGutterNumber(gutter, num) {
  const span = document.createElement('span');
  span.className = 'line-num';
  span.textContent = num;
  gutter.appendChild(span);
}

function insertTokenAtEditor(token) {
  const newChunk = {
    id: 'chunk-' + Date.now(),
    vi: 'Nhập câu tiếng Việt mẫu...',
    en: 'Sample English sentence...',
    ja: 'サンプルの日本語...',
    startSec: 102,
    endSec: 125
  };
  scriptChunks.push(newChunk);
  renderSyntaxCodeFromChunks();
  renderKaraokeTranscriptList();
  showToast(`Đã chèn khối thẻ: ${token}`, 'success');
}

function copyRawScriptToClipboard() {
  let text = '';
  const langKey = state.targetLang;
  const langTag = langKey.toUpperCase();

  scriptChunks.forEach(c => {
    text += `[VI] ${c.vi}\n[${langTag}] ${c[langKey] || c.en}\n\n`;
  });

  navigator.clipboard.writeText(text.trim()).then(() => {
    showToast('Đã sao chép kịch bản vào bộ nhớ tạm', 'success');
  }).catch(() => {
    showToast('Không thể sao chép tự động');
  });
}

/* ==========================================================================
   Interactive Cards View Mode
   ========================================================================== */
function setupInteractiveCards() {}

function renderInteractiveCards() {
  const container = document.getElementById('interactiveCardsContainer');
  if (!container) return;
  container.innerHTML = '';

  const langKey = state.targetLang;
  const langTag = langKey.toUpperCase();

  scriptChunks.forEach((chunk, index) => {
    const card = document.createElement('div');
    card.className = 'chunk-card';
    card.dataset.chunkId = chunk.id;

    card.innerHTML = `
      <div class="chunk-card-header">
        <div class="chunk-index-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span>CẶP CÂU #${index + 1}</span>
        </div>
        <div class="chunk-card-actions">
          <button class="chunk-preview-btn" data-chunk-index="${index}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>Nghe thử cặp này</span>
          </button>
          <button class="icon-button" style="width:28px; height:28px" data-delete-index="${index}" title="Xóa cặp câu">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="chunk-text-row">
        <span class="chunk-label vi">[VI] TIẾNG VIỆT</span>
        <input class="chunk-text-box input-vi" value="${escapeHtml(chunk.vi)}" />
      </div>
      <div class="chunk-text-row">
        <span class="chunk-label en">[${langTag}] ${langKey === 'en' ? 'TIẾNG ANH' : 'TIẾNG NHẬT'}</span>
        <input class="chunk-text-box input-foreign" value="${escapeHtml(chunk[langKey] || chunk.en)}" />
      </div>
    `;

    const inVI = card.querySelector('.input-vi');
    const inForeign = card.querySelector('.input-foreign');

    inVI.addEventListener('input', (e) => {
      chunk.vi = e.target.value;
      calculateLiveMetrics();
    });

    inForeign.addEventListener('input', (e) => {
      chunk[langKey] = e.target.value;
      calculateLiveMetrics();
    });

    const previewChunkBtn = card.querySelector('.chunk-preview-btn');
    previewChunkBtn.addEventListener('click', () => {
      playTone(520, 'sine', 0.25, 0.15);
      if (state.enableChime) setTimeout(playChime, 300);
      setTimeout(() => playTone(660, 'sine', 0.3, 0.15), 600);
      showToast(`Đang phát thử Cặp câu #${index + 1} (VI ➔ Chuông ➔ ${langTag})`, 'success');
    });

    const delBtn = card.querySelector('[data-delete-index]');
    delBtn.addEventListener('click', () => {
      scriptChunks.splice(index, 1);
      renderInteractiveCards();
      renderKaraokeTranscriptList();
      calculateLiveMetrics();
      showToast(`Đã xóa Cặp câu #${index + 1}`);
    });

    container.appendChild(card);
  });
}

/* ==========================================================================
   AI Intake & Auto-Chunking Engine (Step 1)
   ========================================================================== */
function setupAiIntake() {
  const btnProcess = document.getElementById('btnAiProcess');
  const btnPaste = document.getElementById('btnPasteSample');
  const rawTextarea = document.getElementById('rawInputText');
  const wordCounter = document.getElementById('rawWordCount');

  if (rawTextarea && wordCounter) {
    rawTextarea.addEventListener('input', (e) => {
      const words = e.target.value.trim().split(/\s+/).filter(Boolean).length;
      wordCounter.textContent = `${words} từ`;
    });
  }

  if (btnPaste && rawTextarea) {
    btnPaste.addEventListener('click', () => {
      rawTextarea.value = "Luyện tập nghe thụ động kết hợp với Shadowing là phương pháp đã được khoa học chứng minh giúp người học bứt phá khả năng phản xạ ngoại ngữ tự nhiên. Bằng cách nghe lặp đi lặp lại những cụm từ chuẩn và nhại lại đúng cao độ, não bộ sẽ hình thành đường mòn ngôn ngữ.";
      const words = rawTextarea.value.trim().split(/\s+/).filter(Boolean).length;
      wordCounter.textContent = `${words} từ`;
      showToast('Đã nạp văn bản thô mẫu', 'success');
    });
  }

  if (btnProcess) {
    btnProcess.addEventListener('click', () => {
      btnProcess.disabled = true;
      btnProcess.innerHTML = `
        <svg class="spinning" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span>Qwen 3 8B đang phân đoạn...</span>
      `;

      setTimeout(() => {
        btnProcess.disabled = false;
        btnProcess.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
          </svg>
          <span>Phân đoạn &amp; Dịch tự động</span>
        `;

        scriptChunks.push({
          id: 'chunk-' + Date.now(),
          vi: 'Phương pháp Shadowing giúp não bộ hình thành đường mòn ngôn ngữ tự nhiên.',
          en: 'The Shadowing technique helps the brain forge natural language pathways.',
          ja: 'シャドーイング法は、脳に自然な言語の回路を形成するのに役立ちます。',
          startSec: 103,
          endSec: 130
        });

        if (state.activeScriptView === 'cards') {
          renderInteractiveCards();
        } else {
          renderSyntaxCodeFromChunks();
        }
        renderKaraokeTranscriptList();
        calculateLiveMetrics();
        showToast('AI Qwen 3 8B đã phân đoạn thành công 1 cặp câu mới!', 'success');
      }, 1100);
    });
  }
}

/* ==========================================================================
   Live Calculations & Metrics Estimator
   ========================================================================== */
function calculateLiveMetrics() {
  const pairCount = scriptChunks.length;
  let totalWords = 0;

  scriptChunks.forEach(c => {
    const viWords = (c.vi || '').trim().split(/\s+/).filter(Boolean).length;
    const foreignWords = (c[state.targetLang] || c.en || '').trim().split(/\s+/).filter(Boolean).length;
    totalWords += (viWords + foreignWords);
  });

  const speechSeconds = totalWords / 2.6;
  const silenceSeconds = pairCount * (state.silenceVI + state.silenceEN + (state.enableChime ? 0.4 : 0) + 0.5);
  const totalSeconds = Math.max(30, Math.round(speechSeconds + silenceSeconds));
  state.playbackTotalDuration = totalSeconds;

  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const timeFormatted = `${mins}m ${secs.toString().padStart(2, '0')}s`;

  const countDisplay = document.getElementById('metricChunkCount');
  const wordsDisplay = document.getElementById('metricWordCount');
  const durationDisplay = document.getElementById('metricDuration');
  const bottomDuration = document.getElementById('bottomEstimatedDuration');
  const bottomChunks = document.getElementById('bottomChunkSummary');
  const heroTimeTotal = document.getElementById('heroTimeTotal');

  if (countDisplay) countDisplay.textContent = pairCount;
  if (wordsDisplay) wordsDisplay.textContent = totalWords;
  if (durationDisplay) durationDisplay.textContent = timeFormatted;
  if (bottomDuration) bottomDuration.textContent = timeFormatted;
  if (bottomChunks) bottomChunks.textContent = `${pairCount} cặp câu (${totalWords} từ)`;
  if (heroTimeTotal) heroTimeTotal.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/* ==========================================================================
   Primary Synthesis Trigger (Transition to Dedicated Player Tab)
   ========================================================================== */
function setupSynthesisPipeline() {
  const btnTrigger = document.getElementById('btnPrimarySynthesize');
  if (btnTrigger) {
    btnTrigger.addEventListener('click', () => {
      triggerRenderAndNavigateToPlayer();
    });
  }
}

function triggerRenderAndNavigateToPlayer() {
  const btn = document.getElementById('btnPrimarySynthesize');
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = `
    <svg class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    <span>Đang tổng hợp 3 khâu audio...</span>
  `;

  playTone(440, 'sine', 0.2, 0.1);

  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      <span>Tạo Audio Bài Học</span>
      <span class="hotkey-badge">⌘ + Enter</span>
    `;

    // Sync lesson title to dedicated player
    const currentTitle = document.getElementById('lessonTitleInput')?.value || 'Bài học Shadowing';
    const playerTitleEl = document.getElementById('playerCurrentTitle');
    if (playerTitleEl) playerTitleEl.textContent = currentTitle;

    // Switch view directly to dedicated player tab
    switchView('viewPlayer');
    showToast('Tạo audio thành công! Đã chuyển sang Trình Phát Shadowing chuyên biệt.', 'success');

    // Automatically start playing in the dedicated studio player
    startDedicatedPlayback();
  }, 1200);
}

/* ==========================================================================
   DEDICATED SHADOWING PLAYER LOGIC (#viewPlayer)
   ========================================================================== */
let playerInterval = null;

function setupDedicatedPlayer() {
  const playBtn = document.getElementById('btnHeroPlayMaster');
  const seekBackBtn = document.getElementById('btnHeroSeekBack');
  const seekFwdBtn = document.getElementById('btnHeroSeekFwd');
  const repeatBtn = document.getElementById('btnHeroRepeatChunk');
  const speedBtns = document.querySelectorAll('.speed-pill-btn');
  const micBtn = document.getElementById('btnPracticeMic');
  const toggleOnlyForeign = document.getElementById('toggleOnlyForeign');
  const exportBtn = document.getElementById('btnExportPlayer');
  const syncMobileBtn = document.getElementById('btnSyncMobile');

  if (playBtn) {
    playBtn.addEventListener('click', () => toggleDedicatedPlayback());
  }

  if (seekBackBtn) {
    seekBackBtn.addEventListener('click', () => {
      state.playbackCurrentTime = Math.max(0, state.playbackCurrentTime - 5);
      updatePlayerTimeUI();
      playTone(330, 'sine', 0.1, 0.1);
    });
  }

  if (seekFwdBtn) {
    seekFwdBtn.addEventListener('click', () => {
      state.playbackCurrentTime = Math.min(state.playbackTotalDuration, state.playbackCurrentTime + 5);
      updatePlayerTimeUI();
      playTone(440, 'sine', 0.1, 0.1);
    });
  }

  if (repeatBtn) {
    repeatBtn.addEventListener('click', () => {
      const activeChunk = scriptChunks[state.activeChunkIndex] || scriptChunks[0];
      state.playbackCurrentTime = activeChunk.startSec || 0;
      updatePlayerTimeUI();
      playChime();
      showToast(`Đang lặp lại Cặp câu #${state.activeChunkIndex + 1} để nhại lại`, 'success');
      if (!state.isPlayerPlaying) startDedicatedPlayback();
    });
  }

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.playbackSpeed = parseFloat(btn.dataset.speed);
      showToast(`Tốc độ phát: ${state.playbackSpeed}x`);
    });
  });

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      state.isRecordingMic = !state.isRecordingMic;
      if (state.isRecordingMic) {
        micBtn.style.background = 'rgba(239, 68, 68, 0.3)';
        micBtn.innerHTML = `
          <span style="color:#ef4444; font-size:14px">●</span>
          <span>Đang lắng nghe phát âm...</span>
        `;
        playTone(660, 'sine', 0.15, 0.1);
      } else {
        micBtn.style.background = '';
        micBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          </svg>
          <span>Thu âm nhại giọng thử</span>
        `;
        showToast('Khớp phát âm: 94% chuẩn bản ngữ General American! 🎉', 'success');
      }
    });
  }

  if (toggleOnlyForeign) {
    toggleOnlyForeign.addEventListener('change', (e) => {
      state.onlyForeignMode = e.target.checked;
      showToast(state.onlyForeignMode ? 'Đã bật chế độ: Chỉ phát ngoại ngữ' : 'Đã bật chế độ đầy đủ song ngữ');
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      showToast('Đang tạo đường link tải xuống file MP3 320kbps (EBU R128)...', 'success');
    });
  }

  if (syncMobileBtn) {
    syncMobileBtn.addEventListener('click', () => {
      showToast('Đã đẩy bài học lên đám mây! Mở app mobile để nghe ngay lập tức.', 'success');
    });
  }

  // Interactive Waveform Clicking / Seeking
  const waveformBox = document.getElementById('heroWaveformBox');
  if (waveformBox) {
    waveformBox.addEventListener('click', (e) => {
      const rect = waveformBox.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const progressPercent = Math.max(0, Math.min(1, clickX / rect.width));
      state.playbackCurrentTime = Math.round(progressPercent * state.playbackTotalDuration);
      updatePlayerTimeUI();
      playTone(520, 'triangle', 0.15, 0.1);
    });
  }
}

function toggleDedicatedPlayback() {
  if (state.isPlayerPlaying) {
    stopDedicatedPlayback();
  } else {
    startDedicatedPlayback();
  }
}

function startDedicatedPlayback() {
  state.isPlayerPlaying = true;
  const playBtn = document.getElementById('btnHeroPlayMaster');
  if (playBtn) {
    playBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
    `;
  }

  playTone(520, 'sine', 0.2, 0.1);

  if (playerInterval) clearInterval(playerInterval);
  playerInterval = setInterval(() => {
    state.playbackCurrentTime += 1;
    if (state.playbackCurrentTime > state.playbackTotalDuration) {
      state.playbackCurrentTime = 0;
    }
    updatePlayerTimeUI();
  }, 1000 / state.playbackSpeed);
}

function stopDedicatedPlayback() {
  state.isPlayerPlaying = false;
  const playBtn = document.getElementById('btnHeroPlayMaster');
  if (playBtn) {
    playBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    `;
  }
  if (playerInterval) {
    clearInterval(playerInterval);
    playerInterval = null;
  }
}

function updatePlayerTimeUI() {
  const currentLabel = document.getElementById('heroTimeCurrent');
  const playhead = document.getElementById('heroWaveformPlayhead');

  const mins = Math.floor(state.playbackCurrentTime / 60);
  const secs = state.playbackCurrentTime % 60;
  if (currentLabel) {
    currentLabel.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  const progressPercent = (state.playbackCurrentTime / state.playbackTotalDuration) * 100;
  if (playhead) {
    playhead.style.left = `${progressPercent}%`;
  }

  // Determine active chunk based on time
  let activeIdx = 0;
  scriptChunks.forEach((c, idx) => {
    if (state.playbackCurrentTime >= (c.startSec || 0) && state.playbackCurrentTime <= (c.endSec || 999)) {
      activeIdx = idx;
    }
  });

  if (activeIdx !== state.activeChunkIndex) {
    state.activeChunkIndex = activeIdx;
    highlightActiveKaraokeChunk(activeIdx);
  }
}

function renderHeroWaveform() {
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

    // Rhythm segment coloring
    const phase = i % 30;
    if (phase < 8) {
      ctx.fillStyle = '#10b981'; // VI
    } else if (phase < 10) {
      ctx.fillStyle = '#f59e0b'; // Chime
    } else if (phase < 20) {
      ctx.fillStyle = '#06b6d4'; // EN/JA
    } else {
      ctx.fillStyle = 'rgba(99, 102, 241, 0.6)'; // Shadowing Silence
    }

    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 2);
    ctx.fill();
  }
}

function renderKaraokeTranscriptList() {
  const container = document.getElementById('karaokeTranscriptScrollArea');
  if (!container) return;
  container.innerHTML = '';

  const langKey = state.targetLang;
  const langTag = langKey.toUpperCase();

  scriptChunks.forEach((chunk, index) => {
    const card = document.createElement('div');
    card.className = `karaoke-chunk-card ${index === state.activeChunkIndex ? 'active-chunk' : ''}`;
    card.dataset.index = index;

    card.innerHTML = `
      <div class="chunk-card-meta-row">
        <span style="font-size:11px; font-weight:700; color:var(--text-tertiary)">CẶP CÂU #${index + 1}</span>
        <span class="chunk-timestamp-chip">00:${index * 30}s - 00:${(index + 1) * 30}s</span>
      </div>
      <div class="transcript-line vi">${escapeHtml(chunk.vi)}</div>
      <div class="transcript-line foreign">[${langTag}] ${escapeHtml(chunk[langKey] || chunk.en)}</div>
    `;

    // Click chunk to seek audio instantly
    card.addEventListener('click', () => {
      state.activeChunkIndex = index;
      state.playbackCurrentTime = chunk.startSec || (index * 30);
      updatePlayerTimeUI();
      highlightActiveKaraokeChunk(index);
      playChime();
      if (!state.isPlayerPlaying) startDedicatedPlayback();
      showToast(`Đã chuyển tới Cặp câu #${index + 1}`, 'success');
    });

    container.appendChild(card);
  });
}

function highlightActiveKaraokeChunk(activeIndex) {
  const cards = document.querySelectorAll('.karaoke-chunk-card');
  cards.forEach((card, idx) => {
    if (idx === activeIndex) {
      card.classList.add('active-chunk');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      card.classList.remove('active-chunk');
    }
  });
}

/* ==========================================================================
   Library Interactions
   ========================================================================== */
function setupLibraryInteractions() {
  const openButtons = document.querySelectorAll('.btn-open-lesson');
  openButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.lesson-card');
      const title = card?.querySelector('.lesson-card-title')?.textContent || 'Bài học đã chọn';
      
      const playerTitleEl = document.getElementById('playerCurrentTitle');
      if (playerTitleEl) playerTitleEl.textContent = title;

      switchView('viewPlayer');
      startDedicatedPlayback();
      showToast(`Đã nạp bài học: "${title}" vào Trình Phát`, 'success');
    });
  });
}

/* ==========================================================================
   Global Keyboard Shortcuts
   ========================================================================== */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd+Enter or Ctrl+Enter triggers audio synthesis
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      triggerRenderAndNavigateToPlayer();
    }
    
    // Space toggles playback when in Player view
    if (e.code === 'Space' && state.currentView === 'viewPlayer') {
      const activeEl = document.activeElement;
      if (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA') {
        e.preventDefault();
        toggleDedicatedPlayback();
      }
    }

    // R repeats current chunk
    if ((e.key === 'r' || e.key === 'R') && state.currentView === 'viewPlayer') {
      const activeEl = document.activeElement;
      if (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('btnHeroRepeatChunk')?.click();
      }
    }
  });
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${type === 'success' 
        ? '<polyline points="20 6 9 17 4 12"></polyline>' 
        : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
    </svg>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.2s ease-out';
    setTimeout(() => toast.remove(), 200);
  }, 2800);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
