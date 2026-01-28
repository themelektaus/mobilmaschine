const state = {
    currentPath: '',
    entries: [],
    sortBy: 'name-asc',
    clipboard: null,
};

const elements = {
    fileList: document.getElementById('file-list'),
    breadcrumb: document.getElementById('breadcrumb'),
    customSelect: document.getElementById('custom-select'),
    customSelectTrigger: document.querySelector('.custom-select-trigger'),
    customSelectValue: document.querySelector('.custom-select-value'),
    customSelectDropdown: document.querySelector('.custom-select-dropdown'),
    itemCount: document.getElementById('item-count'),
    errorToast: document.getElementById('error-toast'),
    lightbox: document.getElementById('lightbox'),
    lightboxTitle: document.getElementById('lightbox-title'),
    lightboxBody: document.getElementById('lightbox-body'),
    lightboxDownload: document.getElementById('lightbox-download'),
    lightboxSave: document.getElementById('lightbox-save'),
    lightboxClose: document.getElementById('lightbox-close'),
    lightboxBackdrop: document.querySelector('.lightbox-backdrop'),
    dropOverlay: document.getElementById('drop-overlay'),
    uploadPanel: document.getElementById('upload-panel'),
    uploadPanelTitle: document.getElementById('upload-panel-title'),
    uploadPanelList: document.getElementById('upload-panel-list'),
    uploadPanelClose: document.getElementById('upload-panel-close'),
    contextMenu: document.getElementById('context-menu'),
    btnNewFolder: document.getElementById('btn-new-folder'),
    btnNewFile: document.getElementById('btn-new-file'),
    btnPaste: document.getElementById('btn-paste'),
    dialogOverlay: document.getElementById('dialog-overlay'),
    dialogBackdrop: document.querySelector('.dialog-backdrop'),
    dialogTitle: document.getElementById('dialog-title'),
    dialogMessage: document.getElementById('dialog-message'),
    dialogInput: document.getElementById('dialog-input'),
    dialogCancel: document.getElementById('dialog-cancel'),
    dialogConfirm: document.getElementById('dialog-confirm'),
};

const PREVIEW_TYPES = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
    video: ['mp4', 'webm', 'ogg', 'mov'],
    audio: ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'opus', 'weba'],
    text: ['txt', 'md', 'log', 'json', 'xml', 'csv', 'js', 'ts', 'py', 'java', 'cs',
           'cpp', 'c', 'h', 'css', 'html', 'htm', 'sh', 'bash', 'yaml', 'yml', 'toml',
           'ini', 'cfg', 'conf', 'env', 'gitignore', 'dockerfile', 'makefile',
           'sql', 'rb', 'php', 'go', 'rs', 'kt', 'swift', 'dart', 'lua', 'r',
           'bat', 'ps1', 'csproj', 'sln', 'props', 'targets'],
    pdf: ['pdf'],
};

function getPreviewType(ext) {
    if (!ext) return null;
    const lower = ext.toLowerCase();
    for (const [type, exts] of Object.entries(PREVIEW_TYPES)) {
        if (exts.includes(lower)) return type;
    }
    return null;
}

// --- Initialization ---

// Custom Select
elements.customSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = elements.customSelect.classList.contains('open');
    if (isOpen) {
        closeCustomSelect();
    } else {
        openCustomSelect();
    }
});

elements.customSelectDropdown.querySelectorAll('.custom-select-option').forEach((option) => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.dataset.value;
        const text = option.textContent;

        // Update state
        state.sortBy = value;

        // Update UI
        elements.customSelectValue.textContent = text;

        // Update selected styling
        elements.customSelectDropdown.querySelectorAll('.custom-select-option').forEach((opt) => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');

        // Close dropdown and re-render
        closeCustomSelect();
        renderEntries();
    });
});

function openCustomSelect() {
    elements.customSelect.classList.add('open');
    elements.customSelectDropdown.classList.remove('hidden');
}

