const API_BASE = 'https://meko.tryasp.net';
const PARKING_ID = 'parking_1';
const DEVICE_KEY = 'my_secret_key_123';
let currentDeviceKey = DEVICE_KEY;

const CACHE = {
    dashboard: 'pkfy_dashboard',
    slots: 'pkfy_slots',
    bookings: 'pkfy_bookings',
    users: 'pkfy_users',
    alerts: 'pkfy_alerts',
    notifications: 'pkfy_notifications',
};

function cacheSet(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
}

function cacheGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e) { return null; }
}

function getToken() {
    return localStorage.getItem('parkify_token');
}

function saveAuth(data) {
    localStorage.setItem('parkify_token', data.access_token);
    if (data.user) {
        localStorage.setItem('parkify_user', JSON.stringify(data.user));
    }
}

function clearAuth() {
    localStorage.removeItem('parkify_token');
    localStorage.removeItem('parkify_user');
}

function getUser() {
    try { return JSON.parse(localStorage.getItem('parkify_user')) || {}; }
    catch { return {}; }
}

async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let res;
    try {
        res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } catch(networkErr) {
        throw new Error('Cannot connect to server');
    }

    if ((res.status === 401 || res.status === 403) && !options.skipRedirect) {
        clearAuth();
        window.location.href = 'login.html';
        return null;
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        let message = `Error ${res.status}`;
        if (typeof err.detail === 'string') message = err.detail;
        else if (Array.isArray(err.detail)) message = err.detail.map(e => e.msg).join(', ');
        else if (typeof err.message === 'string') message = err.message;
        throw new Error(message);
    }
    return res.json();
}

