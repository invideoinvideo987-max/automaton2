/**
 * Automaton UI - Client-side application logic
 * Connects to the agent backend via WebSocket
 */

// Connect to agent backend
const socket = io('http://localhost:3847');

// State
let isRunning = false;
let thoughtCount = 0;

// ============ SOCKET EVENTS ============

socket.on('connect', () => {
  addActivity('system', 'Connected to agent backend');
  updatePulseDot(true);
});

socket.on('disconnect', () => {
  addActivity('error', 'Disconnected from agent');
  updatePulseDot(false);
});

socket.on('agent:event', (event) => {
  handleAgentEvent(event);
});

socket.on('agent:thought', (thought) => {
  addThoughtCard(thought);
  thoughtCount++;
  updateStat('statThoughts', thoughtCount);
});

socket.on('agent:thinking', (data) => {
  showThinkingIndicator(true);
  updateStatus('thinking');
  addActivity('think', `Thinking: ${data.problem?.substring(0, 50)}...`);
});

socket.on('agent:executing', (data) => {
  addActivity('act', `Executing: ${data.command?.substring(0, 50)}...`);
  addTerminalLine(data.command, 'command');
});

socket.on('agent:wallet', (data) => {
  document.getElementById('walletAddress').textContent = 
    data.address.substring(0, 6) + '...' + data.address.substring(38);
  if (data.isNew) {
    addActivity('success', 'New wallet generated!');
  }
});

// ============ EVENT HANDLERS ============

function handleAgentEvent(event) {
  switch (event.type) {
    case 'start':
      isRunning = true;
      updateControls();
      updateStatus('running');
      addActivity('success', 'Agent started');
      break;
    case 'stop':
      isRunning = false;
      updateControls();
      updateStatus('idle');
      showThinkingIndicator(false);
      addActivity('system', 'Agent stopped');
      break;
    case 'think':
      updateStatus('thinking');
      showThinkingIndicator(true);
      break;
    case 'act':
      updateStatus('running');
      showThinkingIndicator(false);
      break;
    case 'observe':
      break;
    case 'idle':
      updateStatus('idle');
      showThinkingIndicator(false);
      addActivity('system', event.data?.reason || 'Idle');
      break;
    case 'error':
      updateStatus('error');
      showThinkingIndicator(false);
      addActivity('error', event.data?.message || 'Error occurred');
      break;
  }
}

// ============ UI UPDATES ============

function updateStatus(status) {
  const statusEl = document.getElementById('agentStatus');
  const ring = document.getElementById('statusRing');
  
  statusEl.textContent = status.toUpperCase();
  ring.className = 'avatar-ring ' + status;
  
  const statusColors = {
    running: 'var(--accent-green)',
    thinking: 'var(--accent-purple)',
    idle: 'var(--accent-blue)',
    error: 'var(--accent-red)',
    sleeping: 'var(--accent-orange)',
  };
  statusEl.style.color = statusColors[status] || 'var(--accent-blue)';
}

function updateControls() {
  document.getElementById('btnStart').classList.toggle('hidden', isRunning);
  document.getElementById('btnStop').classList.toggle('hidden', !isRunning);
}

function showThinkingIndicator(show) {
  document.getElementById('thinkingIndicator').classList.toggle('hidden', !show);
}

function updatePulseDot(connected) {
  const dot = document.getElementById('pulseDot');
  dot.style.background = connected ? 'var(--accent-green)' : 'var(--accent-red)';
}

function updateStat(id, value) {
  document.getElementById(id).textContent = value;
}

// ============ THOUGHT CARDS ============

function addThoughtCard(thought) {
  const stream = document.getElementById('thoughtsStream');
  
  // Remove placeholder
  const placeholder = stream.querySelector('.thought-placeholder');
  if (placeholder) placeholder.remove();
  
  const card = document.createElement('div');
  card.className = `thought-card ${thought.type}`;
  
  const time = new Date(thought.timestamp).toLocaleTimeString();
  const duration = thought.duration ? `${thought.duration}ms` : '';
  
  // Truncate output for display
  let output = thought.output;
  try {
    const parsed = JSON.parse(output);
    output = JSON.stringify(parsed, null, 2);
  } catch {}
  if (output.length > 500) output = output.substring(0, 500) + '...';
  
  card.innerHTML = `
    <div class="thought-header">
      <span class="thought-type ${thought.type}">${thought.type}</span>
      <span class="thought-time">${time}</span>
    </div>
    <div class="thought-input">${escapeHtml(thought.input.substring(0, 200))}</div>
    <div class="thought-output">${escapeHtml(output)}</div>
    ${duration ? `<div class="thought-duration">⏱ ${duration}</div>` : ''}
  `;
  
  stream.appendChild(card);
  stream.scrollTop = stream.scrollHeight;
}

// ============ ACTIVITY FEED ============

function addActivity(type, text) {
  const feed = document.getElementById('activityFeed');
  const time = new Date().toLocaleTimeString().substring(0, 5);
  
  const item = document.createElement('div');
  item.className = `activity-item ${type}`;
  item.innerHTML = `
    <span class="activity-time">${time}</span>
    <span class="activity-text">${escapeHtml(text)}</span>
  `;
  
  feed.appendChild(item);
  feed.scrollTop = feed.scrollHeight;
  
  // Keep max 100 items
  while (feed.children.length > 100) {
    feed.removeChild(feed.firstChild);
  }
}

// ============ TERMINAL ============

function addTerminalLine(text, type = 'system') {
  const output = document.getElementById('terminalOutput');
  const prefix = type === 'command' ? '$' : '>';
  
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.innerHTML = `
    <span class="terminal-prefix">${prefix}</span>
    <span>${escapeHtml(text)}</span>
  `;
  
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

// ============ NAVIGATION ============

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = btn.dataset.panel;
    
    // Update nav
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update panels
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${panel}`).classList.add('active');
  });
});

// ============ CONTROLS ============

function startAgent() {
  if (window.automaton) {
    window.automaton.start();
  } else {
    socket.emit('agent:start');
  }
  addActivity('system', 'Starting agent...');
}

function stopAgent() {
  if (window.automaton) {
    window.automaton.stop();
  } else {
    socket.emit('agent:stop');
  }
  addActivity('system', 'Stopping agent...');
}

// ============ UTILITIES ============

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============ PERIODIC STATE REFRESH ============

setInterval(async () => {
  if (window.automaton) {
    const state = await window.automaton.getState();
    if (state) {
      updateStat('statLoops', state.loopCount || 0);
      updateStat('statEarned', `$${(state.totalEarned || 0).toFixed(2)}`);
      updateStat('statSpent', `$${(state.totalSpent || 0).toFixed(2)}`);
      document.getElementById('creditsValue').textContent = (state.credits || 0).toFixed(2);
    }
  }
}, 5000);

// ============ INIT ============
console.log('🤖 Automaton UI loaded');
addActivity('system', 'UI initialized - ready to connect');
