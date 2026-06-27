const API = '/api/articles';

let articles = [];
let filteredArticles = [];
let editingId = null;
let deleteId = null;

function init() {
    bindEvents();
    updateTopbarTime();
    setInterval(updateTopbarTime, 1000);
    registerServiceWorker();
    requestPushPermission();
    loadArticles();
    showSection('dashboard');
}

function bindEvents() {
    const titleInput = document.getElementById('inputJudul');
    const contentEditor = document.getElementById('inputContent');
    const writerInput = document.getElementById('inputWriter');
    const categoryInput = document.getElementById('inputCategory');
    const tagsInput = document.getElementById('inputTags');

    if (titleInput) {
        titleInput.addEventListener('input', updateFormPreview);
        titleInput.addEventListener('input', updateTitleCount);
    }

    if (contentEditor) {
        contentEditor.addEventListener('input', updateFormPreview);
    }

    if (writerInput || categoryInput || tagsInput) {
        [writerInput, categoryInput, tagsInput].forEach((input) => {
            if (input) input.addEventListener('input', updateFormPreview);
        });
    }

    const sidebarToggle = document.getElementById('sidebarToggle');
    const topbarToggle = document.getElementById('topbarToggle');
    const sidebar = document.getElementById('sidebar');

    const toggleSidebar = () => {
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    };

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (topbarToggle) topbarToggle.addEventListener('click', toggleSidebar);

    window.showSection = showSection;
    window.handleGlobalSearch = handleGlobalSearch;
    window.filterArticles = filterArticles;
    window.submitArticle = submitArticle;
    window.cancelEdit = cancelEdit;
    window.confirmDelete = confirmDelete;
    window.closeDeleteModal = closeDeleteModal;
    window.formatText = formatText;
    window.editArticle = editArticle;
    window.deleteArticle = deleteArticle;
    window.openDeleteModal = openDeleteModal;
}

async function loadArticles() {
    try {
        const res = await fetch(API);
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const data = await res.json();
        articles = Array.isArray(data) ? data : [];
        filteredArticles = [...articles];
        renderDashboard();
        renderArticleList();
    } catch (err) {
        console.error('FETCH ERROR:', err);
        showToast('Gagal memuat artikel dari server', 'error');
    }
}

