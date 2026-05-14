const DEFAULT_API_BASE_URL = 'http://192.168.1.100:5001';
const STORAGE_KEY = 'mentecart_admin_session';

const state = {
  apiBaseUrl: localStorage.getItem('mentecart_api_base_url') || DEFAULT_API_BASE_URL,
  token: null,
  role: null,
  user: null,
  services: [],
  bookings: [],
};

const elements = {
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  loginPanel: document.getElementById('loginPanel'),
  dashboardPanel: document.getElementById('dashboardPanel'),
  authTitle: document.getElementById('authTitle'),
  authEyebrow: document.getElementById('authEyebrow'),
  loginTab: document.getElementById('loginTab'),
  registerTab: document.getElementById('registerTab'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  serviceForm: document.getElementById('serviceForm'),
  authMessage: document.getElementById('authMessage'),
  serviceMessage: document.getElementById('serviceMessage'),
  sessionState: document.getElementById('sessionState'),
  roleState: document.getElementById('roleState'),
  serviceCount: document.getElementById('serviceCount'),
  bookingMessage: document.getElementById('bookingMessage'),
  bookingsList: document.getElementById('bookingsList'),
  servicesList: document.getElementById('servicesList'),
  logoutBtn: document.getElementById('logoutBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  refreshBookingsBtn: document.getElementById('refreshBookingsBtn'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  registerEmail: document.getElementById('registerEmail'),
  registerPassword: document.getElementById('registerPassword'),
  title: document.getElementById('title'),
  description: document.getElementById('description'),
  price: document.getElementById('price'),
  duration: document.getElementById('duration'),
  category: document.getElementById('category'),
  capacityPerSlot: document.getElementById('capacityPerSlot'),
  image: document.getElementById('image'),
};

const authMode = {
  value: 'login',
};

function saveSession() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    token: state.token,
    role: state.role,
    user: state.user,
    apiBaseUrl: state.apiBaseUrl,
  }));
}

function restoreSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const session = JSON.parse(raw);
    state.token = session.token || null;
    state.role = session.role || null;
    state.user = session.user || null;
    if (session.apiBaseUrl) {
      state.apiBaseUrl = session.apiBaseUrl;
    }
  } catch (_) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function setMessage(element, text, kind = 'info') {
  element.textContent = text || '';
  element.dataset.kind = kind;
}

function setLoggedInView(isLoggedIn) {
  elements.loginPanel.classList.toggle('hidden', isLoggedIn);
  elements.dashboardPanel.classList.toggle('hidden', !isLoggedIn);
  elements.sessionState.textContent = isLoggedIn ? 'Active' : 'Logged out';
  elements.roleState.textContent = state.role || '-';
  elements.serviceCount.textContent = String(state.services.length);
}

function setAuthMode(mode) {
  authMode.value = mode;
  const isLogin = mode === 'login';

  elements.loginForm.classList.toggle('hidden', !isLogin);
  elements.registerForm.classList.toggle('hidden', isLogin);
  elements.loginTab.classList.toggle('active', isLogin);
  elements.registerTab.classList.toggle('active', !isLogin);
  elements.authEyebrow.textContent = isLogin ? 'Admin Login' : 'Admin Register';
  elements.authTitle.textContent = isLogin ? 'Welcome back' : 'Create an admin account';
  elements.loginForm.querySelector('button[type="submit"]').textContent = isLogin ? 'Sign In' : 'Create Account';
}