function showError(msg) {
    const el = document.getElementById('errorMsg') || document.getElementById('loginError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    else alert(msg);
}

function showSuccess(msg) {
    const el = document.getElementById('successMsg');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function initPasswordToggle() {
    const toggle = document.querySelector('#togglePassword');
    const input  = document.querySelector('#password');
    if (toggle && input) {
        toggle.addEventListener('click', function () {
            const isPass = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPass ? 'text' : 'password');
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
}

function initRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Registering...';

        const errEl = document.getElementById('errorMsg');
        if (errEl) errEl.style.display = 'none';

        const username = document.getElementById('username')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;

        const body = { name: username, email, password };

        try {
            await apiFetch('/api/v1/auth/register', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            const succEl = document.getElementById('successMsg');
            if (succEl) { succEl.textContent = 'Account created! Redirecting to login...'; succEl.style.display = 'block'; }
            setTimeout(() => window.location.href = 'login.html', 1500);
        } catch (err) {
            showError(err.message);
            btn.disabled = false;
            btn.textContent = 'Register';
        }
    });
}

function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;

        try {
            const data = await apiFetch('/api/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            saveAuth(data);
            window.location.href = 'dashboard.html';
        } catch (err) {
            showError(err.message || 'Invalid email or password');
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    });
}

function guardDashboard() {
    if (!getToken()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

let occupancyChartObj = null;
let revenueChartObj = null;

function initDashboardCharts() {
    const occCanvas = document.getElementById('occupancyChart');
    const revCanvas = document.getElementById('revenueChart');
    if (!occCanvas || !revCanvas) return;
    if (typeof Chart === 'undefined') { setTimeout(initDashboardCharts, 500); return; }

    if (occupancyChartObj) { occupancyChartObj.destroy(); occupancyChartObj = null; }
    if (revenueChartObj) { revenueChartObj.destroy(); revenueChartObj = null; }

    const hourLabels = Array.from({length: 25}, (_, i) => String(i).padStart(2,'0') + ':00');
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem('pkfy_occ_chart') || '{}');
    const occData = (stored.date === today && stored.data) ? [...stored.data] : Array(25).fill(null);
    const nowHr = new Date().getHours();
    for (let i = 0; i <= nowHr; i++) { if (occData[i] === null) occData[i] = 0; }

    occupancyChartObj = new Chart(occCanvas, {
        type: 'line',
        data: {
            labels: hourLabels,
            datasets: [{ data: occData, borderColor: '#6b21a8', backgroundColor: 'rgba(107,33,168,0.08)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 }, x: { ticks: { maxTicksLimit: 8 } } } }
    });

    revenueChartObj = new Chart(revCanvas, {
        type: 'bar',
        data: {
            labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
            datasets: [{ data: [0,0,0,0,0,0,0], backgroundColor: '#059669', borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function updateChartsFromBookings(bookings) {
    updateRevenueChart(bookings);
    updateOccupancyChartFromBookings(bookings);
}

function updateRevenueChart(bookings) {
    if (!revenueChartObj) return;
    const revenue = [0,0,0,0,0,0,0];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0,0,0,0);
    bookings.forEach(b => {
        if (!['active', 'completed'].includes(b.status)) return;
        const dateField = b.created_at;
        if (!dateField) return;
        const d = new Date(dateField);
        if (d < startOfWeek) return;
        const idx = (d.getDay() + 6) % 7;
        revenue[idx] += Number(b.amount || b.total_amount || 0);
    });
    revenueChartObj.data.datasets[0].data = revenue;
    revenueChartObj.update('none');
}

function updateOccupancyChartFromBookings(bookings) {
    if (!occupancyChartObj) return;
    const now = new Date();
    const nowHr = now.getHours();
    const todayStr = now.toDateString();
    const totalSlots = parseInt(document.querySelector('.stat-sub')?.textContent?.replace('/ ','')) || 8;
    const occData = Array(25).fill(null);

    for (let h = 0; h <= nowHr; h++) {
        const slotStart = new Date(now); slotStart.setHours(h, 0, 0, 0);
        const slotEnd   = new Date(now); slotEnd.setHours(h, 59, 59, 999);
        const active = bookings.filter(b => {
            if (!b.start_time) return false;
            const s = new Date(b.start_time);
            const e = b.end_time ? new Date(b.end_time) : new Date(s.getTime() + 3600000);
            return s <= slotEnd && e >= slotStart && ['confirmed','active','completed'].includes(b.status);
        }).length;
        occData[h] = Math.min(Math.round((active / totalSlots) * 100), 100);
    }
    occupancyChartObj.data.datasets[0].data = occData;
    occupancyChartObj.update('none');
}

function updateOccupancyChart(pct) {
    if (!occupancyChartObj) return;
    const h = new Date().getHours();
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem('pkfy_occ_chart') || '{}');
    if (stored.date !== today) stored.data = Array(25).fill(null);
    stored.date = today;
    if (!stored.data) stored.data = Array(25).fill(null);
    const existing = stored.data[h];
    if (existing === null || pct > existing) {
        stored.data[h] = pct;
        localStorage.setItem('pkfy_occ_chart', JSON.stringify(stored));
        occupancyChartObj.data.datasets[0].data = [...stored.data];
        occupancyChartObj.update('none');
    }
}

function initProfileDisplay() {
    const user = getUser();
    const name = user.name || user.first_name || 'Admin';
    const email = user.email || 'admin@domain.com';

    const nameTop = document.getElementById('displayUserNameTop');
    const nameDrop = document.getElementById('displayUserNameDropdown');
    const emailDrop = document.getElementById('displayUserEmailDropdown');

    if (nameTop) nameTop.textContent = name;
    if (nameDrop) nameDrop.textContent = name;
    if (emailDrop) emailDrop.textContent = email;

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearAuth();
            window.location.href = 'login.html';
        });
    }
}

function renderDashboardStats(data) {
    const stats = data.data || data;
    const el = (id) => document.getElementById(id);

    const available = stats.available_slots ?? stats.available_spots ?? 0;
    const total     = stats.total_slots     ?? stats.total_spots     ?? 8;
    const occ       = stats.occupancy_rate  ?? (total ? Math.round(((total - available) / total) * 100) : 0);
    const visitors  = stats.active_bookings ?? stats.active_visitors ?? stats.current_visitors ?? 0;

    // statAvailable is updated by updateSpotStats (parking-specific source of truth)
    if (el('statOccupancy')) el('statOccupancy').innerHTML = `${occ}% <span class="stat-sub">Overall</span>`;
    if (el('statVisitors'))  el('statVisitors').innerHTML  = `${visitors} <span class="stat-sub">Currently</span>`;
    if (el('statRevenue') && stats.today_revenue !== undefined) {
        el('statRevenue').innerHTML = `${Number(stats.today_revenue).toFixed(0)} EGP <span class="stat-sub">Today</span>`;
    }

    const pFill = document.querySelector('.progress-fill');
    const pText = document.querySelector('.progress-text');
    if (pFill) pFill.style.width = `${occ}%`;
    if (pText) pText.textContent = `${occ}%`;

    loadFloorList(stats);
    if (stats.recent_bookings) loadRecentBookings(stats.recent_bookings);
}

function updateRevenueFromBookings(bookings) {
    // statRevenue is owned by the dashboard API (renderDashboardStats).
    // Do not overwrite it here to avoid replacing the server value with a local calculation.
}

async function loadDashboardStats() {
    try {
        const data = await apiFetch('/api/v1/admin/dashboard');
        if (!data) return;
        renderDashboardStats(data);
    } catch (err) {}
}

function loadFloorList(stats) {
    const floorList = document.getElementById('floorList');
    if (!floorList) return;
    const available = stats.available_slots ?? stats.available_spots ?? 0;
    const total     = stats.total_slots    ?? stats.total_spots    ?? 8;
    const occupied  = total - available;
    const pct = total ? Math.round((occupied / total) * 100) : 0;
    const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#059669';
    floorList.innerHTML = `
        <div class="floor-item">
            <div class="floor-icon"><i class="fa-solid fa-building"></i></div>
            <div class="floor-details">
                <div class="floor-top">
                    <strong style="font-size:14px;">Ground Floor</strong>
                    <span style="font-size:13px;font-weight:700;color:var(--text-main);">${available} <span style="font-weight:400;color:var(--text-muted);">Available</span></span>
                </div>
                <div class="floor-middle">
                    <span><i class="fa-solid fa-car" style="margin-right:4px;"></i>${occupied} / ${total} spots</span>
                </div>
                <div class="floor-bottom">
                    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${barColor};"></div></div>
                    <span style="font-size:12px;font-weight:600;color:var(--text-muted);">${pct}%</span>
                </div>
            </div>
        </div>`;
}

function renderFloorStatus(slots) {
    const floorList = document.getElementById('floorList');
    if (!floorList) return;
    const floorMap = {};
    slots.forEach(s => {
        const floorNum = s.floor || 1;
        const floorName = floorNum === 1 ? 'Ground Floor' : `Level ${floorNum}`;
        if (!floorMap[floorName]) floorMap[floorName] = { name: floorName, floor: floorNum, total: 0, available: 0, occupied: 0 };
        floorMap[floorName].total++;
        const st = (s.status || 'available').toLowerCase();
        if (st === 'available') floorMap[floorName].available++;
        else floorMap[floorName].occupied++;
    });
    const floors = Object.values(floorMap).sort((a, b) => a.floor - b.floor);
    if (!floors.length) return;
    floorList.innerHTML = floors.map(f => {
        const pct = f.total ? Math.round((f.occupied / f.total) * 100) : 0;
        const barColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#059669';
        const trend = pct > 80 ? `<span style="color:#ef4444;font-size:11px;font-weight:600;">↑ +${pct}%</span>` : pct > 0 ? `<span style="color:#f59e0b;font-size:11px;font-weight:600;">→ ${pct}%</span>` : `<span style="color:#059669;font-size:11px;font-weight:600;">↓ ${pct}%</span>`;
        return `
            <div class="floor-item">
                <div class="floor-icon"><i class="fa-solid fa-building"></i></div>
                <div class="floor-details">
                    <div class="floor-top">
                        <strong style="font-size:14px;">${f.name}</strong>
                        <span style="font-size:13px;font-weight:700;color:var(--text-main);">${f.available} <span style="font-weight:400;color:var(--text-muted);">Available</span></span>
                    </div>
                    <div class="floor-middle">
                        <span><i class="fa-solid fa-car" style="margin-right:4px;"></i>${f.occupied} / ${f.total} spots</span>
                        ${trend}
                    </div>
                    <div class="floor-bottom">
                        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${barColor};"></div></div>
                        <span style="font-size:12px;font-weight:600;color:var(--text-muted);">${pct}%</span>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Occupancy Rate</div>
                </div>
            </div>`;
    }).join('');
}

function loadRecentBookings(bookings) {
    const bookingList = document.getElementById('bookingList');
    if (!bookingList) return;
    const recent = [...bookings].sort((a, b) => new Date(b.created_at||0) - new Date(a.created_at||0)).slice(0, 5);
    if (!recent.length) { bookingList.innerHTML = '<p class="empty-msg" style="color:var(--text-muted);font-size:13px;padding:16px 0;">No recent bookings</p>'; return; }
    bookingList.innerHTML = recent.map(b => {
        const statusCls  = b.status === 'completed' ? 'available' : b.status === 'active' ? 'active' : 'pending';
        const statusIcon = b.status === 'completed' ? '<i class="fa-solid fa-circle-check" style="color:#059669;"></i>' : b.status === 'active' ? '<i class="fa-solid fa-circle" style="color:#6b21a8;font-size:10px;"></i>' : '<i class="fa-regular fa-circle" style="color:#f59e0b;"></i>';
        const user       = b.user_name || b.user?.name || 'Unknown';
        const initial    = user.charAt(0).toUpperCase();
        const location   = b.parking_address || (b.parking_name ? `${b.parking_name} – Slot ${b.slot_number||''}` : `Slot ${b.slot_number || b.slot_id || '—'}`);
        const time       = b.start_time ? new Date(b.start_time).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) : (b.created_at ? new Date(b.created_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) : '--:--');
        const duration   = b.total_hours || b.duration_hours;
        return `
            <div class="booking-item">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:38px;height:38px;background:#f3e8ff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#6b21a8;flex-shrink:0;">${initial}</div>
                    <div>
                        <div style="font-size:14px;font-weight:600;color:var(--text-main);display:flex;align-items:center;gap:6px;">${user} ${statusIcon}</div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:3px;"><i class="fa-solid fa-location-dot" style="margin-right:4px;color:#6b21a8;"></i>${location}</div>
                    </div>
                </div>
                <div class="booking-time">
                    <span style="font-size:13px;font-weight:600;color:var(--text-main);">${time}</span>
                    ${duration ? `<span style="font-size:11px;color:var(--text-muted);margin-top:3px;"><i class="fa-regular fa-clock" style="margin-right:3px;"></i>${duration}h</span>` : ''}
                </div>
            </div>`;
    }).join('');
}

let currentParkingId = localStorage.getItem('parkify_parking_id') || PARKING_ID;
const HTML_SLOT_IDS = new Set(['parking_1_slot_01', 'parking_1_slot_02', 'parking_1_slot_03', 'parking_1_slot_04', 'parking_1_slot_05', 'parking_1_slot_06', 'parking_1_slot_07', 'parking_1_slot_08']);

function filterMySlots(slots) {
    return slots.filter(s => {
        const slotNum = s.slot_number || '';
        if (s.slot_id && HTML_SLOT_IDS.has(s.slot_id)) return true;
        if (s.id && HTML_SLOT_IDS.has(s.id)) return true;
        if (slotNum && HTML_SLOT_IDS.has(`parking_1_slot_${slotNum}`)) return true;
        return false;
    });
}

async function loadParkingSpots() {
    try {
        const parkingsData = await apiFetch('/api/v1/admin/parkings');
        if (!parkingsData) return;
        const parkings = parkingsData.data || parkingsData.parkings || parkingsData;
        if (!parkings.length) return;
        const parking = parkings[0];
        currentParkingId = parking.id || parking.parking_id || PARKING_ID;
        if (parking.device_key) currentDeviceKey = parking.device_key;
        localStorage.setItem('parkify_parking_id', currentParkingId);

        // Try slots API
        let allSlots = [];
        const slotsData = await apiFetch(`/api/v1/admin/parkings/${currentParkingId}/slots`);
        if (slotsData) {
            const raw = slotsData.data || slotsData.slots || slotsData;
            if (Array.isArray(raw)) allSlots = raw;
        }

        // If slots API returned nothing, build 8 virtual slots (all available)
        if (!allSlots.length) {
            allSlots = [1,2,3,4,5,6,7,8].map(n => ({ slot_number: String(n), id: null, status: 'available' }));
        }

        // Populate slotUuidMap from slots API data
        allSlots.forEach(s => {
            const slotNum = String(s.slot_number || '');
            const apiId = s.id;
            if (!apiId || !slotNum) return;
            slotUuidMap[`parking_1_slot_${slotNum}`] = apiId;
            slotUuidMap[`parking_1_slot_${slotNum.padStart(2,'0')}`] = apiId;
            slotUuidMap[slotNum] = apiId;
            slotUuidMap[slotNum.padStart(2,'0')] = apiId;
        });

        // Cross-reference with active bookings to mark reserved/occupied slots
        try {
            const bData = await apiFetch('/api/v1/admin/bookings');
            const bookings = bData?.data || bData?.bookings || bData || [];
            bookings.forEach(b => {
                const bStatus = (b.status || '').toLowerCase();
                if (!['confirmed', 'active', 'reserved', 'pending', 'checked_in'].includes(bStatus)) return;
                const newStatus = ['active', 'checked_in'].includes(bStatus) ? 'occupied' : 'reserved';
                // Also fill slotUuidMap from booking data (bookings know slot UUIDs)
                if (b.slot_id && b.slot_number) {
                    const sn = String(b.slot_number);
                    slotUuidMap[`parking_1_slot_${sn}`] = b.slot_id;
                    slotUuidMap[`parking_1_slot_${sn.padStart(2,'0')}`] = b.slot_id;
                    slotUuidMap[sn] = b.slot_id;
                    slotUuidMap[sn.padStart(2,'0')] = b.slot_id;
                }
                const slot = allSlots.find(s =>
                    (b.slot_id && s.id === b.slot_id) ||
                    (b.slot_number && parseInt(s.slot_number, 10) === parseInt(b.slot_number, 10))
                );
                if (slot) slot.status = newStatus;
            });
        } catch(e) {}

        allSlots.forEach(s => {
            const slotNum = String(s.slot_number || '');
            const htmlId = slotNum ? `parking_1_slot_${slotNum.padStart(2,'0')}` : (s.slot_id || s.id || '');
            if (htmlId) prevSlotStatuses[htmlId] = (s.status || '').toLowerCase();
        });
        updateSpotsGrid(allSlots);
        updateSpotStats(allSlots);
        initSpotModal();
        renderFloorStatus(allSlots);
    } catch (err) {}
}

function updateSpotsGrid(slots) {
    const spotBoxes = document.querySelectorAll('.spot-box');
    const slotMap = {};
    slots.forEach(s => {
        const slotNum = s.slot_number || '';
        const id = s.slot_id || s.id || (slotNum ? `parking_1_slot_${slotNum}` : null);
        if (id) slotMap[id] = s;
        if (slotNum) slotMap[slotNum] = s;
    });
    // Map both "parking_1_slot_1" and "parking_1_slot_01" so API always matches HTML
    slots.forEach(s => {
        const slotNum = String(s.slot_number || '');
        if (slotNum) {
            slotMap[`parking_1_slot_${slotNum}`] = s;
            slotMap[`parking_1_slot_${slotNum.padStart(2,'0')}`] = s;
        }
    });
    spotBoxes.forEach(box => {
        const boxId = box.dataset.id;
        const slot = slotMap[boxId];
        if (!slot) return;
        const status = (slot.status || 'available').toLowerCase();
        const displayName = slot.slot_number || (boxId.includes('_slot_') ? boxId.split('_slot_')[1] : boxId);
        const statusMap = { available: 'free', occupied: 'taken', reserved: 'reserved', maintenance: 'maintenance' };
        const cssClass = statusMap[status] || 'free';
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        box.className = `spot-box ${cssClass}`;
        box.dataset.status = label;
        box.dataset.parkingId = currentParkingId || PARKING_ID;
        const idEl = box.querySelector('.spot-id');
        const footerEl = box.querySelector('.spot-footer');
        if (idEl) idEl.textContent = displayName;
        if (footerEl) footerEl.textContent = label;
    });
}

function updateSpotStats(slots) {
    const counts = { available: 0, occupied: 0, reserved: 0, maintenance: 0 };
    slots.forEach(s => {
        const st = (s.status || '').toLowerCase();
        if (['occupied', 'taken'].includes(st)) counts.occupied++;
        else if (['reserved', 'booked'].includes(st)) counts.reserved++;
        else if (st === 'maintenance') counts.maintenance++;
        else counts.available++;
    });
    const total = slots.length;
    const occ = total ? Math.round(((counts.occupied + counts.reserved) / total) * 100) : 0;
    localStorage.setItem('parkify_spot_stats', JSON.stringify({ ...counts, total, occ }));
    const statNums = document.querySelectorAll('.spot-stat-card .stat-num');
    if (statNums[0]) statNums[0].textContent = total;
    if (statNums[1]) statNums[1].textContent = counts.available;
    if (statNums[2]) statNums[2].textContent = counts.occupied;
    if (statNums[3]) statNums[3].textContent = counts.reserved;
    if (statNums[4]) statNums[4].textContent = counts.maintenance;
    const fpPct = document.querySelector('.fp-percentage');
    const fpFill = document.querySelector('.fp-fill');
    if (fpPct) fpPct.textContent = `${occ}%`;
    if (fpFill) fpFill.style.width = `${occ}%`;
    // Sync dashboard Available Spots card with parking-specific count
    const dashAvail = document.getElementById('statAvailable');
    if (dashAvail) dashAvail.innerHTML = `${counts.available} <span class="stat-sub">/ ${total}</span>`;
}

async function loadUsers() {
    const cached = cacheGet(CACHE.users);
    if (cached) renderUsersGrid(cached);
    try {
        const data = await apiFetch('/api/v1/admin/users');
        if (!data) return;
        const users = data.data || data.users || data;
        cacheSet(CACHE.users, users);
        renderUsersGrid(users);
    } catch (err) {}
}

function renderUsersGrid(users) {
    const container = document.getElementById('visitorsGridContainer');
    if (!container) return;
    if (!users.length) { container.innerHTML = '<p class="empty-msg">No users found</p>'; return; }
    container.innerHTML = users.map(user => {
        const name = user.username || user.name || 'Unknown';
        const email = user.email || '—';
        const phone = user.phone || '—';
        const status = user.is_suspended ? 'Suspended' : (user.is_active !== false ? 'Active' : 'Inactive');
        const statusCls = status === 'Active' ? 'active' : 'inactive';
        const initials = name.slice(0, 2).toUpperCase();
        return `<div class="visitor-card"><div class="v-card-header"><div class="v-avatar" style="background-color:#7c3aed">${initials}</div><div class="v-info"><h4>${name}</h4><span class="v-status ${statusCls}">${status}</span></div></div><div class="v-card-body"><p><i class="fa-regular fa-envelope"></i> ${email}</p><p><i class="fa-solid fa-phone"></i> ${phone}</p></div></div>`;
    }).join('');
}

async function loadBookings() {
    try {
        const data = await apiFetch('/api/v1/admin/bookings');
        if (!data) return;
        const bookings = data.data || data.bookings || data;
        renderPaymentsTable(bookings);
        updatePaymentStats(bookings);
        updateChartsFromBookings(bookings);
        updateRevenueFromBookings(bookings);
        loadRecentBookings(bookings);
    } catch (err) {}
}

function renderPaymentsTable(bookings) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    if (!bookings.length) { tbody.innerHTML = '<tr><td colspan="9">No payments found</td></tr>'; return; }
    tbody.innerHTML = bookings.map((b, i) => {
        const amount = Number(b.amount || b.total_amount || 0).toFixed(2);
        const status = (b.status || 'pending').toLowerCase();
        const statusCls = status === 'completed' ? 'available' : status === 'active' || status === 'confirmed' || status === 'checked_in' ? 'active' : 'pending';
        const user = b.user_name || b.user?.username || 'Unknown';
        const spot = b.slot_number || b.slot_id || b.spot_id || '—';
        const bookingId = b.id || b.booking_id;
        const isActive = ['active', 'confirmed', 'reserved'].includes(status);
        const isCheckedIn = status === 'checked_in' || status === 'active';
        let actions = '—';
        if (isCheckedIn) {
            actions = `<button onclick="adminCheckout('${bookingId}')" style="background:#059669;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;">Check-out</button>`;
        } else if (isActive) {
            actions = `<div style="display:flex;gap:6px;"><button onclick="adminCheckin('${bookingId}')" style="background:#6b21a8;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;">Check-in</button><button onclick="adminCancelBooking('${bookingId}', '${spot}')" style="background:#dc2626;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;">Cancel</button></div>`;
        }
        const duration = b.total_hours ? `${b.total_hours}h` : (b.duration_hours ? `${b.duration_hours}h` : '—');
        const method = b.payment_method ? b.payment_method.charAt(0).toUpperCase() + b.payment_method.slice(1) : '—';
        const date = b.created_at ? new Date(b.created_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
        const shortId = bookingId ? bookingId.slice(-8).toUpperCase() : '—';
        return `<tr id="booking-row-${bookingId}">
            <td style="font-size:12px;color:#6b7280;">#${shortId}</td>
            <td><strong>${user}</strong></td>
            <td><strong>Slot ${spot}</strong></td>
            <td><strong>${amount} EGP</strong></td>
            <td style="color:#6b7280;">${duration}</td>
            <td style="color:#6b7280;">${method}</td>
            <td><span class="badge-status ${statusCls}" id="booking-status-${bookingId}">${status}</span></td>
            <td style="font-size:12px;color:#6b7280;">${date}</td>
            <td id="booking-actions-${bookingId}">${actions}</td>
        </tr>`;
    }).join('');
}

async function adminCheckin(bookingId) {
    try {
        await apiFetch(`/api/v1/bookings/${bookingId}/check-in`, { method: 'POST' });
        const statusEl = document.getElementById(`booking-status-${bookingId}`);
        if (statusEl) { statusEl.textContent = 'checked_in'; statusEl.className = 'badge-status active'; }
        const actionsEl = document.getElementById(`booking-actions-${bookingId}`);
        if (actionsEl) actionsEl.innerHTML = `<button onclick="adminCheckout('${bookingId}')" style="background:#059669;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;">Check-out</button>`;
        await loadParkingSpots();
    } catch(err) {}
}

async function adminCheckout(bookingId) {
    try {
        await apiFetch(`/api/v1/bookings/${bookingId}/check-out`, { method: 'POST' });
        const statusEl = document.getElementById(`booking-status-${bookingId}`);
        if (statusEl) { statusEl.textContent = 'completed'; statusEl.className = 'badge-status available'; }
        const actionsEl = document.getElementById(`booking-actions-${bookingId}`);
        if (actionsEl) actionsEl.innerHTML = '—';
        await loadParkingSpots();
        await loadBookings();
    } catch(err) {}
}

async function adminCancelBooking(bookingId, slotId) {
    try {
        await apiFetch(`/api/v1/bookings/${bookingId}/cancel`, { method: 'POST' });
        const statusEl = document.getElementById(`booking-status-${bookingId}`);
        if (statusEl) { statusEl.textContent = 'cancelled'; statusEl.className = 'badge-status pending'; }
        const actionsEl = document.getElementById(`booking-actions-${bookingId}`);
        if (actionsEl) actionsEl.innerHTML = '—';
        const slotNumber = slotId.includes('_slot_') ? slotId.split('_slot_')[1] : slotId;
        await apiFetch(`/api/v1/iot/slot-update?parking_id=${currentParkingId || PARKING_ID}&slot_number=${slotNumber}&status=available&device_key=${currentDeviceKey}`, { method: 'POST', skipRedirect: true }).catch(() => {});
        await loadParkingSpots();
        await loadBookings();
    } catch(err) {}
}

function updatePaymentStats(bookings) {
    const total = bookings.reduce((s, b) => s + Number(b.amount || b.total_amount || 0), 0);
    const pending = bookings.filter(b => b.status === 'pending').reduce((s, b) => s + Number(b.amount || 0), 0);
    const success = bookings.filter(b => b.status === 'completed').length;
    const rate = bookings.length ? Math.round((success / bookings.length) * 100) : 0;
    const vals = document.querySelectorAll('.p-stat-value');
    if (vals[0]) vals[0].textContent = `${total.toFixed(2)} EGP`;
    if (vals[1]) vals[1].textContent = `${pending.toFixed(2)} EGP`;
    if (vals[2]) vals[2].textContent = bookings.length;
    if (vals[3]) vals[3].textContent = `${rate}%`;
}

let lastAlertIds = new Set(JSON.parse(localStorage.getItem('parkify_seen_alert_ids') || '[]'));
const DASHBOARD_START_TIME = new Date();

function saveAlertIds() {
    localStorage.setItem('parkify_seen_alert_ids', JSON.stringify([...lastAlertIds]));
}

async function loadAlerts() {
    try {
        const data = await apiFetch('/api/v1/admin/alerts');
        if (!data) return;
        const alerts = data.data || data.alerts || data;
        alerts.forEach(a => {
            const id = a.id || a.alert_id || ((a.alert_type || a.type || 'alert') + '_' + a.created_at);
            lastAlertIds.add(id);
        });
        saveAlertIds();
        const active = alerts.filter(a => (a.status || '').toLowerCase() === 'active');
        updateMonitoringStats(active);
    } catch (err) {}
}

function renderDashboardAlerts() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    const cached = cacheGet(CACHE.alerts);
    if (!cached || !cached.length) { container.innerHTML = ''; return; }
    const active = cached.filter(a => (a.status || '').toLowerCase() === 'active').slice(0, 3);
    if (!active.length) { container.innerHTML = ''; return; }
    container.innerHTML = active.map(alert => {
        const type = (alert.alert_type || alert.type || 'info').toLowerCase();
        const color = type === 'fire' || type === 'weapon' ? 'red' : 'blue';
        const id = alert.id || alert.alert_id || '';
        return `<div class="alert-box alert-${color}" id="dashAlert-${id}"><div class="alert-content"><strong>${alert.title || type}</strong><p>${alert.message || ''}</p></div><button class="close-alert" onclick="dismissAlert('${id}', this)"><i class="fa-solid fa-xmark"></i></button></div>`;
    }).join('');
}

async function dismissAlert(alertId, btn) {
    const box = btn?.closest('.alert-box');
    if (box) box.remove();
    if (alertId) await apiFetch(`/api/v1/admin/alerts/${alertId}/acknowledge`, { method: 'PUT' }).catch(() => {});
}

async function loadNotifications() {
    try {
        const data = await apiFetch('/api/v1/notifications');
        if (!data) return;
        const notifs = data.data || data.notifications || data;
        renderNotifications(notifs);
        const unreadData = await apiFetch('/api/v1/notifications/unread-count').catch(() => null);
        if (unreadData) {
            const count = unreadData.count ?? unreadData.unread_count ?? 0;
            const badge = document.querySelector('.notification-icon .badge');
            if (badge) { badge.style.display = count > 0 ? '' : 'none'; badge.textContent = count; }
        }
    } catch (err) {}
}

function renderNotifications(notifs) {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    const existingIds = new Set([...container.querySelectorAll('.notification-item')].map(el => el.dataset.id));
    const toAdd = notifs.filter(n => {
        const id = String(n.id || n.notification_id || '');
        return id && !existingIds.has(id);
    });
    toAdd.forEach(n => {
        const isUnread = !n.is_read;
        const id = n.id || n.notification_id;
        const div = document.createElement('div');
        div.className = `notification-item ${isUnread ? 'unread' : ''}`;
        div.dataset.id = id;
        div.innerHTML = `<div class="n-content"><div class="n-title-row"><h4>${n.title || 'Notification'}</h4></div><p>${n.message || n.body || ''}</p></div><button class="n-delete-btn" data-id="${id}"><i class="fa-regular fa-trash-can"></i></button>`;
        if (isUnread) {
            div.addEventListener('click', async function () {
                await apiFetch(`/api/v1/notifications/${id}/read`, { method: 'PUT' }).catch(() => {});
                this.classList.remove('unread');
                saveNotificationsToStorage();
            });
        }
        div.querySelector('.n-delete-btn').addEventListener('click', async function(e) {
            e.stopPropagation();
            await apiFetch(`/api/v1/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
            div.remove();
            saveNotificationsToStorage();
        });
        container.appendChild(div);
    });
}

let currentSpotFilter = 'all';

function applySpotFilter() {
    document.querySelectorAll('#parkingSpotsView .spot-box').forEach(box => {
        if (currentSpotFilter === 'all') {
            box.style.display = '';
        } else {
            const status = (box.dataset.status || '').toLowerCase();
            box.style.display = status === currentSpotFilter ? '' : 'none';
        }
    });
}

function initSpotFilters() {
    const btns = document.querySelectorAll('#parkingSpotsView .filter-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSpotFilter = btn.textContent.trim().toLowerCase();
            applySpotFilter();
        });
    });
}

function initDashboardUI() {
    function updateClocks() {
        const t = new Date().toLocaleTimeString('en-US');
        document.querySelectorAll('.liveTime').forEach(el => el.textContent = t);
        const t24 = new Date().toLocaleTimeString('en-US', { hour12: false });
        document.querySelectorAll('.live-clock').forEach(el => el.textContent = t24);
    }
    updateClocks();
    setInterval(updateClocks, 1000);
    initDashboardCharts();
    const profileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', e => { e.stopPropagation(); profileDropdown.classList.toggle('show'); });
        document.addEventListener('click', () => profileDropdown.classList.remove('show'));
    }
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item[data-target]');
    const pageViews = document.querySelectorAll('.page-view');
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            pageViews.forEach(v => v.classList.remove('active'));
            const target = document.getElementById(link.dataset.target);
            if (target) target.classList.add('active');
            const targetId = link.dataset.target;
            if (targetId === 'visitorsView') await loadUsers();
            if (targetId === 'paymentsView') await loadBookings();
            if (targetId === 'notificationsView') await loadNotifications();
            if (targetId === 'parkingSpotsView' || targetId === 'floorOverviewView') await loadParkingSpots();
            if (targetId === 'parkingSpotsView') startVehicleLogsPolling();
            if (targetId === 'analyticsView') await loadAnalytics();
        });
    });
    initSpotModal();
    initSpotFilters();
}

let currentSpot = {};

function switchTab(tab) {
    ['Details', 'Edit', 'History'].forEach(t => {
        const content = document.getElementById(`tabContent${t}`);
        const btn = document.getElementById(`tab${t}`);
        if (content) content.style.display = 'none';
        if (btn) btn.classList.remove('active');
    });
    const capTab = tab.charAt(0).toUpperCase() + tab.slice(1);
    const activeContent = document.getElementById(`tabContent${capTab}`);
    const activeBtn = document.getElementById(`tab${capTab}`);
    if (activeContent) activeContent.style.display = '';
    if (activeBtn) activeBtn.classList.add('active');
    if (tab === 'history') loadSpotHistory(currentSpot.id);
    if (tab === 'edit') prefillEditForm();
}

function prefillEditForm() {
    const rate = document.getElementById('editSpotRate');
    const type = document.getElementById('editSpotType');
    const status = document.getElementById('editSpotStatus');
    if (rate) rate.value = currentSpot.hourly_rate || currentSpot.price_per_hour || 5;
    if (type) type.value = (currentSpot.spot_type || 'standard').toLowerCase();
    if (status) status.value = (currentSpot.status || 'available').toLowerCase();
}

function showModalMsg(elId, msg, isError = false) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = isError ? '#fee2e2' : '#d1fae5';
    el.style.color = isError ? '#dc2626' : '#059669';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function updateModalButtons(status) {
    const btnReserve = document.getElementById('btnReserve');
    const btnCheckin = document.getElementById('btnCheckin');
    const btnRelease = document.getElementById('btnRelease');
    const btnMaintenance = document.getElementById('btnMaintenance');
    const s = (status || '').toLowerCase();

    // Hide all action buttons first to avoid stale state
    [btnReserve, btnCheckin, btnRelease].forEach(b => { if (b) b.style.display = 'none'; });
    if (btnMaintenance) btnMaintenance.style.display = '';

    if (s === 'available') {
        if (btnReserve) {
            btnReserve.style.display = '';
            btnReserve.style.background = '';
            btnReserve.style.color = '';
            btnReserve.innerHTML = '<i class="fa-solid fa-lock"></i> Reserve Spot';
            btnReserve.onclick = reserveCurrentSpot;
        }
        if (btnCheckin) btnCheckin.style.display = '';
    } else if (s === 'reserved') {
        if (btnReserve) {
            btnReserve.style.display = '';
            btnReserve.style.background = '#dc2626';
            btnReserve.style.color = '#fff';
            btnReserve.innerHTML = '<i class="fa-solid fa-lock-open"></i> Unreserve';
            btnReserve.onclick = unreserveCurrentSpot;
        }
        if (btnCheckin) btnCheckin.style.display = '';
    } else if (s === 'occupied') {
        if (btnRelease) btnRelease.style.display = '';
    } else if (s === 'maintenance') {
        if (btnRelease) btnRelease.style.display = '';
    }
}

async function unreserveCurrentSpot() {
    if (!currentSpot.id) return;
    const slotNumber = currentSpot.id.includes('_slot_') ? currentSpot.id.split('_slot_')[1] : currentSpot.id;
    const slotUuid = slotUuidMap[currentSpot.id] || currentSpot.id;
    try {
        // 1. IoT first
        await apiFetch(`/api/v1/iot/slot-update?parking_id=${currentParkingId || PARKING_ID}&slot_number=${slotNumber}&status=available&device_key=${currentDeviceKey}`, { method: 'POST', skipRedirect: true }).catch(() => {});
        // 2. Cancel the booking
        const bookingsData = await apiFetch('/api/v1/admin/bookings').catch(() => null);
        if (bookingsData) {
            const bookings = bookingsData.data || bookingsData.bookings || bookingsData;
            const active = bookings.find(b =>
                (b.slot_id === slotUuid || b.slot_id === currentSpot.id) &&
                !['cancelled', 'completed'].includes((b.status || '').toLowerCase())
            );
            if (active) {
                const bookingId = active.id || active.booking_id;
                await apiFetch(`/api/v1/bookings/${bookingId}/cancel`, { method: 'POST' }).catch(() => {});
            }
        }
        // 3. Reload and update modal
        await loadParkingSpots();
        const updatedBox = document.querySelector(`.spot-box[data-id="${currentSpot.id}"]`);
        if (updatedBox) currentSpot.status = (updatedBox.dataset.status || 'available').toLowerCase();
        const statusEl = document.getElementById('modalSpotStatus');
        if (statusEl) { statusEl.textContent = currentSpot.status; statusEl.className = `badge-status ${currentSpot.status}`; }
        updateModalButtons(currentSpot.status);
        initSpotModal();
    } catch(err) {}
}

async function checkinCurrentSpot() {
    if (!currentSpot.id) return;
    const slotNumber = currentSpot.id.includes('_slot_') ? currentSpot.id.split('_slot_')[1] : currentSpot.id;
    try {
        await apiFetch(`/api/v1/iot/slot-update?parking_id=${currentParkingId || PARKING_ID}&slot_number=${slotNumber}&status=occupied&device_key=${currentDeviceKey}`, { method: 'POST', skipRedirect: true }).catch(() => {});
        currentSpot.status = 'occupied';
        updateModalButtons('occupied');
        await loadParkingSpots();
        initSpotModal();
    } catch(err) {}
}

async function releaseCurrentSpot() {
    if (!currentSpot.id) return;
    const slotNumber = currentSpot.id.includes('_slot_') ? currentSpot.id.split('_slot_')[1] : currentSpot.id;
    const slotUuid = slotUuidMap[currentSpot.id] || currentSpot.id;
    try {
        // 1. IoT first — changes slot status on server immediately
        await apiFetch(`/api/v1/iot/slot-update?parking_id=${currentParkingId || PARKING_ID}&slot_number=${slotNumber}&status=available&device_key=${currentDeviceKey}`, { method: 'POST', skipRedirect: true }).catch(() => {});
        // 2. Cancel the booking to clean up
        const bookingsData = await apiFetch(`/api/v1/admin/bookings`).catch(() => null);
        if (bookingsData) {
            const bookings = bookingsData.data || bookingsData.bookings || bookingsData;
            const active = bookings.find(b =>
                (b.slot_id === slotUuid || b.slot_id === currentSpot.id) &&
                !['cancelled', 'completed'].includes((b.status || '').toLowerCase())
            );
            if (active) {
                const bookingId = active.id || active.booking_id;
                const bStatus = (active.status || '').toLowerCase();
                if (['checked_in', 'active'].includes(bStatus)) {
                    await apiFetch(`/api/v1/bookings/${bookingId}/check-out`, { method: 'POST' })
                        .catch(() => apiFetch(`/api/v1/bookings/${bookingId}/cancel`, { method: 'POST' }).catch(() => {}));
                } else {
                    await apiFetch(`/api/v1/bookings/${bookingId}/cancel`, { method: 'POST' }).catch(() => {});
                }
            }
        }
        // 3. Reload and update modal from real API state
        await loadParkingSpots();
        const updatedBox = document.querySelector(`.spot-box[data-id="${currentSpot.id}"]`);
        if (updatedBox) currentSpot.status = (updatedBox.dataset.status || 'available').toLowerCase();
        const statusBadge = document.getElementById('modalSpotStatus');
        if (statusBadge) { statusBadge.textContent = currentSpot.status; statusBadge.className = `badge-status ${currentSpot.status}`; }
        updateModalButtons(currentSpot.status);
        initSpotModal();
    } catch(err) {}
}

async function reserveCurrentSpot() {
    if (!currentSpot.id) return;
    const msg = document.getElementById('modalActionMsg');
    if (msg) {
        msg.style.display = 'block';
        msg.innerHTML = `<p>Reserve Spot ${currentSpot.id}</p><div style="display:grid;gap:8px;"><input id="reservePlate" class="s-input" placeholder="Vehicle plate"><input id="reserveHours" class="s-input" type="number" value="1" min="1" max="24"><button onclick="confirmReserve()" style="background:#6b21a8;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;">Confirm Reserve</button></div>`;
    }
}

async function confirmReserve() {
    const plate = document.getElementById('reservePlate')?.value.trim();
    const hours = parseFloat(document.getElementById('reserveHours')?.value) || 1;
    if (!plate) return;
    const now = new Date();
    const end = new Date(now.getTime() + hours * 3600000);
    const htmlSlotId = currentSpot.id.includes('_slot_') ? currentSpot.id : `${PARKING_ID}_slot_${currentSpot.id}`;
    const slotId = slotUuidMap[htmlSlotId] || slotUuidMap[currentSpot.id] || htmlSlotId;
    const parkingId = currentParkingId || currentSpot.parking_id || PARKING_ID;
    try {
        const result = await apiFetch('/api/v1/bookings', { method: 'POST', body: JSON.stringify({ parking_id: parkingId, slot_id: slotId, vehicle_plate: plate, start_time: now.toISOString(), duration_hours: hours, payment_method: 'cash' }) });
        if (!result) return;
        currentSpot.status = 'reserved';
        updateModalButtons('reserved');
        await loadParkingSpots();
        initSpotModal();
    } catch(err) {}
}

async function markMaintenanceSpot() {
    if (!currentSpot.id) return;
    const newStatus = currentSpot.status === 'maintenance' ? 'available' : 'maintenance';
    const slotNumber = currentSpot.id.includes('_slot_') ? currentSpot.id.split('_slot_')[1] : currentSpot.id;
    try {
        await apiFetch(`/api/v1/iot/slot-update?parking_id=${currentParkingId || PARKING_ID}&slot_number=${slotNumber}&status=${newStatus}&device_key=${currentDeviceKey}`, { method: 'POST', skipRedirect: true }).catch(() => {});
        currentSpot.status = newStatus;
        await loadParkingSpots();
        initSpotModal();
    } catch(err) {}
}

async function deleteCurrentSpot() {
    if (!currentSpot.id) return;
    const slotNumber = currentSpot.id.includes('_slot_') ? currentSpot.id.split('_slot_')[1] : currentSpot.id;
    try {
        await apiFetch(`/api/v1/iot/slot-update?parking_id=${currentParkingId || PARKING_ID}&slot_number=${slotNumber}&status=maintenance&device_key=${currentDeviceKey}`, { method: 'POST', skipRedirect: true }).catch(() => {});
        HTML_SLOT_IDS.delete(currentSpot.id);
        const box = document.querySelector(`.spot-box[data-id="${currentSpot.id}"]`);
        if (box) box.remove();
        const modal = document.getElementById('spotDetailsModal');
        if (modal) modal.classList.remove('show');
    } catch(err) {}
}

async function saveSpotEdit() {
    if (!currentSpot.id) return;
    const status = document.getElementById('editSpotStatus')?.value || 'available';
    const slotNumber = currentSpot.id.includes('_slot_') ? currentSpot.id.split('_slot_')[1] : currentSpot.id;
    try {
        if (status !== currentSpot.status) {
            await apiFetch(`/api/v1/iot/slot-update?parking_id=${currentParkingId || PARKING_ID}&slot_number=${slotNumber}&status=${status}&device_key=${currentDeviceKey}`, { method: 'POST', skipRedirect: true }).catch(() => {});
        }
        currentSpot.status = status;
        await loadParkingSpots();
        initSpotModal();
        setTimeout(() => switchTab('details'), 1200);
    } catch(err) {}
}

async function loadSpotHistory(spotId) {
    const container = document.getElementById('spotBookingHistory');
    if (!container || !spotId) return;
    container.innerHTML = '<p>Loading...</p>';
    try {
        const data = await apiFetch(`/api/v1/admin/bookings?slot_id=${spotId}`);
        const bookings = data?.data || data?.bookings || data || [];
        if (!bookings.length) { container.innerHTML = '<p>No booking history.</p>'; return; }
        container.innerHTML = bookings.slice(0, 10).map(b => {
            const status = b.status || 'unknown';
            return `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6;"><div><strong>${b.user_name || 'User'}</strong></div><div style="text-align:right;"><span>${status}</span></div></div>`;
        }).join('');
    } catch(err) { container.innerHTML = '<p>Could not load history.</p>'; }
}

function initSpotModal() {
    const modalOverlay = document.getElementById('spotDetailsModal');
    const closeModalBtns = [document.getElementById('closeModalBtn'), document.getElementById('closeModalFooterBtn')];
    document.querySelectorAll('.spot-box').forEach(box => {
        const newBox = box.cloneNode(true);
        box.parentNode.replaceChild(newBox, box);
        newBox.addEventListener('click', function () {
            const spotId = this.dataset.id;
            const status = (this.dataset.status || 'available').toLowerCase();
            currentSpot = { id: spotId, parking_id: this.dataset.parkingId || PARKING_ID, status: status };
            const displayId = spotId.includes('_slot_') ? spotId.split('_slot_')[1] : spotId;
            const spotIdEl = document.getElementById('modalSpotId');
            if (spotIdEl) spotIdEl.textContent = displayId;
            const infoIdEl = document.getElementById('infoSpotId');
            if (infoIdEl) infoIdEl.textContent = displayId;
            const statusEl = document.getElementById('modalSpotStatus');
            if (statusEl) { statusEl.textContent = currentSpot.status; statusEl.className = `badge-status ${currentSpot.status}`; }
            updateModalButtons(currentSpot.status);
            const actionMsg = document.getElementById('modalActionMsg');
            if (actionMsg) { actionMsg.style.display = 'none'; actionMsg.innerHTML = ''; }
            switchTab('details');
            modalOverlay?.classList.add('show');
        });
    });
    const closeModal = () => { modalOverlay?.classList.remove('show'); switchTab('details'); };
    closeModalBtns.forEach(btn => btn?.addEventListener('click', closeModal));
    modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
    applySpotFilter();
}

let analyticsCharts = {};

async function loadAnalytics() {
    try {
        const data = await apiFetch('/api/v1/admin/bookings');
        if (!data) return;
        const bookings = data.data || data.bookings || data;
        if (!Array.isArray(bookings)) return;

        const now = new Date();
        const msMonth = 30 * 24 * 60 * 60 * 1000;

        // Split into current period (0-3 months) and previous period (3-6 months)
        const current = bookings.filter(b => {
            const d = new Date(b.created_at);
            return (now - d) <= 3 * msMonth;
        });
        const previous = bookings.filter(b => {
            const d = new Date(b.created_at);
            const diff = now - d;
            return diff > 3 * msMonth && diff <= 6 * msMonth;
        });

        const sumRevenue = arr => arr.reduce((s, b) => s + Number(b.amount || b.total_amount || 0), 0);
        const avgDuration = arr => arr.length ? arr.reduce((s, b) => s + Number(b.total_hours || 0), 0) / arr.length : 0;
        const pct = (cur, prev) => prev === 0 ? 0 : ((cur - prev) / prev * 100);

        const curRev  = sumRevenue(current);
        const prevRev = sumRevenue(previous);
        const curBook  = current.length;
        const prevBook = previous.length;
        const curDur  = avgDuration(current);
        const prevDur = avgDuration(previous);

        const trendText = (val, suffix = '') => {
            const sign = val >= 0 ? '+' : '';
            return `${sign}${val.toFixed(1)}%${suffix} from last period`;
        };
        const setTrend = (elId, iconId, val) => {
            const el = document.getElementById(elId);
            const icon = document.getElementById(iconId);
            if (!el) return;
            const up = val >= 0;
            el.textContent = trendText(val);
            el.className = `a-stat-trend ${up ? 'text-green' : 'text-red'}`;
            if (icon) {
                icon.className = `fa-solid ${up ? 'fa-arrow-trend-up text-green' : 'fa-arrow-trend-down text-red'}`;
            }
        };

        const elRev  = document.getElementById('analyticsRevenue');
        const elBook = document.getElementById('analyticsBookings');
        const elDur  = document.getElementById('analyticsDuration');
        if (elRev)  elRev.textContent  = `${curRev.toFixed(0)} EGP`;
        if (elBook) elBook.textContent = curBook;
        if (elDur)  elDur.textContent  = `${curDur.toFixed(1)} hrs`;
        setTrend('analyticsTrendRev',  'analyticsTrendRevIcon',  pct(curRev, prevRev));
        setTrend('analyticsTrendBook', 'analyticsTrendBookIcon', pct(curBook, prevBook));
        setTrend('analyticsTrendDur',  'analyticsTrendDurIcon',  pct(curDur, prevDur));

        // ── Revenue & Bookings Trend (last 6 months) ─────────────────────────
        const months = [];
        const revenueByMonth = [];
        const bookingsByMonth = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleString('en-US', { month: 'short' });
            months.push(label);
            const inMonth = bookings.filter(b => {
                const bd = new Date(b.created_at);
                return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth();
            });
            revenueByMonth.push(sumRevenue(inMonth));
            bookingsByMonth.push(inMonth.length);
        }

        const destroyChart = key => { if (analyticsCharts[key]) { analyticsCharts[key].destroy(); delete analyticsCharts[key]; } };

        destroyChart('trend');
        const trendCtx = document.getElementById('revenueTrendChart');
        if (trendCtx) {
            analyticsCharts.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'bookings',
                            data: bookingsByMonth,
                            borderColor: '#6366f1',
                            backgroundColor: 'rgba(99,102,241,0.08)',
                            tension: 0.4,
                            yAxisID: 'yBook',
                            pointBackgroundColor: '#6366f1'
                        },
                        {
                            label: 'revenue',
                            data: revenueByMonth,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16,185,129,0.08)',
                            tension: 0.4,
                            yAxisID: 'yRev',
                            pointBackgroundColor: '#10b981'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                        yBook: { type: 'linear', position: 'left',  beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        yRev:  { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }
                    }
                }
            });
        }

        // ── Peak Usage Hours (bar) ────────────────────────────────────────────
        const hourCounts = Array(24).fill(0);
        bookings.forEach(b => {
            if (!b.start_time) return;
            const h = new Date(b.start_time).getHours();
            hourCounts[h]++;
        });
        const peakLabels = ['6 AM','7 AM','8 AM','9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM','10 PM'];
        const peakData   = hourCounts.slice(6, 23);

        destroyChart('peak');
        const peakCtx = document.getElementById('peakHoursChart');
        if (peakCtx) {
            analyticsCharts.peak = new Chart(peakCtx, {
                type: 'bar',
                data: {
                    labels: peakLabels,
                    datasets: [{
                        label: 'Bookings',
                        data: peakData,
                        backgroundColor: '#6366f1',
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false } },
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
                    }
                }
            });
        }

    } catch(err) {}
}

