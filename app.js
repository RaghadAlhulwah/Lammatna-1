/* app.js - Lammatna client prototype - FIXED VERSION */
/* -----------------------
   Storage keys and helpers
   ----------------------- */
const STORAGE = {
  USERS: 'lammatna_users',
  GATHERINGS: 'lammatna_gatherings',
  LOGGED: 'lammatna_logged'
};

function loadJSON(key) {
  return JSON.parse(localStorage.getItem(key) || '[]');
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function nowISO() {
  return new Date().toISOString();
}
function genCode() {
  return Math.random().toString(36).slice(2,9).toUpperCase();
}
function el(id) { return document.getElementById(id); }

/* -----------------------
   Crypto: SHA-256 helper
   ----------------------- */
async function hashText(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2,'0')).join('');
}

/* -----------------------
   UI helpers
   ----------------------- */
function showNotif(message, timeout=5000) {
  const area = document.querySelectorAll('#notif-area')[0];
  if (!area) return;
  const node = document.createElement('div');
  node.className = 'notif';
  node.innerHTML = `<div>${escapeHtml(message)}</div><div><button class="btn outline" data-close>إغلاق</button></div>`;
  area.appendChild(node);
  node.querySelector('[data-close]').addEventListener('click', ()=> node.remove());
  if (timeout) setTimeout(()=> node.remove(), timeout);
}
function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/* -----------------------
   Session & Navbar update
   ----------------------- */
function getLoggedEmail() { return localStorage.getItem(STORAGE.LOGGED) || null; }
function setLoggedEmail(email) { localStorage.setItem(STORAGE.LOGGED, email); }
function clearLogged() { localStorage.removeItem(STORAGE.LOGGED); }

function updateNav() {
  const mail = getLoggedEmail();
  const navLogout = el('nav-logout') || document.querySelector('#nav-logout');
  const navProfile = document.querySelectorAll('#nav-profile');
  const navLogin = document.getElementById('nav-login');
  const navRegister = document.getElementById('nav-register');

  if (mail) {
    if (navLogout) navLogout.style.display = 'inline';
    navProfile.forEach(n=> n.style.display = 'inline');
    if (navLogin) navLogin.style.display = 'none';
    if (navRegister) navRegister.style.display = 'none';
  } else {
    if (navLogout) navLogout.style.display = 'none';
    navProfile.forEach(n=> n.style.display = 'none');
    if (navLogin) navLogin.style.display = 'inline';
    if (navRegister) navRegister.style.display = 'inline';
  }

  if (navLogout) {
    navLogout.addEventListener('click', (e)=> {
      clearLogged();
      showNotif('You have logged out successfully.');
      setTimeout(()=> location.href = 'index.html', 600);
    });
  }
}

/* -----------------------
   Auto logout after inactivity
   ----------------------- */
let inactivityTimer = null;
function resetInactivity() {
  const email = getLoggedEmail();
  if (!email) return;
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(()=> {
    clearLogged();
    showNotif('تم تسجيل الخروج تلقائياً بسبب عدم النشاط.');
    setTimeout(()=> location.href = 'login.html', 700);
  }, 30 * 60 * 1000);
}
['click','keydown','mousemove','touchstart'].forEach(ev => window.addEventListener(ev, resetInactivity));

/* -----------------------
   Registration
   ----------------------- */
