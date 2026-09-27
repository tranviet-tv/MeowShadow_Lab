/**
 * MeowShadow Studio - Studio Workspace Client Logic
 * Handles real-time metrics, AI auto-chunking, syntax highlighting,
 * and seamless transition to the Dedicated Shadowing Player.
 */

// Local State Store
const state = {
  activeView: 'syntax',
  targetLang: 'en',
  selectedVoiceVI: 'vi-hoaimy',
  selectedVoiceEN: 'en-jenny',
  selectedVoiceJA: 'ja-nanami',
  silenceVI: 1.5,
  silenceEN: 3.5,
  enableChime: true,
  currentPreset: 'standard'
};

// Initial Chunks Dataset
let scriptChunks = [
  {
    id: 'chunk-1',
    vi: 'Hôm nay là một ngày tuyệt vời để bắt đầu học ngoại ngữ mới.',
    en: 'Today is a wonderful day to start learning a new language.',
    ja: '今日は新しい外国語を学び始めるのに素晴らしい日です。'
  },
  {
    id: 'chunk-2',
    vi: 'Khi bạn kiên trì luyện tập phương pháp Shadowing mỗi ngày mười lăm phút, khả năng phát âm của bạn sẽ tiến bộ vượt bậc.',
    en: 'When you consistently practice the shadowing technique for fifteen minutes every day, your pronunciation will improve dramatically.',
    ja: '毎日15分間シャドーイングの練習を一歩一歩続けると、発音は飛躍的に向上します。'
  },
  {
    id: 'chunk-3',
    vi: 'Hãy nghe thật kỹ từng ngữ điệu và nhại lại ngay sau khi câu nói kết thúc.',
    en: 'Listen carefully to each intonation and repeat immediately after the sentence finishes.',
    ja: 'イントネーションを注意深く聴き、文が終わったらすぐに真似して声に出しましょう。'
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
  calculateLiveMetrics();
});

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
      syntaxEditor.style.display = 'flex';
      cardsContainer.style.display = 'none';
      renderSyntaxCodeFromChunks();
    });

    cardsTabBtn.addEventListener('click', () => {
      state.activeView = 'cards';
      cardsTabBtn.classList.add('active');
      syntaxTabBtn.classList.remove('active');
      syntaxEditor.style.display = 'none';
      cardsContainer.style.display = 'flex';
      renderInteractiveCards();
    });
  }
}

function setupRulesPopover() {
  const btn = document.getElementById('btnShadowingRules');
  const popover = document.getElementById('rulesPopoverCard');
  const closeBtn = document.getElementById('btnCloseRulesPopover');
  const chimeToggle = document.getElementById('chimeTogglePopover');

  if (btn && popover) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.toggle('open');
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
      showToast(state.enableChime ? 'Đã bật chuông Ding báo chuyển câu' : 'Đã tắt chuông Ding', 'info');
    });
  }
}

const voiceDatabase = {
  vi: [
    { id: 'vi-hoaimy', name: 'Hoài My', gender: 'female', meta: 'Nữ • Chuẩn Bắc Bộ, truyền cảm' },
    { id: 'vi-namminh', name: 'Nam Minh', gender: 'male', meta: 'Nam • Trầm ấm, rõ chữ' }
  ],
  en: [
    { id: 'en-jenny', name: 'Jenny (Natural)', gender: 'female', meta: 'Nữ • American chuẩn' },
    { id: 'en-guy', name: 'Guy (Natural)', gender: 'male', meta: 'Nam • American tự nhiên' },
    { id: 'en-aria', name: 'Aria (Expressive)', gender: 'female', meta: 'Nữ • Biểu cảm cao' }
  ],
  ja: [
    { id: 'ja-nanami', name: 'Nanami (Natural)', gender: 'female', meta: 'Nữ • Chuẩn Tokyo, tự nhiên' },
    { id: 'ja-keita', name: 'Keita (Natural)', gender: 'male', meta: 'Nam • Ngữ điệu chuẩn Nhật' },
    { id: 'ja-aoi', name: 'Aoi (Expressive)', gender: 'female', meta: 'Nữ • Biểu cảm sinh động' }
  ]
};

