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

  const APP_VERSION = '1.1.0';
  const APP_VERSION_CODE = 2;
  const UPDATE_PAGE_URL = 'https://wangji330330-ops.github.io/115/';
  const FALLBACK_RELEASE_NOTES = [
    '修复安卓版启动闪退，应用现在可以正常打开',
    '新增右上角设置：安装、数据备份与恢复、保存位置',
    '新增应用内检查更新，下载完成后直接调起系统安装器',
    '新增版本号、更新内容和检查更新状态',
    '完善手机端设置面板与无障碍细节'
  ];

  const params = new URLSearchParams(window.location.search);
  const nativeApp = (function () {
    try {
      if (window.LuckyAndroid && typeof window.LuckyAndroid.getVersionName === 'function') {
        return window.LuckyAndroid;
      }
    } catch (err) {
      return null;
    }
    return null;
  })();
  const isAndroidApp = params.get('app') === '1' || !!nativeApp;
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
    bulbBar: $('#bulbBar'),
    pageShell: $('.page-shell'),
    settingsBtn: $('#settingsBtn'),
    settingsNewdot: $('#settingsNewdot'),
    settingsLayer: $('#settingsLayer'),
    settingsDrawer: $('#settingsDrawer'),
    settingsClose: $('#settingsClose'),
    settingsDoneBtn: $('#settingsDoneBtn'),
    currentVersionChip: $('#currentVersionChip'),
    settingsBuild: $('#settingsBuild'),
    updateTitle: $('#updateTitle'),
    updateMeta: $('#updateMeta'),
    updateBadge: $('#updateBadge'),
    releaseNotes: $('#releaseNotes'),
    updateProgress: $('#updateProgress'),
    updateProgressBar: $('#updateProgressBar'),
    updateProgressText: $('#updateProgressText'),
    checkUpdateBtn: $('#checkUpdateBtn'),
    installUpdateBtn: $('#installUpdateBtn'),
    updateNote: $('#updateNote'),
    installTitle: $('#installTitle'),
    installHint: $('#installHint'),
    pwaInstallBtn: $('#pwaInstallBtn'),
    settingsApkLink: $('#settingsApkLink'),
    exportBtn: $('#exportBtn'),
    importBtn: $('#importBtn'),
    importFile: $('#importFile'),
    savePathText: $('#savePathText'),
    savePathNote: $('#savePathNote'),
    choosePathBtn: $('#choosePathBtn'),
    clearDataBtn: $('#clearDataBtn'),
    confirmLayer: $('#confirmLayer'),
    confirmBox: $('#confirmBox'),
    confirmTitle: $('#confirmTitle'),
    confirmMessage: $('#confirmMessage'),
    confirmCancel: $('#confirmCancel'),
    confirmOk: $('#confirmOk')
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

  let appVersionName = APP_VERSION;
  let appVersionCode = APP_VERSION_CODE;
  let appPlatform = isAndroidApp ? 'android' : 'web';
  let deferredInstallPrompt = null;
  let settingsCloseTimer = 0;
  let updateInfo = null;
  let updatePhase = 'idle';
  let updateProgressValue = 0;
  let updateErrorText = '';
  let updateCheckedAt = 0;
  let updateCheckIsManual = false;
  let updateCheckTimer = 0;
  let autoUpdateAnnounced = 0;
  let pendingImportBackup = null;
  let confirmResolver = null;
  let confirmLastFocus = null;
  let settingsLastFocus = null;
  let exportBusy = false;

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

  /* ========== 设置 / 更新 / 数据备份 ========== */
  function callNative(method) {
    if (!nativeApp || typeof nativeApp[method] !== 'function') return undefined;
    try {
      return nativeApp[method].apply(nativeApp, Array.prototype.slice.call(arguments, 1));
    } catch (err) {
      return undefined;
    }
  }

  function initPlatformInfo() {
    if (nativeApp) {
      appPlatform = 'android';
      const nativeVersionName = callNative('getVersionName');
      if (typeof nativeVersionName === 'string' && nativeVersionName.trim()) {
        appVersionName = nativeVersionName.trim();
      }
      const nativeVersionCode = Number(callNative('getVersionCode'));
      if (Number.isFinite(nativeVersionCode) && nativeVersionCode > 0) {
        appVersionCode = Math.floor(nativeVersionCode);
      }
      document.body.classList.add('is-app');
      document.documentElement.dataset.platform = 'android';
      $$('a[href$=".apk"]').forEach(function (link) {
        link.hidden = true;
      });
      const footerNote = $('.site-footer p:last-child');
      if (footerNote) footerNote.textContent = '数据只保存在你的设备里 · 离线也能玩';
    } else if (isAndroidApp) {
      appPlatform = 'android';
      document.body.classList.add('is-app');
      document.documentElement.dataset.platform = 'android';
      $$('a[href$=".apk"]').forEach(function (link) {
        link.hidden = true;
      });
      const footerNote = $('.site-footer p:last-child');
      if (footerNote) footerNote.textContent = '数据只保存在你的设备里 · 离线也能玩';
    } else {
      appPlatform = 'web';
      document.documentElement.dataset.platform = 'web';
    }
    renderPlatformSections();
    renderUpdatePanel();
    refreshUpdateDot();
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || window.navigator.standalone === true;
  }

  function renderPlatformSections() {
    el.currentVersionChip.textContent = 'v' + appVersionName;
    el.settingsBuild.textContent = 'v' + appVersionName + ' · ' + (appPlatform === 'android' ? '安卓版' : '网页版');
    renderInstallSection();
    renderSavePath();
  }

  function renderInstallSection() {
    if (!el.installTitle) return;
    if (appPlatform === 'android') {
      el.installTitle.textContent = '已安装安卓版';
      el.installHint.textContent = '当前版本 v' + appVersionName + '，更新可在上方完成，不用再去文件管理器找安装包。';
      el.pwaInstallBtn.hidden = true;
      el.settingsApkLink.hidden = true;
      return;
    }

    el.settingsApkLink.hidden = false;
    if (isStandalone()) {
      el.installTitle.textContent = '已作为应用运行';
      el.installHint.textContent = '你现在打开的已经是主屏幕应用，记录会继续保存在本机。';
      el.pwaInstallBtn.hidden = true;
      return;
    }

    el.installTitle.textContent = deferredInstallPrompt ? '安装到主屏幕' : '安装网页版';
    el.installHint.textContent = deferredInstallPrompt
      ? '安装后可像普通 App 一样打开，核心页面离线也能用。'
      : '打开浏览器菜单，选择“添加到主屏幕”或“安装应用”。';
    el.pwaInstallBtn.textContent = deferredInstallPrompt ? '安装' : '方法';
    el.pwaInstallBtn.hidden = false;
  }

  function renderSavePath() {
    if (!el.savePathText) return;
    if (appPlatform === 'android' && nativeApp && typeof nativeApp.getSavePath === 'function') {
      const savedPath = callNative('getSavePath');
      el.savePathText.textContent = savedPath || '尚未选择 · 导出时会打开系统保存面板';
      el.savePathText.className = 'path-value';
      el.choosePathBtn.hidden = false;
      el.savePathNote.textContent = '导出的 JSON 会保存到所选文件夹；没有选择时会打开系统保存面板。';
    } else {
      el.savePathText.textContent = '浏览器自动管理，记录保存在本机站点数据中；导出文件会进入浏览器下载目录。';
      el.savePathText.className = '';
      el.choosePathBtn.hidden = true;
      el.savePathNote.textContent = '换设备或清理浏览器数据前，记得先导出一份备份。';
    }
  }

  function setReleaseNotes(notes) {
    if (!el.releaseNotes) return;
    while (el.releaseNotes.firstChild) el.releaseNotes.removeChild(el.releaseNotes.firstChild);
    const list = Array.isArray(notes) && notes.length ? notes : FALLBACK_RELEASE_NOTES;
    list.slice(0, 10).forEach(function (note) {
      const li = document.createElement('li');
      li.textContent = String(note);
      el.releaseNotes.appendChild(li);
    });
  }

  function formatVersion(v) {
    return 'v' + String(v || '').replace(/^v/i, '');
  }

  function setUpdateBadge(label, modifier) {
    el.updateBadge.textContent = label;
    el.updateBadge.className = 'update-badge' + (modifier ? ' is-' + modifier : '');
  }

  function checkedTimeLabel() {
    if (!updateCheckedAt) return '';
    return ' · 上次检查 ' + formatTime(updateCheckedAt);
  }

  function refreshUpdateDot() {
    const available = !!(updateInfo && Number(updateInfo.versionCode) > appVersionCode);
    el.settingsNewdot.hidden = !available;
    el.settingsBtn.setAttribute('aria-label', available ? '打开设置，有可用更新' : '打开设置');
    el.settingsBtn.title = available ? '设置 · 有可用更新' : '设置';
  }

  function setUpdateProgress(percent, text) {
    updateProgressValue = clamp(Number(percent) || 0, 0, 100);
    el.updateProgress.hidden = false;
    el.updateProgressBar.style.width = updateProgressValue + '%';
    el.updateProgressText.textContent = text || ('正在下载 ' + Math.round(updateProgressValue) + '%');
  }

  function renderUpdatePanel() {
    if (!el.updateTitle) return;
    el.currentVersionChip.textContent = 'v' + appVersionName;
    el.settingsBuild.textContent = 'v' + appVersionName + ' · ' + (appPlatform === 'android' ? '安卓版' : '网页版');
    el.updateProgress.hidden = true;
    el.installUpdateBtn.hidden = true;
    el.installUpdateBtn.disabled = false;
    el.checkUpdateBtn.disabled = false;
    el.checkUpdateBtn.textContent = '检查更新';
    el.updateBadge.className = 'update-badge';
    el.updateNote.textContent = appPlatform === 'android'
      ? '更新会在应用内下载并校验，之后调起系统安装器；Android 会再弹出一次安装确认，这是系统安全限制。'
      : '网页版刷新后会载入最新内容，离线缓存也会随之更新。';

    const available = !!(updateInfo && Number(updateInfo.versionCode) > appVersionCode);
    const latestName = updateInfo && updateInfo.versionName ? formatVersion(updateInfo.versionName) : '';

    switch (updatePhase) {
      case 'checking':
        el.updateTitle.textContent = '正在检查新版本…';
        el.updateMeta.textContent = '当前版本 ' + formatVersion(appVersionName);
        setUpdateBadge('检查中', '');
        el.checkUpdateBtn.disabled = true;
        el.checkUpdateBtn.textContent = '检查中…';
        setReleaseNotes(updateInfo ? updateInfo.notes : FALLBACK_RELEASE_NOTES);
        break;

      case 'available':
        el.updateTitle.textContent = '发现新版本 ' + latestName;
        el.updateMeta.textContent = '当前 ' + formatVersion(appVersionName) + ' → 最新 ' + latestName + checkedTimeLabel();
        setUpdateBadge('可更新', 'new');
        setReleaseNotes(updateInfo.notes);
        el.checkUpdateBtn.textContent = '重新检查';
        el.installUpdateBtn.hidden = false;
        el.installUpdateBtn.disabled = false;
        el.installUpdateBtn.textContent = appPlatform === 'android' ? '下载并安装' : '刷新到最新版';
        el.updateNote.textContent = appPlatform === 'android'
          ? '点一次按钮，应用内下载完成后会自动跳到系统安装界面，不需要离开应用去文件管理器找 APK。'
          : '刷新页面即可载入最新网页版本。';
        break;

      case 'downloading':
        el.updateTitle.textContent = '正在下载 ' + latestName;
        el.updateMeta.textContent = '应用内下载中，请保持应用在前台';
        setUpdateBadge('下载中', 'new');
        el.checkUpdateBtn.disabled = true;
        el.installUpdateBtn.hidden = false;
        el.installUpdateBtn.disabled = true;
        el.installUpdateBtn.textContent = '正在下载…';
        setReleaseNotes(updateInfo ? updateInfo.notes : FALLBACK_RELEASE_NOTES);
        setUpdateProgress(updateProgressValue, '已下载 ' + Math.round(updateProgressValue) + '%');
        el.updateNote.textContent = '下载完成后会自动校验安装包，并打开系统安装器。';
        break;

      case 'verifying':
        el.updateTitle.textContent = '正在校验安装包…';
        el.updateMeta.textContent = '校验通过后就会打开系统安装界面';
        setUpdateBadge('校验中', 'new');
        el.checkUpdateBtn.disabled = true;
        el.installUpdateBtn.hidden = false;
        el.installUpdateBtn.disabled = true;
        el.installUpdateBtn.textContent = '正在校验…';
        setReleaseNotes(updateInfo ? updateInfo.notes : FALLBACK_RELEASE_NOTES);
        setUpdateProgress(100, '完整性校验中…');
        break;

      case 'permission-needed':
        el.updateTitle.textContent = '需要安装权限';
        el.updateMeta.textContent = 'Android 要求允许一次“安装未知应用”';
        setUpdateBadge('待授权', 'new');
        setReleaseNotes(updateInfo ? updateInfo.notes : FALLBACK_RELEASE_NOTES);
        el.installUpdateBtn.hidden = false;
        el.installUpdateBtn.disabled = false;
        el.installUpdateBtn.textContent = '我已允许，继续';
        el.checkUpdateBtn.disabled = true;
        el.updateNote.textContent = '已在系统设置中打开“安装未知应用”页面。允许“幸运学习机”安装应用后，回到这里点“我已允许，继续”。';
        break;

      case 'installing':
        el.updateTitle.textContent = '正在打开系统安装器';
        el.updateMeta.textContent = '下载与校验已完成';
        setUpdateBadge('安装', 'new');
        el.checkUpdateBtn.disabled = true;
        el.installUpdateBtn.hidden = true;
        setReleaseNotes(updateInfo ? updateInfo.notes : FALLBACK_RELEASE_NOTES);
        setUpdateProgress(100, '请在系统弹窗里确认安装…');
        el.updateNote.textContent = '系统安装器已经打开，确认安装后新版本会覆盖旧版，学习记录会保留。';
        break;

      case 'latest':
        el.updateTitle.textContent = '已是最新版本';
        el.updateMeta.textContent = '当前 ' + formatVersion(appVersionName) + checkedTimeLabel();
        setUpdateBadge('最新', 'latest');
        setReleaseNotes(updateInfo ? updateInfo.notes : FALLBACK_RELEASE_NOTES);
        el.checkUpdateBtn.textContent = '重新检查';
        break;

      case 'error':
        el.updateTitle.textContent = '这次检查没有完成';
        el.updateMeta.textContent = '当前 ' + formatVersion(appVersionName);
        setUpdateBadge('失败', 'error');
        setReleaseNotes(updateInfo ? updateInfo.notes : FALLBACK_RELEASE_NOTES);
        el.updateNote.textContent = updateErrorText || '请检查网络后再试一次。';
        if (updateInfo && available && appPlatform === 'android') {
          el.installUpdateBtn.hidden = false;
          el.installUpdateBtn.disabled = false;
          el.installUpdateBtn.textContent = '重试安装';
        }
        break;

      default:
        el.updateTitle.textContent = '当前版本 ' + formatVersion(appVersionName);
        el.updateMeta.textContent = appPlatform === 'android' ? '安卓版 · 可以检查是否有新版本' : '网页版 · 可以检查线上最新内容';
        setUpdateBadge('本机', '');
        setReleaseNotes(FALLBACK_RELEASE_NOTES);
        break;
    }
    refreshUpdateDot();
  }

  function normalizeUpdate(data) {
    if (!data || typeof data !== 'object') return null;
    const versionCode = Number(data.versionCode != null ? data.versionCode : data.latestVersionCode);
    const versionNameRaw = data.versionName || data.latestVersionName;
    if (!Number.isFinite(versionCode) || versionCode <= 0 || !versionNameRaw) return null;
    let apkUrl = '';
    if (typeof data.apkUrl === 'string' && data.apkUrl) {
      try {
        apkUrl = new URL(data.apkUrl, UPDATE_PAGE_URL).href;
      } catch (err) {
        apkUrl = data.apkUrl;
      }
    }
    return {
      versionCode: Math.floor(versionCode),
      versionName: String(versionNameRaw),
      notes: Array.isArray(data.notes) ? data.notes.map(String) : FALLBACK_RELEASE_NOTES.slice(),
      publishedAt: typeof data.publishedAt === 'string' ? data.publishedAt : '',
      apkUrl: apkUrl,
      sha256: typeof data.sha256 === 'string' ? data.sha256 : '',
      size: Number(data.size) || 0
    };
  }

  function checkForUpdates(manual) {
    if (updatePhase === 'checking' || updatePhase === 'downloading' || updatePhase === 'verifying' || updatePhase === 'installing') {
      return;
    }
    updateCheckIsManual = !!manual;
    updateErrorText = '';
    updatePhase = 'checking';
    renderUpdatePanel();

    if (nativeApp) {
      window.clearTimeout(updateCheckTimer);
      updateCheckTimer = window.setTimeout(function () {
        if (updatePhase === 'checking') {
          updatePhase = 'error';
          updateErrorText = '检查更新超时，请确认网络后再试。';
          renderUpdatePanel();
          if (updateCheckIsManual) showToast('检查更新超时了，稍后再试试。', 'warn', 3300);
        }
      }, 20000);
      const started = callNative('checkForUpdate');
      if (started === undefined && typeof nativeApp.checkForUpdate !== 'function') {
        window.clearTimeout(updateCheckTimer);
        updatePhase = 'error';
        updateErrorText = '当前安装包还不支持应用内更新，请手动下载新版。';
        renderUpdatePanel();
      }
      return;
    }

    const updateUrl = new URL('update.json?ts=' + Date.now(), window.location.href).href;
    fetch(updateUrl, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (raw) {
        const info = normalizeUpdate(raw);
        if (!info) throw new Error('更新清单格式不正确');
        updateInfo = info;
        updateCheckedAt = Date.now();
        updatePhase = info.versionCode > appVersionCode ? 'available' : 'latest';
        renderUpdatePanel();
        if (updateCheckIsManual) {
          showToast(
            updatePhase === 'available'
              ? '发现新版本 ' + formatVersion(info.versionName) + '。'
              : '已经是最新版本 ' + formatVersion(appVersionName) + '。',
            updatePhase === 'available' ? 'win' : 'info',
            3200
          );
        }
      })
      .catch(function (err) {
        updatePhase = 'error';
        updateErrorText = window.location.protocol === 'file:'
          ? '本地预览无法联网读取更新清单，部署到线上后即可使用。'
          : '暂时无法读取更新清单，请检查网络后再试。';
        renderUpdatePanel();
        if (updateCheckIsManual) showToast(updateErrorText, 'warn', 3800);
      });
  }

  function beginUpdateInstall() {
    if (!updateInfo) return;
    if (updatePhase !== 'available' && updatePhase !== 'error' && updatePhase !== 'permission-needed') return;

    if (!nativeApp) {
      window.location.reload();
      return;
    }

    if (typeof nativeApp.downloadAndInstallUpdate !== 'function') {
      updatePhase = 'error';
      updateErrorText = '这个安装包没有内置更新器，请下载新版 APK 覆盖安装。';
      renderUpdatePanel();
      return;
    }

    updateErrorText = '';
    updateProgressValue = 0;
    updatePhase = 'downloading';
    renderUpdatePanel();
    const started = callNative('downloadAndInstallUpdate');
    if (started === undefined && typeof nativeApp.downloadAndInstallUpdate !== 'function') {
      updatePhase = 'error';
      updateErrorText = '无法启动应用内更新，请手动下载新版。';
      renderUpdatePanel();
    }
  }

  function handleNativeUpdateEvent(data) {
    window.clearTimeout(updateCheckTimer);
    if (data.currentVersionName) appVersionName = String(data.currentVersionName);
    if (Number(data.currentVersionCode) > 0) appVersionCode = Math.floor(Number(data.currentVersionCode));

    if (data.status === 'available' || data.status === 'latest') {
      const normalized = normalizeUpdate(data);
      if (!normalized) {
        updatePhase = 'error';
        updateErrorText = '更新清单缺少版本信息。';
        renderUpdatePanel();
        return;
      }
      updateInfo = normalized;
      updateCheckedAt = Date.now();
      updatePhase = normalized.versionCode > appVersionCode ? 'available' : 'latest';
      renderUpdatePanel();

      if (updateCheckIsManual) {
        showToast(
          updatePhase === 'available'
            ? '发现新版本 ' + formatVersion(normalized.versionName) + '。'
            : '已经是最新版本 ' + formatVersion(appVersionName) + '。',
          updatePhase === 'available' ? 'win' : 'info',
          3200
        );
      } else if (updatePhase === 'available' && el.settingsLayer.hidden && autoUpdateAnnounced !== normalized.versionCode) {
        autoUpdateAnnounced = normalized.versionCode;
        showToast('发现新版本 ' + formatVersion(normalized.versionName) + '，点右上角齿轮更新。', 'win', 4300);
      }
      return;
    }

    if (data.status === 'downloading') {
      updatePhase = 'downloading';
      updateProgressValue = clamp(Number(data.progress) || 0, 0, 100);
      renderUpdatePanel();
      return;
    }

    if (data.status === 'verifying') {
      updatePhase = 'verifying';
      renderUpdatePanel();
      return;
    }

    if (data.status === 'permission-needed') {
      updatePhase = 'permission-needed';
      renderUpdatePanel();
      return;
    }

    if (data.status === 'installing') {
      updatePhase = 'installing';
      renderUpdatePanel();
      showToast('已打开系统安装器，确认一下就完成更新。', 'info', 3800);
      return;
    }

    if (data.status === 'error') {
      updatePhase = 'error';
      updateErrorText = data.error || '下载或安装没有完成。';
      renderUpdatePanel();
      showToast(updateErrorText, 'warn', 4200);
    }
  }

  function handleNativeEvent(raw) {
    let data = raw;
    if (typeof raw === 'string') {
      try {
        data = JSON.parse(raw);
      } catch (err) {
        return;
      }
    }
    if (!data || typeof data !== 'object') return;

    if (data.kind === 'update') {
      handleNativeUpdateEvent(data);
    } else if (data.kind === 'savePath') {
      if (typeof data.path === 'string' && data.path) {
        el.savePathText.textContent = data.path;
        el.savePathText.className = 'path-value';
        showToast('保存位置已改为：' + data.path, 'win', 3500);
      } else if (data.error) {
        showToast(data.error, 'warn', 3600);
      }
    } else if (data.kind === 'export') {
      exportBusy = false;
      el.exportBtn.disabled = false;
      if (data.status === 'saved') {
        showToast('备份已导出' + (data.fileName ? '：' + data.fileName : '。'), 'win', 3600);
      } else {
        showToast('导出没有完成：' + (data.error || '请换一个位置再试。'), 'warn', 4200);
      }
    }
  }

  function openSettings() {
    if (!el.settingsLayer || !el.settingsLayer.hidden) return;
    settingsLastFocus = document.activeElement;
    window.clearTimeout(settingsCloseTimer);
    el.settingsLayer.hidden = false;
    el.settingsBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('settings-open');
    if (el.pageShell && 'inert' in el.pageShell) el.pageShell.inert = true;
    renderPlatformSections();
    renderUpdatePanel();
    window.requestAnimationFrame(function () {
      el.settingsLayer.classList.add('is-open');
      el.settingsClose.focus({ preventScroll: true });
    });

    if (updatePhase !== 'checking' && updatePhase !== 'downloading' && updatePhase !== 'verifying' && updatePhase !== 'installing') {
      if (!updateInfo || Date.now() - updateCheckedAt > 60000) {
        window.setTimeout(function () {
          if (!el.settingsLayer.hidden) checkForUpdates(false);
        }, 180);
      }
    }
  }

  function closeSettings() {
    if (!el.settingsLayer || el.settingsLayer.hidden) return;
    if (!el.confirmLayer.hidden) settleConfirm(false);
    el.settingsLayer.classList.remove('is-open');
    el.settingsBtn.setAttribute('aria-expanded', 'false');
    window.clearTimeout(settingsCloseTimer);
    settingsCloseTimer = window.setTimeout(function () {
      if (el.settingsLayer.classList.contains('is-open')) return;
      el.settingsLayer.hidden = true;
      document.body.classList.remove('settings-open');
      if (el.pageShell && 'inert' in el.pageShell) el.pageShell.inert = false;
      const target = settingsLastFocus && typeof settingsLastFocus.focus === 'function'
        ? settingsLastFocus
        : el.settingsBtn;
      if (target && document.contains(target)) target.focus({ preventScroll: true });
    }, 330);
  }

  function focusableIn(container) {
    return $$('button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), [tabindex]:not([tabindex="-1"])', container)
      .filter(function (node) {
        return !node.hidden && node.offsetParent !== null;
      });
  }

  function handleSettingsKeydown(event) {
    const confirmOpen = el.confirmLayer && !el.confirmLayer.hidden;
    const settingsOpen = el.settingsLayer && !el.settingsLayer.hidden;
    if (!confirmOpen && !settingsOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      if (confirmOpen) settleConfirm(false);
      else closeSettings();
      return;
    }

    if (event.key !== 'Tab') return;
    const scope = confirmOpen ? el.confirmBox : el.settingsDrawer;
    if (!scope) return;
    const nodes = focusableIn(scope);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first || !scope.contains(document.activeElement)) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last || !scope.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  function showConfirm(options) {
    const opts = options || {};
    return new Promise(function (resolve) {
      if (confirmResolver) {
        const previous = confirmResolver;
        confirmResolver = null;
        previous(false);
      }
      confirmResolver = resolve;
      confirmLastFocus = document.activeElement;
      el.confirmTitle.textContent = opts.title || '确认操作';
      el.confirmMessage.textContent = opts.message || '';
      el.confirmOk.textContent = opts.confirmLabel || '确认';
      el.confirmCancel.textContent = opts.cancelLabel || '取消';
      el.confirmBox.classList.toggle('is-danger', !!opts.danger);
      el.confirmLayer.hidden = false;
      window.requestAnimationFrame(function () {
        el.confirmLayer.classList.add('is-open');
        el.confirmOk.focus({ preventScroll: true });
      });
    });
  }

  function settleConfirm(value) {
    if (!el.confirmLayer || el.confirmLayer.hidden) return;
    const resolver = confirmResolver;
    confirmResolver = null;
    el.confirmLayer.classList.remove('is-open');
    window.setTimeout(function () {
      el.confirmLayer.hidden = true;
      const target = confirmLastFocus;
      if (target && document.contains(target) && !el.settingsLayer.hidden) {
        target.focus({ preventScroll: true });
      } else if (!el.settingsLayer.hidden) {
        el.settingsClose.focus({ preventScroll: true });
      }
    }, 230);
    if (resolver) resolver(!!value);
  }

  function backupPayload() {
    return {
      app: 'lucky-study-machine',
      schema: 1,
      version: appVersionName,
      exportedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(state))
    };
  }

  function backupFileName() {
    return 'lucky-study-backup-' + dateKey() + '.json';
  }

  function downloadBackupString(filename, json) {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1800);
  }

  function exportLearningData() {
    if (exportBusy) return;
    exportBusy = true;
    el.exportBtn.disabled = true;
    const filename = backupFileName();
    const json = JSON.stringify(backupPayload(), null, 2);

    if (nativeApp && typeof nativeApp.exportData === 'function') {
      try {
        nativeApp.exportData(filename, json);
      } catch (err) {
        exportBusy = false;
        el.exportBtn.disabled = false;
        showToast('没有打开保存面板，请稍后再试。', 'warn', 3600);
        return;
      }
      showToast('正在导出学习记录备份…', 'info', 3000);
      window.setTimeout(function () {
        if (exportBusy) {
          exportBusy = false;
          el.exportBtn.disabled = false;
        }
      }, 45000);
      return;
    }

    try {
      downloadBackupString(filename, json);
      showToast('备份已下载：' + filename, 'win', 3600);
    } catch (err) {
      showToast('浏览器没有允许下载，请再试一次。', 'warn', 3600);
    }
    window.setTimeout(function () {
      exportBusy = false;
      el.exportBtn.disabled = false;
    }, 900);
  }

  function parseBackup(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error('这不是有效的 JSON 文件。');
    }
    let data = parsed;
    if (parsed && parsed.app === 'lucky-study-machine' && parsed.data) {
      data = parsed.data;
    } else if (parsed && parsed.data && typeof parsed.data === 'object' && Array.isArray(parsed.data.tasks)) {
      data = parsed.data;
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.tasks)) {
      throw new Error('这不是幸运学习机的备份文件。');
    }

    const tasks = sanitizeTasks(data.tasks);
    const tickets = Number.isFinite(Number(data.tickets))
      ? clamp(Math.floor(Number(data.tickets)), 0, MAX_TICKETS)
      : START_TICKETS;
    const spins = Number.isFinite(Number(data.spins))
      ? Math.max(0, Math.floor(Number(data.spins)))
      : 0;
    const totalStars = Number.isFinite(Number(data.totalStars))
      ? Math.max(0, Math.floor(Number(data.totalStars)))
      : 0;
    const date = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
      ? data.date
      : '未知日期';
    return {
      tasks: tasks,
      tickets: tickets,
      spins: spins,
      totalStars: totalStars,
      history: sanitizeHistory(data.history),
      sound: data.sound !== false,
      date: date,
      exportedAt: parsed && parsed.exportedAt ? String(parsed.exportedAt) : ''
    };
  }

  function applyImportedBackup(backup) {
    const sameDay = backup.date === dateKey();
    state.date = dateKey();
    state.tasks = sameDay ? backup.tasks : [];
    state.tickets = sameDay ? backup.tickets : START_TICKETS;
    state.spins = sameDay ? backup.spins : 0;
    state.totalStars = backup.totalStars;
    state.history = backup.history;
    state.sound = backup.sound;
    audio.setEnabled(state.sound);
    renderSoundToggle();
    saveState();
    renderDate();
    renderTasks({ scrollTop: 0 });
    renderTickets();
    renderSpinCounter();
    renderHeaderStats();
    renderPlatformSections();
    resetResultCard();
    const done = backup.tasks.filter(function (task) { return task.done; }).length;
    showToast(
      sameDay
        ? '数据已恢复：' + backup.tasks.length + ' 个任务，完成 ' + done + ' 个。'
        : '备份来自 ' + backup.date + '，任务已按新的一天重置，累计灵感和历史已恢复。',
      'win',
      4600
    );
  }

  function handleImportFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('备份文件太大了，无法读取。', 'warn', 3400);
      return;
    }
    const finish = function (text) {
      let backup;
      try {
        backup = parseBackup(text);
      } catch (err) {
        showToast(err.message || '备份文件格式不正确。', 'warn', 3800);
        return;
      }
      pendingImportBackup = backup;
      const sameDay = backup.date === dateKey();
      const done = backup.tasks.filter(function (task) { return task.done; }).length;
      let message = '备份日期：' + backup.date
        + '\n任务：' + backup.tasks.length + ' 项（完成 ' + done + ' 项）'
        + '\n灵感星：' + formatNumber(backup.totalStars) + ' · 摇奖券：' + backup.tickets
        + '\n\n导入会覆盖当前的任务和记录。';
      if (!sameDay) {
        message += '\n\n这份备份不是今天的：导入后任务和摇奖券会按新的一天重置，累计灵感和历史记录仍会恢复。';
      }
      showConfirm({
        title: '导入这份学习记录？',
        message: message,
        confirmLabel: '导入',
        cancelLabel: '先不导入'
      }).then(function (ok) {
        if (!ok) {
          pendingImportBackup = null;
          return;
        }
        applyImportedBackup(backup);
        pendingImportBackup = null;
        window.setTimeout(closeSettings, 260);
      });
    };

    if (typeof file.text === 'function') {
      file.text().then(finish).catch(function () {
        showToast('读取备份文件失败，请再试一次。', 'warn', 3600);
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = function () { finish(String(reader.result || '')); };
    reader.onerror = function () { showToast('读取备份文件失败，请再试一次。', 'warn', 3600); };
    reader.readAsText(file, 'utf-8');
  }

  async function clearAllLearningData() {
    const ok = await showConfirm({
      title: '清空全部学习记录？',
      message: '任务清单、灵感星、连续天数和历史记录都会被删除，且无法恢复。\n如果还没备份，建议先导出。',
      confirmLabel: '确认清空',
      danger: true
    });
    if (!ok) return;
    state.date = dateKey();
    state.tasks = [];
    state.tickets = START_TICKETS;
    state.spins = 0;
    state.totalStars = 0;
    state.history = {};
    saveState();
    renderDate();
    renderTasks({ scrollTop: 0 });
    renderTickets();
    renderSpinCounter();
    renderHeaderStats();
    resetResultCard();
    showToast('已清空所有学习数据，今天可以从头开始。', 'win', 3800);
    closeSettings();
  }

  async function chooseSavePath() {
    if (!nativeApp || typeof nativeApp.chooseSaveFolder !== 'function') {
      showToast('当前环境不支持更改保存位置，导出时由浏览器决定下载目录。', 'info', 3600);
      return;
    }
    try {
      nativeApp.chooseSaveFolder();
    } catch (err) {
      showToast('没有打开文件夹选择器，请稍后再试。', 'warn', 3400);
      return;
    }
    showToast('请选择一个用来存放备份 JSON 的文件夹。', 'info', 3200);
  }

  async function installWebApp() {
    if (appPlatform === 'android') return;
    if (isStandalone()) {
      showToast('已经在主屏幕应用模式里啦。', 'info', 2800);
      return;
    }
    if (deferredInstallPrompt) {
      const prompt = deferredInstallPrompt;
      deferredInstallPrompt = null;
      try {
        prompt.prompt();
        const result = await prompt.userChoice;
        if (result && result.outcome === 'accepted') {
          showToast('正在安装，请稍等。', 'win', 3000);
        } else {
          showToast('安装取消了，随时可以在设置里再试。', 'info', 2800);
        }
      } catch (err) {
        showToast('浏览器没有完成安装，请从浏览器菜单手动添加。', 'warn', 3200);
      }
      renderInstallSection();
      return;
    }
    showToast('打开浏览器菜单，选择“添加到主屏幕”或“安装应用”。', 'info', 4500);
  }

  window.LuckyNative = {
    onEvent: handleNativeEvent
  };

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
    if (el.settingsLayer && !el.settingsLayer.hidden) return;
    if (el.confirmLayer && !el.confirmLayer.hidden) return;
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

    document.addEventListener('keydown', handleSettingsKeydown);

    document.addEventListener('keydown', function (event) {
      if (event.code !== 'Space' && event.key !== ' ') return;
      if (el.settingsLayer && !el.settingsLayer.hidden) return;
      if (el.confirmLayer && !el.confirmLayer.hidden) return;
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

    el.settingsBtn.addEventListener('click', openSettings);
    el.settingsClose.addEventListener('click', closeSettings);
    el.settingsDoneBtn.addEventListener('click', closeSettings);
    $$('[data-close-settings]').forEach(function (node) {
      node.addEventListener('click', closeSettings);
    });
    el.checkUpdateBtn.addEventListener('click', function () { checkForUpdates(true); });
    el.installUpdateBtn.addEventListener('click', beginUpdateInstall);
    el.exportBtn.addEventListener('click', exportLearningData);
    el.importBtn.addEventListener('click', function () {
      el.importFile.value = '';
      el.importFile.click();
    });
    el.importFile.addEventListener('change', function () {
      const file = el.importFile.files && el.importFile.files[0];
      if (file) handleImportFile(file);
    });
    el.choosePathBtn.addEventListener('click', chooseSavePath);
    el.clearDataBtn.addEventListener('click', clearAllLearningData);
    el.pwaInstallBtn.addEventListener('click', installWebApp);
    el.confirmCancel.addEventListener('click', function () { settleConfirm(false); });
    el.confirmOk.addEventListener('click', function () { settleConfirm(true); });
    $$('[data-confirm-cancel]').forEach(function (node) {
      node.addEventListener('click', function () { settleConfirm(false); });
    });

    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      deferredInstallPrompt = event;
      if (el.settingsLayer && !el.settingsLayer.hidden) renderInstallSection();
    });

    window.addEventListener('appinstalled', function () {
      deferredInstallPrompt = null;
      showToast('网页版已经安装到主屏幕。', 'win', 3200);
      renderInstallSection();
    });
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
      spin: startSpin,
      openSettings: openSettings,
      closeSettings: closeSettings,
      checkUpdate: function () { checkForUpdates(true); },
      getUpdateInfo: function () { return updateInfo ? JSON.parse(JSON.stringify(updateInfo)) : null; },
      getVersion: function () { return { name: appVersionName, code: appVersionCode, platform: appPlatform }; },
      importBackupText: function (text) {
        const backup = parseBackup(text);
        applyImportedBackup(backup);
        return true;
      }
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
    initPlatformInfo();
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

    if (nativeApp) {
      window.setTimeout(function () {
        if (updatePhase === 'idle') checkForUpdates(false);
      }, 2600);
    }
  }

  init();
})();
