// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');

// ==================== AUTH FUNCTIONS ====================

async function doRegister() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;

  if (!name || !email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      showToast('Registered successfully!', 'success');
      closeModal('registerModal');
      loadDashboard();
    } else {
      showToast(data.error || 'Registration failed', 'error');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      showToast('Logged in successfully!', 'success');
      closeModal('loginModal');
      loadDashboard();
    } else {
      showToast(data.error || 'Login failed', 'error');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function doLogout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  authToken = null;
  showToast('Logged out', 'success');
  location.reload();
}

// ==================== PAGE NAVIGATION ====================

function showPage(pageName, element) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  document.getElementById(`page-${pageName}`).classList.add('active');
  if (element) element.classList.add('active');

  // Update breadcrumb
  const breadcrumb = document.getElementById('breadcrumb');
  breadcrumb.innerHTML = `Z Admin / <span>${pageName.charAt(0).toUpperCase() + pageName.slice(1)}</span>`;

  // Load page data
  if (pageName === 'dashboard') loadDashboard();
  if (pageName === 'imoveis') loadProperties();
  if (pageName === 'leads') loadLeads();
  if (pageName === 'equipa') loadTeam();
}

// ==================== DASHBOARD ====================

async function loadDashboard() {
  if (!authToken) return;

  try {
    const response = await fetch(`${API_BASE_URL}/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const stats = await response.json();

    const statsGrid = document.querySelector('.stats-grid');
if (!statsGrid) return;
statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon gold">🏠</div>
          <span class="stat-change up">▲ 12%</span>
        </div>
        <div class="stat-value">${stats.activeProperties}</div>
        <div class="stat-label">Imóveis ativos</div>
      </div>
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon green">✉</div>
          <span class="stat-change up">▲ 28%</span>
        </div>
        <div class="stat-value">${stats.newLeads}</div>
        <div class="stat-label">Leads novos</div>
      </div>
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon blue">€</div>
          <span class="stat-change up">▲ 8%</span>
        </div>
        <div class="stat-value">€${(stats.volumeInPortfolio / 1000000).toFixed(1)}M</div>
        <div class="stat-label">Volume em carteira</div>
      </div>
      <div class="stat-card">
        <div class="stat-top">
          <div class="stat-icon red">👁</div>
          <span class="stat-change down">▼ 3%</span>
        </div>
        <div class="stat-value">${stats.totalLeads}</div>
        <div class="stat-label">Total de leads</div>
      </div>
    `;

    generateBarChart();
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

function generateBarChart() {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const data = [12, 19, 8, 15, 24, 18];
  
  const barChart = document.getElementById('barChart');
  barChart.innerHTML = '';

  data.forEach((value, index) => {
    const barWrap = document.createElement('div');
    barWrap.className = 'bar-wrap';
    barWrap.innerHTML = `
      <div class="bar" style="height: ${(value / 24) * 100}%; background: #B8935A;"></div>
      <div class="bar-label">${months[index]}</div>
    `;
    barChart.appendChild(barWrap);
  });
}

// ==================== PROPERTIES ====================

async function loadProperties() {
  if (!authToken) return;

  try {
    const response = await fetch(`${API_BASE_URL}/properties`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const properties = await response.json();

    const tableBody = document.querySelector('table tbody') || createPropertiesTable();
    tableBody.innerHTML = properties.map(prop => `
      <tr>
        <td>
          <div class="prop-cell">
            <div class="prop-thumb"></div>
            <div>
              <div class="prop-name">${prop.title}</div>
              <div class="prop-loc">${prop.location}</div>
            </div>
          </div>
        </td>
        <td class="td-muted">€${prop.price.toLocaleString()}</td>
        <td class="td-muted">${prop.bedrooms || '-'} bed</td>
        <td class="td-muted">${prop.area || '-'} m²</td>
        <td><span class="badge ${prop.status}">${prop.status}</span></td>
        <td class="td-muted">${new Date(prop.createdAt).toLocaleDateString('pt-PT')}</td>
        <td>
          <div class="row-actions">
            <button class="action-btn" onclick="editProperty('${prop._id}')">✎</button>
            <button class="action-btn danger" onclick="deleteProperty('${prop._id}')">✕</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading properties:', error);
  }
}

function createPropertiesTable() {
  const container = document.querySelector('.table-wrap') || document.querySelector('.card-body');
  if (!container) return;

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Propriedade</th>
        <th>Preço</th>
        <th>Quartos</th>
        <th>Área</th>
        <th>Status</th>
        <th>Data</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  container.appendChild(table);
  return table.querySelector('tbody');
}

async function openAddModal() {
  if (!authToken) {
    showToast('Please login first', 'error');
    return;
  }

  const modal = document.getElementById('propertyModal') || createPropertyModal();
  modal.querySelector('.modal-title').textContent = 'Novo Imóvel';
  document.getElementById('propId').value = '';
  document.getElementById('propForm').reset();
  modal.classList.add('open');
}

function createPropertyModal() {
  const modal = document.createElement('div');
  modal.id = 'propertyModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <div class="modal-title">Novo Imóvel</div>
        <button class="modal-close" onclick="closeModal('propertyModal')">✕</button>
      </div>
      <form id="propForm" onsubmit="saveProperty(event)">
        <div class="modal-body">
          <input type="hidden" id="propId">
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">Título</label>
              <input type="text" id="propTitle" class="form-input" required>
            </div>
            <div class="form-field">
              <label class="form-label">Localização</label>
              <input type="text" id="propLocation" class="form-input" required>
            </div>
            <div class="form-field">
              <label class="form-label">Preço</label>
              <input type="number" id="propPrice" class="form-input" required>
            </div>
            <div class="form-field">
              <label class="form-label">Tipo</label>
              <select id="propType" class="form-input" required>
                <option>apartment</option>
                <option>house</option>
                <option>penthouse</option>
                <option>villa</option>
              </select>
            </div>
            <div class="form-field">
              <label class="form-label">Quartos</label>
              <input type="number" id="propBedrooms" class="form-input">
            </div>
            <div class="form-field">
              <label class="form-label">Casa de Banho</label>
              <input type="number" id="propBathrooms" class="form-input">
            </div>
            <div class="form-field">
              <label class="form-label">Área (m²)</label>
              <input type="number" id="propArea" class="form-input">
            </div>
            <div class="form-field">
              <label class="form-label">Status</label>
              <select id="propStatus" class="form-input">
                <option>active</option>
                <option>pending</option>
                <option>sold</option>
                <option>inactive</option>
              </select>
            </div>
            <div class="form-field full">
              <label class="form-label">Descrição</label>
              <textarea id="propDescription" class="form-input"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-sm outline" onclick="closeModal('propertyModal')">Cancelar</button>
          <button type="submit" class="btn-sm gold">Guardar</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal('propertyModal');
  });
  return modal;
}

async function saveProperty(event) {
  event.preventDefault();
  if (!authToken) {
    showToast('Please login first', 'error');
    return;
  }

  const propId = document.getElementById('propId').value;
  const data = {
    title: document.getElementById('propTitle').value,
    location: document.getElementById('propLocation').value,
    price: parseFloat(document.getElementById('propPrice').value),
    type: document.getElementById('propType').value,
    bedrooms: parseInt(document.getElementById('propBedrooms').value) || 0,
    bathrooms: parseInt(document.getElementById('propBathrooms').value) || 0,
    area: parseInt(document.getElementById('propArea').value) || 0,
    status: document.getElementById('propStatus').value,
    description: document.getElementById('propDescription').value,
  };

  try {
    const url = propId ? `${API_BASE_URL}/properties/${propId}` : `${API_BASE_URL}/properties`;
    const method = propId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      showToast(propId ? 'Property updated!' : 'Property created!', 'success');
      closeModal('propertyModal');
      loadProperties();
    } else {
      const error = await response.json();
      showToast(error.error || 'Error saving property', 'error');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteProperty(propId) {
  if (!confirm('Are you sure?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/properties/${propId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    if (response.ok) {
      showToast('Property deleted!', 'success');
      loadProperties();
    } else {
      showToast('Error deleting property', 'error');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ==================== LEADS ====================

async function loadLeads() {
  if (!authToken) return;

  try {
    const response = await fetch(`${API_BASE_URL}/leads`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const leads = await response.json();

    const leadsContainer = document.querySelector('.leads-grid') || createLeadsContainer();
    const leadsListHtml = leads.map(lead => `
      <div class="lead-card" onclick="selectLead('${lead._id}')">
        <div class="lead-card-top">
          <div class="lead-name">${lead.name}</div>
          <div class="lead-time">${new Date(lead.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="lead-subject">${lead.subject || 'No subject'}</div>
        <div class="lead-preview">${lead.message.substring(0, 100)}...</div>
        <div class="lead-footer">
          <span class="badge ${lead.status}">${lead.status}</span>
        </div>
      </div>
    `).join('');

    const listContainer = leadsContainer.querySelector('.lead-cards-list');
    if (listContainer) {
      listContainer.innerHTML = leadsListHtml;
    }
  } catch (error) {
    console.error('Error loading leads:', error);
  }
}

function createLeadsContainer() {
  const container = document.querySelector('.leads-grid');
  if (!container) {
    const div = document.createElement('div');
    div.className = 'leads-grid';
    div.innerHTML = `
      <div class="lead-cards-list"></div>
      <div class="lead-detail"></div>
    `;
    return div;
  }
  return container;
}

async function selectLead(leadId) {
  if (!authToken) return;

  try {
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const lead = await response.json();

    const detail = document.querySelector('.lead-detail');
    detail.innerHTML = `
      <div class="lead-detail-header">
        <div class="lead-detail-avatar">${lead.name[0].toUpperCase()}</div>
        <div class="lead-detail-name">${lead.name}</div>
        <div class="lead-detail-contact">${lead.email}<br>${lead.phone || ''}</div>
      </div>
      <div class="lead-detail-body">
        <div class="detail-section-title">Mensagem</div>
        <div class="lead-message-box">${lead.message}</div>
        <div class="detail-section-title">Status</div>
        <div class="detail-field">
          <span class="detail-field-label">Status</span>
          <select id="leadStatus" class="form-input" onchange="updateLeadStatus('${lead._id}', this.value)">
            <option value="new" ${lead.status === 'new' ? 'selected' : ''}>Novo</option>
            <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contactado</option>
            <option value="qualified" ${lead.status === 'qualified' ? 'selected' : ''}>Qualificado</option>
            <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>Fechado</option>
          </select>
        </div>
      </div>
      <div class="lead-actions-panel">
        <button class="btn-sm gold" onclick="replyToLead('${lead._id}')">Responder</button>
        <button class="btn-sm outline" onclick="viewLeadDetails('${lead._id}')">Ver Detalhes</button>
      </div>
    `;

    document.querySelectorAll('.lead-card').forEach(card => card.classList.remove('selected'));
    event.target.closest('.lead-card')?.classList.add('selected');
  } catch (error) {
    console.error('Error loading lead:', error);
  }
}

async function updateLeadStatus(leadId, status) {
  if (!authToken) return;

  try {
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      showToast('Lead status updated!', 'success');
      loadLeads();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function replyToLead(leadId) {
  showToast('Reply feature coming soon', 'success');
}

function viewLeadDetails(leadId) {
  showToast('Details feature coming soon', 'success');
}

// ==================== TEAM ====================

async function loadTeam() {
  if (!authToken) return;

  try {
    const response = await fetch(`${API_BASE_URL}/team`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const team = await response.json();

    const teamGrid = document.querySelector('.team-grid') || createTeamGrid();
    teamGrid.innerHTML = team.map(member => `
      <div class="team-card">
        <div class="team-photo">
          <div class="team-photo-inner">${member.name[0].toUpperCase()}</div>
        </div>
        <div class="team-info" style="padding: 20px;">
          <h3 style="font-size: 1rem; margin-bottom: 4px;">${member.name}</h3>
          <p style="font-size: 0.8rem; color: #999; margin-bottom: 12px;">${member.role}</p>
          <p style="font-size: 0.85rem; color: #666;">${member.email}</p>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading team:', error);
  }
}

function createTeamGrid() {
  const grid = document.createElement('div');
  grid.className = 'team-grid';
  document.querySelector('.content') ? document.querySelector('.content').appendChild(grid) : null;
  return grid;
}

// ==================== UI UTILITIES ====================

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar?.classList.toggle('open');
  overlay?.classList.toggle('open');
}

function showNotifications() {
  showToast('You have 3 new notifications', 'success');
}

function globalSearch(query) {
  console.log('Search:', query);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  // Load theme preference
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Check if user is logged in
  const currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    const user = JSON.parse(currentUser);
    const adminName = document.querySelector('.admin-name');
    if (adminName) adminName.textContent = user.name;
    loadDashboard();
  }
});