// ── Live Monitoring — camera status, alerts, fullscreen ───────────────────────

function initAICamera() {}
function initCameraWebSocket() {}
function loadAIModels() {}
// ── Vehicle Logs (IoT plate-detect) ──────────────────────────────────────────
let vehicleLogs = [];
let vehicleLogsTimer = null;

async function loadVehicleLogs() {
    try {
        const parkingId = currentParkingId || localStorage.getItem('parkify_parking_id');
        const url = parkingId && parkingId !== PARKING_ID
            ? `/api/v1/admin/vehicles/logs?parking_id=${parkingId}&limit=20`
            : `/api/v1/admin/vehicles/logs?limit=20`;
        const data = await apiFetch(url);
        if (!data) return;
        const logs = data.data || data;
        if (!Array.isArray(logs)) return;
        vehicleLogs = logs;
        renderVehicleLogs();
    } catch (_) {}
}

function renderVehicleLogs() {
    const tbody = document.getElementById('vehicleLogsTbody');
    if (!tbody) return;
    if (!vehicleLogs.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="padding:28px;text-align:center;color:#94a3b8;font-size:13px;">
            <i class="fa-solid fa-camera" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>No plates detected yet</td></tr>`;
        return;
    }
    tbody.innerHTML = vehicleLogs.map((log, i) => {
        const plate = log.vehicle_plate || '—';
        const action = log.action || 'entry';
        const actionColor = action === 'exit' ? '#dc2626' : '#059669';
        const gate = log.gate || '—';
        const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
        return `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">${i + 1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">
                <span style="font-family:monospace;font-weight:700;font-size:14px;color:#1e293b;letter-spacing:2px;">${plate}</span>
                <span style="margin-left:8px;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:600;background:${actionColor}18;color:${actionColor};">${action}</span>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">
                ${gate} &nbsp;·&nbsp; ${time}
            </td>
        </tr>`;
    }).join('');
}

function clearVehicleLogs() {
    vehicleLogs = [];
    renderVehicleLogs();
}

function startVehicleLogsPolling() {
    loadVehicleLogs();
    clearInterval(vehicleLogsTimer);
    vehicleLogsTimer = setInterval(loadVehicleLogs, 10000);
}

function setCamOnline(online) {
    const img      = document.getElementById('aiCamFeed');
    const offline  = document.getElementById('aiCamOffline');
    const statusEl = document.getElementById('aiCameraStatus');
    if (img)      img.style.display     = online ? 'block' : 'none';
    if (offline)  offline.style.display = online ? 'none'  : 'flex';
    if (statusEl) {
        statusEl.textContent  = online ? 'Online' : 'Offline';
        statusEl.className    = `cam-status ${online ? 'active' : 'inactive'}`;
    }
}

function openCamFullscreen() {
    const modal  = document.getElementById('cameraModal');
    const stream = document.getElementById('modalCamStream');
    if (!modal || !stream) return;
    stream.src = 'http://' + location.hostname + ':5000/video_feed';
    modal.style.display = 'flex';
    document.onkeydown = e => { if (e.key === 'Escape') closeCameraModal(); };
}

function openCameraModal() { openCamFullscreen(); }
function openCam2Modal()   { openCamFullscreen(); }

function closeCameraModal() {
    const modal  = document.getElementById('cameraModal');
    const stream = document.getElementById('modalCamStream');
    if (modal)  modal.style.display = 'none';
    if (stream) stream.src = '';
    document.onkeydown = null;
}

function showMonitoringAlert(alert) {
    const panel = document.getElementById('monitoringAlertsList');
    if (!panel) return;
    const type  = (alert.alert_type || alert.type || 'alert').toLowerCase();
    const isFire = type === 'fire';
    const color  = isFire ? '#ef4444' : '#7c3aed';
    const icon   = isFire ? 'fa-fire'  : 'fa-gun';
    const title  = alert.title || (isFire ? 'Fire Detected' : 'Weapon Detected');

    // clear the "all clear" placeholder on first real alert
    const placeholder = panel.querySelector('[data-placeholder]');
    if (placeholder) placeholder.remove();

    const item = document.createElement('div');
    item.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 14px;background:${color}12;border-left:4px solid ${color};border-radius:6px;margin-bottom:8px;animation:slideIn .3s ease;`;
    item.innerHTML = `
        <i class="fa-solid ${icon}" style="color:${color};font-size:1rem;flex-shrink:0;"></i>
        <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:13px;color:#1e293b;">${title}</div>
            <div style="font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${alert.message || ''} · ${new Date().toLocaleTimeString()}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;flex-shrink:0;"><i class="fa-solid fa-xmark"></i></button>
    `;
    panel.prepend(item);
    if (panel.children.length > 10) panel.lastElementChild.remove();
}



let activeEmergencyIds = new Set();
let bannerTimer = null;

async function pollAlertsRealtime() {
    try {
        const data = await apiFetch('/api/v1/admin/alerts');
        if (!data) return;
        const alerts = data.data || data.alerts || data;
        if (!Array.isArray(alerts)) return;
        const newAlerts = alerts.filter(a => {
            const id = a.id || a.alert_id || ((a.alert_type || a.type || 'alert') + '_' + a.created_at);
            const status = (a.status || '').toLowerCase();
            if (lastAlertIds.has(id)) return false;
            lastAlertIds.add(id);
            if (status && status !== 'active') return false;
            if (a.created_at) {
                const alertTime = new Date(a.created_at);
                if (alertTime < DASHBOARD_START_TIME) return false;
            }
            return true;
        });
        saveAlertIds();
        if (newAlerts.length > 0) {
            newAlerts.forEach(alert => {
                showRealtimeAlert(alert);
                addRealtimeNotification(alert);
                const t = (alert.alert_type || alert.type || '').toLowerCase();
                if (['fire','theft','weapon','security'].includes(t)) { triggerCameraAlertOverlay(alert); }
            });
        }
        updateMonitoringStats(alerts);
    } catch (err) {}
}

function showRealtimeAlert(alert) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    const type = (alert.alert_type || alert.type || 'info').toLowerCase();
    const color = type === 'fire' || type === 'weapon' ? 'red' : 'blue';
    const id = alert.id || alert.alert_id || Date.now();
    document.getElementById(`alert-${id}`)?.remove();
    const div = document.createElement('div');
    div.className = `alert-box alert-${color}`;
    div.id = `alert-${id}`;
    div.innerHTML = `<div class="alert-content"><strong>${alert.title || type}</strong><p>${alert.message || ''}</p></div><button class="close-alert" onclick="this.closest('.alert-box').remove()"><i class="fa-solid fa-xmark"></i></button>`;
    container.prepend(div);
    const allAlerts = container.querySelectorAll('.alert-box');
    if (allAlerts.length > 5) allAlerts[allAlerts.length - 1].remove();
}