function closeCustomSelect() {
    elements.customSelect.classList.remove('open');
    elements.customSelectDropdown.classList.add('hidden');
}

// Initialize first option as selected
elements.customSelectDropdown.querySelector('.custom-select-option').classList.add('selected');

window.addEventListener('popstate', (e) => {
    const path = e.state?.path ?? '';
    loadDirectory(path, false);
});

elements.lightboxClose.addEventListener('click', closeLightbox);
elements.lightboxBackdrop.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!elements.dialogOverlay.classList.contains('hidden')) {
            closeDialog(null);
        } else if (!elements.contextMenu.classList.contains('hidden')) {
            closeContextMenu();
        } else if (elements.customSelect.classList.contains('open')) {
            closeCustomSelect();
        } else if (!elements.lightbox.classList.contains('hidden')) {
            closeLightbox();
        }
    }
});

document.addEventListener('click', (e) => {
    if (!elements.contextMenu.contains(e.target) && !e.target.closest('.more-btn')) {
        closeContextMenu();
    }
    if (!elements.customSelect.contains(e.target)) {
        closeCustomSelect();
    }
});

// --- Drag & Drop ---

let dragCounter = 0;

document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
        elements.dropOverlay.classList.remove('hidden');
    }
});

document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        elements.dropOverlay.classList.add('hidden');
    }
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    elements.dropOverlay.classList.add('hidden');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        uploadFiles(files);
    }
});

elements.uploadPanelClose.addEventListener('click', () => {
    elements.uploadPanel.classList.add('hidden');
});

elements.btnNewFolder.addEventListener('click', () => createNew('mkdir', 'Neuer Ordner'));
elements.btnNewFile.addEventListener('click', () => createNew('touch', 'Neue Datei'));
elements.btnPaste.addEventListener('click', () => pasteEntry());

loadDirectory('');

// --- API ---

async function loadDirectory(path, pushState = true) {
    state.currentPath = path;
    elements.fileList.innerHTML = '<div class="loading">Wird geladen...</div>';

    try {
        const response = await fetch(`api/files?path=${encodeURIComponent(path)}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        state.entries = data.entries;
        state.parentPath = data.parentPath;

        if (pushState) {
            history.pushState({ path }, '', `#${path}`);
        }

        renderBreadcrumb(path);
        renderEntries();
    } catch (err) {
        elements.fileList.innerHTML = `<div class="empty">Fehler: ${escapeHtml(err.message)}</div>`;
        showError(err.message);
    }
}

function fileUrl(path) {
    return `api/files/download?path=${encodeURIComponent(path)}`;
}

function downloadFile(path) {
    window.open(fileUrl(path), '_blank');
}

function openFile(path, name, ext) {
    const previewType = getPreviewType(ext);
    if (!previewType) {
        downloadFile(path);
        return;
    }
    openLightbox(path, name, previewType);
}

async function openLightbox(path, name, previewType) {
    const url = fileUrl(path);
    elements.lightboxTitle.textContent = name;
    elements.lightboxDownload.href = url;
    elements.lightboxDownload.download = name;
    elements.lightboxDownload.style.display = '';

    let content = '';
    switch (previewType) {
        case 'image':
            content = `<img src="${escapeAttr(url)}" alt="${escapeAttr(name)}">`;
            break;
        case 'video':
            content = `<video controls autoplay><source src="${escapeAttr(url)}">Nicht unterstützt.</video>`;
            break;
        case 'audio':
            content = `<audio controls autoplay><source src="${escapeAttr(url)}">Nicht unterstützt.</audio>`;
            break;
        case 'pdf':
            content = `<iframe src="${escapeAttr(url)}"></iframe>`;
            break;
        case 'text':
            content = '<pre>Wird geladen...</pre>';
            break;
    }

    elements.lightboxBody.innerHTML = content;
    elements.lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    if (previewType === 'text') {
        try {
            const res = await fetch(url);
            const text = await res.text();
            elements.lightboxBody.querySelector('pre').textContent = text;
        } catch {
            elements.lightboxBody.querySelector('pre').textContent = 'Fehler beim Laden der Datei.';
        }
    }
}

