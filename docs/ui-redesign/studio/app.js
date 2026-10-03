/**
 * MeowShadow Studio - Studio Workspace Client Logic
 * Handles real-time metrics, AI auto-chunking, syntax highlighting,
 * and seamless transition to the Dedicated Shadowing Player.
 */

// Application State Store
const state = {
  activeView: 'syntax',
  targetLang: 'en',
  selectedVoiceVI: 'vi-hoaimy',
  selectedVoiceEN: 'en-jenny',
  selectedVoiceJA: 'ja-nanami',
  silenceVI: 1.5,
  silenceEN: 3.5,
  enableChime: true,
  currentPreset: 'standard',
  isPlayingPreview: null
};

// Initial Script Chunks
let scriptChunks = [
  {
    id: 'chunk-1',
    vi: 'Hom nay la mot ngay tuyet voi de bat dau hoc ngoai ngu moi.',
    en: 'Today is a wonderful day to start learning a new language.',
    ja: 'Kyou wa atarashii gaikokugo wo manabi hajimeru no ni subarashii hi desu.'
  },
  {
    id: 'chunk-2',
    vi: 'Khi ban kien tri luyen tap phuong phap Shadowing moi ngay muoi lam phut, kha nang phat am cua ban se tien bo vuot bac.',
    en: 'When you consistently practice the shadowing technique for fifteen minutes every day, your pronunciation will improve dramatically.',
    ja: 'Mainichi 15-fun kan shadoingu no renshuu wo issoku issoku tsuzukeru to, hatsunon wa hiyetsu-teki ni joukyou shimasu.'
  },
  {
    id: 'chunk-3',
    vi: 'Hay nghe that ky tung ngu dieu va nhai lai ngay sau khi cau noi ket thuc.',
    en: 'Listen carefully to each intonation and repeat immediately after the sentence finishes.',
    ja: 'Intoneeshon wo chuui kuite kiite, bun ga owattara sugu mimi wo shite koe ni dashimashou.'
  }
];

// Web Audio API Context for Tone Synthesis
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

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

function playChime() {
  playTone(880, 'sine', 0.4, 0.12);
  setTimeout(() => playTone(1320, 'sine', 0.5, 0.1), 100);
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  setupViewTabs();
  setupLanguageTabs();
  setupRulesPopover();
  setupVoiceSelection();
  setupPacingControls();
  setupSyntaxEditor();
  setupInteractiveCards();
  setupAiIntake();
  setupSynthesisPipeline();
  setupKeyboardShortcuts();
  setupParticles();
  setupRippleEffects();
  calculateLiveMetrics();
});

// Floating Particles Background
function setupParticles() {
  const container = document.createElement('div');
  container.className = 'particles-container';
  container.id = 'particlesContainer';
  document.body.appendChild(container);

  for (let i = 0; i < 15; i++) {
    createParticle(container, i);
  }
}

function createParticle(container, index) {
  const particle = document.createElement('div');
  particle.className = 'particle';
  particle.style.left = `${Math.random() * 100}%`;
  particle.style.animationDelay = `${Math.random() * 15}s`;
  particle.style.animationDuration = `${15 + Math.random() * 10}s`;
  particle.style.width = `${2 + Math.random() * 4}px`;
  particle.style.height = particle.style.width;
  particle.style.opacity = 0.3 + Math.random() * 0.4;
  container.appendChild(particle);
}