function saveNotificationsToStorage() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    const items = [];
    container.querySelectorAll('.notification-item').forEach(item => {
        items.push({ id: item.id, html: item.innerHTML, unread: item.classList.contains('unread') });
    });
    localStorage.setItem('parkify_notifications', JSON.stringify(items));
}

function loadNotificationsFromStorage() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    const saved = JSON.parse(localStorage.getItem('parkify_notifications') || '[]');
    if (!saved.length) return;
    container.innerHTML = '';
    saved.forEach(item => {
        const div = document.createElement('div');
        div.className = 'notification-item' + (item.unread ? ' unread' : '');
        div.id = item.id;
        div.innerHTML = item.html;
        const btn = div.querySelector('.n-delete-btn');
        if (btn) btn.onclick = () => { div.remove(); saveNotificationsToStorage(); };
        container.appendChild(div);
    });
}

function addRealtimeNotification(alert) {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    const id = alert.id || alert.alert_id || Date.now();
    const div = document.createElement('div');
    div.className = 'notification-item unread';
    div.id = `notif-alert-${id}`;
    div.innerHTML = `<div class="n-content"><div class="n-title-row"><h4>${alert.title || 'Alert'}</h4></div><p>${alert.message || ''}</p></div><button class="n-delete-btn"><i class="fa-regular fa-trash-can"></i></button>`;
    div.querySelector('.n-delete-btn').onclick = () => { div.remove(); saveNotificationsToStorage(); };
    container.prepend(div);
    saveNotificationsToStorage();
}