async function handleRegister() {
  const form = el('registerForm');
  if (!form) return;
  form.addEventListener('submit', async (e)=> {
    e.preventDefault();
    const username = el('r-username').value.trim();
    const email = el('r-email').value.trim().toLowerCase();
    const password = el('r-password').value;
    const confirm = el('r-confirm').value;

    if (!username || !email || !password || !confirm) {
      showNotif('يرجى ملء جميع الحقول.');
      return;
    }
    if (!/^[a-zA-Z0-9\u0600-\u06FF _-]{3,}$/.test(username)) {
      showNotif('اسم المستخدم يجب أن يحتوي حروف وأرقام أو مسافات، وبحد أدنى 3 أحرف.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showNotif('البريد الإلكتروني غير صالح.');
      return;
    }
    if (password.length < 8) {
      showNotif('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
      return;
    }
    if (password !== confirm) {
      showNotif('كلمتا المرور غير متطابقتين.');
      return;
    }

    const users = loadJSON(STORAGE.USERS);
    if (users.some(u => u.email === email)) {
      showNotif('البريد الإلكتروني مستخدم سابقاً.');
      return;
    }
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      showNotif('اسم المستخدم مستخدم سابقاً.');
      return;
    }

    const hashed = await hashText(password);
    users.push({ username, email, passwordHash: hashed, createdAt: nowISO() });
    saveJSON(STORAGE.USERS, users);
    showNotif('Account created successfully — تم إنشاء الحساب بنجاح.');
    setTimeout(()=> location.href = 'login.html', 900);
  });
}

/* -----------------------
   Login
   ----------------------- */
async function handleLogin() {
  const form = el('loginForm');
  if (!form) return;
  form.addEventListener('submit', async (e)=> {
    e.preventDefault();
    const email = el('l-email').value.trim().toLowerCase();
    const password = el('l-password').value;
    if (!email || !password) {
      showNotif('يرجى ملء الحقول.');
      return;
    }
    const users = loadJSON(STORAGE.USERS);
    const hash = await hashText(password);
    const user = users.find(u => u.email === email && u.passwordHash === hash);
    if (!user) {
      showNotif('Invalid email or password. البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      return;
    }
    setLoggedEmail(email);
    resetInactivity();
    showNotif(`مرحباً ${user.username} — تم تسجيل الدخول بنجاح.`);
    setTimeout(()=> location.href = 'gatherings.html', 700);
  });
}

/* -----------------------
   Profile page
   ----------------------- */
function handleProfile() {
  const panel = el('profilePanel');
  if (!panel) return;
  const email = getLoggedEmail();
  if (!email) { 
    showNotif('يجب تسجيل الدخول لعرض الملف.'); 
    setTimeout(()=> location.href = 'login.html', 700); 
    return; 
  }

  const users = loadJSON(STORAGE.USERS);
  const user = users.find(u => u.email === email);
  if (!user) { showNotif('User not found.'); return; }

  function renderView() {
    panel.innerHTML = `
      <h2>معلومات الحساب</h2>
      <div class="form-container">
        <label>اسم المستخدم</label>
        <div id="p-username" class="readonly">${escapeHtml(user.username)}</div>

        <label>البريد الإلكتروني</label>
        <div id="p-email" class="readonly">${escapeHtml(user.email)}</div>

        <label>تاريخ الإنشاء</label>
        <div class="readonly">${new Date(user.createdAt).toLocaleString()}</div>

        <div style="margin-top:10px">
          <button id="editProfile" class="btn">تعديل</button>
        </div>
      </div>
    `;
    el('editProfile').addEventListener('click', renderEdit);
  }

  function renderEdit() {
    panel.innerHTML = `
      <h2>تعديل الحساب</h2>
      <form id="editForm" class="form-container">
        <label>اسم المستخدم</label>
        <input id="edit-username" value="${escapeHtml(user.username)}" required />

        <label>البريد الإلكتروني</label>
        <input id="edit-email" value="${escapeHtml(user.email)}" required />

        <label>كلمة المرور الجديدة (اختياري)</label>
        <input id="edit-password" type="password" placeholder="اتركه فارغاً إن لم ترغب بالتغيير" minlength="8" />

        <div style="margin-top:10px; display:flex; gap:8px;">
          <button class="btn" type="submit">حفظ</button>
          <button id="cancelEdit" class="btn outline" type="button">إلغاء</button>
        </div>
      </form>
    `;
    el('cancelEdit').addEventListener('click', renderView);
    el('editForm').addEventListener('submit', async (e)=> {
      e.preventDefault();
      const newUsername = el('edit-username').value.trim();
      const newEmail = el('edit-email').value.trim().toLowerCase();
      const newPass = el('edit-password').value;

      if (!/^[a-zA-Z0-9\u0600-\u06FF _-]{3,}$/.test(newUsername)) {
        showNotif('اسم المستخدم غير صالح.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        showNotif('البريد الإلكتروني غير صالح.');
        return;
      }
      
      const others = loadJSON(STORAGE.USERS).filter(u => u.email !== user.email);
      if (others.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
        showNotif('اسم المستخدم مستخدم.');
        return;
      }
      if (others.some(u => u.email === newEmail)) {
        showNotif('البريد الإلكتروني مستخدم.');
        return;
      }
      
      const all = loadJSON(STORAGE.USERS);
      const idx = all.findIndex(u => u.email === user.email);
      if (idx === -1) { showNotif('حدث خطأ'); return; }
      all[idx].username = newUsername;
      all[idx].email = newEmail;
      if (newPass && newPass.length >=8) {
        all[idx].passwordHash = await hashText(newPass);
      }
      saveJSON(STORAGE.USERS, all);
      
      if (getLoggedEmail() === user.email) {
        setLoggedEmail(newEmail);
      }
      showNotif('Profile updated successfully — تم تحديث الملف.');
      renderView();
    });
  }

  renderView();
}

/* -----------------------
   Create / Edit gatherings
   ----------------------- */
// Update the handleCreateEdit function to work with maps
function handleCreateEdit() {
  const form = el('createForm');
  if (!form) return;

  const urlParams = new URLSearchParams(location.search);
  const editId = urlParams.get('edit');
  
  if (editId) {
    // Load existing gathering for editing
    const gatherings = loadJSON(STORAGE.GATHERINGS);
    const gathering = gatherings.find(g => g.id === editId);
    
    if (gathering) {
      el('formTitle').textContent = 'تعديل الفعالية';
      el('g-name').value = gathering.name;
      el('g-category').value = gathering.category;
      
      // Format date for datetime-local input
      const date = new Date(gathering.date);
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
        .toISOString()
        .slice(0, 16);
      el('g-date').value = localDate;
      
      el('g-location').value = gathering.location;
      el('g-reminder').value = gathering.reminder || 'none';
      
      el('cancelEdit').style.display = 'inline-block';
      el('cancelEdit').onclick = () => location.href = `gathering.html?id=${gathering.id}`;
    }
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    
    const formData = {
      name: el('g-name').value.trim(),
      category: el('g-category').value,
      date: el('g-date').value,
      location: el('g-location').value,
      reminder: el('g-reminder').value,
      locationLat: el('g-location-lat').value,
      locationLng: el('g-location-lng').value
    };

    // Validation
    if (!formData.name || !formData.category || !formData.date || !formData.location) {
      showNotif('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!formData.locationLat || !formData.locationLng) {
      showNotif('يرجى اختيار موقع من الخريطة');
      return;
    }

    const gatherings = loadJSON(STORAGE.GATHERINGS);
    
    if (editId) {
      // Update existing gathering
      const index = gatherings.findIndex(g => g.id === editId);
      if (index !== -1) {
        gatherings[index] = {
          ...gatherings[index],
          ...formData,
          locationData: {
            address: formData.location,
            lat: formData.locationLat,
            lng: formData.locationLng
          }
        };
        saveJSON(STORAGE.GATHERINGS, gatherings);
        showNotif('تم تعديل الفعالية بنجاح');
        setTimeout(() => location.href = `gathering.html?id=${editId}`, 1000);
      }
    } else {
      // Create new gathering
      const newGathering = {
        id: Date.now().toString(),
        code: genCode(),
        createdBy: getLoggedEmail(),
        createdAt: nowISO(),
        participants: getLoggedEmail() ? [getLoggedEmail()] : [],
        tasks: [],
        shareableLink: `${location.origin}/gatherings.html?joincode=${genCode()}`,
        ...formData,
        locationData: {
          address: formData.location,
          lat: formData.locationLat,
          lng: formData.locationLng
        }
      };
      
      gatherings.push(newGathering);
      saveJSON(STORAGE.GATHERINGS, gatherings);
      showNotif('تم إنشاء الفعالية بنجاح');
      setTimeout(() => location.href = 'gatherings.html', 1000);
    }
  };
}

/* -----------------------
   Gatherings list (search + filter + join) - FIXED
   ----------------------- */
function handleGatheringsList() {
  const listEl = el('gatheringList');
  if (!listEl) return;
  
  const search = el('searchInput');
  const categoryFilter = el('filterCategory');
  const from = el('filterFrom');
  const to = el('filterTo');
  const clear = el('clearFilter');
  const joinInput = el('joinCode');
  const joinBtn = el('joinBtn');
  const welcome = el('welcomeUser');

  // Auto-join from shareable link
  const urlParams = new URLSearchParams(window.location.search);
  const joinCode = urlParams.get('joincode');
  if (joinCode && getLoggedEmail()) {
    const allG = loadJSON(STORAGE.GATHERINGS);
    const g = allG.find(x => x.code === joinCode);
    if (g && !g.participants.includes(getLoggedEmail())) {
      g.participants.push(getLoggedEmail());
      saveJSON(STORAGE.GATHERINGS, allG);
      showNotif('تم الانضمام للفعالية تلقائياً من الرابط!');
      window.history.replaceState({}, '', 'gatherings.html');
    }
  }

  const all = loadJSON(STORAGE.GATHERINGS);
  const users = loadJSON(STORAGE.USERS);
  const logged = getLoggedEmail();
  
  if (welcome) {
    const u = users.find(x=> x.email === logged);
    welcome.textContent = u ? `مرحباً، ${u.username}` : 'فعالياتي';
  }

  function render(items) {
    listEl.innerHTML = '';
    if (!items.length) {
      listEl.innerHTML = '<p class="muted">لا توجد فعاليات مطابقة.</p>';
      return;
    }
    
    items.forEach(g => {
      const container = document.createElement('div');
      container.className = 'item';
      const ownerName = users.find(u=> u.email === g.createdBy)?.username || 'غير معروف';
      const shareableLink = `${window.location.origin}/gatherings.html?joincode=${g.code}`;
      
      const html = `
        <div class="meta">
          <h3>${escapeHtml(g.name)}</h3>
          <p>الفئة: ${escapeHtml(g.category)} — التاريخ: ${new Date(g.date).toLocaleString()}</p>
          <p>الموقع: ${escapeHtml(g.location)}</p>
          <p class="muted">المنشئ: ${escapeHtml(ownerName)} — رمز الانضمام: <strong>${escapeHtml(g.code)}</strong></p>
          <div class="share-link">
            <strong>رابط المشاركة:</strong><br>
            <small>${shareableLink}</small>
            <button class="btn outline copy-link" data-link="${shareableLink}" style="margin-top: 5px; padding: 5px 10px;">
              <i class="fas fa-copy"></i> نسخ الرابط
            </button>
          </div>
        </div>
        <div class="actions">
          <button class="btn" data-view="${g.id}">عرض</button>
          ${ (g.createdBy === logged) ? 
            `<button class="btn outline" data-edit="${g.id}">تعديل</button>
             <button class="btn outline" data-delete="${g.id}">حذف</button>` : 
            `<button class="btn outline" data-join="${g.id}">انضم للفعالية</button>` 
          }
        </div>`;
      
      container.innerHTML = html;
      listEl.appendChild(container);
    });

    // Event listeners
    listEl.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', ()=> location.href = 'gathering.html?id=' + btn.dataset.view);
    });
    
    listEl.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', ()=> location.href = 'create.html?edit=' + btn.dataset.edit);
    });
    
    listEl.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', ()=> {
        if (!confirm('هل أنت متأكد من حذف هذه الفعالية؟')) return;
        const allG = loadJSON(STORAGE.GATHERINGS).filter(x=> x.id !== btn.dataset.delete);
        saveJSON(STORAGE.GATHERINGS, allG);
        showNotif(' تم حذف الفعالية.');
        render(filterApply());
      });
    });
    
    listEl.querySelectorAll('[data-join]').forEach(btn => {
      btn.addEventListener('click', ()=> joinById(btn.dataset.join));
    });
    
    // Copy link functionality
    listEl.querySelectorAll('.copy-link').forEach(btn => {
      btn.addEventListener('click', ()=> {
        const link = btn.dataset.link;
        navigator.clipboard.writeText(link).then(() => {
          showNotif('تم نسخ رابط المشاركة إلى الحافظة!');
        });
      });
    });
  }

  function filterApply() {
    let items = loadJSON(STORAGE.GATHERINGS);
    const q = search?.value?.trim().toLowerCase();
    const category = categoryFilter?.value;
    
    if (q) items = items.filter(i => i.name.toLowerCase().includes(q));
    if (category) items = items.filter(i => i.category === category);
    
    const f = from?.value;
    const t = to?.value;
    if (f) {
      const fromD = new Date(f).getTime();
      items = items.filter(i => new Date(i.date).getTime() >= fromD);
    }
    if (t) {
      const toD = new Date(t);
      toD.setHours(23,59,59,999);
      items = items.filter(i => new Date(i.date).getTime() <= toD.getTime());
    }
    
    return items.sort((a,b)=> new Date(a.date) - new Date(b.date));
  }

  function joinById(gid) {
    const all = loadJSON(STORAGE.GATHERINGS);
    const g = all.find(x=> x.id === gid);
    if (!g) { showNotif('الفعالية غير موجودة'); return; }
    const logged = getLoggedEmail();
    if (!logged) { 
      showNotif('يجب تسجيل الدخول للانضمام.'); 
      location.href='login.html'; 
      return; 
    }
    if (!g.participants.includes(logged)) {
      g.participants.push(logged);
      saveJSON(STORAGE.GATHERINGS, all);
      showNotif(' تم الانضمام للفعالية.');
      render(filterApply());
    } else {
      showNotif('أنت بالفعل مشارك في هذه الفعالية.');
    }
  }

  // Join by code
  joinBtn?.addEventListener('click', ()=> {
    const code = (joinInput.value || '').trim().toUpperCase();
    if (!code) { showNotif('ادخل رمز الانضمام.'); return; }
    const allG = loadJSON(STORAGE.GATHERINGS);
    const g = allG.find(x=> x.code === code);
    if (!g) { showNotif('الرمز غير صالح.'); return; }
    if (!getLoggedEmail()) { 
      showNotif('يجب تسجيل الدخول أولاً.'); 
      setTimeout(()=> location.href='login.html',600); 
      return; 
    }
    if (!g.participants.includes(getLoggedEmail())) {
      g.participants.push(getLoggedEmail());
      saveJSON(STORAGE.GATHERINGS, allG);
      showNotif(' تم الانضمام.');
      render(filterApply());
    } else {
      showNotif('أنت بالفعل منضم لهذه الفعالية.');
    }
  });

  // Search/filter events - FIXED to include category filter
  [search, categoryFilter, from, to].forEach(inp => {
    if (inp) inp.addEventListener('input', ()=> render(filterApply()));
  });
  
  clear?.addEventListener('click', ()=> { 
    if (from) from.value = '';
    if (to) to.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (search) search.value = '';
    render(filterApply()); 
  });

  render(filterApply());
}

