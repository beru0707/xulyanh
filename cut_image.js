// Global State & Elements
let currentCutMode = 'grid'; // 'grid' hoặc 'batch'

const modeCutGridBtn = document.getElementById('modeCutGridBtn');
const modeCutBatchBtn = document.getElementById('modeCutBatchBtn');
const cutInputLabel = document.getElementById('cutInputLabel');
const cutDropzoneText = document.getElementById('cutDropzoneText');
const gridCutControls = document.getElementById('gridCutControls');
const batchCutControls = document.getElementById('batchCutControls');

const batchThumbnailContainer = document.getElementById('batchThumbnailContainer');
const noBatchImageText = document.getElementById('noBatchImageText');
const batchImageCount = document.getElementById('batchImageCount');
const clearBatchCutBtn = document.getElementById('clearBatchCutBtn');

const cutDropzone = document.getElementById('cutDropzone');
const cutImageInput = document.getElementById('cutImageInput');
const cutPreviewCanvas = document.getElementById('cutPreviewCanvas');
const cutPreviewCtx = cutPreviewCanvas.getContext('2d');
const cutImagePlaceholderText = document.getElementById('cutImagePlaceholderText');
const btnProcessCut = document.getElementById('btnProcessCut');
const cutResultsContainer = document.getElementById('cutResultsContainer');
const cutResultsTitle = document.getElementById('cutResultsTitle');
const cutResultCount = document.getElementById('cutResultCount');
const btnSendToVideo = document.getElementById('btnSendToVideo');
const gridRowsInput = document.getElementById('gridRows');
const gridColsInput = document.getElementById('gridCols');
const cutFileNamePrefixInput = document.getElementById('cutFileNamePrefix');

// Nút Download All
const btnDownloadAll = document.createElement('button');
btnDownloadAll.className = "w-full py-2 px-4 border border-green-600 rounded-md shadow-sm text-sm font-medium text-green-600 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 hidden mt-2 flex justify-center items-center gap-2";
btnDownloadAll.innerHTML = '<i class="fa-solid fa-folder-open"></i> Lưu toàn bộ vào Folder';
btnSendToVideo.parentNode.insertBefore(btnDownloadAll, btnSendToVideo.nextSibling);

// Dữ liệu ảnh
let batchImages = []; // Array of { file, url, img }
let currentPreviewIndex = 0;
let sourceImg = null; 
let cutBlobs = []; 

// Dữ liệu Cắt Lưới (Mode 1)
let hLines = []; 
let vLines = []; 
let draggingLine = null; 

// Dữ liệu Cắt Hàng Loạt (Mode 2 - Tỷ lệ vùng chọn chuẩn hóa 0..1)
let normalizedCropRect = null; // { normX, normY, normW, normH }
let isSelectingCrop = false;
let cropStartPos = null;

// Chuyển đổi giữa 2 chế độ
window.switchCutMode = function(mode) {
    currentCutMode = mode;
    resetCutState();

    if (mode === 'grid') {
        modeCutGridBtn.className = "flex-1 py-2 rounded-md font-medium text-center bg-white shadow-sm text-indigo-600 transition";
        modeCutBatchBtn.className = "flex-1 py-2 rounded-md font-medium text-center text-gray-600 hover:text-indigo-600 transition";
        cutInputLabel.textContent = "1. Chọn 1 ảnh lớn để cắt thành nhiều mảnh";
        cutDropzoneText.textContent = "Kéo thả 1 ảnh vào đây";
        cutImageInput.removeAttribute('multiple');
        gridCutControls.classList.remove('hidden');
        batchCutControls.classList.add('hidden');
    } else {
        modeCutBatchBtn.className = "flex-1 py-2 rounded-md font-medium text-center bg-white shadow-sm text-indigo-600 transition";
        modeCutGridBtn.className = "flex-1 py-2 rounded-md font-medium text-center text-gray-600 hover:text-indigo-600 transition";
        cutInputLabel.textContent = "1. Chọn nhiều ảnh để cắt cùng 1 vùng chọn";
        cutDropzoneText.textContent = "Kéo thả nhiều ảnh vào đây";
        cutImageInput.setAttribute('multiple', 'true');
        gridCutControls.classList.add('hidden');
        batchCutControls.classList.remove('hidden');
    }
};