function triggerCameraAlertOverlay(alert) {
    const overlay = document.getElementById('aiAlertOverlay');
    const label   = document.getElementById('aiAlertLabel');
    if (!overlay || !label) return;
    const type   = (alert.alert_type || alert.type || '').toLowerCase();
    const isFire = type === 'fire';
    label.textContent         = isFire ? 'FIRE DETECTED' : 'WEAPON DETECTED';
    overlay.style.borderColor = isFire ? '#f97316' : '#ef4444';
    label.style.background    = isFire ? '#f97316' : '#ef4444';
    overlay.style.display     = 'block';
    clearTimeout(triggerCameraAlertOverlay._t);
    triggerCameraAlertOverlay._t = setTimeout(() => { overlay.style.display = 'none'; }, 10000);

    showMonitoringAlert(alert);
    showCameraEmergencyBanner(alert);
}

// ── Fast camera status poll (every 1s, hits local Python server directly) ─────
let _lastCamAlertTs = 0;

function startCameraStatusPoll() {
    const base = 'http://' + location.hostname + ':5000/status';
    setInterval(async () => {
        try {
            const res  = await fetch(base, { cache: 'no-store' });
            const data = await res.json();
            if (data.detection && data.ts && data.ts !== _lastCamAlertTs) {
                _lastCamAlertTs = data.ts;
                const fakeAlert = { alert_type: data.detection, type: data.detection, title: data.detection === 'fire' ? 'Fire Detected' : 'Weapon Detected', message: data.label };
                showCameraEmergencyBanner(fakeAlert);
                showMonitoringAlert(fakeAlert);
                triggerCameraOverlayOnly(fakeAlert);
            }
        } catch (_) {}
    }, 1000);
}