// Ripple Effect on Buttons
function setupRippleEffects() {
  document.querySelectorAll('.synthesize-cta-button, .primary-ai-btn, .preset-card, .quick-chip, .lang-tab').forEach(btn => {
    btn.classList.add('ripple');

    btn.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const existingRipple = this.querySelector('.ripple-effect');
      if (existingRipple) existingRipple.remove();

      const ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = ripple.style.height = `${Math.max(rect.width, rect.height)}px`;

      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

function setupViewTabs() {
  const syntaxTabBtn = document.getElementById('viewTabSyntax');
  const cardsTabBtn = document.getElementById('viewTabCards');
  const syntaxEditor = document.getElementById('syntaxCodeEditor');
  const cardsContainer = document.getElementById('interactiveCardsContainer');

  if (syntaxTabBtn && cardsTabBtn) {
    syntaxTabBtn.addEventListener('click', () => {
      state.activeView = 'syntax';
      syntaxTabBtn.classList.add('active');
      cardsTabBtn.classList.remove('active');
      if (syntaxEditor) syntaxEditor.style.display = 'flex';
      if (cardsContainer) cardsContainer.style.display = 'none';
      renderSyntaxCodeFromChunks();
      playTone(520, 'sine', 0.1, 0.08);
    });

    cardsTabBtn.addEventListener('click', () => {
      state.activeView = 'cards';
      cardsTabBtn.classList.add('active');
      syntaxTabBtn.classList.remove('active');
      if (syntaxEditor) syntaxEditor.style.display = 'none';
      if (cardsContainer) cardsContainer.style.display = 'flex';
      renderInteractiveCards();
      playTone(660, 'sine', 0.1, 0.08);
    });
  }
}

function setupRulesPopover() {
  const btn = document.getElementById('btnShadowingRules');
  const popover = document.getElementById('rulesPopoverCard');
  const closeBtn = document.getElementById('btnCloseRulesPopover');
  const chimeToggle = document.getElementById('chimeTogglePopover');
  const sidebarChimeToggle = document.getElementById('chimeToggleSidebar');

  if (btn && popover) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.toggle('open');
      playTone(440, 'sine', 0.08, 0.05);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popover.classList.remove('open');
      });
    }

    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && e.target !== btn) {
        popover.classList.remove('open');
      }
    });
  }

  if (chimeToggle) {
    chimeToggle.addEventListener('change', (e) => {
      state.enableChime = e.target.checked;
      showToast(state.enableChime ? 'Da bat chuong Ding bao chuyen cau' : 'Da tat chuong Ding', 'info');
      if (state.enableChime) playChime();
    });
  }

  if (sidebarChimeToggle) {
    sidebarChimeToggle.addEventListener('change', (e) => {
      state.enableChime = e.target.checked;
      if (state.enableChime) {
        playChime();
        showToast('Da bat chuong Ding', 'success');
      } else {
        showToast('Da tat chuong Ding');
      }
    });
  }
}

const voiceDatabase = {
  vi: [
    { id: 'vi-hoaimy', name: 'Hoai My', gender: 'female', meta: 'Nu - Chuan Bac Bo, truyen cam' },
    { id: 'vi-namminh', name: 'Nam Minh', gender: 'male', meta: 'Nam - Tram am, ro chu' }
  ],
  en: [
    { id: 'en-jenny', name: 'Jenny (Natural)', gender: 'female', meta: 'Nu - American chuan' },
    { id: 'en-guy', name: 'Guy (Natural)', gender: 'male', meta: 'Nam - American tu nhien' },
    { id: 'en-aria', name: 'Aria (Expressive)', gender: 'female', meta: 'Nu - Bieu cam cao' }
  ],
  ja: [
    { id: 'ja-nanami', name: 'Nanami (Natural)', gender: 'female', meta: 'Nu - Chuan Tokyo, tu nhien' },
    { id: 'ja-keita', name: 'Keita (Natural)', gender: 'male', meta: 'Nam - Ngu dieu chuan Nhat' },
    { id: 'ja-aoi', name: 'Aoi (Expressive)', gender: 'female', meta: 'Nu - Bieu cam sinh dong' }
  ]
};

function updateForeignVoiceOptions() {
  const lang = state.targetLang;
  const selectForeign = document.getElementById('selectVoiceForeign');
  const chipsForeign = document.getElementById('quickChipsForeign');
  const foreignTag = document.getElementById('foreignChannelTag');

  if (foreignTag) {
    foreignTag.textContent = lang === 'en' ? 'GIONG NGOAI NGU (SHADOWING EN)' : 'GIONG NGOAI NGU (SHADOWING JA)';
  }

  const voices = voiceDatabase[lang] || voiceDatabase.en;
  const currentId = lang === 'en' ? state.selectedVoiceEN : state.selectedVoiceJA;

  if (selectForeign) {
    selectForeign.innerHTML = voices.map(v =>
      `<option value="${v.id}" ${v.id === currentId ? 'selected' : ''}>${v.name} (${v.gender === 'female' ? 'Nu' : 'Nam'}) - ${v.meta}</option>`
    ).join('');
  }

  if (chipsForeign) {
    chipsForeign.innerHTML = voices.map(v =>
      `<button class="quick-chip ${v.id === currentId ? 'active' : ''}" data-voice="${v.id}">${v.name} (${v.gender === 'female' ? 'Nu' : 'Nam'})</button>`
    ).join('');

    chipsForeign.querySelectorAll('.quick-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const voiceId = btn.dataset.voice;
        if (state.targetLang === 'en') state.selectedVoiceEN = voiceId;
        else state.selectedVoiceJA = voiceId;
        if (selectForeign) selectForeign.value = voiceId;
        chipsForeign.querySelectorAll('.quick-chip').forEach(b => b.classList.toggle('active', b.dataset.voice === voiceId));
        const found = voices.find(v => v.id === voiceId);
        if (found) showToast(`Da chon giong ngoai ngu: ${found.name}`, 'success');
      });
    });
  }
}