function normalizeApiBaseUrl(value) {
  return value.replace(/\/$/, '');
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch (_) {
    return null;
  }
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${state.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = body && body.message ? body.message : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}

function renderServices() {
  if (!state.services.length) {
    elements.servicesList.innerHTML = '<div class="service-card"><strong>No services yet</strong><div class="meta">Create the first one using the form.</div></div>';
    elements.serviceCount.textContent = '0';
    return;
  }

  elements.serviceCount.textContent = String(state.services.length);
  elements.servicesList.innerHTML = state.services.map((service) => {
    const title = service.title || 'Untitled service';
    const description = service.description || '';
    const price = service.price != null ? `Rs ${service.price}` : 'No price';
    const duration = service.duration != null ? `${service.duration} min` : 'No duration';
    const category = service.category || 'uncategorized';
    const capacity = service.capacityPerSlot != null ? `Capacity ${service.capacityPerSlot}` : 'No capacity';

    return `
      <article class="service-card">
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(description)}</p>
        <div class="meta">
          <span class="price">${escapeHtml(price)}</span>
          <span>${escapeHtml(duration)}</span>
          <span>${escapeHtml(category)}</span>
          <span>${escapeHtml(capacity)}</span>
        </div>
      </article>
    `;
  }).join('');
}

function renderBookings() {
  if (!state.bookings.length) {
    elements.bookingsList.innerHTML = '<div class="booking-card"><strong>No bookings yet</strong><div class="meta">Bookings created by users will appear here.</div></div>';
    return;
  }

  elements.bookingsList.innerHTML = state.bookings.map((booking) => {
    const bookingId = booking._id ? String(booking._id) : '';
    const shortId = bookingId.length >= 8 ? bookingId.slice(0, 8) : bookingId;
    const status = booking.status || 'unknown';
    const paymentStatus = booking.paymentStatus || 'unknown';
    const paymentMethod = booking.paymentMethod || 'unknown';
    const customer = booking.userId && typeof booking.userId === 'object'
      ? (booking.userId.email || 'customer')
      : 'customer';
    const itemCount = Array.isArray(booking.items) ? booking.items.length : 0;
    const canComplete = status === 'confirmed';
    const canFail = status !== 'completed' && status !== 'cancelled' && status !== 'failed';

    return `
      <article class="booking-card">
        <h4>Booking #${escapeHtml(shortId || 'N/A')}</h4>
        <p>${escapeHtml(customer)}</p>
        <div class="meta">
          <span>${escapeHtml(status)}</span>
          <span>${escapeHtml(paymentStatus)}</span>
          <span>${escapeHtml(paymentMethod)}</span>
          <span>${escapeHtml(itemCount)} item(s)</span>
        </div>
        <div class="booking-actions">
          ${canComplete ? `<button class="ghost-btn" data-complete-booking="${escapeHtml(bookingId)}" type="button">Mark completed</button>` : ''}
          ${canFail ? `<button class="ghost-btn danger" data-fail-booking="${escapeHtml(bookingId)}" type="button">Mark failed</button>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadServices() {
  const response = await request('/services?page=1&limit=100', { method: 'GET' });
  state.services = Array.isArray(response.data) ? response.data : [];
  renderServices();
}

async function loadBookings() {
  const response = await request('/bookings/admin?page=1&limit=100', { method: 'GET' });
  state.bookings = Array.isArray(response.data) ? response.data : [];
  renderBookings();
}

async function updateBookingStatus(bookingId, action) {
  await request(`/bookings/${bookingId}/${action}`, { method: 'POST' });
  await loadBookings();
}

async function handleLogin(event) {
  event.preventDefault();
  setMessage(elements.authMessage, 'Signing in...');

  try {
    const email = elements.email.value.trim();
    const password = elements.password.value;
    const baseUrl = normalizeApiBaseUrl(elements.apiBaseUrl.value.trim() || DEFAULT_API_BASE_URL);

    state.apiBaseUrl = baseUrl;
    localStorage.setItem('mentecart_api_base_url', baseUrl);

    const response = await fetch(`${state.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const token = data.token;
    const userRole = data.user?.role || decodeJwtPayload(token)?.role || null;

    state.token = token;
    state.role = userRole || 'user';
    state.user = data.user || null;
    saveSession();

    setMessage(elements.authMessage, 'Logged in successfully.', 'success');
    await loadServices();
    setLoggedInView(true);
  } catch (error) {
    state.token = null;
    state.role = null;
    state.user = null;
    localStorage.removeItem(STORAGE_KEY);
    setMessage(elements.authMessage, error.message || 'Unable to login', 'error');
    setLoggedInView(false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  setMessage(elements.authMessage, 'Creating account...');

  try {
    const email = elements.registerEmail.value.trim();
    const password = elements.registerPassword.value;
    const baseUrl = normalizeApiBaseUrl(elements.apiBaseUrl.value.trim() || DEFAULT_API_BASE_URL);

    state.apiBaseUrl = baseUrl;
    localStorage.setItem('mentecart_api_base_url', baseUrl);

    const response = await fetch(`${state.apiBaseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'admin' }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    const token = data.token;
    const userRole = data.user?.role || decodeJwtPayload(token)?.role || null;

    state.token = token;
    state.role = userRole || 'user';
    state.user = data.user || null;

    saveSession();
    setMessage(elements.authMessage, 'Account created successfully.', 'success');
    await loadServices();
    setLoggedInView(true);
  } catch (error) {
    state.token = null;
    state.role = null;
    state.user = null;
    localStorage.removeItem(STORAGE_KEY);
    setMessage(elements.authMessage, error.message || 'Unable to register', 'error');
    setLoggedInView(false);
  }
}

async function handleCreateService(event) {
  event.preventDefault();
  setMessage(elements.serviceMessage, 'Creating service...');

  try {
    const payload = {
      title: elements.title.value.trim(),
      description: elements.description.value.trim(),
      price: Number(elements.price.value),
      duration: Number(elements.duration.value),
      category: elements.category.value.trim(),
      capacityPerSlot: Number(elements.capacityPerSlot.value),
    };

    const image = elements.image.value.trim();
    if (image) {
      payload.image = image;
    }

    await request('/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setMessage(elements.serviceMessage, 'Service created successfully.', 'success');
    elements.serviceForm.reset();
    await loadServices();
  } catch (error) {
    setMessage(elements.serviceMessage, error.message || 'Unable to create service', 'error');
  }
}

function handleLogout() {
  state.token = null;
  state.role = null;
  state.user = null;
  state.services = [];
  state.bookings = [];
  localStorage.removeItem(STORAGE_KEY);
  setMessage(elements.authMessage, '');
  setMessage(elements.serviceMessage, '');
  setMessage(elements.bookingMessage, '');
  renderServices();
  renderBookings();
  setLoggedInView(false);
}

function bindEvents() {
  elements.apiBaseUrl.value = state.apiBaseUrl;
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.registerForm.addEventListener('submit', handleRegister);
  elements.serviceForm.addEventListener('submit', handleCreateService);
  elements.logoutBtn.addEventListener('click', handleLogout);
  elements.refreshBtn.addEventListener('click', async () => {
    try {
      await loadServices();
      setMessage(elements.serviceMessage, 'Service list refreshed.', 'success');
    } catch (error) {
      setMessage(elements.serviceMessage, error.message || 'Unable to refresh services', 'error');
    }
  });
  elements.refreshBookingsBtn.addEventListener('click', async () => {
    try {
      await loadBookings();
      setMessage(elements.bookingMessage, 'Booking list refreshed.', 'success');
    } catch (error) {
      setMessage(elements.bookingMessage, error.message || 'Unable to refresh bookings', 'error');
    }
  });
  elements.apiBaseUrl.addEventListener('change', () => {
    state.apiBaseUrl = normalizeApiBaseUrl(elements.apiBaseUrl.value.trim() || DEFAULT_API_BASE_URL);
    localStorage.setItem('mentecart_api_base_url', state.apiBaseUrl);
  });
  elements.loginTab.addEventListener('click', () => setAuthMode('login'));
  elements.registerTab.addEventListener('click', () => setAuthMode('register'));
  elements.bookingsList.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const completeBookingId = target.dataset.completeBooking;
    const failBookingId = target.dataset.failBooking;

    try {
      if (completeBookingId) {
        await updateBookingStatus(completeBookingId, 'complete');
        setMessage(elements.bookingMessage, 'Booking marked as completed.', 'success');
      }

      if (failBookingId) {
        await updateBookingStatus(failBookingId, 'fail');
        setMessage(elements.bookingMessage, 'Booking marked as failed.', 'success');
      }
    } catch (error) {
      setMessage(elements.bookingMessage, error.message || 'Unable to update booking', 'error');
    }
  });
}

async function boot() {
  restoreSession();
  bindEvents();

  if (!state.apiBaseUrl) {
    state.apiBaseUrl = DEFAULT_API_BASE_URL;
  }

  elements.apiBaseUrl.value = state.apiBaseUrl;
  setAuthMode('login');
  setLoggedInView(Boolean(state.token && state.role === 'admin'));
  renderServices();

  if (state.token && state.role === 'admin') {
    try {
      await loadServices();
      await loadBookings();
      setMessage(elements.authMessage, 'Restored admin session.', 'success');
      setLoggedInView(true);
    } catch (error) {
      setMessage(elements.authMessage, error.message || 'Session expired, please sign in again.', 'error');
      handleLogout();
    }
  }
}

window.addEventListener('DOMContentLoaded', boot);