function triggerCameraOverlayOnly(alert) {
    const overlay = document.getElementById('aiAlertOverlay');
    const label   = document.getElementById('aiAlertLabel');
    if (!overlay || !label) return;
    const isFire = (alert.alert_type || '').toLowerCase() === 'fire';
    label.textContent         = isFire ? 'FIRE DETECTED' : 'WEAPON DETECTED';
    overlay.style.borderColor = isFire ? '#f97316' : '#ef4444';
    label.style.background    = isFire ? '#f97316' : '#ef4444';
    overlay.style.display     = 'block';
    clearTimeout(triggerCameraOverlayOnly._t);
    triggerCameraOverlayOnly._t = setTimeout(() => { overlay.style.display = 'none'; }, 10000);
}

function showCameraEmergencyBanner(alert) {
    const banner = document.getElementById('emergencyBanner');
    const list   = document.getElementById('emergencyList');
    const badge  = document.getElementById('emergencyBadge');
    if (!banner || !list) return;

    const type   = (alert.alert_type || alert.type || '').toLowerCase();
    const isFire = type === 'fire';

    list.innerHTML = isFire
        ? `<div style="display:flex;align-items:center;gap:8px;font-size:14px;color:#991b1b;font-weight:500;">
               <i class="fa-solid fa-fire" style="color:#f97316;"></i> Fire/Heat Alert detected
           </div>`
        : `<div style="display:flex;align-items:center;gap:8px;font-size:14px;color:#991b1b;font-weight:500;">
               <i class="fa-solid fa-shield-halved" style="color:#7c3aed;"></i> Security Breach detected
           </div>`;

    banner.style.display = 'flex';

    if (badge) {
        badge.style.display = 'inline-flex';
        const span = badge.querySelector('span');
        if (span) span.textContent = '1';
    }

    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
        banner.style.display = 'none';
        if (badge) badge.style.display = 'none';
    }, 10000);
}