function setupVoiceSelection() {
  const selectVI = document.getElementById('selectVoiceVI');
  const chipsVI = document.getElementById('quickChipsVI');
  const selectForeign = document.getElementById('selectVoiceForeign');
  const btnTestVI = document.getElementById('btnTestVoiceVI');
  const btnTestForeign = document.getElementById('btnTestVoiceForeign');

  if (selectVI) {
    selectVI.addEventListener('change', (e) => {
      state.selectedVoiceVI = e.target.value;
      if (chipsVI) {
        chipsVI.querySelectorAll('.quick-chip').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.voice === e.target.value);
        });
      }
      const found = voiceDatabase.vi.find(v => v.id === e.target.value);
      if (found) showToast(`Da chon giong Tieng Viet: ${found.name}`, 'success');
    });
  }

  if (chipsVI) {
    chipsVI.querySelectorAll('.quick-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const voiceId = btn.dataset.voice;
        state.selectedVoiceVI = voiceId;
        if (selectVI) selectVI.value = voiceId;
        chipsVI.querySelectorAll('.quick-chip').forEach(b => b.classList.toggle('active', b.dataset.voice === voiceId));
        const found = voiceDatabase.vi.find(v => v.id === voiceId);
        if (found) showToast(`Da chon giong Tieng Viet: ${found.name}`, 'success');
      });
    });
  }

  if (selectForeign) {
    selectForeign.addEventListener('change', (e) => {
      const voiceId = e.target.value;
      if (state.targetLang === 'en') state.selectedVoiceEN = voiceId;
      else state.selectedVoiceJA = voiceId;
      const chipsForeign = document.getElementById('quickChipsForeign');
      if (chipsForeign) {
        chipsForeign.querySelectorAll('.quick-chip').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.voice === voiceId);
        });
      }
      const list = voiceDatabase[state.targetLang] || voiceDatabase.en;
      const found = list.find(v => v.id === voiceId);
      if (found) showToast(`Da chon giong Ngoai ngu: ${found.name}`, 'success');
    });
  }

  updateForeignVoiceOptions();

  if (btnTestVI) {
    btnTestVI.addEventListener('click', (e) => {
      e.stopPropagation();
      handleVoicePreview('vi', state.selectedVoiceVI);
      const found = voiceDatabase.vi.find(v => v.id === state.selectedVoiceVI) || voiceDatabase.vi[0];
      showToast(`Dang phat mau giong Tieng Viet: ${found.name}`, 'info');
    });
  }

  if (btnTestForeign) {
    btnTestForeign.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = state.targetLang;
      const currentId = lang === 'en' ? state.selectedVoiceEN : state.selectedVoiceJA;
      handleVoicePreview(lang, currentId);
      const list = voiceDatabase[lang] || voiceDatabase.en;
      const found = list.find(v => v.id === currentId) || list[0];
      showToast(`Dang phat mau giong Ngoai ngu: ${found.name}`, 'info');
    });
  }
}

function handleVoicePreview(category, voiceId) {
  if (state.isPlayingPreview) {
    state.isPlayingPreview = null;
    document.querySelectorAll('.preview-audio-btn').forEach(b => b.classList.remove('playing'));
  }

  state.isPlayingPreview = voiceId;
  const previewBtns = document.querySelectorAll(`.preview-audio-btn[data-voice="${voiceId}"]`);
  previewBtns.forEach(btn => btn.classList.add('playing'));

  const voice = (voiceDatabase[category] || []).find(v => v.id === voiceId);
  const baseFreq = voice?.gender === 'female' ? 520 : 380;

  playTone(baseFreq, 'triangle', 0.2, 0.12);
  setTimeout(() => playTone(baseFreq * 1.25, 'triangle', 0.2, 0.12), 150);
  setTimeout(() => playTone(baseFreq * 1.5, 'triangle', 0.35, 0.12), 300);

  setTimeout(() => {
    previewBtns.forEach(btn => btn.classList.remove('playing'));
    state.isPlayingPreview = null;
  }, 900);
}

