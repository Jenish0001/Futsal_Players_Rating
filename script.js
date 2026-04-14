const STORAGE_KEY = 'futsal_players_v1';
const STATS = ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];
const STAT_LABELS = {
  PAC: 'Pace (PAC)',
  SHO: 'Shooting (SHO)',
  PAS: 'Passing (PAS)',
  DRI: 'Dribbling (DRI)',
  DEF: 'Defense (DEF)',
  PHY: 'Physical (PHY)',
};
const CARD_ANIMATION_DELAY_MS = 70;
const SHUFFLE_ANIMATION_DURATION_MS = 500;
const DEFAULT_PLAYER_IMAGE_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs><linearGradient id="bg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#2a344a"/><stop offset="100%" stop-color="#111827"/></linearGradient></defs><rect width="240" height="240" fill="url(#bg)"/><circle cx="120" cy="90" r="46" fill="#c9d0de"/><path d="M42 220c8-42 38-66 78-66s70 24 78 66" fill="#c9d0de"/></svg>'
)}`;

const POSITION_WEIGHTS = {
  ATT: { PAC: 0.2, SHO: 0.3, PAS: 0.1, DRI: 0.25, DEF: 0.05, PHY: 0.1 },
  MID: { PAC: 0.15, SHO: 0.15, PAS: 0.25, DRI: 0.2, DEF: 0.1, PHY: 0.15 },
  DEF: { PAC: 0.15, SHO: 0.05, PAS: 0.15, DRI: 0.1, DEF: 0.3, PHY: 0.25 },
};

const defaultPlayers = [
  { name: 'Pritam', position: 'ATT', stats: { PAC: 84, SHO: 82, PAS: 70, DRI: 81, DEF: 36, PHY: 68 } },
  { name: 'Milan', position: 'MID', stats: { PAC: 76, SHO: 72, PAS: 83, DRI: 79, DEF: 63, PHY: 71 } },
  { name: 'Suman', position: 'DEF', stats: { PAC: 70, SHO: 46, PAS: 68, DRI: 61, DEF: 84, PHY: 83 } },
  { name: 'Jenish', position: 'ATT', stats: { PAC: 88, SHO: 80, PAS: 66, DRI: 84, DEF: 31, PHY: 67 } },
  { name: 'Avinab', position: 'MID', stats: { PAC: 74, SHO: 69, PAS: 81, DRI: 80, DEF: 62, PHY: 72 } },
  { name: 'Ajmon', position: 'DEF', stats: { PAC: 68, SHO: 44, PAS: 66, DRI: 58, DEF: 86, PHY: 85 } },
  { name: 'Sujan', position: 'ATT', stats: { PAC: 83, SHO: 79, PAS: 69, DRI: 82, DEF: 34, PHY: 70 } },
  { name: 'Arpan', position: 'MID', stats: { PAC: 75, SHO: 71, PAS: 82, DRI: 77, DEF: 64, PHY: 73 } },
  { name: 'Gaurav', position: 'DEF', stats: { PAC: 69, SHO: 48, PAS: 67, DRI: 60, DEF: 82, PHY: 84 } },
].map((player) => ({
  ...player,
  id: crypto.randomUUID(),
  imageUrl: DEFAULT_PLAYER_IMAGE_URL,
  selected: false,
}));

let players = [];

const playerGrid = document.getElementById('playerGrid');
const addPlayerForm = document.getElementById('addPlayerForm');
const splitTeamsBtn = document.getElementById('splitTeamsBtn');
const teamAList = document.getElementById('teamAList');
const teamBList = document.getElementById('teamBList');
const formMessage = document.getElementById('formMessage');

function calculateWeightedRating(position, stats) {
  const weights = POSITION_WEIGHTS[position];
  const weighted = STATS.reduce((sum, key) => sum + stats[key] * weights[key], 0);
  return Math.round(weighted);
}

function savePlayersToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function loadPlayersFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    players = [...defaultPlayers];
    savePlayersToLocalStorage();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      players = [...defaultPlayers];
      savePlayersToLocalStorage();
      return;
    }

    players = parsed
      .map((player) => sanitizePlayer(player))
      .filter(Boolean);

    if (!players.length) {
      players = [...defaultPlayers];
      savePlayersToLocalStorage();
    }
  } catch {
    players = [...defaultPlayers];
    savePlayersToLocalStorage();
  }
}

function sanitizePlayer(player) {
  if (!player || typeof player !== 'object') return null;

  const name = String(player.name || '').trim();
  const position = String(player.position || '').toUpperCase();
  if (!name || !POSITION_WEIGHTS[position]) return null;
  if (!player.stats || typeof player.stats !== 'object' || Array.isArray(player.stats)) return null;

  const stats = {};
  for (const stat of STATS) {
    const value = Number(player.stats[stat]);
    if (!Number.isFinite(value)) return null;
    stats[stat] = clamp(Math.round(value), 0, 100);
  }

  return {
    id: player.id || crypto.randomUUID(),
    name,
    position,
    stats,
    imageUrl: sanitizeImageUrl(player.imageUrl),
    selected: Boolean(player.selected),
  };
}

function sanitizeImageUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_PLAYER_IMAGE_URL;

  try {
    const parsed = new URL(raw);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return raw;
    }
  } catch {
    return DEFAULT_PLAYER_IMAGE_URL;
  }

  return DEFAULT_PLAYER_IMAGE_URL;
}

function createPlayerCard(player, index, animateNew = false) {
  const card = document.createElement('article');
  card.className = 'player-card';
  card.dataset.id = player.id;

  const rating = calculateWeightedRating(player.position, player.stats);
  card.style.animationDelay = `${index * CARD_ANIMATION_DELAY_MS}ms`;
  if (animateNew) {
    card.style.animationDelay = '0ms';
  }

  if (player.selected) {
    card.classList.add('selected');
  }

  card.innerHTML = `
    <div class="card-hero">
      <img
        class="player-image"
        src="${escapeHtml(player.imageUrl)}"
        alt="${escapeHtml(
          player.imageUrl === DEFAULT_PLAYER_IMAGE_URL ? 'Default player avatar' : `${player.name} portrait`
        )}"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    </div>
    <div class="card-top">
      <div class="ovr">${rating}</div>
      <div class="position-pill">${player.position}</div>
    </div>
    <h3 class="player-name">${escapeHtml(player.name)}</h3>
    <div class="stats">
      ${STATS.map((stat) => `<span><b>${stat}</b><em>${player.stats[stat]}</em></span>`).join('')}
    </div>
  `;

  card.addEventListener('click', () => {
    const isSelected = handleSelection(player.id);
    card.classList.toggle('selected', isSelected);
  });

  const imageElement = card.querySelector('.player-image');
  imageElement.addEventListener('error', () => {
    if (imageElement.dataset.fallbackApplied === 'true') return;
    imageElement.dataset.fallbackApplied = 'true';
    imageElement.src = DEFAULT_PLAYER_IMAGE_URL;
  });

  return card;
}

function renderPlayerCards({ animateNewId = null } = {}) {
  playerGrid.innerHTML = '';
  players.forEach((player, index) => {
    const card = createPlayerCard(player, index, animateNewId === player.id);
    playerGrid.appendChild(card);
  });
}

function handleSelection(playerId) {
  const player = players.find((entry) => entry.id === playerId);
  if (!player) return false;

  player.selected = !player.selected;
  savePlayersToLocalStorage();
  return player.selected;
}

function shufflePlayers(list) {
  const arr = [...list];
  // Fisher-Yates shuffle for unbiased random ordering.
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function splitTeams(selectedPlayers) {
  const shuffled = shufflePlayers(selectedPlayers);
  const baseSize = Math.floor(shuffled.length / 2);
  const remainder = shuffled.length % 2;

  let teamASize = baseSize;
  let teamBSize = baseSize;

  if (remainder) {
    if (Math.random() < 0.5) {
      teamASize += 1;
    } else {
      teamBSize += 1;
    }
  }

  const teamA = shuffled.slice(0, teamASize);
  const teamB = shuffled.slice(teamASize, teamASize + teamBSize);
  return { teamA, teamB };
}

function animatePreShuffle(selectedIds) {
  const cards = [...document.querySelectorAll('.player-card')].filter((card) =>
    selectedIds.has(card.dataset.id)
  );

  cards.forEach((card) => card.classList.add('shuffling'));
  return new Promise((resolve) => {
    setTimeout(() => {
      cards.forEach((card) => card.classList.remove('shuffling'));
      resolve();
    }, SHUFFLE_ANIMATION_DURATION_MS);
  });
}

function animateTeamGrouping(teamAIds, teamBIds) {
  const selectedIds = new Set(players.filter((player) => player.selected).map((player) => player.id));
  const cards = [...document.querySelectorAll('.player-card')];
  cards.forEach((card) => {
    card.classList.remove('split-left', 'split-right');
    if (!selectedIds.has(card.dataset.id)) return;

    if (teamAIds.has(card.dataset.id)) card.classList.add('split-left');
    if (teamBIds.has(card.dataset.id)) card.classList.add('split-right');
  });
}

function renderTeams(teamA, teamB) {
  teamAList.innerHTML = teamA
    .map((p) => `<li><span>${escapeHtml(p.name)}</span><strong>${calculateWeightedRating(p.position, p.stats)}</strong></li>`)
    .join('');

  teamBList.innerHTML = teamB
    .map((p) => `<li><span>${escapeHtml(p.name)}</span><strong>${calculateWeightedRating(p.position, p.stats)}</strong></li>`)
    .join('');
}

function validateStat(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 100;
}

function showMessage(message, type = '') {
  formMessage.textContent = message;
  formMessage.className = type;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

addPlayerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(addPlayerForm);
  const name = String(formData.get('name') || '').trim();
  const position = String(formData.get('position') || '').toUpperCase();
  const imageUrl = sanitizeImageUrl(formData.get('imageUrl'));

  const stats = {
    PAC: Number(formData.get('pac')),
    SHO: Number(formData.get('sho')),
    PAS: Number(formData.get('pas')),
    DRI: Number(formData.get('dri')),
    DEF: Number(formData.get('def')),
    PHY: Number(formData.get('phy')),
  };

  if (!name) {
    showMessage('Please enter a player name.', 'error');
    return;
  }

  if (!POSITION_WEIGHTS[position]) {
    showMessage('Please choose a valid position.', 'error');
    return;
  }

  for (const stat of STATS) {
    if (!validateStat(stats[stat])) {
      showMessage(`Invalid ${STAT_LABELS[stat]}. Enter an integer between 0 and 100.`, 'error');
      return;
    }
  }

  const newPlayer = {
    id: crypto.randomUUID(),
    name,
    position,
    stats,
    imageUrl,
    selected: false,
  };

  players = [...players, newPlayer];
  savePlayersToLocalStorage();
  renderPlayerCards({ animateNewId: newPlayer.id });

  addPlayerForm.reset();
  showMessage(`Added ${name} successfully.`, 'success');
});

splitTeamsBtn.addEventListener('click', async () => {
  const selectedPlayers = players.filter((player) => player.selected);

  if (selectedPlayers.length < 2) {
    showMessage('Select at least 2 players to split teams.', 'error');
    return;
  }

  await animatePreShuffle(new Set(selectedPlayers.map((player) => player.id)));
  const { teamA, teamB } = splitTeams(selectedPlayers);
  const teamAIds = new Set(teamA.map((p) => p.id));
  const teamBIds = new Set(teamB.map((p) => p.id));

  animateTeamGrouping(teamAIds, teamBIds);
  renderTeams(teamA, teamB);
  showMessage('Teams generated successfully.', 'success');
});

loadPlayersFromLocalStorage();
renderPlayerCards();