function saveStatsToStorage(total, fire, security) {
    localStorage.setItem('parkify_stats', JSON.stringify({ total, fire, security, ts: Date.now() }));
}

function loadStatsFromStorage() {}
function loadSpotStatsFromStorage() {}

function updateMonitoringStats(alerts) {
    const active   = (alerts || []).filter(a => (a.status || '').toLowerCase() === 'active');
    const fire     = active.filter(a => (a.alert_type || a.type || '').toLowerCase() === 'fire').length;
    const security = active.filter(a => ['theft', 'weapon', 'security'].includes((a.alert_type || a.type || '').toLowerCase())).length;

    const totalEl  = document.getElementById('statTotalAlerts');
    const fireEl   = document.getElementById('statFireAlerts');
    const breachEl = document.getElementById('statBreaches');
    if (totalEl)  totalEl.textContent  = active.length;
    if (fireEl)   fireEl.textContent   = fire;
    if (breachEl) breachEl.textContent = security;

    saveStatsToStorage(active.length, fire, security);
}

let prevSlotStatuses = {};
let slotUuidMap = {}; // maps HTML slot ID → actual API UUID

async function pollSpotsRealtime() {
    try {
        const pid = currentParkingId || PARKING_ID;
        let allSlots = [];
        const slotsData = await apiFetch(`/api/v1/admin/parkings/${pid}/slots`);
        if (slotsData) {
            const raw = slotsData.data || slotsData.slots || slotsData;
            if (Array.isArray(raw)) allSlots = raw;
        }
        if (!allSlots.length) {
            allSlots = [1,2,3,4,5,6,7,8].map(n => ({ slot_number: String(n), id: null, status: 'available' }));
        }
        // Cross-reference with bookings
        try {
            const bData = await apiFetch('/api/v1/admin/bookings');
            const bookings = bData?.data || bData?.bookings || bData || [];
            bookings.forEach(b => {
                const bStatus = (b.status || '').toLowerCase();
                if (!['confirmed', 'active', 'reserved', 'pending', 'checked_in'].includes(bStatus)) return;
                const newStatus = ['active', 'checked_in'].includes(bStatus) ? 'occupied' : 'reserved';
                if (b.slot_id && b.slot_number) {
                    const sn = String(b.slot_number);
                    slotUuidMap[`parking_1_slot_${sn}`] = b.slot_id;
                    slotUuidMap[`parking_1_slot_${sn.padStart(2,'0')}`] = b.slot_id;
                }
                const slot = allSlots.find(s =>
                    (b.slot_id && s.id === b.slot_id) ||
                    (b.slot_number && parseInt(s.slot_number, 10) === parseInt(b.slot_number, 10))
                );
                if (slot) slot.status = newStatus;
            });
        } catch(e) {}
        // Only update DOM for slots whose status actually changed — no full re-render
        const statusMap = { available: 'free', occupied: 'taken', reserved: 'reserved', maintenance: 'maintenance' };
        let changed = false;
        allSlots.forEach(s => {
            const slotNum = String(s.slot_number || '');
            if (!slotNum) return;
            const htmlId = `parking_1_slot_${slotNum.padStart(2,'0')}`;
            const newStatus = (s.status || 'available').toLowerCase();
            if (prevSlotStatuses[htmlId] === newStatus) return;
            changed = true;
            prevSlotStatuses[htmlId] = newStatus;
            const box = document.querySelector(`.spot-box[data-id="${htmlId}"]`);
            if (!box) return;
            const cls = statusMap[newStatus] || 'free';
            box.className = `spot-box ${cls}`;
            const footer = box.querySelector('.spot-footer');
            if (footer) footer.textContent = cls.charAt(0).toUpperCase() + cls.slice(1);
        });
        if (changed) {
            updateSpotStats(allSlots);
            loadDashboardStats();
        }
    } catch(e) {}
}