function setupLanguageTabs() {
  const langTabs = document.querySelectorAll('.lang-tab');

  langTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      langTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const lang = tab.dataset.lang;
      state.targetLang = lang;

      updateForeignVoiceOptions();

      if (state.activeView === 'cards') {
        renderInteractiveCards();
      } else {
        renderSyntaxCodeFromChunks();
      }
      showToast(`Da chuyen muc tieu hoc sang: ${lang === 'en' ? 'Tieng Anh (EN)' : 'Tieng Nhat (JA)'}`, 'success');
    });
  });
}

function updateSliderProgressFill(slider) {
  if (!slider) return;
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value) || 0;
  const percent = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  slider.style.setProperty('--fill-percent', `${percent}%`);
}

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
      updateSliderProgressFill(sliderVI);
      calculateLiveMetrics();
    });

    inputVI.addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 1.5;
      val = Math.max(0.5, Math.min(5.0, val));
      inputVI.value = val.toFixed(1);
      sliderVI.value = val;
      state.silenceVI = val;
      updateSliderProgressFill(sliderVI);
      calculateLiveMetrics();
    });
  }

  if (sliderEN && inputEN) {
    sliderEN.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      inputEN.value = val.toFixed(1);
      state.silenceEN = val;
      updateSliderProgressFill(sliderEN);
      calculateLiveMetrics();
    });

    inputEN.addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 3.5;
      val = Math.max(1.0, Math.min(8.0, val));
      inputEN.value = val.toFixed(1);
      sliderEN.value = val;
      state.silenceEN = val;
      updateSliderProgressFill(sliderEN);
      calculateLiveMetrics();
    });
  }

  if (chimeToggle) {
    chimeToggle.addEventListener('change', (e) => {
      state.enableChime = e.target.checked;
      if (state.enableChime) {
        playChime();
        showToast('Da bat chuong Ding', 'success');
      } else {
        showToast('Da tat chuong Ding');
      }
    });
  }

  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      presetCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const preset = card.dataset.preset;
      if (preset === 'standard') { state.silenceVI = 1.5; state.silenceEN = 3.5; }
      else if (preset === 'fast') { state.silenceVI = 1.0; state.silenceEN = 2.0; }
      else if (preset === 'focus') { state.silenceVI = 2.0; state.silenceEN = 4.5; }

      if (sliderVI) {
        sliderVI.value = state.silenceVI;
        updateSliderProgressFill(sliderVI);
      }
      if (inputVI) inputVI.value = state.silenceVI.toFixed(1);
      if (sliderEN) {
        sliderEN.value = state.silenceEN;
        updateSliderProgressFill(sliderEN);
      }
      if (inputEN) inputEN.value = state.silenceEN.toFixed(1);
      calculateLiveMetrics();
      showToast(`Da ap dung mau: ${card.querySelector('.preset-name')?.textContent || preset}`, 'success');
    });
  });

  // Initialize slider progress fill on load
  if (sliderVI) updateSliderProgressFill(sliderVI);
  if (sliderEN) updateSliderProgressFill(sliderEN);
}