function resetCutState() {
    sourceImg = null;
    batchImages.forEach(item => URL.revokeObjectURL(item.url));
    batchImages = [];
    currentPreviewIndex = 0;
    cutBlobs = [];
    normalizedCropRect = null;
    hLines = [];
    vLines = [];
    cutPreviewCanvas.classList.add('hidden');
    cutImagePlaceholderText.classList.remove('hidden');
    cutResultsTitle.classList.add('hidden');
    cutResultsContainer.innerHTML = '';
    btnSendToVideo.classList.add('hidden');
    btnDownloadAll.classList.add('hidden');
    btnProcessCut.disabled = true;
    updateBatchThumbnails();
}

// Xử lý phím Mũi tên (Left / Right / Up / Down) để di chuyển giữa các ảnh
document.addEventListener('keydown', (e) => {
    const cutTabContent = document.getElementById('contentCutImage');
    if (!cutTabContent || !cutTabContent.classList.contains('active')) return;
    if (currentCutMode !== 'batch' || batchImages.length === 0) return;

    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentPreviewIndex > 0) selectPreviewImage(currentPreviewIndex - 1);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentPreviewIndex < batchImages.length - 1) selectPreviewImage(currentPreviewIndex + 1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPreviewImage(0);
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectPreviewImage(batchImages.length - 1);
    }
});

// Xử lý kéo thả / chọn file
cutDropzone.addEventListener('click', () => cutImageInput.click());
cutDropzone.addEventListener('dragover', (e) => { e.preventDefault(); cutDropzone.classList.add('dragover'); });
cutDropzone.addEventListener('dragleave', () => cutDropzone.classList.remove('dragover'));
cutDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    cutDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleCutFiles(e.dataTransfer.files);
});

cutImageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleCutFiles(e.target.files);
});

async function handleCutFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    if (currentCutMode === 'grid') {
        resetCutState();
        const file = validFiles[0];
        const url = URL.createObjectURL(file);
        sourceImg = new Image();
        sourceImg.onload = () => {
            initGrid(); 
            cutPreviewCanvas.classList.remove('hidden');
            cutImagePlaceholderText.classList.add('hidden');
            btnProcessCut.disabled = false;
        };
        sourceImg.src = url;
    } else {
        for (let file of validFiles) {
            const url = URL.createObjectURL(file);
            const img = await loadImage(url);
            batchImages.push({ file, url, img });
        }

        if (batchImages.length > 0) {
            if (!normalizedCropRect) {
                normalizedCropRect = { normX: 0.25, normY: 0.25, normW: 0.5, normH: 0.5 };
            }
            updateBatchThumbnails();
            selectPreviewImage(currentPreviewIndex);
            btnProcessCut.disabled = false;
        }
    }
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Cập nhật danh sách Thumbnails ở Mode Batch
function updateBatchThumbnails() {
    batchThumbnailContainer.innerHTML = '';
    batchImageCount.textContent = batchImages.length;

    if (batchImages.length === 0) {
        batchThumbnailContainer.appendChild(noBatchImageText);
        clearBatchCutBtn.classList.add('hidden');
        return;
    }
    clearBatchCutBtn.classList.remove('hidden');

    batchImages.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `batch-thumb-item flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 cursor-pointer transition-all relative group ${
            index === currentPreviewIndex ? 'border-indigo-500 scale-105 shadow' : 'border-transparent hover:border-indigo-300'
        }`;
        div.onclick = () => selectPreviewImage(index);

        const img = document.createElement('img');
        img.src = item.url;
        img.className = "w-full h-full object-cover pointer-events-none";

        const badge = document.createElement('div');
        badge.className = "absolute top-0.5 left-0.5 bg-black/60 text-white text-[10px] px-1 rounded pointer-events-none";
        badge.textContent = index + 1;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = "absolute top-0.5 right-0.5 bg-red-500/90 hover:bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity";
        deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteBatchImage(index); };

        div.appendChild(img);
        div.appendChild(badge);
        div.appendChild(deleteBtn);
        batchThumbnailContainer.appendChild(div);
    });
}

