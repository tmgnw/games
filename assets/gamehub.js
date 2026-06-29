/* ============================================================
 * GameHub Shared System
 * Universal coin, profile, achievements, daily challenge.
 * Exposed as window.GameHub. All games can call:
 *   GameHub.coins.add(n) / .spend(n) / .get()
 *   GameHub.profile.get() / .setName(s)
 *   GameHub.achievements.unlock(id)
 *   GameHub.achievements.notify(event, data)  -> triggers checks
 *   GameHub.daily.getChallenge()
 *   GameHub.daily.recordProgress(gameId, value)
 *   GameHub.daily.claim()
 * ============================================================ */
(function() {
  'use strict';

  const STORAGE_KEY = 'gamehub_v1';

  // ----- Default state -----
  function defaultState() {
    return {
      profile: { name: 'Pemain', avatar: '🎮', createdAt: Date.now() },
      coins: 0,
      achievements: {},           // id → { unlockedAt }
      stats: {},                  // game-id → { plays, wins, bestScore, ... }
      daily: { date: null, challengeId: null, progress: 0, claimed: false }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const data = JSON.parse(raw);
      const def = defaultState();
      return {
        profile: Object.assign({}, def.profile, data.profile || {}),
        coins: (typeof data.coins === 'number' && data.coins >= 0) ? Math.floor(data.coins) : 0,
        achievements: data.achievements || {},
        stats: data.stats || {},
        daily: Object.assign({}, def.daily, data.daily || {})
      };
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) {}
  }

  let state = load();

  // =========== ACHIEVEMENTS DEFINITION ===========
  // Each: { id, name, desc, icon, coinReward, check(event, data, state) → boolean }
  const ACHIEVEMENTS = [
    // ---- Collector ----
    { id: 'first_play',      name: 'Selamat Datang',      desc: 'Main game pertama kali.', icon: '🎉', coinReward: 50,
      check: (ev) => ev === 'game_start' },
    { id: 'coin_100',        name: 'Pemula Kaya',         desc: 'Kumpulkan 100 koin.', icon: '🪙', coinReward: 25,
      check: (ev, d, s) => s.coins >= 100 },
    { id: 'coin_1000',       name: 'Saudagar',            desc: 'Kumpulkan 1.000 koin.', icon: '💰', coinReward: 100,
      check: (ev, d, s) => s.coins >= 1000 },
    { id: 'coin_10000',      name: 'Konglomerat',         desc: 'Kumpulkan 10.000 koin.', icon: '🏦', coinReward: 500,
      check: (ev, d, s) => s.coins >= 10000 },

    // ---- Game 1: Color Puzzle ----
    { id: 'g1_easy',         name: 'Pelukis Pemula',      desc: 'Selesaikan puzzle mudah Game 1.', icon: '🎨', coinReward: 30,
      check: (ev, d) => ev === 'g1_win' && d && d.difficulty === 'easy' },
    { id: 'g1_hard',         name: 'Master Warna',        desc: 'Selesaikan puzzle sulit Game 1.', icon: '🌈', coinReward: 100,
      check: (ev, d) => ev === 'g1_win' && d && d.difficulty === 'hard' },

    // ---- Game 2: Tic-Tac-Toe ----
    { id: 'g2_first_win',    name: 'Juara X-O',           desc: 'Menang pertama di Tic-Tac-Toe.', icon: '❌', coinReward: 30,
      check: (ev) => ev === 'g2_win' },
    { id: 'g2_streak3',      name: 'Trio Kemenangan',     desc: '3 kemenangan beruntun di Game 2.', icon: '🔥', coinReward: 75,
      check: (ev, d) => ev === 'g2_win' && d && d.streak >= 3 },

    // ---- Game 3: Snake ----
    { id: 'g3_50apples',     name: 'Lapar Apel',          desc: 'Makan 50 apel dalam 1 game.', icon: '🍎', coinReward: 50,
      check: (ev, d) => ev === 'g3_gameover' && d && d.apples >= 50 },
    { id: 'g3_score300',     name: 'Snake Pro',           desc: 'Capai skor 300 di Snake.', icon: '🐍', coinReward: 80,
      check: (ev, d) => ev === 'g3_gameover' && d && d.score >= 300 },
    { id: 'g3_all_modes',    name: 'Petualang Mode',      desc: 'Coba 10 mode berbeda di Snake.', icon: '🎯', coinReward: 100,
      check: (ev, d, s) => {
        if (ev !== 'g3_gameover' || !d || typeof d.mode !== 'number') return false;
        s.stats.g3_modes = s.stats.g3_modes || {};
        s.stats.g3_modes[d.mode] = true;
        return Object.keys(s.stats.g3_modes).length >= 10;
      }},

    // ---- Game 4: Tetris ----
    { id: 'g4_first_tetris', name: 'Tetris!',             desc: 'Hapus 4 baris sekaligus.', icon: '🟦', coinReward: 60,
      check: (ev) => ev === 'g4_tetris' },
    { id: 'g4_combo5',       name: 'Combo Master',        desc: 'Capai combo ×5 di Tetris.', icon: '⚡', coinReward: 80,
      check: (ev, d) => ev === 'g4_combo' && d && d.combo >= 5 },
    { id: 'g4_tspin',        name: 'T-Spin Sage',         desc: 'Lakukan T-spin dengan line clear.', icon: '🌀', coinReward: 100,
      check: (ev) => ev === 'g4_tspin' },
    { id: 'g4_vs_win',       name: 'Pemenang Duel',       desc: 'Menang VS CPU di Tetris.', icon: '🏆', coinReward: 100,
      check: (ev) => ev === 'g4_vs_win' },
    { id: 'g4_vs_hard',      name: 'Penakluk Sulit',      desc: 'Menang VS CPU level Sulit.', icon: '👑', coinReward: 300,
      check: (ev, d) => ev === 'g4_vs_win' && d && d.difficulty === 'hard' },
    { id: 'g4_sprint60',     name: 'Sprinter',            desc: 'Selesaikan Sprint 40 di bawah 60 detik.', icon: '⏱️', coinReward: 150,
      check: (ev, d) => ev === 'g4_sprint_done' && d && d.timeMs < 60000 },
    { id: 'g4_zen_long',     name: 'Zen Master',          desc: 'Capai 5000 skor di mode Zen.', icon: '🧘', coinReward: 100,
      check: (ev, d) => ev === 'g4_score' && d && d.mode === 'zen' && d.score >= 5000 },

    // ---- Game 5: 2048 ----
    { id: 'g5_2048',         name: '2048!',               desc: 'Capai tile 2048.', icon: '🔢', coinReward: 150,
      check: (ev, d) => ev === 'g5_tile' && d && d.tile >= 2048 },
    { id: 'g5_4096',         name: '4096 Legend',         desc: 'Capai tile 4096.', icon: '💎', coinReward: 400,
      check: (ev, d) => ev === 'g5_tile' && d && d.tile >= 4096 },

    // ---- Game 6: Ular Tangga ----
    { id: 'g6_first_win',    name: 'Sang Penanjak',       desc: 'Menang pertama di Ular Tangga.', icon: '🪜', coinReward: 40,
      check: (ev) => ev === 'g6_win' },

    // ---- Game 7: Catur ----
    { id: 'g7_first_win',    name: 'Schah Mat',           desc: 'Menang pertama di Catur.', icon: '♟️', coinReward: 80,
      check: (ev) => ev === 'g7_win' },

    // ---- Game 8: Monopoli ----
    { id: 'g8_first_win',    name: 'Tycoon',              desc: 'Menang pertama di Monopoli.', icon: '🏠', coinReward: 100,
      check: (ev) => ev === 'g8_win' },

    // ---- Game 9: Space Invaders ----
    { id: 'g9_boss',         name: 'Boss Hunter',         desc: 'Kalahkan boss di Space Invaders.', icon: '👾', coinReward: 100,
      check: (ev) => ev === 'g9_boss_kill' },
    { id: 'g9_score5000',    name: 'Sharpshooter',        desc: 'Capai skor 5.000 di Space Invaders.', icon: '🚀', coinReward: 80,
      check: (ev, d) => ev === 'g9_gameover' && d && d.score >= 5000 },

    // ---- Game 10: Dice Defense ----
    { id: 'g10_wave10',      name: 'Survivor',            desc: 'Bertahan sampai wave 10.', icon: '🎲', coinReward: 80,
      check: (ev, d) => ev === 'g10_wave' && d && d.wave >= 10 },
    { id: 'g10_wave25',      name: 'Wave Master',         desc: 'Bertahan sampai wave 25.', icon: '⚔️', coinReward: 250,
      check: (ev, d) => ev === 'g10_wave' && d && d.wave >= 25 },

    // ---- Cross-game ----
    { id: 'play_all',        name: 'Penjelajah',          desc: 'Main semua 15 game.', icon: '🗺️', coinReward: 500,
      check: (ev, d, s) => {
        if (ev !== 'game_start' || !d || !d.gameId) return false;
        s.stats.played = s.stats.played || {};
        s.stats.played[d.gameId] = true;
        return Object.keys(s.stats.played).length >= 15;
      }},
    { id: 'daily_streak3',   name: 'Setia',               desc: 'Klaim daily challenge 3 hari beruntun.', icon: '📅', coinReward: 100,
      check: (ev, d, s) => {
        if (ev !== 'daily_claim') return false;
        return (s.stats.dailyStreak || 0) >= 3;
      }},
    { id: 'daily_streak7',   name: 'Mingguan',            desc: 'Klaim daily challenge 7 hari beruntun.', icon: '🗓️', coinReward: 300,
      check: (ev, d, s) => {
        if (ev !== 'daily_claim') return false;
        return (s.stats.dailyStreak || 0) >= 7;
      }},

    // ---- Game 11-15 placeholders ----
    { id: 'g11_first_win',   name: 'Detektif Ranjau',     desc: 'Menang pertama di Minesweeper.', icon: '💣', coinReward: 60,
      check: (ev) => ev === 'g11_win' },
    { id: 'g12_level10',     name: 'Pemindah Dus',        desc: 'Selesaikan 10 level Sokoban.', icon: '📦', coinReward: 100,
      check: (ev, d) => ev === 'g12_level_done' && d && d.level >= 10 },
    { id: 'g13_combo10',     name: 'Match Master',        desc: 'Combo ×10 di Match-3.', icon: '🍬', coinReward: 80,
      check: (ev, d) => ev === 'g13_combo' && d && d.combo >= 10 },
    { id: 'g14_clear',       name: 'Pemecah Bata',        desc: 'Selesaikan 1 level Brick Breaker.', icon: '🧱', coinReward: 50,
      check: (ev) => ev === 'g14_level_done' },
    { id: 'g15_perfect',     name: 'Memori Sempurna',     desc: 'Selesaikan Memory dengan minimum moves.', icon: '🧠', coinReward: 100,
      check: (ev, d) => ev === 'g15_done' && d && d.perfect === true }
  ];

  // ======= DAILY CHALLENGES =======
  // Pool of challenges that rotate based on day-of-year seed
  const DAILY_POOL = [
    { id: 'd_g3_score',  text: 'Capai skor 100 di Snake', game: 3, target: 100, eventCheck: (ev, d) => ev === 'g3_gameover' ? (d && d.score) || 0 : null, reward: 100 },
    { id: 'd_g3_apples', text: 'Makan 20 apel di Snake',  game: 3, target: 20,  eventCheck: (ev, d) => ev === 'g3_gameover' ? (d && d.apples) || 0 : null, reward: 100 },
    { id: 'd_g4_tetris', text: 'Hapus 4 baris (Tetris) sekali', game: 4, target: 1, eventCheck: (ev) => ev === 'g4_tetris' ? 1 : null, reward: 80 },
    { id: 'd_g4_lines',  text: 'Hapus 20 baris di Tetris', game: 4, target: 20, eventCheck: (ev, d) => ev === 'g4_lines' ? (d && d.delta) || 0 : null, reward: 100 },
    { id: 'd_g5_512',    text: 'Capai tile 512 di 2048',   game: 5, target: 1, eventCheck: (ev, d) => (ev === 'g5_tile' && d && d.tile >= 512) ? 1 : null, reward: 100 },
    { id: 'd_g1_solve',  text: 'Selesaikan 1 puzzle Game 1', game: 1, target: 1, eventCheck: (ev) => ev === 'g1_win' ? 1 : null, reward: 80 },
    { id: 'd_g2_win',    text: 'Menang 1× di Tic-Tac-Toe',  game: 2, target: 1, eventCheck: (ev) => ev === 'g2_win' ? 1 : null, reward: 60 },
    { id: 'd_g9_kills',  text: 'Tembak 50 musuh di Space Invaders', game: 9, target: 50, eventCheck: (ev, d) => ev === 'g9_kill' ? (d && d.count) || 1 : null, reward: 100 },
    { id: 'd_g10_wave5', text: 'Bertahan sampai wave 5 (Dice)', game: 10, target: 5, eventCheck: (ev, d) => ev === 'g10_wave' ? (d && d.wave) || 0 : null, reward: 90 },
    { id: 'd_g11_win',   text: 'Menang 1× di Minesweeper',   game: 11, target: 1, eventCheck: (ev) => ev === 'g11_win' ? 1 : null, reward: 80 }
  ];

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayOfYear() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    return Math.floor(diff / 86400000);
  }

  function ensureDailyChallenge() {
    const today = todayKey();
    if (state.daily.date !== today) {
      const idx = dayOfYear() % DAILY_POOL.length;
      const ch = DAILY_POOL[idx];
      // Streak tracking: if yesterday was claimed, increment; else reset
      const yesterday = (function() {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
      })();
      if (state.daily.date === yesterday && state.daily.claimed) {
        state.stats.dailyStreak = (state.stats.dailyStreak || 0) + 1;
      } else if (state.daily.date && state.daily.date !== yesterday) {
        state.stats.dailyStreak = 0;
      }
      state.daily = { date: today, challengeId: ch.id, progress: 0, claimed: false };
      save();
    }
  }

  function getCurrentChallenge() {
    ensureDailyChallenge();
    const ch = DAILY_POOL.find(c => c.id === state.daily.challengeId);
    return ch ? Object.assign({}, ch, { progress: state.daily.progress, claimed: state.daily.claimed }) : null;
  }

  // ======= NOTIFICATION SYSTEM =======
  // Show floating toast in top-right
  function showToast(html, color) {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('gh-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gh-toast-container';
      container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:99999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none;max-width:320px;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${color || '#1a1a2e'};
      color: #fff;
      padding: 0.7rem 1rem;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      border: 2px solid rgba(255,213,79,0.4);
      font-family: 'Poppins', sans-serif;
      font-size: 0.85rem;
      transform: translateX(120%);
      transition: transform 0.4s cubic-bezier(.5,0,.3,1.5), opacity 0.3s;
      pointer-events: auto;
    `;
    toast.innerHTML = html;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  function unlockAchievement(achievementId) {
    if (state.achievements[achievementId]) return false; // already unlocked
    const ach = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!ach) return false;
    state.achievements[achievementId] = { unlockedAt: Date.now() };
    state.coins += ach.coinReward || 0;
    save();
    showToast(
      `<div style="font-weight:700;color:#ffd54f">🏆 Achievement!</div>
       <div style="font-size:1.05em;font-weight:600">${ach.icon} ${ach.name}</div>
       <div style="opacity:0.85;font-size:0.85em">${ach.desc}</div>
       ${ach.coinReward ? `<div style="margin-top:4px;color:#ffd54f">+${ach.coinReward} 🪙</div>` : ''}`,
      '#1f3a0e'
    );
    return true;
  }

  // Process event → check all achievements + daily challenge
  function notify(event, data) {
    // Achievements
    for (const ach of ACHIEVEMENTS) {
      if (state.achievements[ach.id]) continue;
      try {
        if (ach.check(event, data, state)) {
          unlockAchievement(ach.id);
        }
      } catch (e) {}
    }
    // Daily challenge progress
    ensureDailyChallenge();
    const ch = DAILY_POOL.find(c => c.id === state.daily.challengeId);
    if (ch && !state.daily.claimed) {
      try {
        const delta = ch.eventCheck(event, data);
        if (delta && delta > 0) {
          state.daily.progress = Math.min(ch.target, state.daily.progress + delta);
          save();
          if (state.daily.progress >= ch.target) {
            showToast(
              `<div style="font-weight:700;color:#ffd54f">📅 Daily Selesai!</div>
               <div style="font-size:0.95em">${ch.text}</div>
               <div style="margin-top:4px;color:#ffd54f">Buka dashboard untuk klaim</div>`,
              '#1f2a3a'
            );
          }
        }
      } catch (e) {}
    }
  }

  function claimDaily() {
    ensureDailyChallenge();
    const ch = DAILY_POOL.find(c => c.id === state.daily.challengeId);
    if (!ch || state.daily.claimed) return { ok: false, reason: 'sudah_klaim' };
    if (state.daily.progress < ch.target) return { ok: false, reason: 'belum_selesai' };
    state.daily.claimed = true;
    state.coins += ch.reward;
    save();
    notify('daily_claim', { reward: ch.reward });
    showToast(
      `<div style="font-weight:700;color:#ffd54f">📅 Daily Diklaim!</div>
       <div style="color:#ffd54f">+${ch.reward} 🪙</div>`,
      '#2d5016'
    );
    return { ok: true, reward: ch.reward };
  }

  // ======= PUBLIC API =======
  window.GameHub = {
    coins: {
      get: () => state.coins,
      add: (n) => { state.coins += Math.max(0, Math.floor(n)); save(); notify('coin_change', { delta: n }); },
      spend: (n) => {
        n = Math.max(0, Math.floor(n));
        if (state.coins < n) return false;
        state.coins -= n;
        save();
        return true;
      }
    },
    profile: {
      get: () => Object.assign({}, state.profile),
      setName: (name) => {
        if (typeof name === 'string' && name.trim().length > 0) {
          state.profile.name = name.trim().slice(0, 24);
          save();
        }
      },
      setAvatar: (a) => {
        if (typeof a === 'string') {
          state.profile.avatar = a.slice(0, 4);
          save();
        }
      }
    },
    achievements: {
      list: () => ACHIEVEMENTS.map(a => ({
        id: a.id, name: a.name, desc: a.desc, icon: a.icon, coinReward: a.coinReward,
        unlocked: !!state.achievements[a.id],
        unlockedAt: state.achievements[a.id] ? state.achievements[a.id].unlockedAt : null
      })),
      unlock: unlockAchievement,
      isUnlocked: (id) => !!state.achievements[id],
      total: () => ACHIEVEMENTS.length,
      unlockedCount: () => Object.keys(state.achievements).length
    },
    daily: {
      getChallenge: getCurrentChallenge,
      claim: claimDaily,
      streak: () => state.stats.dailyStreak || 0
    },
    notify: notify,
    // For debugging
    _state: () => state,
    _reset: () => { state = defaultState(); save(); }
  };

  // Initialize daily challenge on load
  ensureDailyChallenge();
})();
