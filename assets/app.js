/* 幸运学习机 · 交互逻辑
   无框架、无后端，所有学习记录只保存在本机 localStorage。 */
(function () {
  'use strict';

  /* ========== 常量 ========== */
  const STORAGE_KEY = 'lucky-study-machine.v1';
  const START_TICKETS = 5;
  const MAX_TICKETS = 99;
  const TASK_REWARD = { tickets: 1, stars: 12 };
  const MAX_TASKS = 60;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  const SYMBOLS = {
    seven: { id: 'seven', glyph: '7', name: '幸运七', className: 'symbol-seven' },
    cherry: { id: 'cherry', glyph: '🍒', name: '樱桃', className: 'symbol-emoji' },
    lemon: { id: 'lemon', glyph: '🍋', name: '柠檬', className: 'symbol-emoji' },
    grape: { id: 'grape', glyph: '🍇', name: '葡萄', className: 'symbol-emoji' },
    watermelon: { id: 'watermelon', glyph: '🍉', name: '西瓜', className: 'symbol-emoji' },
    bell: { id: 'bell', glyph: '🔔', name: '幸运铃', className: 'symbol-emoji' },
    star: { id: 'star', glyph: '⭐', name: '星星', className: 'symbol-emoji' }
  };

  const SYMBOL_IDS = Object.keys(SYMBOLS);
  const NON_SEVEN_IDS = ['cherry', 'lemon', 'grape', 'watermelon', 'bell', 'star'];
  const FRUIT_IDS = ['cherry', 'lemon', 'grape', 'watermelon'];
  const DISPLAY_WEIGHTS = {
    seven: 1.1,
    cherry: 4.3,
    lemon: 3.9,
    grape: 3.4,
    watermelon: 2.8,
    bell: 3.1,
    star: 2.0
  };

  const RANDOM_TASKS = [
    '背 20 个英语单词',
    '复习昨天的错题',
    '读完一章书',
    '做 10 道数学题',
    '整理今天的笔记',
    '练字 10 分钟',
    '听一集英语听力',
    '默写一首古诗',
    '预习明天的课程',
    '写 100 字日记',
    '复习一个知识点',
    '做一套选择题',
    '读 15 分钟课外书',
    '把一道错题讲给自己听',
    '画一张思维导图',
    '记忆 5 个公式',
    '练 5 分钟口语',
    '整理书包和书桌',
    '完成一件拖延很久的小事',
    '给明天的自己写一句话',
    '专注学习 25 分钟',
    '复习 3 个固定搭配',
    '听一段播客并记笔记',
    '做一次章节自测',
    '读一篇短文并复述',
    '写下一个今天学会的新知识',
    '朗读课文 10 分钟',
    '解决 3 道压轴小题',
    '整理一个易错点',
    '完成今日作业的第一项',
    '复习一张思维导图',
    '用 5 分钟回顾课堂内容'
  ];

  const TIERS = {
    jackpot: {
      key: 'jackpot',
      kicker: '✦ LUCKY JACKPOT · 777',
      stars: 888,
      bonusTickets: 3,
      win: true,
      sound: 'jackpot',
      quotes: [
        '777！今天的你，被好运一眼选中。',
        '三个七齐亮。这不是偶然，是你攒了很久的光。',
        '头彩时刻！把这份底气，带去今天的每一道题里吧。'
      ],
      hint: '额外获得 3 张摇奖券。今天的头彩，也分一点给明天的自己。'
    },
    starTriple: {
      key: 'starTriple',
      kicker: '✦ STAR TRIO · 三星报喜',
      stars: 288,
      bonusTickets: 1,
      win: true,
      sound: 'bigWin',
      quotes: [
        '三颗星一起亮起，专注的你自带光。',
        '星三星。愿今天的灵感，也像星星一样多。',
        '星星为你排成一排，接下来也要闪闪发光呀。'
      ],
      hint: '额外获得 1 张摇奖券。带着星光继续。'
    },
    fruitTriple: {
      key: 'fruitTriple',
      kicker: '✦ FRUIT TRIO · 水果三连',
      stars: 128,
      bonusTickets: 0,
      win: true,
      sound: 'bigWin',
      quotes: [
        '水果三连。甜的不仅是转轮，还有认真生活的你。',
        '三个一样的图案，像三次小小的坚持叠在一起。',
        '今天的甜度已达标，继续把小事做好吧。'
      ],
      hint: '灵感已经收进小口袋，下一件小事也会很甜。'
    },
    pairSeven: {
      key: 'pairSeven',
      kicker: '✦ DOUBLE SEVEN · 双七',
      stars: 68,
      bonusTickets: 0,
      win: true,
      sound: 'smallWin',
      quotes: [
        '双七出现，今天的能量条直接拉满。',
        '两个七并肩站着，像在说：你可以的。',
        '差一点点就是三个七，但双份幸运也足够开心。'
      ],
      hint: '双倍幸运已经到账。完成一件小事，就能再来一次。'
    },
    pair: {
      key: 'pair',
      kicker: '✦ LUCKY PAIR · 好运成双',
      stars: 38,
      bonusTickets: 0,
      win: true,
      sound: 'smallWin',
      quotes: [
        '好运成双，你的努力也被看见了。',
        '图案凑成一对，今天的快乐也凑成一对。',
        '不需要惊天动地，两个一样的图案就值得开心一下。'
      ],
      hint: '这局收下 38 颗灵感星。小小好运，也算数。'
    },
    seven: {
      key: 'seven',
      kicker: '✦ LUCKY SEVEN · 幸运七',
      stars: 18,
      bonusTickets: 0,
      win: true,
      sound: 'smallWin',
      quotes: [
        '幸运七来报到，今天也慢慢向前吧。',
        '一个七，一份小确幸。今天依旧值得期待。',
        '七待已久。把这份小小的好运收好。'
      ],
      hint: '完成今日任务，还能获得更多摇奖券。'
    },
    none: {
      key: 'none',
      kicker: '✦ KEEP GOING · 差一点点',
      stars: 5,
      bonusTickets: 0,
      win: false,
      sound: 'noWin',
      quotes: [
        '这次没连成线，但你的每一次尝试都算数。',
        '好运正在加载。先给自己倒杯水，再回来吧。',
        '转轮停下的地方，也是新的起点。',
        '没有连成图案，也送你五颗勇气星。',
        '慢一点没关系，今天的你已经很努力了。'
      ],
      hint: '5 颗勇气星已到账。去做一件小事，攒下一张摇奖券。'
    }
  };

  const TIER_WEIGHTS = [
    { tier: 'jackpot', weight: 1.3 },
    { tier: 'starTriple', weight: 1.7 },
    { tier: 'fruitTriple', weight: 4.4 },
    { tier: 'pairSeven', weight: 5.6 },
    { tier: 'pair', weight: 26 },
    { tier: 'seven', weight: 11 },
    { tier: 'none', weight: 50 }
  ];

  const DEFAULT_RESULT = {
    kicker: 'READY WHEN YOU ARE',
    text: '今天也不用很厉害，先完成一件小事就好。',
    hint: '每完成 1 个任务，收获 1 张摇奖券。'
  };

  const params = new URLSearchParams(window.location.search);
  const isAndroidApp = params.get('app') === '1';
  const isDebug = params.get('debug') === '1';

  /* ========== 日期与存储 ========== */
  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function dateKey(date) {
    const d = date || new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function formatToday(date) {
    const d = date || new Date();
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + WEEKDAYS[d.getDay()];
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '';
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function makeDefaultState() {
    return {
      version: 1,
      date: dateKey(),
      tasks: [],
      tickets: START_TICKETS,
      spins: 0,
      totalStars: 0,
      history: {},
      sound: true,
      updatedAt: 0
    };
  }

  let loadedWithNewDay = false;
  let storageWarned = false;

  function sanitizeHistory(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).slice(-1200).forEach(function (key) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      const item = raw[key];
      if (!item || typeof item !== 'object') return;
      const completed = Number(item.completed);
      const spins = Number(item.spins);
      out[key] = {
        completed: Number.isFinite(completed) ? Math.max(0, Math.floor(completed)) : 0,
        spins: Number.isFinite(spins) ? Math.max(0, Math.floor(spins)) : 0
      };
    });
    return out;
  }

  function sanitizeTasks(rawTasks) {
    if (!Array.isArray(rawTasks)) return [];
    const seen = new Set();
    const out = [];
    rawTasks.slice(0, MAX_TASKS).forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      if (typeof item.text !== 'string') return;
      let text = item.text.replace(/\s+/g, ' ').trim();
      if (!text) return;
      text = Array.from(text).slice(0, 60).join('');
      const norm = text.toLocaleLowerCase('zh-CN');
      if (seen.has(norm)) return;
      seen.add(norm);
      out.push({
        id: typeof item.id === 'string' && item.id ? item.id : uid(),
        text: text,
        done: !!item.done,
        rewarded: !!item.rewarded,
        createdAt: Number(item.createdAt) || Date.now(),
        completedAt: Number(item.completedAt) || null,
        source: typeof item.source === 'string' ? item.source : 'custom'
      });
    });
    return out;
  }

  function loadState() {
    const fresh = makeDefaultState();
    let raw = null;
    try {
      raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (err) {
      raw = null;
    }

    if (!raw || typeof raw !== 'object') return fresh;

    fresh.totalStars = Number.isFinite(Number(raw.totalStars))
      ? Math.max(0, Math.floor(Number(raw.totalStars)))
      : 0;
    fresh.history = sanitizeHistory(raw.history);
    fresh.sound = raw.sound !== false;

    if (raw.date !== fresh.date) {
      loadedWithNewDay = !!raw.date;
      return fresh;
    }

    fresh.tickets = Number.isFinite(Number(raw.tickets))
      ? clamp(Math.floor(Number(raw.tickets)), 0, MAX_TICKETS)
      : START_TICKETS;
    fresh.spins = Number.isFinite(Number(raw.spins))
      ? Math.max(0, Math.floor(Number(raw.spins)))
      : 0;
    fresh.tasks = sanitizeTasks(raw.tasks);
    fresh.updatedAt = Number(raw.updatedAt) || 0;
    return fresh;
  }

  const state = loadState();

  function saveState() {
    state.updatedAt = Date.now();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      if (!storageWarned) {
        storageWarned = true;
        showToast('浏览器没有放开本地存储，这次记录可能无法保存。', 'warn', 4200);
      }
    }
  }

  function bumpHistory(field, amount) {
    const day = state.date;
    if (!state.history[day]) state.history[day] = { completed: 0, spins: 0 };
    state.history[day][field] = Math.max(0, (state.history[day][field] || 0) + (amount || 1));
  }

  function calcStreak() {
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    const today = dateKey(cursor);
    const todayEntry = state.history[today];
    if (!todayEntry || !todayEntry.completed) {
      cursor.setDate(cursor.getDate() - 1);
    }
    let count = 0;
    for (let i = 0; i < 3660; i += 1) {
      const key = dateKey(cursor);
      const entry = state.history[key];
      if (!entry || entry.completed <= 0) break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function ensureToday(showNotice) {
    if (spinning) return false;
    const today = dateKey();
    if (state.date === today) return false;
    state.date = today;
    state.tasks = [];
    state.tickets = START_TICKETS;
    state.spins = 0;
    saveState();
    renderDate();
    renderTasks({ scrollTop: 0 });
    renderTickets();
    renderSpinCounter();
    renderHeaderStats();
    resetResultCard();
    if (showNotice) {
      showToast('新的一天到啦，5 张摇奖券已经到账。', 'win', 3200);
    }
    return true;
  }

  /* ========== 音频引擎 ========== */
  function SoundKit() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.enabled = state.sound !== false;
    this.lastTickAt = 0;
  }

  SoundKit.prototype.init = function () {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.78 : 0;
      this.master.connect(this.ctx.destination);
      const length = Math.floor(this.ctx.sampleRate * 0.8);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
      return true;
    } catch (err) {
      this.ctx = null;
      return false;
    }
  };

  SoundKit.prototype.unlock = function () {
    if (!this.enabled) return false;
    if (!this.init()) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(function () {});
    }
    return true;
  };

  SoundKit.prototype.setEnabled = function (enabled) {
    this.enabled = enabled;
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(enabled ? 0.78 : 0, now, 0.025);
    }
    if (enabled) this.unlock();
  };

  SoundKit.prototype.tone = function (freq, duration, options) {
    if (!this.enabled || !this.ctx) return;
    const opts = options || {};
    const now = this.ctx.currentTime + (opts.when || 0);
    const attack = Math.max(0.002, opts.attack || 0.006);
    const gainValue = Math.max(0.0002, opts.gain || 0.04);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(24, freq), now);
    if (opts.to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(24, opts.to), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  };

  SoundKit.prototype.noise = function (duration, options) {
    if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
    const opts = options || {};
    const now = this.ctx.currentTime + (opts.when || 0);
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = opts.filter || 'highpass';
    filter.frequency.setValueAtTime(opts.freq || 1600, now);
    if (opts.toFreq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, opts.toFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.gain || 0.018), now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  };

  SoundKit.prototype.click = function (volume) {
    if (!this.enabled) return;
    if (!this.ctx) return;
    this.tone(1480, 0.035, { type: 'square', gain: volume || 0.017, to: 760 });
    this.noise(0.028, { filter: 'highpass', freq: 2800, gain: 0.012 });
  };

  SoundKit.prototype.tick = function () {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastTickAt < 38) return;
    this.lastTickAt = now;
    this.tone(1900 + Math.random() * 420, 0.018, { type: 'square', gain: 0.008, to: 1050 });
    this.noise(0.016, { filter: 'highpass', freq: 3600, gain: 0.005 });
  };

  SoundKit.prototype.spinStart = function () {
    this.unlock();
    this.click(0.028);
    this.tone(190, 0.16, { type: 'triangle', gain: 0.055, to: 81 });
    this.noise(0.22, { filter: 'bandpass', freq: 950, toFreq: 220, gain: 0.035 });
    this.tone(392, 0.09, { type: 'sine', gain: 0.018, when: 0.03, to: 523.25 });
  };

  SoundKit.prototype.reelStop = function (index) {
    if (!this.enabled) return;
    this.unlock();
    this.noise(0.035, { filter: 'highpass', freq: 2400, gain: 0.017 });
    this.tone(126 - index * 10, 0.13, { type: 'sine', gain: 0.075, to: 48 });
    this.tone(260 - index * 12, 0.055, { type: 'triangle', gain: 0.025, to: 110 });
  };

  SoundKit.prototype.taskDone = function () {
    this.unlock();
    this.tone(659.25, 0.22, { type: 'sine', gain: 0.04 });
    this.tone(987.77, 0.28, { type: 'sine', gain: 0.035, when: 0.075 });
    this.tone(1318.51, 0.34, { type: 'sine', gain: 0.028, when: 0.15 });
    this.noise(0.2, { filter: 'highpass', freq: 4200, gain: 0.010, when: 0.09 });
  };

  SoundKit.prototype.smallWin = function () {
    this.unlock();
    [523.25, 659.25, 783.99].forEach(function (freq, i) {
      this.tone(freq, 0.19, { type: 'triangle', gain: 0.035, when: i * 0.075 });
    }, this);
    this.tone(1046.5, 0.22, { type: 'sine', gain: 0.022, when: 0.25 });
  };

  SoundKit.prototype.bigWin = function () {
    this.unlock();
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach(function (freq, i) {
      this.tone(freq, 0.24, { type: 'triangle', gain: 0.032, when: i * 0.08 });
      this.tone(freq * 2, 0.13, { type: 'sine', gain: 0.011, when: i * 0.08 + 0.02 });
    }, this);
    [523.25, 659.25, 783.99].forEach(function (freq) {
      this.tone(freq, 0.62, { type: 'sine', gain: 0.012, when: 0.42 });
    }, this);
  };

  SoundKit.prototype.jackpot = function () {
    this.unlock();
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.51].forEach(function (freq, i) {
      this.tone(freq, 0.24, { type: 'triangle', gain: 0.038, when: i * 0.095 });
      this.tone(freq * 2, 0.16, { type: 'sine', gain: 0.014, when: i * 0.095 + 0.01 });
    }, this);
    [523.25, 659.25, 783.99, 1046.5].forEach(function (freq) {
      this.tone(freq, 1.1, { type: 'sine', gain: 0.016, when: 0.64 });
    }, this);
    this.noise(0.35, { filter: 'highpass', freq: 3200, gain: 0.026, when: 0.25 });
    this.tone(1568, 0.7, { type: 'sine', gain: 0.018, when: 0.76, to: 2093 });
  };

  SoundKit.prototype.noWin = function () {
    this.unlock();
    this.tone(440, 0.18, { type: 'sine', gain: 0.025, to: 523.25 });
    this.tone(659.25, 0.3, { type: 'sine', gain: 0.018, when: 0.12 });
    this.noise(0.12, { filter: 'highpass', freq: 3800, gain: 0.006, when: 0.05 });
  };

  SoundKit.prototype.toggleOn = function () {
    this.unlock();
    this.tone(659.25, 0.16, { type: 'sine', gain: 0.03 });
    this.tone(987.77, 0.24, { type: 'sine', gain: 0.027, when: 0.08 });
  };

  SoundKit.prototype.error = function () {
    this.unlock();
    this.tone(196, 0.13, { type: 'triangle', gain: 0.03, to: 155 });
    this.tone(146.83, 0.18, { type: 'triangle', gain: 0.025, when: 0.12, to: 110 });
  };

  SoundKit.prototype.ui = function () {
    this.unlock();
    this.click(0.014);
  };

  const audio = new SoundKit();

  /* ========== DOM ========== */
  const el = {
    streakDays: $('#streakDays'),
    totalStars: $('#totalStars'),
    apkLink: $('#apkLink'),
    soundToggle: $('#soundToggle'),
    cabinet: $('#cabinet'),
    reelWindow: $('#reelWindow'),
    reels: $$('.reel'),
    spinBtn: $('#spinBtn'),
    spinTitle: $('#spinTitle'),
    spinSub: $('#spinSub'),
    ticketBox: $('#ticketBox'),
    ticketCount: $('#ticketCount'),
    todaySpins: $('#todaySpins'),
    resultCard: $('#resultCard'),
    resultKicker: $('#resultKicker'),
    resultReward: $('#resultReward'),
    resultText: $('#resultText'),
    resultHint: $('#resultHint'),
    taskList: $('#taskList'),
    taskListWrap: $('#taskListWrap'),
    emptyState: $('#emptyState'),
    taskForm: $('#taskForm'),
    taskInput: $('#taskInput'),
    inputShell: $('.input-shell'),
    randomBtn: $('#randomBtn'),
    clearDoneBtn: $('#clearDoneBtn'),
    todayDate: $('#todayDate'),
    progressRing: $('#progressRing'),
    progressPercent: $('#progressPercent'),
    progressBar: $('#progressBar'),
    doneCount: $('#doneCount'),
    totalCount: $('#totalCount'),
    toastHost: $('#toastHost'),
    srStatus: $('#srStatus'),
    fxCanvas: $('#fxCanvas'),
    taskCard: $('.task-card'),
    bulbBar: $('#bulbBar')
  };

  const reelTracks = el.reels.map(function (reel) {
    return $('.reel-track', reel);
  });
  const visibleByReel = [];
  const currentCenterIndex = [2, 2, 2];
  let spinning = false;
  let forcedTier = null;
  let lastQuote = '';
  let resizeTimer = 0;
  let resizedWhileSpinning = false;

  /* ========== 基础 UI ========== */
  function formatNumber(n) {
    return Math.max(0, Math.round(Number(n) || 0)).toLocaleString('zh-CN');
  }

  function animateNumber(node, target) {
    if (!node) return;
    const to = Math.max(0, Math.round(Number(target) || 0));
    const from = Number(node.dataset.value || 0);
    node.dataset.value = String(to);
    if (node._countRaf) cancelAnimationFrame(node._countRaf);
    if (prefersReducedMotion || from === to) {
      node.textContent = formatNumber(to);
      return;
    }
    const started = performance.now();
    const duration = 580;
    const tick = function (now) {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (to - from) * eased);
      node.textContent = formatNumber(value);
      if (progress < 1) {
        node._countRaf = requestAnimationFrame(tick);
      } else {
        node._countRaf = null;
      }
    };
    node._countRaf = requestAnimationFrame(tick);
  }

  function showToast(message, tone, duration) {
    if (!el.toastHost) return;
    const toast = document.createElement('div');
    toast.className = 'toast' + (tone ? ' is-' + tone : '');
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);
    el.toastHost.appendChild(toast);
    while (el.toastHost.children.length > 3) {
      el.toastHost.removeChild(el.toastHost.firstElementChild);
    }
    requestAnimationFrame(function () {
      toast.classList.add('is-show');
    });
    window.setTimeout(function () {
      toast.classList.remove('is-show');
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 280);
    }, duration || 2700);
  }

  function announce(message) {
    if (!el.srStatus) return;
    el.srStatus.textContent = '';
    window.setTimeout(function () {
      el.srStatus.textContent = message;
    }, 40);
  }

  function renderDate() {
    el.todayDate.textContent = formatToday();
  }

  function renderBulbs() {
    const count = 15;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const bulb = document.createElement('span');
      bulb.className = 'bulb';
      bulb.style.animationDelay = (-(i * 0.19)).toFixed(2) + 's';
      fragment.appendChild(bulb);
    }
    el.bulbBar.appendChild(fragment);
  }

  function renderSoundToggle() {
    const on = !!state.sound;
    el.soundToggle.classList.toggle('is-muted', !on);
    el.soundToggle.setAttribute('aria-pressed', String(on));
    el.soundToggle.setAttribute('aria-label', on ? '关闭音效' : '开启音效');
    el.soundToggle.title = on ? '音效已开启，点击关闭' : '音效已关闭，点击开启';
  }

  function renderHeaderStats() {
    el.streakDays.textContent = String(calcStreak());
    animateNumber(el.totalStars, state.totalStars);
  }

  function renderTickets(bump) {
    el.ticketCount.textContent = String(state.tickets);
    el.ticketBox.setAttribute('aria-label', '摇奖券余额：' + state.tickets + ' 张');
    el.spinBtn.setAttribute(
      'aria-label',
      state.tickets > 0 ? '摇一摇，当前有 ' + state.tickets + ' 张摇奖券' : '摇一摇，当前没有摇奖券'
    );
    if (bump) {
      el.ticketBox.classList.remove('is-bump');
      void el.ticketBox.offsetWidth;
      el.ticketBox.classList.add('is-bump');
    }
  }

  function renderSpinCounter() {
    el.todaySpins.textContent = String(state.spins);
  }

  function renderProgress() {
    const total = state.tasks.length;
    const done = state.tasks.filter(function (task) { return task.done; }).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    el.doneCount.textContent = String(done);
    el.totalCount.textContent = String(total);
    el.progressPercent.textContent = percent + '%';
    el.progressRing.style.setProperty('--pct', String(percent));
    el.progressRing.setAttribute('aria-label', '今日任务完成度 ' + percent + '%');
    el.progressBar.style.width = percent + '%';
    el.clearDoneBtn.disabled = done === 0;
  }

  function makeMetaItem(text, className) {
    const span = document.createElement('span');
    if (className) span.className = className;
    span.textContent = text;
    return span;
  }

  function makeDot() {
    const dot = document.createElement('span');
    dot.className = 'meta-dot';
    dot.setAttribute('aria-hidden', 'true');
    return dot;
  }

  function buildTaskItem(task) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' is-done' : '');
    li.dataset.id = task.id;

    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'task-check';
    check.dataset.action = 'toggle';
    check.setAttribute('aria-pressed', String(task.done));
    check.setAttribute(
      'aria-label',
      (task.done ? '标记为未完成：' : '标记为完成：') + task.text
    );
    check.textContent = '✓';

    const body = document.createElement('div');
    body.className = 'task-body';
    const text = document.createElement('p');
    text.className = 'task-text';
    text.textContent = task.text;
    body.appendChild(text);

    const meta = document.createElement('p');
    meta.className = 'task-meta';
    if (task.done) {
      const time = formatTime(task.completedAt);
      meta.appendChild(makeMetaItem(time ? '完成于 ' + time : '已完成'));
      meta.appendChild(makeDot());
      meta.appendChild(makeMetaItem(task.rewarded ? '奖励已领取' : '等一张摇奖券', 'reward-tag'));
    } else {
      meta.appendChild(makeMetaItem(task.rewarded ? '再次完成' : '完成后'));
      meta.appendChild(makeMetaItem(task.rewarded ? '奖励已领取' : '+1 张摇奖券', 'reward-tag'));
      meta.appendChild(makeDot());
      meta.appendChild(makeMetaItem('+' + TASK_REWARD.stars + ' 灵感'));
      if (task.source === 'random') {
        meta.appendChild(makeDot());
        meta.appendChild(makeMetaItem('随机灵感'));
      }
    }
    body.appendChild(meta);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'task-remove';
    remove.dataset.action = 'remove';
    remove.setAttribute('aria-label', '删除任务：' + task.text);
    remove.title = '删除这条任务';
    remove.textContent = '×';

    li.appendChild(check);
    li.appendChild(body);
    li.appendChild(remove);
    return li;
  }

  function renderTasks(options) {
    const opts = options || {};
    const scrollTop = typeof opts.scrollTop === 'number' ? opts.scrollTop : el.taskListWrap.scrollTop;
    while (el.taskList.firstChild) el.taskList.removeChild(el.taskList.firstChild);
    state.tasks.forEach(function (task) {
      el.taskList.appendChild(buildTaskItem(task));
    });
    el.emptyState.hidden = state.tasks.length > 0;
    el.taskListWrap.scrollTop = scrollTop;

    if (opts.newTaskId) {
      const created = Array.prototype.find.call(el.taskList.children, function (node) {
        return node.dataset.id === opts.newTaskId;
      });
      if (created) {
        created.classList.add('is-new');
        el.taskListWrap.scrollTop = 0;
      }
    }
    if (opts.focusTaskId) {
      const row = Array.prototype.find.call(el.taskList.children, function (node) {
        return node.dataset.id === opts.focusTaskId;
      });
      const focusNode = row ? $('.task-check', row) : null;
      if (focusNode) focusNode.focus({ preventScroll: true });
    }
    renderProgress();
  }

  function setResultCard(kicker, text, hint, reward, classes) {
    const preserved = ['result-card'].concat(classes || []).join(' ');
    el.resultCard.className = preserved;
    el.resultKicker.textContent = kicker;
    el.resultText.textContent = text;
    el.resultHint.textContent = hint;
    el.resultReward.textContent = reward || '';
    el.resultCard.classList.remove('is-pop');
    void el.resultCard.offsetWidth;
    el.resultCard.classList.add('is-pop');
  }

  function resetResultCard() {
    el.resultCard.className = 'result-card';
    el.resultKicker.textContent = DEFAULT_RESULT.kicker;
    el.resultText.textContent = DEFAULT_RESULT.text;
    el.resultHint.textContent = DEFAULT_RESULT.hint;
    el.resultReward.textContent = '';
    clearMatches();
  }

  /* ========== 老虎机轮子 ========== */
  function weightedSymbolId() {
    const total = SYMBOL_IDS.reduce(function (sum, id) {
      return sum + (DISPLAY_WEIGHTS[id] || 1);
    }, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < SYMBOL_IDS.length; i += 1) {
      roll -= DISPLAY_WEIGHTS[SYMBOL_IDS[i]] || 1;
      if (roll <= 0) return SYMBOL_IDS[i];
    }
    return 'cherry';
  }

  function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function makeSymbolCell(id) {
    const symbol = SYMBOLS[id] || SYMBOLS.cherry;
    const cell = document.createElement('div');
    cell.className = 'reel-cell';
    const glyph = document.createElement('span');
    glyph.className = 'symbol ' + symbol.className;
    glyph.textContent = symbol.glyph;
    glyph.setAttribute('aria-hidden', 'true');
    cell.appendChild(glyph);
    return cell;
  }

  function renderTape(track, ids) {
    const fragment = document.createDocumentFragment();
    ids.forEach(function (id) {
      fragment.appendChild(makeSymbolCell(id));
    });
    while (track.firstChild) track.removeChild(track.firstChild);
    track.appendChild(fragment);
  }

  function measureCellHeight(reel) {
    const first = reel.querySelector('.reel-cell');
    if (first) {
      const height = first.getBoundingClientRect().height;
      if (height > 0) return height;
    }
    const raw = window.getComputedStyle(reel).getPropertyValue('--tile-h');
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 78;
  }

  function setReelAria(index, centerId) {
    const symbol = SYMBOLS[centerId] || SYMBOLS.cherry;
    el.reels[index].setAttribute('aria-label', '第 ' + (index + 1) + ' 个转轮，中间是' + symbol.name);
  }

  function initReels() {
    const centers = ['seven', 'cherry', 'grape'];
    el.reels.forEach(function (reel, index) {
      const center = centers[index];
      const others = shuffle(SYMBOL_IDS.filter(function (id) { return id !== center; }));
      const top = others[0];
      const bottom = others[1];
      const ids = [];
      for (let i = 0; i < 8; i += 1) ids.push(weightedSymbolId());
      ids[1] = top;
      ids[2] = center;
      ids[3] = bottom;
      renderTape(reelTracks[index], ids);
      visibleByReel[index] = { top: top, center: center, bottom: bottom };
      currentCenterIndex[index] = 2;
      setReelAria(index, center);
    });
    layoutReelsAtRest();
  }

  function layoutReelsAtRest() {
    el.reels.forEach(function (reel, index) {
      const height = measureCellHeight(reel);
      const centerIndex = currentCenterIndex[index] || 2;
      reelTracks[index].style.transform = 'translate3d(0, ' + (-(centerIndex - 1) * height) + 'px, 0)';
    });
  }

  function clearMatches() {
    el.reelWindow.classList.remove('is-win');
    $$('.reel-cell.is-match', el.reelWindow).forEach(function (cell) {
      cell.classList.remove('is-match');
    });
  }

  function markMatches(matchedIndices) {
    clearMatches();
    if (!matchedIndices || !matchedIndices.length) return;
    el.reelWindow.classList.add('is-win');
    matchedIndices.forEach(function (reelIndex) {
      const track = reelTracks[reelIndex];
      const cell = track.children[currentCenterIndex[reelIndex]];
      if (cell) cell.classList.add('is-match');
    });
  }

  function prepareSpin(outcome) {
    const specs = [];
    el.reels.forEach(function (reel, index) {
      const previous = visibleByReel[index] || {
        top: weightedSymbolId(),
        center: 'cherry',
        bottom: weightedSymbolId()
      };
      const targetIndex = 32 + index * 4;
      const tapeLength = targetIndex + 8;
      const ids = [];
      for (let i = 0; i < tapeLength; i += 1) ids.push(weightedSymbolId());
      ids[1] = previous.top;
      ids[2] = previous.center;
      ids[3] = previous.bottom;
      ids[targetIndex - 1] = weightedSymbolId();
      ids[targetIndex] = outcome.centers[index];
      ids[targetIndex + 1] = weightedSymbolId();

      renderTape(reelTracks[index], ids);
      const cellHeight = measureCellHeight(reel);
      const startY = -cellHeight;
      const endY = -(targetIndex - 1) * cellHeight;
      reelTracks[index].style.transform = 'translate3d(0, ' + startY + 'px, 0)';
      visibleByReel[index] = {
        top: ids[targetIndex - 1],
        center: outcome.centers[index],
        bottom: ids[targetIndex + 1]
      };
      currentCenterIndex[index] = targetIndex;
      reel.classList.add('is-spinning');
      specs.push({
        index: index,
        track: reelTracks[index],
        reel: reel,
        cellHeight: cellHeight,
        startY: startY,
        endY: endY,
        lastCell: 1,
        done: false,
        targetIndex: targetIndex
      });
      setReelAria(index, outcome.centers[index]);
    });
    return specs;
  }

  function smootherStep(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function finishReel(spec) {
    spec.done = true;
    spec.track.style.transform = 'translate3d(0, ' + spec.endY + 'px, 0)';
    spec.reel.classList.remove('is-spinning');
    audio.reelStop(spec.index);
    if (!prefersReducedMotion && typeof spec.reel.animate === 'function') {
      spec.reel.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(2.5px)' },
          { transform: 'translateY(0)' }
        ],
        { duration: 230, easing: 'ease-out' }
      );
    }
  }

  function animateReels(outcome) {
    const specs = prepareSpin(outcome);
    const slow = prefersReducedMotion;
    const durations = slow ? [850, 1050, 1250] : [2150, 2550, 2950];
    specs.forEach(function (spec, index) {
      spec.duration = durations[index];
    });

    return new Promise(function (resolve) {
      const started = performance.now();
      function frame(now) {
        let allDone = true;
        for (let i = 0; i < specs.length; i += 1) {
          const spec = specs[i];
          if (spec.done) continue;
          const elapsed = now - started;
          const ratio = clamp(elapsed / spec.duration, 0, 1);
          const eased = smootherStep(ratio);
          const y = spec.startY + (spec.endY - spec.startY) * eased;
          spec.track.style.transform = 'translate3d(0, ' + y.toFixed(2) + 'px, 0)';
          const cell = Math.floor(-y / spec.cellHeight);
          if (cell !== spec.lastCell) {
            spec.lastCell = cell;
            audio.tick();
          }
          if (ratio >= 1) {
            finishReel(spec);
          } else {
            allDone = false;
          }
        }
        if (allDone) {
          resolve(specs);
        } else {
          requestAnimationFrame(frame);
        }
      }
      requestAnimationFrame(frame);
    });
  }

  /* ========== 结果生成 ========== */
  function chooseTier() {
    if (forcedTier && TIERS[forcedTier]) {
      const forced = forcedTier;
      forcedTier = null;
      return forced;
    }
    const total = TIER_WEIGHTS.reduce(function (sum, item) { return sum + item.weight; }, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < TIER_WEIGHTS.length; i += 1) {
      roll -= TIER_WEIGHTS[i].weight;
      if (roll <= 0) return TIER_WEIGHTS[i].tier;
    }
    return 'none';
  }

  function makeCenters(tier) {
    if (tier === 'jackpot') return ['seven', 'seven', 'seven'];
    if (tier === 'starTriple') return ['star', 'star', 'star'];
    if (tier === 'fruitTriple') {
      const fruit = pickRandom(FRUIT_IDS);
      return [fruit, fruit, fruit];
    }
    if (tier === 'pairSeven') {
      const other = pickRandom(NON_SEVEN_IDS);
      return shuffle(['seven', 'seven', other]);
    }
    if (tier === 'pair') {
      const pair = pickRandom(NON_SEVEN_IDS);
      const other = pickRandom(SYMBOL_IDS.filter(function (id) { return id !== pair; }));
      return shuffle([pair, pair, other]);
    }
    if (tier === 'seven') {
      const others = shuffle(NON_SEVEN_IDS).slice(0, 2);
      return shuffle(['seven'].concat(others));
    }
    return shuffle(NON_SEVEN_IDS).slice(0, 3);
  }

  function matchedIndices(centers) {
    const count = {};
    centers.forEach(function (id) {
      count[id] = (count[id] || 0) + 1;
    });
    const matched = [];
    centers.forEach(function (id, index) {
      if (count[id] >= 2) matched.push(index);
    });
    return matched;
  }

  function pickQuote(quotes) {
    let quote = quotes[Math.floor(Math.random() * quotes.length)];
    if (quotes.length > 1 && quote === lastQuote) {
      const alternatives = quotes.filter(function (item) { return item !== quote; });
      quote = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    lastQuote = quote;
    return quote;
  }

  function buildOutcome(tier) {
    const key = TIERS[tier] ? tier : 'none';
    const def = TIERS[key];
    const centers = makeCenters(key);
    let matched = [];
    if (key === 'seven') {
      matched = [centers.indexOf('seven')].filter(function (index) { return index >= 0; });
    } else if (key !== 'none') {
      matched = matchedIndices(centers);
    }
    return {
      tier: key,
      key: key,
      kicker: def.kicker,
      stars: def.stars,
      bonusTickets: def.bonusTickets,
      win: def.win,
      sound: def.sound,
      quotes: def.quotes,
      quote: pickQuote(def.quotes),
      hint: def.hint,
      centers: centers,
      matched: matched
    };
  }

  function applyOutcome(outcome) {
    markMatches(outcome.matched);
    if (outcome.stars > 0) state.totalStars += outcome.stars;
    if (outcome.bonusTickets > 0) {
      state.tickets = clamp(state.tickets + outcome.bonusTickets, 0, MAX_TICKETS);
    }
    bumpHistory('spins', 1);

    const classes = outcome.win ? ['is-win'] : ['is-none'];
    if (outcome.tier === 'jackpot') classes.push('is-jackpot');
    const rewardText = '+' + outcome.stars + ' 灵感';

    el.resultCard.className = 'result-card ' + classes.join(' ');
    el.resultKicker.textContent = outcome.kicker;
    el.resultText.textContent = outcome.quote;
    el.resultHint.textContent = outcome.hint;
    el.resultReward.textContent = rewardText;
    el.resultCard.classList.remove('is-pop');
    void el.resultCard.offsetWidth;
    el.resultCard.classList.add('is-pop');

    renderTickets(outcome.bonusTickets > 0);
    renderHeaderStats();

    if (outcome.bonusTickets > 0) {
      window.setTimeout(function () {
        showToast('额外获得 ' + outcome.bonusTickets + ' 张摇奖券！', 'win', 3200);
      }, 500);
    }

    const sound = {
      jackpot: function () { audio.jackpot(); },
      bigWin: function () { audio.bigWin(); },
      smallWin: function () { audio.smallWin(); },
      noWin: function () { audio.noWin(); }
    }[outcome.sound];
    if (sound) sound();

    celebrate(outcome);
    announce('摇奖结果：' + outcome.kicker.replace('✦ ', '') + '，获得 ' + outcome.stars + ' 颗灵感星。');
    saveState();
  }

  function loadingQuote() {
    const quotes = [
      '三个轮子正在替今天挑一句好运……',
      '正在把努力换算成一点点甜。',
      '转轮有自己的节奏，再等它一小会儿。',
      '好运正在排列组合，马上就好。'
    ];
    return pickQuote(quotes);
  }

  /* ========== 摇奖主流程 ========== */
  function setSpinBusy(busy) {
    el.spinBtn.classList.toggle('is-spinning', busy);
    el.spinBtn.setAttribute('aria-busy', String(busy));
    el.spinTitle.textContent = busy ? '好运转动中' : '摇一摇';
    el.spinSub.textContent = busy ? 'GOOD LUCK' : 'SPIN FOR LUCK';
    el.cabinet.classList.toggle('is-working', busy);
  }

  function startSpin() {
    if (spinning) return;
    ensureToday(true);
    if (state.tickets <= 0) {
      audio.error();
      showToast('摇奖券用完了。先完成一个今日任务，就能再摇一次。', 'warn', 3600);
      if (window.innerWidth <= 1180) {
        el.taskCard.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      }
      el.ticketBox.classList.remove('is-bump');
      void el.ticketBox.offsetWidth;
      el.ticketBox.classList.add('is-bump');
      return;
    }

    audio.unlock();
    spinning = true;
    state.tickets -= 1;
    state.spins += 1;
    renderTickets();
    renderSpinCounter();
    setSpinBusy(true);
    clearMatches();

    el.resultCard.className = 'result-card is-spinning';
    el.resultKicker.textContent = 'FORTUNE IN MOTION';
    el.resultText.textContent = loadingQuote();
    el.resultHint.textContent = '慢一点，好的事情值得等三秒。';
    el.resultReward.textContent = '';
    audio.spinStart();

    const outcome = buildOutcome(chooseTier());
    const waitAfter = prefersReducedMotion ? 60 : 180;

    const finishSpinState = function () {
      spinning = false;
      setSpinBusy(false);
      renderTickets();
      if (resizedWhileSpinning) {
        resizedWhileSpinning = false;
        layoutReelsAtRest();
      }
      saveState();
    };

    animateReels(outcome)
      .catch(function (err) {
        // 极端情况下也不要卡死按钮；直接展示结果。
        if (window.console && console.error) console.error(err);
        el.reels.forEach(function (reel) { reel.classList.remove('is-spinning'); });
        return null;
      })
      .then(function () {
        return new Promise(function (resolve) {
          window.setTimeout(resolve, waitAfter);
        });
      })
      .then(function () {
        applyOutcome(outcome);
      })
      .then(finishSpinState, function (err) {
        if (window.console && console.error) console.error(err);
        finishSpinState();
      });
  }

  /* ========== 任务增删改 ========== */
  function normalizedTaskText(text) {
    return Array.from(String(text || '').replace(/\s+/g, ' ').trim()).slice(0, 60).join('');
  }

  function findDuplicate(text) {
    const norm = text.toLocaleLowerCase('zh-CN');
    return state.tasks.find(function (task) {
      return task.text.toLocaleLowerCase('zh-CN') === norm;
    });
  }

  function shakeInput() {
    el.inputShell.classList.remove('is-shaking');
    void el.inputShell.offsetWidth;
    el.inputShell.classList.add('is-shaking');
    window.setTimeout(function () {
      el.inputShell.classList.remove('is-shaking');
    }, 400);
  }

  function addTask(rawText, source, options) {
    const opts = options || {};
    const text = normalizedTaskText(rawText);
    if (!text) {
      audio.error();
      shakeInput();
      showToast('先写下一件小事吧，哪怕只是读一页书。', 'warn');
      if (!opts.silentFocus) el.taskInput.focus({ preventScroll: true });
      return false;
    }
    if (findDuplicate(text)) {
      audio.error();
      shakeInput();
      showToast('这条任务已经在清单里啦。', 'warn');
      if (!opts.silentFocus) el.taskInput.focus({ preventScroll: true });
      return false;
    }

    const task = {
      id: uid(),
      text: text,
      done: false,
      rewarded: false,
      createdAt: Date.now(),
      completedAt: null,
      source: source || 'custom'
    };
    state.tasks.unshift(task);
    saveState();
    renderTasks({ newTaskId: task.id, scrollTop: 0 });
    audio.ui();
    showToast('已加入今日清单。完成它，就能摇一次。');
    if (opts.clearInput) {
      el.taskInput.value = '';
      if (!opts.silentFocus) el.taskInput.focus({ preventScroll: true });
    }
    announce('已添加任务：' + text);
    return true;
  }

  function addRandomTask() {
    const existing = new Set(state.tasks.map(function (task) {
      return task.text.toLocaleLowerCase('zh-CN');
    }));
    const candidates = RANDOM_TASKS.filter(function (text) {
      return !existing.has(text.toLocaleLowerCase('zh-CN'));
    });
    if (!candidates.length) {
      audio.error();
      showToast('灵感池被搬空啦，试着自己写一件小事吧。', 'warn', 3200);
      return;
    }
    const chosen = pickRandom(candidates);
    addTask(chosen, 'random', { silentFocus: true });
  }

  function toggleTask(id) {
    const task = state.tasks.find(function (item) { return item.id === id; });
    if (!task) return;
    const scrollTop = el.taskListWrap.scrollTop;
    const previouslyDone = task.done;

    if (!task.done) {
      task.done = true;
      task.completedAt = Date.now();
      let newlyRewarded = false;
      if (!task.rewarded) {
        task.rewarded = true;
        state.tickets = clamp(state.tickets + TASK_REWARD.tickets, 0, MAX_TICKETS);
        state.totalStars += TASK_REWARD.stars;
        bumpHistory('completed', 1);
        newlyRewarded = true;
      }
      saveState();
      renderTasks({ scrollTop: scrollTop, focusTaskId: task.id });
      renderTickets(newlyRewarded);
      renderHeaderStats();

      const checkNode = el.taskList.querySelector('.task-item[data-id="' + task.id + '"] .task-check');
      const rect = checkNode ? checkNode.getBoundingClientRect() : null;
      audio.taskDone();
      if (rect) {
        burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, {
          count: prefersReducedMotion ? 0 : 34,
          power: 5.8,
          spread: Math.PI * 2,
          lift: 2.2,
          size: 5
        });
      }
      if (newlyRewarded) {
        setResultCard(
          '✦ TASK CLEARED · 又完成一件',
          '「' + (task.text.length > 34 ? task.text.slice(0, 34) + '…' : task.text) + '」完成了。每一次认真，都是在给未来的自己攒底气。',
          '去摇一摇，把这份努力变成好运。',
          '+1 张摇奖券 · +' + TASK_REWARD.stars + ' 灵感',
          ['is-task']
        );
        showToast('完成啦！+1 张摇奖券 · +' + TASK_REWARD.stars + ' 颗灵感星', 'win', 3200);
        announce('任务完成：' + task.text + '。获得一张摇奖券和 ' + TASK_REWARD.stars + ' 颗灵感星。');
      } else {
        setResultCard(
          '✦ TASK AGAIN · 又向前一步',
          '「' + (task.text.length > 34 ? task.text.slice(0, 34) + '…' : task.text) + '」又完成了一次。奖励之前已经领过，但认真不会白费。',
          '每一次重新开始，都算数。',
          '奖励已领取',
          ['is-task']
        );
        showToast('又完成了一次。之前已经领过奖励，但这份认真依旧算数。', 'info', 3000);
        announce('任务再次完成：' + task.text + '。奖励已领取。');
      }
    } else {
      task.done = false;
      task.completedAt = null;
      saveState();
      renderTasks({ scrollTop: scrollTop, focusTaskId: task.id });
      showToast(previouslyDone ? '已放回清单。奖励不会重复发放哦。' : '已放回清单。');
      audio.ui();
    }
    if (previouslyDone) renderProgress();
  }

  function removeTask(id) {
    const index = state.tasks.findIndex(function (item) { return item.id === id; });
    if (index < 0) return;
    const scrollTop = el.taskListWrap.scrollTop;
    state.tasks.splice(index, 1);
    saveState();
    renderTasks({ scrollTop: scrollTop });
    renderTickets();
    audio.ui();
    showToast('任务已删除。');
  }

  function clearDoneTasks() {
    const doneCount = state.tasks.filter(function (task) { return task.done; }).length;
    if (!doneCount) return;
    state.tasks = state.tasks.filter(function (task) { return !task.done; });
    saveState();
    renderTasks({ scrollTop: 0 });
    audio.ui();
    showToast('已清理 ' + doneCount + ' 条完成记录。');
    el.clearDoneBtn.blur();
  }

  /* ========== 音效开关 ========== */
  function toggleSound() {
    state.sound = !state.sound;
    audio.setEnabled(state.sound);
    renderSoundToggle();
    saveState();
    if (state.sound) {
      audio.toggleOn();
      showToast('音效已开启，摇起来更带感。');
    } else {
      showToast('音效已关闭。');
    }
  }

  /* ========== 彩纸特效 ========== */
  const fx = {
    canvas: el.fxCanvas,
    ctx: null,
    dpr: 1,
    particles: [],
    running: false,
    lastFrame: 0
  };

  function setupFx() {
    if (!fx.canvas) return;
    fx.ctx = fx.canvas.getContext('2d');
    resizeFx();
    window.addEventListener('resize', resizeFx);
  }

  function resizeFx() {
    if (!fx.canvas || !fx.ctx) return;
    fx.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    fx.canvas.width = Math.floor(width * fx.dpr);
    fx.canvas.height = Math.floor(height * fx.dpr);
    fx.ctx.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0);
  }

  const CONFETTI_COLORS = ['#ffd267', '#ffe9ab', '#ff7685', '#ff9e5b', '#75deca', '#f7f0df', '#e4a4ff'];

  function burstAt(x, y, options) {
    if (!fx.ctx || prefersReducedMotion) return;
    const opts = options || {};
    const count = opts.count == null ? 30 : opts.count;
    if (count <= 0) return;
    const power = opts.power || 7;
    const spread = opts.spread == null ? Math.PI * 2 : opts.spread;
    const angle = opts.angle == null ? -Math.PI / 2 : opts.angle;
    const lift = opts.lift || 0;
    const size = opts.size || 6;
    for (let i = 0; i < count; i += 1) {
      const theta = angle + (Math.random() - 0.5) * spread;
      const speed = power * (0.35 + Math.random() * 0.85);
      fx.particles.push({
        x: x,
        y: y,
        vx: Math.cos(theta) * speed,
        vy: Math.sin(theta) * speed - lift,
        gravity: 0.128 + Math.random() * 0.06,
        drag: 0.993,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.32,
        size: size * (0.55 + Math.random() * 0.9),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        shape: Math.random() > 0.32 ? 'rect' : 'circle',
        age: 0,
        ttl: 100 + Math.random() * 70
      });
    }
    if (!fx.running) {
      fx.running = true;
      fx.lastFrame = performance.now();
      requestAnimationFrame(fxFrame);
    }
  }

  function fxFrame(now) {
    if (!fx.ctx) {
      fx.running = false;
      return;
    }
    const delta = Math.min(32, now - fx.lastFrame) / 16.67;
    fx.lastFrame = now;
    const width = window.innerWidth;
    const height = window.innerHeight;
    fx.ctx.clearRect(0, 0, width, height);
    for (let i = fx.particles.length - 1; i >= 0; i -= 1) {
      const p = fx.particles[i];
      p.age += delta;
      if (p.age > p.ttl) {
        fx.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * delta;
      p.vx *= Math.pow(p.drag, delta);
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.rot += p.vrot * delta;
      const alpha = Math.max(0, 1 - p.age / p.ttl);
      fx.ctx.save();
      fx.ctx.globalAlpha = alpha;
      fx.ctx.translate(p.x, p.y);
      fx.ctx.rotate(p.rot);
      fx.ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        fx.ctx.beginPath();
        fx.ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        fx.ctx.fill();
      } else {
        fx.ctx.fillRect(-p.size * 0.5, -p.size * 0.28, p.size, p.size * 0.56);
      }
      fx.ctx.restore();
    }
    fx.ctx.globalAlpha = 1;
    if (fx.particles.length) {
      requestAnimationFrame(fxFrame);
    } else {
      fx.ctx.clearRect(0, 0, width, height);
      fx.running = false;
    }
  }

  function celebrate(outcome) {
    if (prefersReducedMotion) return;
    if (outcome.tier === 'jackpot') {
      const width = window.innerWidth;
      const height = window.innerHeight;
      burstAt(width * 0.5, height * 0.34, { count: 120, power: 10.5, spread: Math.PI * 2, lift: 2, size: 7 });
      window.setTimeout(function () {
        burstAt(0, height * 0.85, { count: 60, power: 12, angle: -Math.PI / 3.2, spread: 0.7, lift: 5, size: 7 });
        burstAt(width, height * 0.85, { count: 60, power: 12, angle: -Math.PI + Math.PI / 3.2, spread: 0.7, lift: 5, size: 7 });
      }, 90);
      window.setTimeout(function () {
        burstAt(width * 0.5, height * 0.46, { count: 45, power: 7, spread: Math.PI * 2, size: 5 });
      }, 380);
      return;
    }
    if (outcome.win) {
      const rect = el.reelWindow.getBoundingClientRect();
      const big = outcome.tier === 'starTriple' || outcome.tier === 'fruitTriple';
      burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, {
        count: big ? 78 : 36,
        power: big ? 8.5 : 6,
        spread: Math.PI * 2,
        lift: 1.4,
        size: big ? 6 : 4.8
      });
    }
  }

  /* ========== 事件绑定 ========== */
  function bindEvents() {
    el.taskForm.addEventListener('submit', function (event) {
      event.preventDefault();
      addTask(el.taskInput.value, 'custom', { clearInput: true });
    });

    el.randomBtn.addEventListener('click', function () {
      if (el.randomBtn.disabled) return;
      el.randomBtn.disabled = true;
      el.randomBtn.classList.remove('is-rolling');
      void el.randomBtn.offsetWidth;
      el.randomBtn.classList.add('is-rolling');
      audio.unlock();
      audio.click(0.012);
      window.setTimeout(function () {
        el.randomBtn.classList.remove('is-rolling');
        addRandomTask();
        el.randomBtn.disabled = false;
      }, 300);
    });

    $$('.idea-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        addTask(chip.dataset.idea || '', 'idea', { silentFocus: true });
      });
    });

    el.taskList.addEventListener('click', function (event) {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const row = button.closest('.task-item');
      if (!row) return;
      const id = row.dataset.id;
      if (button.dataset.action === 'toggle') toggleTask(id);
      if (button.dataset.action === 'remove') removeTask(id);
    });

    el.clearDoneBtn.addEventListener('click', clearDoneTasks);

    el.spinBtn.addEventListener('click', function () {
      audio.unlock();
      startSpin();
    });

    el.soundToggle.addEventListener('click', toggleSound);

    document.addEventListener('keydown', function (event) {
      if (event.code !== 'Space' && event.key !== ' ') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      const tag = active ? active.tagName : '';
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag) || (active && active.isContentEditable)) {
        return;
      }
      event.preventDefault();
      startSpin();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        ensureToday(false);
      }
    });

    window.addEventListener('focus', function () {
      ensureToday(false);
    });

    window.setInterval(function () {
      if (!spinning) ensureToday(false);
    }, 60000);

    window.addEventListener('resize', function () {
      if (spinning) resizedWhileSpinning = true;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (!spinning) layoutReelsAtRest();
      }, 120);
    });

    window.addEventListener('orientationchange', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (!spinning) layoutReelsAtRest();
      }, 220);
    });

    document.addEventListener('pointerdown', function () {
      if (state.sound) audio.unlock();
    }, { once: true, passive: true });

    if (isAndroidApp) {
      document.body.classList.add('is-app');
      $$('a[href$=".apk"]').forEach(function (link) {
        link.hidden = true;
      });
      const footerNote = $('.site-footer p:last-child');
      if (footerNote) footerNote.textContent = '数据只保存在你的设备里 · 离线也能玩';
    }
  }

  /* ========== 启动 ========== */
  function setupDebugApi() {
    if (!isDebug) return;
    window.__luckyDebug = {
      forceTier: function (tier) {
        if (!TIERS[tier]) return false;
        forcedTier = tier;
        return true;
      },
      setTickets: function (count) {
        state.tickets = clamp(Number(count) || 0, 0, MAX_TICKETS);
        renderTickets();
        saveState();
        return state.tickets;
      },
      resetToday: function () {
        state.date = dateKey();
        state.tasks = [];
        state.tickets = START_TICKETS;
        state.spins = 0;
        saveState();
        renderDate();
        renderTasks({ scrollTop: 0 });
        renderTickets();
        renderSpinCounter();
        renderHeaderStats();
        resetResultCard();
      },
      getState: function () {
        return JSON.parse(JSON.stringify(state));
      },
      spin: startSpin
    };
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {
        /* 离线缓存不可用不影响主流程 */
      });
    });
  }

  function init() {
    renderBulbs();
    renderDate();
    renderSoundToggle();
    renderHeaderStats();
    renderTickets();
    renderSpinCounter();
    initReels();
    renderTasks({ scrollTop: 0 });
    bindEvents();
    setupFx();
    setupDebugApi();
    registerServiceWorker();
    saveState();

    window.requestAnimationFrame(function () {
      layoutReelsAtRest();
    });

    if (loadedWithNewDay) {
      window.setTimeout(function () {
        showToast('新的一天到啦，5 张摇奖券已经到账。', 'win', 3200);
      }, 700);
    }
  }

  init();
})();