function selectPreviewImage(index) {
    if (batchImages.length === 0) return;
    if (index < 0) index = 0;
    if (index >= batchImages.length) index = batchImages.length - 1;

    currentPreviewIndex = index;
    sourceImg = batchImages[index].img;

    cutPreviewCanvas.width = sourceImg.width;
    cutPreviewCanvas.height = sourceImg.height;

    drawCutPreview();
    cutPreviewCanvas.classList.remove('hidden');
    cutImagePlaceholderText.classList.add('hidden');
    updateBatchThumbnails();

    const thumbElements = batchThumbnailContainer.querySelectorAll('.batch-thumb-item');
    if (thumbElements[index]) {
        thumbElements[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

function deleteBatchImage(index) {
    URL.revokeObjectURL(batchImages[index].url);
    batchImages.splice(index, 1);
    if (batchImages.length === 0) {
        resetCutState();
    } else {
        if (currentPreviewIndex >= batchImages.length) currentPreviewIndex = batchImages.length - 1;
        selectPreviewImage(currentPreviewIndex);
    }
}

clearBatchCutBtn.addEventListener('click', () => resetCutState());

function initGrid() {
    if (!sourceImg || currentCutMode !== 'grid') return;
    const rows = parseInt(gridRowsInput.value) || 1;
    const cols = parseInt(gridColsInput.value) || 1;
    
    cutPreviewCanvas.width = sourceImg.width;
    cutPreviewCanvas.height = sourceImg.height;
    
    hLines = [];
    vLines = [];
    const tileWidth = sourceImg.width / cols;
    const tileHeight = sourceImg.height / rows;
    
    for (let i = 1; i < rows; i++) hLines.push(i * tileHeight);
    for (let i = 1; i < cols; i++) vLines.push(i * tileWidth);
    
    drawCutPreview();
}

gridRowsInput.addEventListener('input', initGrid);
gridColsInput.addEventListener('input', initGrid);

// Vẽ Preview Canvas
function drawCutPreview() {
    if (!sourceImg) return;
    
    cutPreviewCtx.clearRect(0, 0, cutPreviewCanvas.width, cutPreviewCanvas.height);
    
    // Tối ưu độ nét preview
    cutPreviewCtx.imageSmoothingEnabled = true;
    cutPreviewCtx.imageSmoothingQuality = 'high';
    cutPreviewCtx.drawImage(sourceImg, 0, 0);
    
    if (currentCutMode === 'grid') {
        const lineThickness = Math.max(6, sourceImg.width / 150);
        
        cutPreviewCtx.lineWidth = lineThickness;
        cutPreviewCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        cutPreviewCtx.setLineDash([]); 
        cutPreviewCtx.beginPath();
        vLines.forEach(x => { cutPreviewCtx.moveTo(x, 0); cutPreviewCtx.lineTo(x, sourceImg.height); });
        hLines.forEach(y => { cutPreviewCtx.moveTo(0, y); cutPreviewCtx.lineTo(sourceImg.width, y); });
        cutPreviewCtx.stroke();
        
        cutPreviewCtx.lineWidth = lineThickness * 0.7; 
        cutPreviewCtx.strokeStyle = '#ff0000'; 
        const dashLength = Math.max(15, sourceImg.width / 60);
        cutPreviewCtx.setLineDash([dashLength, dashLength]);
        cutPreviewCtx.beginPath();
        vLines.forEach(x => { cutPreviewCtx.moveTo(x, 0); cutPreviewCtx.lineTo(x, sourceImg.height); });
        hLines.forEach(y => { cutPreviewCtx.moveTo(0, y); cutPreviewCtx.lineTo(sourceImg.width, y); });
        cutPreviewCtx.stroke();
    } else if (currentCutMode === 'batch' && normalizedCropRect) {
        const cropX = Math.round(normalizedCropRect.normX * sourceImg.width);
        const cropY = Math.round(normalizedCropRect.normY * sourceImg.height);
        const cropW = Math.round(normalizedCropRect.normW * sourceImg.width);
        const cropH = Math.round(normalizedCropRect.normH * sourceImg.height);

        cutPreviewCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        cutPreviewCtx.fillRect(0, 0, cutPreviewCanvas.width, cutPreviewCanvas.height);
        
        cutPreviewCtx.drawImage(
            sourceImg, 
            cropX, cropY, cropW, cropH,
            cropX, cropY, cropW, cropH
        );
        
        cutPreviewCtx.strokeStyle = '#4f46e5';
        cutPreviewCtx.lineWidth = Math.max(3, sourceImg.width / 200);
        cutPreviewCtx.setLineDash([8, 8]);
        cutPreviewCtx.strokeRect(cropX, cropY, cropW, cropH);
    }
}

function getMousePos(evt) {
    const rect = cutPreviewCanvas.getBoundingClientRect();
    const scaleX = cutPreviewCanvas.width / rect.width;
    const scaleY = cutPreviewCanvas.height / rect.height;
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}

function getHitLine(pos) {
    const hitTolerance = Math.max(20, sourceImg.width / 40); 
    for (let i = 0; i < vLines.length; i++) {
        if (Math.abs(pos.x - vLines[i]) < hitTolerance) return { type: 'v', index: i };
    }
    for (let i = 0; i < hLines.length; i++) {
        if (Math.abs(pos.y - hLines[i]) < hitTolerance) return { type: 'h', index: i };
    }
    return null;
}

cutPreviewCanvas.addEventListener('mousedown', (e) => {
    if (!sourceImg) return;
    const pos = getMousePos(e);

    if (currentCutMode === 'grid') {
        draggingLine = getHitLine(pos);
    } else if (currentCutMode === 'batch') {
        isSelectingCrop = true;
        cropStartPos = pos;
        normalizedCropRect = {
            normX: pos.x / sourceImg.width,
            normY: pos.y / sourceImg.height,
            normW: 0,
            normH: 0
        };
    }
});

cutPreviewCanvas.addEventListener('mousemove', (e) => {
    if (!sourceImg) return;
    const pos = getMousePos(e);
    
    if (currentCutMode === 'grid') {
        if (draggingLine) {
            if (draggingLine.type === 'v') {
                const minX = draggingLine.index === 0 ? 0 : vLines[draggingLine.index - 1];
                const maxX = draggingLine.index === vLines.length - 1 ? sourceImg.width : vLines[draggingLine.index + 1];
                vLines[draggingLine.index] = Math.max(minX + 10, Math.min(maxX - 10, pos.x));
            } else {
                const minY = draggingLine.index === 0 ? 0 : hLines[draggingLine.index - 1];
                const maxY = draggingLine.index === hLines.length - 1 ? sourceImg.height : hLines[draggingLine.index + 1];
                hLines[draggingLine.index] = Math.max(minY + 10, Math.min(maxY - 10, pos.y));
            }
            drawCutPreview(); 
            cutPreviewCanvas.style.cursor = draggingLine.type === 'v' ? 'col-resize' : 'row-resize';
        } else {
            const hit = getHitLine(pos);
            cutPreviewCanvas.style.cursor = hit ? (hit.type === 'v' ? 'col-resize' : 'row-resize') : 'default';
        }
    } else if (currentCutMode === 'batch') {
        if (isSelectingCrop && cropStartPos) {
            const x = Math.min(cropStartPos.x, pos.x);
            const y = Math.min(cropStartPos.y, pos.y);
            const w = Math.abs(pos.x - cropStartPos.x);
            const h = Math.abs(pos.y - cropStartPos.y);

            normalizedCropRect = {
                normX: Math.max(0, x) / sourceImg.width,
                normY: Math.max(0, y) / sourceImg.height,
                normW: Math.min(sourceImg.width - x, w) / sourceImg.width,
                normH: Math.min(sourceImg.height - y, h) / sourceImg.height
            };
            drawCutPreview();
        }
        cutPreviewCanvas.style.cursor = 'crosshair';
    }
});

cutPreviewCanvas.addEventListener('mouseup', () => { 
    draggingLine = null; 
    if (isSelectingCrop) {
        isSelectingCrop = false;
        if (normalizedCropRect && (normalizedCropRect.normW < 0.01 || normalizedCropRect.normH < 0.01)) {
            normalizedCropRect = { normX: 0.25, normY: 0.25, normW: 0.5, normH: 0.5 };
            drawCutPreview();
        }
    }
});

cutPreviewCanvas.addEventListener('mouseleave', () => { 
    draggingLine = null; 
    isSelectingCrop = false;
});

// Xử lý Cắt Ảnh (Đã tối ưu độ nét & pixel chuẩn)
btnProcessCut.addEventListener('click', async () => {
    cutResultsContainer.innerHTML = '';
    cutBlobs = [];
    const prefix = cutFileNamePrefixInput.value.trim() || 'crop';

    if (currentCutMode === 'grid') {
        if (!sourceImg) return;
        
        const hBounds = [0, ...hLines, sourceImg.height];
        const vBounds = [0, ...vLines, sourceImg.width];
        const finalRows = hBounds.length - 1;
        const finalCols = vBounds.length - 1;

        const promises = [];
        let tileCount = 0;

        for (let r = 0; r < finalRows; r++) {
            for (let c = 0; c < finalCols; c++) {
                // Làm tròn số nguyên tọa độ để tránh mờ do sub-pixel
                const x = Math.round(vBounds[c]);
                const y = Math.round(hBounds[r]);
                const w = Math.round(vBounds[c + 1] - x);
                const h = Math.round(hBounds[r + 1] - y);
                
                if (w <= 0 || h <= 0) continue;

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Thiết lập chế độ render chất lượng cao
                tempCtx.imageSmoothingEnabled = true;
                tempCtx.imageSmoothingQuality = 'high';
                
                tempCtx.drawImage(sourceImg, x, y, w, h, 0, 0, w, h);

                const imgElement = document.createElement('img');
                imgElement.className = "w-full h-auto border border-gray-200 rounded shadow-sm object-contain";
                cutResultsContainer.appendChild(imgElement);

                const currentTileName = `${prefix}_${String(tileCount + 1).padStart(2, '0')}.png`;

                const promise = new Promise((resolve) => {
                    tempCanvas.toBlob((blob) => {
                        const blobUrl = URL.createObjectURL(blob);
                        imgElement.src = blobUrl;
                        const file = new File([blob], currentTileName, { type: "image/png" });
                        cutBlobs.push(file);
                        resolve();
                    }, 'image/png');
                });

                promises.push(promise);
                tileCount++;
            }
        }
        await Promise.all(promises);

    } else if (currentCutMode === 'batch') {
        if (batchImages.length === 0 || !normalizedCropRect) return;

        const promises = [];

        for (let i = 0; i < batchImages.length; i++) {
            const item = batchImages[i];
            const img = item.img;

            // Tính toán và làm tròn pixel chuẩn dựa trên độ phân giải thực của ảnh
            const actualX = Math.round(normalizedCropRect.normX * img.width);
            const actualY = Math.round(normalizedCropRect.normY * img.height);
            const actualW = Math.round(normalizedCropRect.normW * img.width);
            const actualH = Math.round(normalizedCropRect.normH * img.height);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = actualW;
            tempCanvas.height = actualH;
            const tempCtx = tempCanvas.getContext('2d');

            // Cấu hình khử mờ
            tempCtx.imageSmoothingEnabled = true;
            tempCtx.imageSmoothingQuality = 'high';

            tempCtx.drawImage(img, actualX, actualY, actualW, actualH, 0, 0, actualW, actualH);

            const imgElement = document.createElement('img');
            imgElement.className = "w-full h-auto border border-gray-200 rounded shadow-sm object-contain";
            cutResultsContainer.appendChild(imgElement);

            const fileName = `${prefix}_${String(i + 1).padStart(2, '0')}.png`;

            const promise = new Promise((resolve) => {
                tempCanvas.toBlob((blob) => {
                    const blobUrl = URL.createObjectURL(blob);
                    imgElement.src = blobUrl;
                    const resultFile = new File([blob], fileName, { type: "image/png" });
                    cutBlobs.push(resultFile);
                    resolve();
                }, 'image/png');
            });
            promises.push(promise);
        }
        await Promise.all(promises);
    }

    cutResultsTitle.classList.remove('hidden');
    cutResultCount.textContent = cutBlobs.length;
    btnSendToVideo.classList.remove('hidden');
    btnDownloadAll.classList.remove('hidden');
});

// Chuyển kết quả sang Tab Convert Video
btnSendToVideo.addEventListener('click', () => {
    if (cutBlobs.length === 0) return;
    switchTab('convertVideo');
    if (window.VideoConverter) {
        window.VideoConverter.clearAll();
        window.VideoConverter.handleFiles(cutBlobs);
    }
});

// Lưu tất cả ảnh vào thư mục
btnDownloadAll.addEventListener('click', async () => {
    if (cutBlobs.length === 0) return;

    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            for (const file of cutBlobs) {
                const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(file);
                await writable.close();
            }
            alert(`Đã lưu thành công toàn bộ ${cutBlobs.length} ảnh vào thư mục bạn chọn!`);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                alert('Có lỗi xảy ra khi lưu file vào thư mục.');
            }
        }
    } else {
        for (let i = 0; i < cutBlobs.length; i++) {
            const file = cutBlobs[i];
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            await new Promise(r => setTimeout(r, 200));
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
});

btnProcessCut.disabled = true;