function setupSyntaxEditor() {
  renderSyntaxCodeFromChunks();
  document.getElementById('pillInsertVI')?.addEventListener('click', () => {
    insertTokenAtEditor('[VI] ');
    playTone(520, 'sine', 0.1, 0.08);
  });
  document.getElementById('pillInsertEN')?.addEventListener('click', () => {
    insertTokenAtEditor(`[${state.targetLang.toUpperCase()}] `);
    playTone(660, 'sine', 0.1, 0.08);
  });
  document.getElementById('pillInsertCUE')?.addEventListener('click', () => {
    insertTokenAtEditor('[CUE] ');
    playChime();
  });
  document.getElementById('btnFormatScript')?.addEventListener('click', () => {
    renderSyntaxCodeFromChunks();
    showToast('Da can le chuan cu phap song ngu', 'success');
  });
  document.getElementById('btnCopyScript')?.addEventListener('click', () => {
    copyRawScriptToClipboard();
  });
  document.getElementById('btnClearScript')?.addEventListener('click', () => {
    const confirmClear = confirm('Canh bao an toan: Ban co chac chan muon xoa toan bo kich ban hien tai khong?');
    if (confirmClear) {
      scriptChunks = [];
      renderSyntaxCodeFromChunks();
      renderInteractiveCards();
      calculateLiveMetrics();
      showToast('Da lam rong kich ban');
    }
  });
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
  scriptChunks.push({
    id: 'chunk-' + Date.now(),
    vi: 'Nhap cau tieng Viet mau...',
    en: 'Sample English sentence...',
    ja: 'Sample no nihongo...'
  });
  renderSyntaxCodeFromChunks();
  showToast(`Da chen the: ${token}`, 'success');
}

function copyRawScriptToClipboard() {
  let text = '';
  const langKey = state.targetLang;
  scriptChunks.forEach(c => {
    text += `[VI] ${c.vi}\n[${langKey.toUpperCase()}] ${c[langKey] || c.en}\n\n`;
  });
  navigator.clipboard.writeText(text.trim()).then(() => {
    showToast('Da sao chep kich ban', 'success');
    playTone(440, 'sine', 0.15, 0.1);
  }).catch(() => {
    showToast('Khong the sao chep tu dong');
  });
}

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
    card.innerHTML = `
      <div class="chunk-card-header">
        <span class="chunk-index-badge">CAP CAU #${index + 1}</span>
        <button class="chunk-preview-btn" data-chunk-index="${index}">Nghe thu</button>
      </div>
      <div class="chunk-text-row">
        <span class="chunk-label vi">[VI] TIENG VIET</span>
        <input class="chunk-text-box input-vi" value="${escapeHtml(chunk.vi)}" />
      </div>
      <div class="chunk-text-row">
        <span class="chunk-label en">[${langTag}] NGOAI NGU</span>
        <input class="chunk-text-box input-foreign" value="${escapeHtml(chunk[langKey] || chunk.en)}" />
      </div>
    `;

    const inputVI = card.querySelector('.input-vi');
    const inputForeign = card.querySelector('.input-foreign');

    inputVI.addEventListener('input', (e) => {
      chunk.vi = e.target.value;
      calculateLiveMetrics();
    });

    inputForeign.addEventListener('input', (e) => {
      chunk[langKey] = e.target.value;
      calculateLiveMetrics();
    });

    card.querySelector('.chunk-preview-btn').addEventListener('click', () => {
      playTone(520, 'sine', 0.2, 0.1);
      if (state.enableChime) setTimeout(playChime, 300);
      setTimeout(() => playTone(660, 'sine', 0.25, 0.1), 600);
      showToast(`Dang phat thu Cap cau #${index + 1}`, 'info');
    });

    container.appendChild(card);
  });
}

