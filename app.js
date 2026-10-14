function switchTab(tabName) {
    // Reset active ở tất cả nút tab
    const tabs = ['tabCutImage', 'tabMergeSprite', 'tabConvertVideo', 'tabExtractVideo', 'tabRemoveBg'];
    tabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    
    // Reset active ở tất cả nội dung tab
    const contents = ['contentCutImage', 'contentMergeSprite', 'contentConvertVideo', 'contentExtractVideo', 'contentRemoveBg'];
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
        'removeBg': ['tabRemoveBg', 'contentRemoveBg']
    };

    if (tabMap[tabName]) {
        const [tabId, contentId] = tabMap[tabName];
        const tabEl = document.getElementById(tabId);
        const contentEl = document.getElementById(contentId);
        if (tabEl) tabEl.classList.add('active');
        if (contentEl) contentEl.classList.add('active');
    }
}