let alertPollingTimer = null;

function startAlertsPolling() {
    pollAlertsRealtime();
    pollSpotsRealtime();
    alertPollingTimer = setInterval(pollAlertsRealtime, 5000);
    setInterval(pollSpotsRealtime, 5000);
    startCameraStatusPoll();
}

document.addEventListener('DOMContentLoaded', async () => {
    initPasswordToggle();
    initRegister();
    initLogin();
    if (document.querySelector('.dashboard-page')) {
        if (!guardDashboard()) return;
        initProfileDisplay();
        initDashboardUI();
        // Clear all cached data on startup — always fetch fresh from APIs
        Object.values(CACHE).forEach(k => localStorage.removeItem(k));
        localStorage.removeItem('pkfy_slot_counts');
        localStorage.removeItem('pkfy_occ_chart');
        localStorage.removeItem('parkify_stats');
        await Promise.allSettled([
            loadDashboardStats(),
            loadParkingSpots(),
            loadAlerts(),
            loadNotifications()
        ]);
        startAlertsPolling();
        setInterval(async () => {
            await loadDashboardStats();
            await loadParkingSpots();
            await loadAlerts();
            await loadBookings();
        }, 10000);
    }
});

function openAddSpotModal() {
    const modal = document.getElementById('addSpotModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('newSpotNumber').value = '';
    }
}

function closeAddSpotModal() {
    const modal = document.getElementById('addSpotModal');
    if (modal) modal.style.display = 'none';
}

async function saveNewSpot() {
    const raw = document.getElementById('newSpotNumber')?.value.trim();
    const msgEl = document.getElementById('addSpotMsg');
    if (!raw) return;
    const spotNumber = raw.padStart(2, '0');
    const htmlId = `parking_1_slot_${spotNumber}`;
    if (msgEl) msgEl.style.display = 'none';
    if (HTML_SLOT_IDS.has(htmlId)) {
        if (msgEl) { msgEl.style.cssText = 'display:block;background:#fee2e2;color:#dc2626;padding:10px;border-radius:8px;font-size:13px;'; msgEl.textContent = `Slot ${spotNumber} already shown.`; }
        return;
    }
    if (parseInt(spotNumber) < 1 || parseInt(spotNumber) > 50) {
        if (msgEl) { msgEl.style.cssText = 'display:block;background:#fee2e2;color:#dc2626;padding:10px;border-radius:8px;font-size:13px;'; msgEl.textContent = 'Enter a number between 01 and 50.'; }
        return;
    }
    HTML_SLOT_IDS.add(htmlId);
    // Add new box to the DOM (right column)
    const cols = document.querySelectorAll('#parkingSpotsView .spot-box[data-id]');
    const lastBox = cols[cols.length - 1];
    const col = lastBox?.closest('div[style*="flex-direction:column"]');
    if (col) {
        const box = document.createElement('div');
        box.className = 'spot-box free';
        box.dataset.id = htmlId;
        box.dataset.status = 'Available';
        box.style.cssText = 'margin:0;height:110px;';
        box.innerHTML = `<div class="spot-id">${spotNumber}</div><div class="spot-icon"><i class="fa-solid fa-car-side"></i></div><div class="spot-footer">Free</div><div class="hover-overlay"><span>Details</span></div>`;
        col.appendChild(box);
    }
    if (msgEl) { msgEl.style.cssText = 'display:block;background:#d1fae5;color:#059669;padding:10px;border-radius:8px;font-size:13px;'; msgEl.textContent = `Slot ${spotNumber} added!`; }
    await loadParkingSpots();
    setTimeout(closeAddSpotModal, 1500);
}

function navigateTo(section) {
    const link = document.querySelector(`[data-section="${section}"]`);
    if (link) link.click();
}


async function generateReport() {
    let bookings = [], alerts = [];
    try { const d = await apiFetch('/api/v1/admin/bookings'); bookings = d?.data || d?.bookings || d || []; } catch(e) {}
    try { const d = await apiFetch('/api/v1/admin/alerts');   alerts   = d?.data || d?.alerts   || d || []; } catch(e) {}
    const today    = new Date();
    const todayStr = today.toDateString();

    const todayBookings = bookings.filter(b => b.created_at && new Date(b.created_at).toDateString() === todayStr);
    const completed  = todayBookings.filter(b => b.status === 'completed');
    const cancelled  = todayBookings.filter(b => b.status === 'cancelled');
    const active     = todayBookings.filter(b => ['active','confirmed'].includes(b.status));
    const revenue    = completed.reduce((s, b) => s + Number(b.amount || b.total_amount || 0), 0);
    const todayAlerts = alerts.filter(a => a.created_at && new Date(a.created_at).toDateString() === todayStr);

    const fmt = d => d ? new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';

    const rows = todayBookings.map(b => `
        <tr>
            <td>#${(b.id || '').slice(-8).toUpperCase()}</td>
            <td>${b.user_name || 'Unknown'}</td>
            <td>Slot ${b.slot_number || b.slot_id || '—'}</td>
            <td>${Number(b.amount || b.total_amount || 0).toFixed(2)} EGP</td>
            <td>${b.total_hours || b.duration_hours || '—'}h</td>
            <td>${b.payment_method || '—'}</td>
            <td><span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${b.status==='completed'?'#d1fae5':b.status==='cancelled'?'#fee2e2':'#e0e7ff'};color:${b.status==='completed'?'#059669':b.status==='cancelled'?'#dc2626':'#4338ca'}">${b.status}</span></td>
            <td>${fmt(b.created_at)}</td>
        </tr>`).join('');

    const alertRows = todayAlerts.map(a => `
        <tr>
            <td>${a.alert_type || '—'}</td>
            <td>${a.severity || '—'}</td>
            <td>${a.message || '—'}</td>
            <td><span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${a.status==='resolved'?'#d1fae5':'#fee2e2'};color:${a.status==='resolved'?'#059669':'#dc2626'}">${a.status || '—'}</span></td>
            <td>${fmt(a.created_at)}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Daily Report – ${today.toLocaleDateString('en-GB')}</title>
    <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;max-width:1000px;margin:auto;}
        h1{font-size:24px;color:#6b21a8;margin-bottom:4px;}
        .sub{color:#64748b;font-size:14px;margin-bottom:32px;}
        .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;}
        .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center;}
        .card h2{font-size:22px;margin:4px 0;color:#1e293b;}
        .card p{font-size:12px;color:#64748b;margin:0;}
        table{width:100%;border-collapse:collapse;margin-bottom:32px;}
        th{background:#f1f5f9;text-align:left;padding:10px 12px;font-size:12px;color:#64748b;text-transform:uppercase;}
        td{padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;}
        h3{font-size:16px;font-weight:700;margin-bottom:12px;color:#1e293b;}
        @media print{button{display:none;}}
    </style></head><body>
    <button onclick="window.print()" style="float:right;background:#6b21a8;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;">🖨 Print / Save PDF</button>
    <h1>Grand Mall Parking — Daily Report</h1>
    <p class="sub">Date: ${today.toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric'})} &nbsp;|&nbsp; Generated: ${today.toLocaleTimeString()}</p>
    <div class="summary">
        <div class="card"><h2>${todayBookings.length}</h2><p>Total Bookings</p></div>
        <div class="card"><h2 style="color:#059669">${completed.length}</h2><p>Completed</p></div>
        <div class="card"><h2 style="color:#dc2626">${cancelled.length}</h2><p>Cancelled</p></div>
        <div class="card"><h2 style="color:#6b21a8">${revenue.toFixed(2)} EGP</h2><p>Revenue</p></div>
    </div>
    <h3>Bookings (${todayBookings.length})</h3>
    ${todayBookings.length ? `<table><thead><tr><th>ID</th><th>User</th><th>Slot</th><th>Amount</th><th>Duration</th><th>Method</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>` : '<p style="color:#94a3b8;">No bookings today.</p>'}
    <h3>Alerts (${todayAlerts.length})</h3>
    ${todayAlerts.length ? `<table><thead><tr><th>Type</th><th>Severity</th><th>Message</th><th>Status</th><th>Time</th></tr></thead><tbody>${alertRows}</tbody></table>` : '<p style="color:#94a3b8;">No alerts today.</p>'}
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
}

async function exportDashboardData() {
    let bookings = [], users = [];
    try { const d = await apiFetch('/api/v1/admin/bookings'); bookings = d?.data || d?.bookings || d || []; } catch(e) {}
    try { const d = await apiFetch('/api/v1/admin/users');    users    = d?.data || d?.users    || d || []; } catch(e) {}
    const rows = [['Booking ID','User','Slot','Amount (EGP)','Status','Date']];
    bookings.forEach(b => {
        rows.push([
            b.id || '',
            b.user_name || 'Unknown',
            b.slot_number || b.slot_id || '—',
            Number(b.amount || b.total_amount || 0).toFixed(2),
            b.status || '',
            b.created_at ? new Date(b.created_at).toLocaleString() : ''
        ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `parkify_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}