function updateForeignVoiceOptions() {
  const lang = state.targetLang;
  const selectForeign = document.getElementById('selectVoiceForeign');
  const chipsForeign = document.getElementById('quickChipsForeign');
  const foreignTag = document.getElementById('foreignChannelTag');

  if (foreignTag) {
    foreignTag.textContent = lang === 'en' ? '🎙️ GIỌNG NGOẠI NGỮ (SHADOWING EN)' : '🎙️ GIỌNG NGOẠI NGỮ (SHADOWING JA)';
  }

  const voices = voiceDatabase[lang] || voiceDatabase.en;
  const currentId = lang === 'en' ? state.selectedVoiceEN : state.selectedVoiceJA;

  if (selectForeign) {
    selectForeign.innerHTML = voices.map(v => 
      `<option value="${v.id}" ${v.id === currentId ? 'selected' : ''}>${v.name} (${v.gender === 'female' ? 'Nữ' : 'Nam'}) - ${v.meta}</option>`
    ).join('');
  }

  if (chipsForeign) {
    chipsForeign.innerHTML = voices.map(v => 
      `<button class="quick-chip ${v.id === currentId ? 'active' : ''}" data-voice="${v.id}">${v.name} (${v.gender === 'female' ? 'Nữ' : 'Nam'})</button>`
    ).join('');

    chipsForeign.querySelectorAll('.quick-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const voiceId = btn.dataset.voice;
        if (state.targetLang === 'en') state.selectedVoiceEN = voiceId;
        else state.selectedVoiceJA = voiceId;
        if (selectForeign) selectForeign.value = voiceId;
        chipsForeign.querySelectorAll('.quick-chip').forEach(b => b.classList.toggle('active', b.dataset.voice === voiceId));
        const found = voices.find(v => v.id === voiceId);
        if (found) showToast(`Đã chọn giọng ngoại ngữ: ${found.name}`, 'success');
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
      if (found) showToast(`Đã chọn giọng Tiếng Việt: ${found.name}`, 'success');
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
        if (found) showToast(`Đã chọn giọng Tiếng Việt: ${found.name}`, 'success');
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
      if (found) showToast(`Đã chọn giọng Ngoại ngữ: ${found.name}`, 'success');
    });
  }

  updateForeignVoiceOptions();

  if (btnTestVI) {
    btnTestVI.addEventListener('click', (e) => {
      e.stopPropagation();
      playTone(520, 'sine', 0.35, 0.15);
      const found = voiceDatabase.vi.find(v => v.id === state.selectedVoiceVI) || voiceDatabase.vi[0];
      showToast(`Đang phát mẫu giọng Tiếng Việt: ${found.name}`, 'info');
    });
  }

  if (btnTestForeign) {
    btnTestForeign.addEventListener('click', (e) => {
      e.stopPropagation();
      playTone(660, 'triangle', 0.4, 0.15);
      const list = voiceDatabase[state.targetLang] || voiceDatabase.en;
      const currentId = state.targetLang === 'en' ? state.selectedVoiceEN : state.selectedVoiceJA;
      const found = list.find(v => v.id === currentId) || list[0];
      showToast(`Đang phát mẫu giọng Ngoại ngữ: ${found.name}`, 'info');
    });
  }
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
      showToast(`Đã chuyển mục tiêu học sang: ${lang === 'en' ? 'Tiếng Anh (EN)' : 'Tiếng Nhật (JA)'}`, 'success');
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
      if (state.enableChime) playChime();
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
    });
  });

  // Initial progress fill on load
  if (sliderVI) updateSliderProgressFill(sliderVI);
  if (sliderEN) updateSliderProgressFill(sliderEN);
}

function setupSyntaxEditor() {
  renderSyntaxCodeFromChunks();
  document.getElementById('pillInsertVI')?.addEventListener('click', () => insertTokenAtEditor('[VI] '));
  document.getElementById('pillInsertEN')?.addEventListener('click', () => insertTokenAtEditor(`[${state.targetLang.toUpperCase()}] `));
  document.getElementById('pillInsertCUE')?.addEventListener('click', () => { insertTokenAtEditor('[CUE 🔔] '); playChime(); });
  document.getElementById('btnFormatScript')?.addEventListener('click', () => { renderSyntaxCodeFromChunks(); showToast('Đã căn lề chuẩn cú pháp song ngữ', 'success'); });
  document.getElementById('btnCopyScript')?.addEventListener('click', () => copyRawScriptToClipboard());
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
    vi: 'Nhập câu tiếng Việt mẫu...',
    en: 'Sample English sentence...',
    ja: 'サンプルの日本語...'
  });
  renderSyntaxCodeFromChunks();
  showToast(`Đã chèn thẻ: ${token}`, 'success');
}

function copyRawScriptToClipboard() {
  let text = '';
  const langKey = state.targetLang;
  scriptChunks.forEach(c => {
    text += `[VI] ${c.vi}\n[${langKey.toUpperCase()}] ${c[langKey] || c.en}\n\n`;
  });
  navigator.clipboard.writeText(text.trim()).then(() => showToast('Đã sao chép kịch bản', 'success'));
}