async function submitArticle() {
    const title = document.getElementById('inputJudul').value.trim();
    const content = document.getElementById('inputContent').innerHTML.trim();
    const writer = document.getElementById('inputWriter').value.trim();
    const category = document.getElementById('inputCategory').value;
    const tags = document.getElementById('inputTags').value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

    const errorBox = document.getElementById('formError');
    if (!title || !content) {
        if (errorBox) {
            errorBox.textContent = 'Judul dan isi artikel wajib diisi.';
            errorBox.classList.remove('hidden');
        }
        return;
    }

    if (errorBox) {
        errorBox.classList.add('hidden');
    }

    try {
        const payload = { title, content, writer, category, tags };
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${API}/${editingId}` : API;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Gagal menyimpan artikel');

        await loadArticles();
        showToast(editingId ? 'Artikel berhasil diperbarui' : 'Artikel berhasil ditambahkan', 'success');
        await showPushMessage(editingId ? 'Artikel diperbarui' : 'Artikel baru ditambahkan');
        cancelEdit();
        showSection('articles');
    } catch (err) {
        console.error('SUBMIT ERROR:', err);
        showToast(err.message || 'Gagal menyimpan artikel', 'error');
    }
}

function cancelEdit() {
    editingId = null;
    document.getElementById('inputJudul').value = '';
    document.getElementById('inputContent').innerHTML = '';
    document.getElementById('inputWriter').value = 'Naqris';
    document.getElementById('inputCategory').value = 'Teknologi';
    document.getElementById('inputTags').value = '';
    document.getElementById('formTitle').textContent = 'Tambah Artikel Baru';
    document.getElementById('formSubtitle').textContent = 'Tulis artikel dan klik Simpan';
    document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Artikel';
    updateTitleCount();
    updateFormPreview();
}

function editArticle(id) {
    const article = articles.find((item) => item.id === id);
    if (!article) return;

    editingId = id;
    document.getElementById('inputJudul').value = article.title || '';
    document.getElementById('inputContent').innerHTML = article.content || '';
    document.getElementById('inputWriter').value = article.writer || 'Naqris';
    document.getElementById('inputCategory').value = article.category || 'Teknologi';
    document.getElementById('inputTags').value = Array.isArray(article.tags) ? article.tags.join(', ') : '';
    document.getElementById('formTitle').textContent = 'Edit Artikel';
    document.getElementById('formSubtitle').textContent = 'Perbarui konten artikel yang dipilih';
    document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Perbarui Artikel';
    updateTitleCount();
    updateFormPreview();
    showSection('add');
}

function openDeleteModal(id) {
    deleteId = id;
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.add('active');
}

function closeDeleteModal() {
    deleteId = null;
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.remove('active');
}

async function confirmDelete() {
    if (!deleteId) return;

    try {
        const res = await fetch(`${API}/${deleteId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Gagal menghapus artikel');
        await loadArticles();
        showToast('Artikel berhasil dihapus', 'success');
        await showPushMessage('Artikel dihapus');
        closeDeleteModal();
    } catch (err) {
        console.error('DELETE ERROR:', err);
        showToast(err.message || 'Gagal menghapus artikel', 'error');
    }
}

function filterArticles() {
    const search = document.getElementById('articleSearch')?.value.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const sort = document.getElementById('sortFilter')?.value || 'newest';

    filteredArticles = articles.filter((article) => {
        const titleMatch = article.title?.toLowerCase().includes(search);
        const writerMatch = article.writer?.toLowerCase().includes(search);
        const categoryMatch = !category || article.category === category;
        return (titleMatch || writerMatch) && categoryMatch;
    });

    if (sort === 'oldest') {
        filteredArticles.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'az') {
        filteredArticles.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'za') {
        filteredArticles.sort((a, b) => b.title.localeCompare(a.title));
    } else {
        filteredArticles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    renderArticleList();
}

function handleGlobalSearch(value) {
    const q = value.toLowerCase();
    const filtered = articles.filter((article) => {
        return article.title?.toLowerCase().includes(q) || article.writer?.toLowerCase().includes(q);
    });
    filteredArticles = filtered;
    renderArticleList();
}

function renderDashboard() {
    const statTotal = document.getElementById('statTotal');
    const statWriters = document.getElementById('statWriters');
    const statCategories = document.getElementById('statCategories');
    const statToday = document.getElementById('statToday');
    const recentArticles = document.getElementById('recentArticles');
    const categoryChart = document.getElementById('categoryChart');

    if (statTotal) statTotal.textContent = articles.length;
    if (statWriters) statWriters.textContent = new Set(articles.map((article) => article.writer)).size;
    if (statCategories) statCategories.textContent = new Set(articles.map((article) => article.category)).size;
    if (statToday) statToday.textContent = articles.filter((article) => isToday(article.createdAt)).length;

    if (recentArticles) {
        if (!articles.length) {
            recentArticles.innerHTML = '<p class="empty-state-text">Belum ada artikel terbaru.</p>';
            return;
        }

        recentArticles.innerHTML = articles.slice(0, 5).map((article) => `
            <div class="recent-item">
                <div>
                    <strong>${escapeHtml(article.title || 'Tanpa judul')}</strong>
                    <p>${escapeHtml(article.writer || 'Admin')} • ${escapeHtml(article.category || 'Lainnya')}</p>
                </div>
                <span>${formatDate(article.createdAt)}</span>
            </div>
        `).join('');
    }

    if (categoryChart) {
        const categories = articles.reduce((acc, article) => {
            const key = article.category || 'Lainnya';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const items = Object.entries(categories).map(([name, count]) => `
            <div class="category-pill">
                <span>${escapeHtml(name)}</span>
                <strong>${count}</strong>
            </div>
        `).join('');

        categoryChart.innerHTML = items || '<p class="empty-state-text">Belum ada kategori.</p>';
    }
}

function renderArticleList() {
    const articleList = document.getElementById('articleList');
    const emptyState = document.getElementById('emptyState');

    if (!articleList) return;

    if (!filteredArticles.length) {
        articleList.innerHTML = '';
        emptyState?.classList.remove('hidden');
        return;
    }

    emptyState?.classList.add('hidden');

    articleList.innerHTML = filteredArticles.map((article) => `
        <article class="article-card">
            <div class="article-card-header">
                <div>
                    <h3>${escapeHtml(article.title || 'Tanpa judul')}</h3>
                    <p>${escapeHtml(article.writer || 'Admin')} • ${escapeHtml(article.category || 'Lainnya')}</p>
                </div>
                <span class="article-date">${formatDate(article.createdAt)}</span>
            </div>
            <div class="article-card-content">
                ${article.content ? article.content.substring(0, 180) : 'Belum ada isi artikel'}
            </div>
            <div class="article-card-tags">
                ${(article.tags || []).slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="article-card-actions">
                <button class="btn-ghost" onclick="editArticle('${article.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                <button class="btn-danger" onclick="openDeleteModal('${article.id}')"><i class="fa-solid fa-trash"></i> Hapus</button>
            </div>
        </article>
    `).join('');
}

function updateFormPreview() {
    const previewBox = document.getElementById('previewBox');
    if (!previewBox) return;

    const title = document.getElementById('inputJudul').value.trim() || 'Judul artikel';
    const content = document.getElementById('inputContent').innerHTML.trim() || '<p>Isi artikel akan tampil di sini.</p>';
    const writer = document.getElementById('inputWriter').value.trim() || 'Admin';
    const category = document.getElementById('inputCategory').value || 'Lainnya';

    previewBox.innerHTML = `
        <h4>${escapeHtml(title)}</h4>
        <p class="preview-meta">${escapeHtml(writer)} • ${escapeHtml(category)}</p>
        <div>${content}</div>
    `;
}

function updateTitleCount() {
    const input = document.getElementById('inputJudul');
    const counter = document.getElementById('judulCount');
    if (!input || !counter) return;
    counter.textContent = `${input.value.length}/100`;
}

function formatText(command) {
    document.execCommand(command, false, null);
    document.getElementById('inputContent').focus();
    updateFormPreview();
}

function showSection(section) {
    document.querySelectorAll('.section').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));

    const target = document.getElementById(`section-${section}`);
    if (target) target.classList.add('active');

    const nav = document.getElementById(`nav-${section}`);
    if (nav) nav.classList.add('active');

    const breadcrumb = document.getElementById('breadcrumbText');
    if (breadcrumb) {
        const labels = {
            dashboard: 'Dashboard',
            articles: 'Manajemen Artikel',
            add: 'Tambah / Edit Artikel',
        };
        breadcrumb.textContent = labels[section] || 'Dashboard';
    }
}

function updateTopbarTime() {
    const topbarTime = document.getElementById('topbarTime');
    if (topbarTime) {
        topbarTime.textContent = new Date().toLocaleString('id-ID', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(value) {
    if (!value) return 'Baru';
    return new Date(value).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function isToday(value) {
    if (!value) return false;
    const date = new Date(value);
    const now = new Date();
    return date.toDateString() === now.toDateString();
}

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker terdaftar');
        } catch (err) {
            console.error('Gagal mendaftarkan service worker', err);
        }
    }
}

async function requestPushPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

async function showPushMessage(message) {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        if (Notification.permission === 'granted') {
            registration.showNotification('CMS Update', {
                body: message,
                icon: 'https://img.icons8.com/color/48/000000/news.png',
            });
        }
    } catch (err) {
        console.error('Push notification error:', err);
    }
}

document.addEventListener('DOMContentLoaded', init);