/* -----------------------
   Gathering detail page - FIXED with items to bring
   ----------------------- */
function handleGatheringDetail() {
  const panel = el('detailPanel');
  if (!panel) return;
  const url = new URL(location.href);
  const id = url.searchParams.get('id');
  const all = loadJSON(STORAGE.GATHERINGS);
  const users = loadJSON(STORAGE.USERS);
  const g = all.find(x=> x.id === id);
  const logged = getLoggedEmail();
  if (!g) { panel.innerHTML = '<p class="muted">الفعالية غير موجودة.</p>'; return; }

  function render() {
    const ownerName = users.find(u=> u.email === g.createdBy)?.username || 'غير معروف';
    const joined = logged && g.participants.includes(logged);
    const canEdit = logged && g.createdBy === logged;
    const shareableLink = `${window.location.origin}/gatherings.html?joincode=${g.code}`;
    
    panel.innerHTML = `
      <div class="top-row">
        <h2>${escapeHtml(g.name)}</h2>
        <div>
          ${canEdit ? `<button id="editBtn" class="btn">تعديل</button>
                       <button id="delBtn" class="btn outline">حذف</button>` : ''}
          ${joined ? `<button id="leaveBtn" class="btn outline">الخروج من الفعالية</button>` : `<button id="joinBtn" class="btn">انضم للفعالية</button>`}
        </div>
      </div>

      <div class="card" style="margin-top:10px">
        <p><strong>الفئة:</strong> ${escapeHtml(g.category)}</p>
        <p><strong>التاريخ:</strong> ${new Date(g.date).toLocaleString()}</p>
        <p><strong>الموقع:</strong> ${escapeHtml(g.location)}</p>
        <p><strong>رمز الانضمام:</strong> <code>${escapeHtml(g.code)}</code></p>
        <div class="share-link">
          <strong>رابط المشاركة:</strong><br>
          <small>${shareableLink}</small>
          <button class="btn outline copy-link" data-link="${shareableLink}" style="margin-top: 5px; padding: 5px 10px;">
            <i class="fas fa-copy"></i> نسخ الرابط
          </button>
        </div>
        <p class="muted"><strong>المنشئ:</strong> ${escapeHtml(ownerName)}</p>
      </div>

      <section style="margin-top:12px">
        <h3>المشاركون (${g.participants.length})</h3>
        <div id="participantsList" class="list"></div>
      </section>

      <section style="margin-top:12px">
        <h3>قائمة المهام الاغراض</h3>
      <br>
        <form id="taskForm" style="margin-bottom:8px">
          <input id="taskTitle" placeholder="عنوان المهمة أو الغرض" required />
      <br><br>
          <input id="taskNotes" placeholder="ملاحظة (اختياري)" />
    <br><br>
          <select id="taskType">
            <option value="task">مهمة </option>
            <option value="item">غرض</option>
          </select>
      <br><br>
          <select id="taskAssign"><option value="">تعيين إلى  (اختياري)</option></select>
            <br><br>

          <button class="btn" type="submit">إضافة</button>
      <br> <br>

        </form>
        <div id="taskList" class="list"></div>
      </section>
    `;

    // Copy link functionality
    panel.querySelectorAll('.copy-link').forEach(btn => {
      btn.addEventListener('click', ()=> {
        const link = btn.dataset.link;
        navigator.clipboard.writeText(link).then(() => {
          showNotif('تم نسخ رابط المشاركة إلى الحافظة!');
        });
      });
    });

    // Participants rendering with items they're bringing
    const participantsList = el('participantsList');
    participantsList.innerHTML = '';
    if (!g.participants.length) {
      participantsList.innerHTML = '<p class="muted">No participants yet — لا يوجد مشاركون بعد.</p>';
    } else {
      g.participants.forEach(pEmail => {
        const u = users.find(u => u.email === pEmail);
        const name = u ? u.username : pEmail;
        const userTasks = g.tasks.filter(t => t.assignedTo === pEmail && t.type === 'task');
        const userItems = g.tasks.filter(t => t.assignedTo === pEmail && t.type === 'item');
        
        const li = document.createElement('div');
        li.className = 'item';
        li.innerHTML = `
          <div class="meta">
            <h3>${escapeHtml(name)}</h3>
            ${userTasks.length ? `<p>📝 المهام: ${userTasks.map(t=> escapeHtml(t.title)).join(', ')}</p>` : ''}
            ${userItems.length ? `<p>🚗 سَيحضر: ${userItems.map(t=> escapeHtml(t.title)).join(', ')}</p>` : ''}
            ${!userTasks.length && !userItems.length ? '<p class="muted">لم يتم تكليف مهام أو اغراض بعد</p>' : ''}
          </div>`;
        participantsList.appendChild(li);
      });
    }

    // Tasks rendering
    const taskList = el('taskList');
    taskList.innerHTML = '';
    if (!g.tasks.length) {
      taskList.innerHTML = '<p class="muted">لا توجد مهام أو اغراض بعد.</p>';
    } else {
      g.tasks.forEach(t => {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${t.status === 'done' ? 'done' : ''}`;
        const assignedName = users.find(u=> u.email === t.assignedTo)?.username || (t.assignedTo || 'غير مخصص');
        const icon = t.type === 'item' ? '🚗' : '📝';
        const typeText = t.type === 'item' ? 'غرض سيتم إحضاره' : 'مهمة';
        
        taskDiv.innerHTML = `
          <div class="meta">
            <h3>${icon} ${escapeHtml(t.title)} ${t.status === 'done' ? '✔️' : ''}</h3>
            <p>${escapeHtml(t.notes || '')}</p>
            <p class="muted">${typeText} - معين لـ: ${escapeHtml(assignedName)} — الحالة: ${escapeHtml(t.status)}</p>
          </div>
          <div class="actions">
            <button class="btn" data-toggle="${t.id}">${t.status === 'done' ? 'وضع كقيد الانتظار' : 'وضع كمكتمل'}</button>
            <button class="btn outline" data-edit="${t.id}">تعديل</button>
            <button class="btn outline" data-del="${t.id}">حذف</button>
          </div>
        `;
        taskList.appendChild(taskDiv);
      });
    }

    // Populate assign select
    const assignSelect = el('taskAssign');
    assignSelect.innerHTML = `<option value="">تعيين إلى (اختياري)</option>`;
    g.participants.forEach(p => {
      const user = users.find(u=> u.email === p);
      assignSelect.innerHTML += `<option value="${escapeHtml(p)}">${escapeHtml(user ? user.username : p)}</option>`;
    });

    // Event handlers
    el('joinBtn')?.addEventListener('click', ()=> {
      if (!getLoggedEmail()) { 
        showNotif('يجب تسجيل الدخول للانضمام.'); 
        setTimeout(()=> location.href='login.html',600); 
        return; 
      }
      if (!g.participants.includes(getLoggedEmail())) {
        g.participants.push(getLoggedEmail());
        saveGatherings();
        showNotif('تم الانضمام للفعالية.');
        render();
      } else {
        showNotif('أنت بالفعل مشارك.');
      }
    });
    
    el('leaveBtn')?.addEventListener('click', ()=> {
      if (!confirm('هل تريد الخروج من الفعالية؟')) return;
      const idx = g.participants.indexOf(getLoggedEmail());
      if (idx !== -1) g.participants.splice(idx,1);
      g.tasks.forEach(t=> { 
        if (t.assignedTo === getLoggedEmail()) t.assignedTo = null; 
      });
      saveGatherings();
      showNotif('تم الخروج من الفعالية.');
      render();
    });

    el('editBtn')?.addEventListener('click', ()=> location.href = 'create.html?edit=' + g.id);
    el('delBtn')?.addEventListener('click', ()=> {
      if (!confirm('هل تريد حذف الفعالية نهائياً؟')) return;
      const allG = loadJSON(STORAGE.GATHERINGS).filter(x=> x.id !== g.id);
      saveJSON(STORAGE.GATHERINGS, allG);
      showNotif('Gathering deleted.');
      setTimeout(()=> location.href = 'gatherings.html', 700);
    });

    // Task form
    el('taskForm').addEventListener('submit', (ev)=> {
      ev.preventDefault();
      const title = el('taskTitle').value.trim();
      const notes = el('taskNotes').value.trim();
      const taskType = el('taskType').value;
      const assignedTo = el('taskAssign').value || null;
      
      if (!title) { showNotif('عنوان المهمة أو الغرض مطلوب.'); return; }
      
      const tId = Date.now().toString(36);
      g.tasks.push({ 
        id: tId, 
        title, 
        notes, 
        type: taskType,
        assignedTo, 
        status: 'pending', 
        createdAt: nowISO() 
      });
      
      saveGatherings();
      showNotif('تم إضافة ' + (taskType === 'item' ? 'الغرض' : 'المهمة') + ' بنجاح.');
      el('taskTitle').value = ''; 
      el('taskNotes').value = '';
      render();
    });

    // Task actions
    taskList.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', ()=> {
        const t = g.tasks.find(x=> x.id === btn.dataset.toggle);
        if (!t) return;
        t.status = t.status === 'done' ? 'pending' : 'done';
        saveGatherings();
        showNotif(t.status === 'done' ? 'Task marked done.' : 'Task set to pending.');
        render();
      });
    });
    
    taskList.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', ()=> {
        const t = g.tasks.find(x=> x.id === btn.dataset.edit);
        if (!t) return;
        const newTitle = prompt('تعديل العنوان', t.title);
        if (newTitle === null) return;
        const newNotes = prompt('تعديل الملاحظة (اتركها فارغة للحذف)', t.notes || '');
        const assigned = prompt('أدخل البريد الإلكتروني للمستخدم المخصص (أو اتركه فارغاً)', t.assignedTo || '');
        t.title = newTitle.trim() || t.title;
        t.notes = newNotes === null ? t.notes : newNotes.trim();
        t.assignedTo = assigned ? assigned.trim().toLowerCase() : null;
        saveGatherings();
        showNotif('Task edited — تم تعديل المهمة.');
        render();
      });
    });
    
    taskList.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', ()=> {
        if (!confirm('هل تريد حذف هذا العنصر؟')) return;
        g.tasks = g.tasks.filter(x=> x.id !== btn.dataset.del);
        saveGatherings();
        showNotif('Task deleted — تم حذف العنصر.');
        render();
      });
    });
  }

  function saveGatherings() {
    const allG = loadJSON(STORAGE.GATHERINGS);
    const idx = allG.findIndex(x=> x.id === g.id);
    if (idx !== -1) { 
      allG[idx] = g; 
      saveJSON(STORAGE.GATHERINGS, allG); 
    }
  }

  render();
}

/* -----------------------
   Reminders check
   ----------------------- */
function checkReminders() {
  const all = loadJSON(STORAGE.GATHERINGS);
  const users = loadJSON(STORAGE.USERS);
  const logged = getLoggedEmail();
  if (!logged) return;
  const now = Date.now();
  
  all.forEach(g => {
    if (!g.reminder || g.reminder === 'none') return;
    if (!g.participants.includes(logged) && g.createdBy !== logged) return;
    
    const eventTime = new Date(g.date).getTime();
    let remTime = null;
    if (g.reminder === '24h') remTime = eventTime - (24*3600*1000);
    else if (g.reminder === '1h') remTime = eventTime - (1*3600*1000);
    if (!remTime) return;
    
    const key = `rem-notified-${logged}-${g.id}`;
    const notified = localStorage.getItem(key);
    if (now >= remTime && !notified) {
      showNotif(`تذكير: الفعالية "${g.name}" بتاريخ ${new Date(g.date).toLocaleString()}`);
      localStorage.setItem(key, '1');
    }
  });
}


/* -----------------------
   Initialize on DOM load
   ----------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initializeSampleData();
  
  updateNav();
  resetInactivity();
  handleRegister();
  handleLogin();
  handleProfile();
  handleCreateEdit();
  handleGatheringsList();
  handleGatheringDetail();
  addSampleUserLogin();

  checkReminders();
  setInterval(checkReminders, 60 * 1000);

  const logged = getLoggedEmail();
  if (logged) {
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    if (navLogin) navLogin.style.display='none';
    if (navRegister) navRegister.style.display='none';
  }
});