function setupInteractiveCards() {}

function renderInteractiveCards() {
  const container = document.getElementById('interactiveCardsContainer');
  if (!container) return;
  container.innerHTML = '';

  const langKey = state.targetLang;
  scriptChunks.forEach((chunk, index) => {
    const card = document.createElement('div');
    card.className = 'chunk-card';
    card.innerHTML = `
      <div class="chunk-card-header">
        <span class="chunk-index-badge">CẶP CÂU #${index + 1}</span>
        <button class="chunk-preview-btn">Nghe thử</button>
      </div>
      <div class="chunk-text-row">
        <span class="chunk-label vi">[VI] TIẾNG VIỆT</span>
        <input class="chunk-text-box input-vi" value="${escapeHtml(chunk.vi)}" />
      </div>
      <div class="chunk-text-row">
        <span class="chunk-label en">[${langKey.toUpperCase()}] NGOẠI NGỮ</span>
        <input class="chunk-text-box input-foreign" value="${escapeHtml(chunk[langKey] || chunk.en)}" />
      </div>
    `;

    card.querySelector('.chunk-preview-btn').addEventListener('click', () => {
      playTone(520, 'sine', 0.2, 0.1);
      if (state.enableChime) setTimeout(playChime, 300);
      setTimeout(() => playTone(660, 'sine', 0.25, 0.1), 600);
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

  if (btnToggle && intakeCard) {
    btnToggle.addEventListener('click', () => {
      intakeCard.classList.toggle('collapsed');
    });
  }

  if (btnExpand && intakeCard) {
    btnExpand.addEventListener('click', () => {
      intakeCard.classList.remove('collapsed');
      if (rawTextarea) rawTextarea.focus();
    });
  }

  if (btnPaste && rawTextarea) {
    btnPaste.addEventListener('click', () => {
      rawTextarea.value = "Phương pháp Shadowing giúp não bộ hình thành đường mòn ngôn ngữ tự nhiên. Bằng cách nghe lặp đi lặp lại những cụm từ chuẩn và nhại lại đúng cao độ, khả năng phản xạ sẽ bứt phá.";
      document.getElementById('rawWordCount').textContent = '35 từ';
      showToast('Đã nạp văn bản thô mẫu', 'success');
    });
  }

  if (btnProcess) {
    btnProcess.addEventListener('click', () => {
      btnProcess.disabled = true;
      btnProcess.innerHTML = 'Đang phân đoạn AI...';
      setTimeout(() => {
        btnProcess.disabled = false;
        btnProcess.innerHTML = 'Phân đoạn &amp; Dịch tự động';
        scriptChunks.push({
          id: 'chunk-' + Date.now(),
          vi: 'Phương pháp Shadowing giúp người học bứt phá khả năng phát âm bản ngữ.',
          en: 'The Shadowing technique helps learners achieve native pronunciation breakthroughs.',
          ja: 'シャドーイング法は学習者がネイティブの発音を習得するのに役立ちます。'
        });
        if (state.activeView === 'cards') renderInteractiveCards();
        else renderSyntaxCodeFromChunks();
        calculateLiveMetrics();

        // Auto-collapse Step 1 to expand vertical screen real estate for script editing
        if (intakeCard) {
          intakeCard.classList.add('collapsed');
          if (summaryTitle) {
            let totalW = 0;
            scriptChunks.forEach(c => totalW += (c.vi.split(/\s+/).length + (c[state.targetLang] || c.en).split(/\s+/).length));
            summaryTitle.textContent = `Đã phân đoạn ${scriptChunks.length} cặp câu song ngữ (${totalW} từ)`;
          }
        }
        showToast('AI Qwen 3 (8B) đã hoàn tất! Đã tự động thu gọn khối nạp bài.', 'success');
      }, 1000);
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

  document.getElementById('metricChunkCount').textContent = pairCount;
  document.getElementById('metricWordCount').textContent = totalWords;
  document.getElementById('metricDuration').textContent = timeFormatted;
  document.getElementById('bottomEstimatedDuration').textContent = timeFormatted;
  document.getElementById('bottomChunkSummary').textContent = `${pairCount} cặp câu (${totalWords} từ)`;
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
  btn.innerHTML = `<span>Đang tổng hợp 3 khâu audio...</span>`;
  playTone(520, 'sine', 0.2, 0.1);

  setTimeout(() => {
    // Smooth redirect to dedicated player page
    window.location.href = '../player/index.html';
  }, 900);
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      triggerRenderAndNavigateToPlayer();
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
