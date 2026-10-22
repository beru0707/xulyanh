function switchTab(tabName) {
    // Reset active ở tất cả nút tab
    const tabs = [
        'tabCutImage', 
        'tabMergeSprite', 
        'tabConvertVideo', 
        'tabExtractVideo', 
        'tabRemoveBg', 
        'tabConvertToWebp',
        'tabFlipImage',
        'tabAntiDup'
    ];
    tabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    
    // Reset active ở tất cả nội dung tab
    const contents = [
        'contentCutImage', 
        'contentMergeSprite', 
        'contentConvertVideo', 
        'contentExtractVideo', 
        'contentRemoveBg', 
        'contentConvertToWebp',
        'contentFlipImage',
        'contentAntiDup'
    ];
    contents.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    // Bật tab được chọn
    const tabMap = {
        'cutImage': ['tabCutImage', 'contentCutImage'],
        'mergeSprite': ['tabMergeSprite', 'contentMergeSprite'],
        'convertVideo': ['tabConvertVideo', 'contentConvertVideo'],
        'extractVideo': ['tabExtractVideo', 'contentExtractVideo'],
        'removeBg': ['tabRemoveBg', 'contentRemoveBg'],
        'convertToWebp': ['tabConvertToWebp', 'contentConvertToWebp'],
        'flipImage': ['tabFlipImage', 'contentFlipImage'],
        'antiDup': ['tabAntiDup', 'contentAntiDup']
    };

    if (tabMap[tabName]) {
        const [tabId, contentId] = tabMap[tabName];
        const tabEl = document.getElementById(tabId);
        const contentEl = document.getElementById(contentId);
        if (tabEl) tabEl.classList.add('active');
        if (contentEl) contentEl.classList.add('active');

        // DÒNG MỚI THÊM VÀO: Lưu tên tab vào bộ nhớ trình duyệt
        localStorage.setItem('activePhotoToolTab', tabName);
    }
}

// Tự động khôi phục tab khi tải lại trang
document.addEventListener('DOMContentLoaded', () => {
    const savedTab = localStorage.getItem('activePhotoToolTab');
    if (savedTab) {
        switchTab(savedTab);
    }
});

// ================= CHẾ ĐỘ SÁNG / TỐI =================
function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const icon = document.getElementById('themeToggleIcon');
    if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.addEventListener('click', () => {
            const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
            applyTheme(next);
            try { localStorage.setItem('photoToolTheme', next); } catch (e) {}
        });
    }
});