function setupAiIntake() {
  const btnProcess = document.getElementById('btnAiProcess');
  const btnPaste = document.getElementById('btnPasteSample');
  const rawTextarea = document.getElementById('rawInputText');
  const intakeCard = document.getElementById('aiIntakeCard');
  const btnToggle = document.getElementById('btnToggleIntake');
  const btnExpand = document.getElementById('btnExpandIntake');
  const summaryTitle = document.getElementById('aiSummaryTitle');
  const wordCounter = document.getElementById('rawWordCount');

  // AI Intake Collapse/Expand Toggle
  if (btnToggle && intakeCard) {
    btnToggle.addEventListener('click', () => {
      intakeCard.classList.toggle('collapsed');
      playTone(330, 'sine', 0.08, 0.05);
    });
  }

  if (btnExpand && intakeCard) {
    btnExpand.addEventListener('click', () => {
      intakeCard.classList.remove('collapsed');
      if (rawTextarea) rawTextarea.focus();
      playTone(440, 'sine', 0.08, 0.05);
    });
  }

  if (rawTextarea && wordCounter) {
    rawTextarea.addEventListener('input', (e) => {
      const words = e.target.value.trim().split(/\s+/).filter(Boolean).length;
      wordCounter.textContent = `${words} tu`;
    });
  }

  if (btnPaste && rawTextarea) {
    btnPaste.addEventListener('click', () => {
      rawTextarea.value = 'Phuong phap Shadowing giup nao bo hinh thanh duong mon ngon ngu tu nhien. Bang cach nghe lap di lap lai nhung cum tu chuan va nhai lai dung cao do, kha nang phan xa se but pha.';
      const words = rawTextarea.value.trim().split(/\s+/).filter(Boolean).length;
      if (wordCounter) wordCounter.textContent = `${words} tu`;
      showToast('Da nap van ban tho mau', 'success');
      playTone(520, 'sine', 0.15, 0.1);
    });
  }

  if (btnProcess) {
    btnProcess.addEventListener('click', () => {
      btnProcess.disabled = true;
      btnProcess.innerHTML = '<svg class="spinning" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Dang phan doan AI...';
      playTone(440, 'sine', 0.1, 0.08);

      setTimeout(() => {
        btnProcess.disabled = false;
        btnProcess.innerHTML = 'Phan doan & Dich tu dong';
        scriptChunks.push({
          id: 'chunk-' + Date.now(),
          vi: 'Phuong phap Shadowing giup nguoi hoc but pha kha nang phat am ban ngu.',
          en: 'The shadowing technique helps learners achieve native pronunciation breakthroughs.',
          ja: 'Shadoingu hou wa gakushuu-sha ga neitibu no hatsunon wo shuutoku suru no ni yakudachimasu.'
        });
        if (state.activeView === 'cards') renderInteractiveCards();
        else renderSyntaxCodeFromChunks();
        calculateLiveMetrics();

        // Auto-collapse Step 1 to expand vertical screen real estate
        if (intakeCard) {
          intakeCard.classList.add('collapsed');
          if (summaryTitle) {
            let totalW = 0;
            scriptChunks.forEach(c => totalW += (c.vi.split(/\s+/).length + (c[state.targetLang] || c.en).split(/\s+/).length));
            summaryTitle.textContent = `Da phan doan ${scriptChunks.length} cap cau song ngu (${totalW} tu)`;
          }
        }
        showToast('AI Qwen 3 (8B) da hoan tat!', 'success');
      }, 1200);
    });
  }
}

function calculateLiveMetrics() {
  const pairCount = scriptChunks.length;
  let totalWords = 0;
  scriptChunks.forEach(c => {
    totalWords += (c.vi.split(/\s+/).length + (c[state.targetLang] || c.en).split(/\s+/).length);
  });

  const totalSeconds = Math.round(totalWords / 2.6 + pairCount * (state.silenceVI + state.silenceEN + 1.0));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const timeFormatted = `${mins}m ${secs.toString().padStart(2, '0')}s`;

  const countEl = document.getElementById('metricChunkCount');
  const wordsEl = document.getElementById('metricWordCount');
  const durationEl = document.getElementById('metricDuration');
  const bottomDuration = document.getElementById('bottomEstimatedDuration');
  const bottomChunks = document.getElementById('bottomChunkSummary');

  if (countEl) countEl.textContent = pairCount;
  if (wordsEl) wordsEl.textContent = totalWords;
  if (durationEl) durationEl.textContent = timeFormatted;
  if (bottomDuration) bottomDuration.textContent = timeFormatted;
  if (bottomChunks) bottomChunks.textContent = `${pairCount} cap cau (${totalWords} tu)`;
}

/* Master Primary CTA - Navigate to Dedicated Player */
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
  btn.innerHTML = `<svg class="spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Dang tong hop audio...</span>`;
  playTone(520, 'sine', 0.2, 0.1);

  setTimeout(() => {
    // Redirect to dedicated player page
    window.location.href = '../player/index.html';
  }, 1000);
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd+Enter or Ctrl+Enter triggers synthesis
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      triggerRenderAndNavigateToPlayer();
    }

    // Escape closes popover
    if (e.key === 'Escape') {
      const popover = document.getElementById('rulesPopoverCard');
      if (popover && popover.classList.contains('open')) {
        popover.classList.remove('open');
      }
    }
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconSvg = type === 'success'
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  // Auto remove toast with fade out animation
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px) scale(0.9)';
    toast.style.transition = 'all 0.2s ease-out';
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
