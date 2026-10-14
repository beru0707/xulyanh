const mergeDropzone = document.getElementById('mergeDropzone');
const mergeInput = document.getElementById('mergeInput');
const mergeCount = document.getElementById('mergeCount');
const mergeColsInput = document.getElementById('mergeCols');
const mergeRowsInput = document.getElementById('mergeRows');
const spriteOutputNameInput = document.getElementById('spriteOutputName');
const btnBuildSprite = document.getElementById('btnBuildSprite');
const spriteResultCanvas = document.getElementById('spriteResultCanvas');
const spriteResultCtx = spriteResultCanvas.getContext('2d');
const spritePlaceholderText = document.getElementById('spritePlaceholderText');
const spriteActions = document.getElementById('spriteActions');
const btnDownloadSprite = document.getElementById('btnDownloadSprite');
const btnSendMergedToVideo = document.getElementById('btnSendMergedToVideo');

// Nút "Lưu vào Folder"
const btnSaveSpriteToFolder = document.createElement('button');
btnSaveSpriteToFolder.className = "py-2 px-4 border border-green-600 text-green-600 rounded-md text-sm font-medium hover:bg-green-50 flex items-center gap-2";
btnSaveSpriteToFolder.innerHTML = '<i class="fa-solid fa-folder-open"></i> Lưu vào Folder';
btnDownloadSprite.parentNode.insertBefore(btnSaveSpriteToFolder, btnDownloadSprite);

let selectedSpriteFiles = [];
let generatedSpriteBlob = null;

mergeDropzone.addEventListener('click', () => mergeInput.click());
mergeDropzone.addEventListener('dragover', (e) => { e.preventDefault(); mergeDropzone.classList.add('dragover'); });
mergeDropzone.addEventListener('dragleave', () => mergeDropzone.classList.remove('dragover'));
mergeDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    mergeDropzone.classList.remove('dragover');
    handleMergeFiles(e.dataTransfer.files);
});

mergeInput.addEventListener('change', (e) => handleMergeFiles(e.target.files));

function handleMergeFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;
    selectedSpriteFiles = validFiles;
    mergeCount.textContent = selectedSpriteFiles.length;
}

btnBuildSprite.addEventListener('click', async () => {
    if (selectedSpriteFiles.length === 0) {
        alert("Vui lòng chọn ít nhất 1 file ảnh!");
        return;
    }

    const cols = parseInt(mergeColsInput.value) || 6;
    const rows = parseInt(mergeRowsInput.value) || 6;

    const loadedImages = await Promise.all(selectedSpriteFiles.map(file => {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = url;
        });
    }));

    if (loadedImages.length === 0) return;

    const baseW = loadedImages[0].width;
    const baseH = loadedImages[0].height;

    spriteResultCanvas.width = baseW * cols;
    spriteResultCanvas.height = baseH * rows;

    spriteResultCtx.clearRect(0, 0, spriteResultCanvas.width, spriteResultCanvas.height);

    const maxItems = cols * rows;
    loadedImages.forEach((img, index) => {
        if (index >= maxItems) return;

        const col = index % cols;
        const row = Math.floor(index / cols);

        spriteResultCtx.drawImage(img, col * baseW, row * baseH, baseW, baseH);
    });

    spriteResultCanvas.classList.remove('hidden');
    spritePlaceholderText.classList.add('hidden');
    spriteActions.classList.remove('hidden');

    await new Promise((resolve) => {
        spriteResultCanvas.toBlob((blob) => {
            generatedSpriteBlob = blob;
            resolve();
        }, 'image/png');
    });
});

function getSpriteFileName() {
    let fileName = spriteOutputNameInput.value.trim() || 'sprite_sheet.png';
    if (!fileName.toLowerCase().endsWith('.png')) {
        fileName += '.png';
    }
    return fileName;
}

// Option 1: Tải về trình duyệt
btnDownloadSprite.addEventListener('click', () => {
    if (!generatedSpriteBlob) return;
    
    const fileName = getSpriteFileName();
    const url = URL.createObjectURL(generatedSpriteBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
});

// Option 2: Lưu vào Folder qua File System Access API
btnSaveSpriteToFolder.addEventListener('click', async () => {
    if (!generatedSpriteBlob) return;

    const fileName = getSpriteFileName();

    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await window.showDirectoryPicker();
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(generatedSpriteBlob);
            await writable.close();
            alert(`Đã lưu thành công file "${fileName}" vào thư mục!`);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                alert('Không thể lưu file vào thư mục.');
            }
        }
    } else {
        btnDownloadSprite.click();
    }
});

btnSendMergedToVideo.addEventListener('click', () => {
    if (!generatedSpriteBlob) return;
    const fileName = getSpriteFileName();
    const file = new File([generatedSpriteBlob], fileName, { type: "image/png" });
    
    switchTab('convertVideo');
    if (window.VideoConverter) {
        window.VideoConverter.loadSpriteImage(file);
    }
});