function closeLightbox() {
    elements.lightbox.classList.add('hidden');
    elements.lightboxSave.classList.add('hidden');
    elements.lightboxSave.onclick = null;
    document.body.style.overflow = '';
    // stop any playing media
    elements.lightboxBody.querySelectorAll('video, audio').forEach((el) => {
        el.pause();
        el.src = '';
    });
    elements.lightboxBody.innerHTML = '';
}

// --- Edit ---

async function editFile(path, name) {
    const url = fileUrl(path);
    elements.lightboxTitle.textContent = `Bearbeiten: ${name}`;
    elements.lightboxDownload.href = url;
    elements.lightboxDownload.download = name;
    elements.lightboxDownload.style.display = '';
    elements.lightboxBody.innerHTML = '<pre>Wird geladen...</pre>';
    elements.lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
        const res = await fetch(url);
        const text = await res.text();
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.spellcheck = false;
        elements.lightboxBody.innerHTML = '';
        elements.lightboxBody.appendChild(textarea);

        elements.lightboxSave.classList.remove('hidden');
        elements.lightboxSave.onclick = () => saveFile(path, textarea);
    } catch {
        elements.lightboxBody.innerHTML = '<pre>Fehler beim Laden der Datei.</pre>';
    }
}

async function saveFile(path, textarea) {
    try {
        const res = await fetch(`api/files/save?path=${encodeURIComponent(path)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: textarea.value }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        closeLightbox();
    } catch (err) {
        showError(err.message);
    }
}

// --- Dialog ---

let dialogResolve = null;

function showDialog({ title, message, input = false, confirmText = 'OK', confirmDanger = false, placeholder = '', defaultValue = '' }) {
    elements.dialogTitle.textContent = title;
    elements.dialogMessage.textContent = message;
    elements.dialogConfirm.textContent = confirmText;

    if (confirmDanger) {
        elements.dialogConfirm.classList.add('danger');
    } else {
        elements.dialogConfirm.classList.remove('danger');
    }

    if (input) {
        elements.dialogInput.classList.add('visible');
        elements.dialogInput.value = defaultValue;
        elements.dialogInput.placeholder = placeholder;
    } else {
        elements.dialogInput.classList.remove('visible');
    }

    elements.dialogOverlay.classList.remove('hidden');

    if (input) {
        requestAnimationFrame(() => elements.dialogInput.focus());
    } else {
        requestAnimationFrame(() => elements.dialogConfirm.focus());
    }

    return new Promise((resolve) => {
        dialogResolve = resolve;
    });
}

function closeDialog(result) {
    elements.dialogOverlay.classList.add('hidden');
    if (dialogResolve) {
        dialogResolve(result);
        dialogResolve = null;
    }
}

elements.dialogCancel.addEventListener('click', () => closeDialog(null));
elements.dialogBackdrop.addEventListener('click', () => closeDialog(null));
elements.dialogConfirm.addEventListener('click', () => {
    if (elements.dialogInput.classList.contains('visible')) {
        closeDialog(elements.dialogInput.value);
    } else {
        closeDialog(true);
    }
});
elements.dialogInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        closeDialog(elements.dialogInput.value);
    }
});

// --- Create New ---

async function createNew(type, label) {
    const name = await showDialog({
        title: label,
        message: 'Name eingeben:',
        input: true,
        placeholder: label,
    });
    if (!name || !name.trim()) return;

    try {
        const res = await fetch(
            `api/files/${type}?path=${encodeURIComponent(state.currentPath)}&name=${encodeURIComponent(name.trim())}`,
            { method: 'POST' }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        loadDirectory(state.currentPath, false);
    } catch (err) {
        showError(err.message);
    }
}

// --- Context Menu ---

function showContextMenu(anchor, entry) {
    const isFile = entry.type === 'file';
    const previewType = isFile ? getPreviewType(entry.ext) : null;
    const hasPreview = previewType !== null;
    const isText = previewType === 'text';

    let items = '';

    if (hasPreview) {
        items += `<button class="context-menu-item" data-action="preview"><i class="mdi mdi-eye"></i>Ansicht</button>`;
    } else if (!isFile) {
        items += `<button class="context-menu-item" data-action="open-dir"><i class="mdi mdi-folder-open"></i>Öffnen</button>`;
    }

    if (isText) {
        items += `<button class="context-menu-item" data-action="edit"><i class="mdi mdi-pencil"></i>Bearbeiten</button>`;
    }

    if (isFile) {
        items += `<button class="context-menu-item" data-action="download"><i class="mdi mdi-download"></i>Herunterladen</button>`;
    }

    items += `<div class="context-menu-divider"></div>`;
    items += `<button class="context-menu-item" data-action="info"><i class="mdi mdi-information-outline"></i>Info</button>`;
    items += `<div class="context-menu-divider"></div>`;
    items += `<button class="context-menu-item" data-action="rename"><i class="mdi mdi-rename"></i>Umbenennen</button>`;
    items += `<button class="context-menu-item" data-action="cut"><i class="mdi mdi-content-cut"></i>Ausschneiden</button>`;
    items += `<button class="context-menu-item" data-action="copy"><i class="mdi mdi-content-copy"></i>Kopieren</button>`;
    items += `<div class="context-menu-divider"></div>`;
    items += `<button class="context-menu-item danger" data-action="delete"><i class="mdi mdi-delete"></i>Löschen</button>`;

    elements.contextMenu.innerHTML = items;
    elements.contextMenu.classList.remove('hidden');

    const rect = anchor.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.right - 180;

    if (top + elements.contextMenu.offsetHeight > window.innerHeight) {
        top = rect.top - elements.contextMenu.offsetHeight - 4;
    }
    if (left < 8) left = 8;

    elements.contextMenu.style.top = `${top}px`;
    elements.contextMenu.style.left = `${left}px`;

    elements.contextMenu.querySelectorAll('.context-menu-item').forEach((btn) => {
        btn.addEventListener('click', () => {
            closeContextMenu();
            handleContextAction(btn.dataset.action, entry);
        });
    });
}

function closeContextMenu() {
    elements.contextMenu.classList.add('hidden');
}

function handleContextAction(action, entry) {
    switch (action) {
        case 'preview':
            openLightbox(entry.path, entry.name, getPreviewType(entry.ext));
            break;
        case 'open-dir':
            loadDirectory(entry.path);
            break;
        case 'edit':
            editFile(entry.path, entry.name);
            break;
        case 'download':
            downloadFile(entry.path);
            break;
        case 'rename':
            renameEntry(entry.path, entry.name, entry.type);
            break;
        case 'cut':
            setClipboard('cut', entry);
            break;
        case 'copy':
            setClipboard('copy', entry);
            break;
        case 'info':
            showFileInfo(entry.path);
            break;
        case 'delete':
            confirmDelete(entry.path, entry.name, entry.type);
            break;
    }
}

async function renameEntry(path, name, type) {
    const label = type === 'dir' ? 'Ordner' : 'Datei';
    const newName = await showDialog({
        title: `${label} umbenennen`,
        message: `Neuer Name für "${name}":`,
        input: true,
        defaultValue: name,
    });
    if (!newName || !newName.trim() || newName.trim() === name) return;

    try {
        const res = await fetch(
            `api/files/rename?path=${encodeURIComponent(path)}&name=${encodeURIComponent(newName.trim())}`,
            { method: 'POST' }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        loadDirectory(state.currentPath, false);
    } catch (err) {
        showError(err.message);
    }
}

async function showFileInfo(path) {
    try {
        const res = await fetch(`api/files/info?path=${encodeURIComponent(path)}`);
        if (!res.ok) throw new Error('Fehler beim Laden');
        const info = await res.json();

        const isFile = info.type === 1;
        const rows = [
            ['Name', escapeHtml(info.name)],
            ['Pfad', escapeHtml(info.path)],
            ['Typ', isFile ? `Datei${info.extension ? ` (.${escapeHtml(info.extension)})` : ''}` : 'Ordner'],
        ];
        if (isFile && info.size != null) {
            rows.push(['Grösse', formatSize(info.size)]);
        }
        rows.push(['Geändert', formatDate(info.lastModified)]);

        const html = `<dl class="info-grid">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

        elements.lightboxTitle.textContent = `Info: ${info.name}`;
        elements.lightboxDownload.href = isFile ? fileUrl(path) : '#';
        elements.lightboxDownload.download = info.name;
        elements.lightboxDownload.style.display = isFile ? '' : 'none';
        elements.lightboxBody.innerHTML = html;
        elements.lightbox.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch {
        showError('Info konnte nicht geladen werden.');
    }
}

async function confirmDelete(path, name, type) {
    const label = type === 'dir' ? 'Ordner' : 'Datei';
    const confirmed = await showDialog({
        title: `${label} löschen`,
        message: `${label} "${name}" wirklich löschen?`,
        confirmText: 'Löschen',
        confirmDanger: true,
    });
    if (!confirmed) return;

    try {
        const res = await fetch(`api/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        loadDirectory(state.currentPath, false);
    } catch (err) {
        showError(err.message);
    }
}

// --- Clipboard ---

function setClipboard(operation, entry) {
    state.clipboard = { operation, path: entry.path, name: entry.name, type: entry.type };
    updatePasteButton();
}

function updatePasteButton() {
    if (state.clipboard) {
        elements.btnPaste.disabled = false;
        const label = state.clipboard.operation === 'cut' ? 'Einfügen (Verschieben)' : 'Einfügen (Kopie)';
        elements.btnPaste.title = `${label}: ${state.clipboard.name}`;
    } else {
        elements.btnPaste.disabled = true;
        elements.btnPaste.title = 'Einfügen';
    }
}

async function pasteEntry() {
    if (!state.clipboard) return;

    const { operation, path, name } = state.clipboard;
    const endpoint = operation === 'cut' ? 'move' : 'copy';

    try {
        const res = await fetch(
            `api/files/${endpoint}?source=${encodeURIComponent(path)}&destination=${encodeURIComponent(state.currentPath)}`,
            { method: 'POST' }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        state.clipboard = null;
        updatePasteButton();
        loadDirectory(state.currentPath, false);
    } catch (err) {
        showError(err.message);
    }
}

// --- Upload ---

const uploadQueue = [];

function uploadFiles(fileList) {
    const files = Array.from(fileList);

    elements.uploadPanel.classList.remove('hidden');
    elements.uploadPanelTitle.textContent = `Upload (${files.length} Dateien)`;

    for (const file of files) {
        const item = { file, progress: 0, status: 'pending', id: crypto.randomUUID() };
        uploadQueue.push(item);
        renderUploadItem(item);
        startUpload(item);
    }
}

function renderUploadItem(item) {
    const div = document.createElement('div');
    div.className = 'upload-item';
    div.id = `upload-${item.id}`;
    div.innerHTML = `
        <i class="mdi mdi-file-upload"></i>
        <div style="flex:1;min-width:0">
            <div class="upload-name">${escapeHtml(item.file.name)}</div>
            <div class="upload-progress-bar"><div class="fill" style="width:0%"></div></div>
        </div>
        <span class="upload-status">0%</span>
    `;
    elements.uploadPanelList.appendChild(div);
}

function updateUploadItem(item) {
    const div = document.getElementById(`upload-${item.id}`);
    if (!div) return;

    const statusEl = div.querySelector('.upload-status');
    const fillEl = div.querySelector('.fill');
    const iconEl = div.querySelector('.mdi');

    if (item.status === 'uploading') {
        fillEl.style.width = `${item.progress}%`;
        statusEl.textContent = `${item.progress}%`;
    } else if (item.status === 'done') {
        fillEl.style.width = '100%';
        statusEl.textContent = 'Fertig';
        statusEl.className = 'upload-status done';
        iconEl.className = 'mdi mdi-check-circle';
    } else if (item.status === 'error') {
        statusEl.textContent = 'Fehler';
        statusEl.className = 'upload-status error';
        iconEl.className = 'mdi mdi-alert-circle';
    }
}

function startUpload(item) {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('files', item.file);

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            item.progress = Math.round((e.loaded / e.total) * 100);
            item.status = 'uploading';
            updateUploadItem(item);
        }
    });

    xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            item.status = 'done';
        } else {
            item.status = 'error';
        }
        updateUploadItem(item);
        checkAllUploadsComplete();
    });

    xhr.addEventListener('error', () => {
        item.status = 'error';
        updateUploadItem(item);
        checkAllUploadsComplete();
    });

    xhr.open('POST', `api/files/upload?path=${encodeURIComponent(state.currentPath)}`);
    xhr.send(formData);
}

function checkAllUploadsComplete() {
    const allDone = uploadQueue.every((i) => i.status === 'done' || i.status === 'error');
    if (allDone) {
        const ok = uploadQueue.filter((i) => i.status === 'done').length;
        const fail = uploadQueue.filter((i) => i.status === 'error').length;
        elements.uploadPanelTitle.textContent = `Upload: ${ok} fertig${fail ? `, ${fail} fehlgeschlagen` : ''}`;
        uploadQueue.length = 0;
        loadDirectory(state.currentPath, false);
    }
}

// --- Rendering ---

function renderBreadcrumb(path) {
    let html = '<a href="#" data-path="">Speicher</a>';
    if (path) {
        const parts = path.split('/');
        let accumulated = '';
        for (const part of parts) {
            accumulated += (accumulated ? '/' : '') + part;
            html += `<span class="separator">/</span><a href="#" data-path="${escapeAttr(accumulated)}">${escapeHtml(part)}</a>`;
        }
    }
    elements.breadcrumb.innerHTML = html;

    elements.breadcrumb.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            loadDirectory(a.dataset.path);
        });
    });
}

function renderEntries() {
    const sorted = sortEntries([...state.entries], state.sortBy);
    const dirs = sorted.filter((e) => e.type === 0);
    const files = sorted.filter((e) => e.type === 1);
    const all = [...dirs, ...files];

    elements.itemCount.textContent = `${dirs.length} Ordner, ${files.length} Dateien`;

    if (all.length === 0 && state.parentPath == null) {
        elements.fileList.innerHTML = '<div class="empty">Ordner ist leer</div>';
        return;
    }

    let html = '';

    if (state.parentPath != null) {
        html += `
            <a class="file-entry parent-dir" data-action="navigate" data-path="${escapeAttr(state.parentPath)}">
                <div class="icon dir"><i class="mdi mdi-arrow-u-left-top"></i></div>
                <div class="name">..</div>
                <div class="meta"></div>
                <div class="size"></div>
                <div></div>
            </a>`;
    }

    for (const entry of all) {
        const isDir = entry.type === 0;
        const icon = isDir ? getDirectoryIcon(entry.name) : getFileIcon(entry.extension);
        const action = isDir ? 'navigate' : 'open';
        const size = isDir ? '' : formatSize(entry.size);
        const date = formatDate(entry.lastModified);

        html += `
            <a class="file-entry" data-action="${action}" data-path="${escapeAttr(entry.path)}" data-name="${escapeAttr(entry.name)}" data-ext="${escapeAttr(entry.extension || '')}" data-type="${isDir ? 'dir' : 'file'}">
                <div class="icon ${isDir ? 'dir' : 'file'}">${icon}</div>
                <div class="name">${escapeHtml(entry.name)}</div>
                <div class="meta">${date}</div>
                <div class="size">${size}</div>
                <button class="more-btn" title="Optionen"><i class="mdi mdi-dots-vertical"></i></button>
            </a>`;
    }

    elements.fileList.innerHTML = html;

    elements.fileList.querySelectorAll('.file-entry').forEach((el) => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.more-btn')) return;
            e.preventDefault();
            const action = el.dataset.action;
            const path = el.dataset.path;
            if (action === 'navigate') {
                loadDirectory(path);
            } else {
                openFile(path, el.dataset.name, el.dataset.ext);
            }
        });

        const moreBtn = el.querySelector('.more-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showContextMenu(moreBtn, {
                    path: el.dataset.path,
                    name: el.dataset.name,
                    ext: el.dataset.ext,
                    type: el.dataset.type,
                });
            });
        }
    });
}

// --- Sorting ---

function sortEntries(entries, sortBy) {
    const [field, direction] = sortBy.split('-');
    const dir = direction === 'asc' ? 1 : -1;

    return entries.sort((a, b) => {
        if (field === 'name') {
            return dir * a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
        }
        if (field === 'date') {
            return dir * (new Date(a.lastModified) - new Date(b.lastModified));
        }
        if (field === 'size') {
            return dir * ((a.size ?? 0) - (b.size ?? 0));
        }
        return 0;
    });
}

// --- Icons (Material Design Icons) ---

function mdi(name) {
    return `<i class="mdi mdi-${name}"></i>`;
}

const FILE_ICONS = {
    pdf: 'file-pdf-box',
    doc: 'file-word-box', docx: 'file-word-box', odt: 'file-word-box',
    xls: 'file-excel-box', xlsx: 'file-excel-box', ods: 'file-excel-box',
    ppt: 'file-powerpoint-box', pptx: 'file-powerpoint-box',
    jpg: 'file-image', jpeg: 'file-image', png: 'file-image', gif: 'file-image', webp: 'file-image', svg: 'file-image', bmp: 'file-image', ico: 'file-image',
    mp4: 'file-video', mkv: 'file-video', avi: 'file-video', mov: 'file-video', webm: 'file-video',
    mp3: 'file-music', wav: 'file-music', flac: 'file-music', ogg: 'file-music', aac: 'file-music', m4a: 'file-music',
    zip: 'zip-box', rar: 'zip-box', '7z': 'zip-box', tar: 'zip-box', gz: 'zip-box',
    txt: 'file-document', md: 'language-markdown', log: 'file-document',
    js: 'language-javascript', ts: 'language-typescript', py: 'language-python', java: 'language-java', cs: 'language-csharp', cpp: 'language-cpp', c: 'language-c', h: 'language-c',
    html: 'language-html5', css: 'language-css3', xml: 'file-xml-box', json: 'code-json',
    apk: 'android',
};

const DIR_ICONS = {
    dcim: 'folder-image', pictures: 'folder-image', images: 'folder-image',
    download: 'folder-download', downloads: 'folder-download',
    music: 'folder-music', audio: 'folder-music',
    movies: 'folder-play', videos: 'folder-play',
    documents: 'folder-text',
    android: 'folder-cog',
};

function getFileIcon(ext) {
    return mdi(FILE_ICONS[ext] || 'file');
}

function getDirectoryIcon(name) {
    return mdi(DIR_ICONS[name.toLowerCase()] || 'folder');
}

// --- Formatting ---

function formatSize(bytes) {
    if (bytes == null) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// --- Utilities ---

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showError(message) {
    elements.errorToast.textContent = message;
    elements.errorToast.classList.remove('hidden');
    setTimeout(() => elements.errorToast.classList.add('hidden'), 4000);
}
