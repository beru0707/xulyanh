// Các hằng số và biến trạng thái
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
let imageFiles = []; 
let currentFPS = 12;
let isPlaying = false;
let currentFrameIndex = 0;
let previewInterval = null;
let mediaRecorder = null;
let recordedChunks = [];
let draggedIndex = null; 

// HTML Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const thumbnailContainer = document.getElementById('thumbnailContainer');
const noImageText = document.getElementById('noImageText');
const imageCount = document.getElementById('imageCount');
const clearBtn = document.getElementById('clearBtn');
const fpsSlider = document.getElementById('fpsSlider');
const fpsDisplay = document.getElementById('fpsDisplay');
const canvas = document.getElementById('videoCanvas');
const ctx = canvas.getContext('2d');
const canvasOverlay = document.getElementById('canvasOverlay');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const frameCounter = document.getElementById('frameCounter');
const exportBtn = document.getElementById('exportBtn');
const exportStatus = document.getElementById('exportStatus');
const exportProgressContainer = document.getElementById('exportProgressContainer');
const exportProgressBar = document.getElementById('exportProgressBar');

// Xử lý chuyển Mode nhập liệu (Nhiều ảnh vs Sprite Sheet)
const modeMultipleBtn = document.getElementById('modeMultiple');
const modeSpriteBtn = document.getElementById('modeSprite');
const dropzoneMultiple = document.getElementById('dropzoneMultiple');
const dropzoneSprite = document.getElementById('dropzoneSprite');
const spriteDropzone = document.getElementById('spriteDropzone');
const spriteFileInput = document.getElementById('spriteFileInput');
const spriteRowsInput = document.getElementById('spriteRows');
const spriteColsInput = document.getElementById('spriteCols');
const btnSliceSprite = document.getElementById('btnSliceSprite');

let loadedSpriteImg = null;

function setVideoInputMode(mode) {
    if (mode === 'multiple') {
        modeMultipleBtn.className = "flex-1 py-1.5 rounded-md font-medium text-center bg-white shadow-sm text-indigo-600 transition";
        modeSpriteBtn.className = "flex-1 py-1.5 rounded-md font-medium text-center text-gray-600 hover:text-indigo-600 transition";
        dropzoneMultiple.classList.remove('hidden');
        dropzoneSprite.classList.add('hidden');
    } else {
        modeSpriteBtn.className = "flex-1 py-1.5 rounded-md font-medium text-center bg-white shadow-sm text-indigo-600 transition";
        modeMultipleBtn.className = "flex-1 py-1.5 rounded-md font-medium text-center text-gray-600 hover:text-indigo-600 transition";
        dropzoneSprite.classList.remove('hidden');
        dropzoneMultiple.classList.add('hidden');
    }
}

// Xử lý nạp Sprite Sheet vào tab Video
spriteDropzone.addEventListener('click', () => spriteFileInput.click());
spriteFileInput.addEventListener('change', (e) => loadSpriteForVideo(e.target.files[0]));

function loadSpriteForVideo(file) {
    if(!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    loadedSpriteImg = new Image();
    loadedSpriteImg.onload = () => {
        alert("Đã nhận file Sprite Sheet! Hãy kiểm tra số Hàng/Cột và bấm 'Tách Sprite Sheet'.");
    };
    loadedSpriteImg.src = url;
}

btnSliceSprite.addEventListener('click', () => {
    if(!loadedSpriteImg) {
        alert("Vui lòng chọn 1 file Sprite Sheet trước!");
        return;
    }
    const rows = parseInt(spriteRowsInput.value) || 1;
    const cols = parseInt(spriteColsInput.value) || 1;
    
    sliceSpriteToFrames(loadedSpriteImg, rows, cols);
});

function sliceSpriteToFrames(img, rows, cols) {
    const tileW = img.width / cols;
    const tileH = img.height / rows;
    
    const slicedFiles = [];
    let count = 0;

    for(let r = 0; r < rows; r++) {
        for(let c = 0; c < cols; c++) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = tileW;
            tempCanvas.height = tileH;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(img, c * tileW, r * tileH, tileW, tileH, 0, 0, tileW, tileH);
            
            tempCanvas.toBlob((blob) => {
                const file = new File([blob], `frame_${count + 1}.png`, { type: 'image/png' });
                slicedFiles.push(file);
                if (slicedFiles.length === rows * cols) {
                    clearAllImages();
                    handleFiles(slicedFiles);
                }
            }, 'image/png');
            count++;
        }
    }
}

function clearCanvas() {
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}
clearCanvas();

async function handleFiles(files) {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;
    noImageText.textContent = "Đang tải ảnh...";
    
    for (let file of validFiles) {
        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        imageFiles.push({ url, img });
    }
    
    updateThumbnails();
    if (imageFiles.length > 0) {
        canvasOverlay.style.display = 'none';
        drawFrame(0);
        updateControls();
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

function updateThumbnails() {
    thumbnailContainer.innerHTML = '';
    imageCount.textContent = imageFiles.length;
    
    if (imageFiles.length === 0) {
        thumbnailContainer.appendChild(noImageText);
        noImageText.textContent = "Chưa có ảnh nào";
        clearBtn.classList.add('hidden');
        return;
    }
    clearBtn.classList.remove('hidden');
    
    imageFiles.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 border-transparent hover:border-indigo-500 cursor-grab transition-all relative group";
        div.onclick = () => { stopPreview(); drawFrame(index); };
        
        div.draggable = true; 
        div.addEventListener('dragstart', (e) => {
            draggedIndex = index;
            setTimeout(() => div.classList.add('opacity-40'), 0); 
        });
        
        div.addEventListener('dragend', () => {
            div.classList.remove('opacity-40');
            draggedIndex = null;
        });
        
        div.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            div.classList.add('border-indigo-500', 'scale-105'); 
        });
        
        div.addEventListener('dragleave', () => {
            div.classList.remove('border-indigo-500', 'scale-105');
        });
        
        div.addEventListener('drop', (e) => {
            e.preventDefault();
            div.classList.remove('border-indigo-500', 'scale-105');
            
            if (draggedIndex !== null && draggedIndex !== index) {
                const draggedItem = imageFiles.splice(draggedIndex, 1)[0];
                imageFiles.splice(index, 0, draggedItem);
                
                stopPreview();
                updateThumbnails();
                drawFrame(index); 
            }
        });

        const img = document.createElement('img');
        img.src = item.url;
        img.className = "w-full h-full object-cover pointer-events-none"; 
        
        const badge = document.createElement('div');
        badge.className = "absolute top-0.5 left-0.5 bg-black/60 text-white text-[10px] px-1 rounded pointer-events-none";
        badge.textContent = index + 1;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = "absolute top-0.5 right-0.5 bg-red-500/90 hover:bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity";
        deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteImage(index); };

        div.appendChild(img);
        div.appendChild(badge);
        div.appendChild(deleteBtn);
        thumbnailContainer.appendChild(div);
    });
    updateControls();
}

function deleteImage(index) {
    URL.revokeObjectURL(imageFiles[index].url);
    imageFiles.splice(index, 1);
    stopPreview();
    updateThumbnails();
    if (imageFiles.length === 0) {
        clearCanvas();
        canvasOverlay.style.display = 'flex';
        currentFrameIndex = 0;
        frameCounter.textContent = "0 / 0";
    } else {
        if (currentFrameIndex >= imageFiles.length) currentFrameIndex = imageFiles.length - 1;
        drawFrame(currentFrameIndex);
    }
}

function drawFrame(index) {
    if (imageFiles.length === 0 || index >= imageFiles.length) return;
    currentFrameIndex = index;
    frameCounter.textContent = `${index + 1} / ${imageFiles.length}`;
    
    const img = imageFiles[index].img;
    clearCanvas();
    const scale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (CANVAS_WIDTH - w) / 2;
    const y = (CANVAS_HEIGHT - h) / 2;
    ctx.drawImage(img, x, y, w, h);

    const thumbs = thumbnailContainer.querySelectorAll('div.flex-shrink-0');
    thumbs.forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.remove('border-transparent');
            thumb.classList.add('border-indigo-500');
            thumb.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
        } else {
            thumb.classList.add('border-transparent');
            thumb.classList.remove('border-indigo-500');
        }
    });
}

function playPreview() {
    isPlaying = true;
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    playBtn.classList.replace('bg-indigo-600', 'bg-amber-500');
    playBtn.classList.replace('hover:bg-indigo-700', 'hover:bg-amber-600');
    const intervalTime = 1000 / currentFPS;
    if (currentFrameIndex >= imageFiles.length - 1) currentFrameIndex = 0;

    previewInterval = setInterval(() => {
        drawFrame(currentFrameIndex);
        currentFrameIndex++;
        if (currentFrameIndex >= imageFiles.length) currentFrameIndex = 0;
    }, intervalTime);
}

function stopPreview() {
    isPlaying = false;
    clearInterval(previewInterval);
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    playBtn.classList.replace('bg-amber-500', 'bg-indigo-600');
    playBtn.classList.replace('hover:bg-amber-600', 'hover:bg-indigo-700');
}

function updateControls() {
    const hasImages = imageFiles.length > 0;
    playBtn.disabled = !hasImages;
    stopBtn.disabled = !hasImages;
    exportBtn.disabled = !hasImages;
    if(!hasImages) frameCounter.textContent = "0 / 0";
}

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function clearAllImages() {
    imageFiles = [];
    stopPreview();
    updateThumbnails();
    clearCanvas();
    canvasOverlay.style.display = 'flex';
}

clearBtn.addEventListener('click', clearAllImages);

fpsSlider.addEventListener('input', (e) => {
    currentFPS = parseInt(e.target.value);
    fpsDisplay.textContent = `${currentFPS} FPS`;
    if (isPlaying) { stopPreview(); playPreview(); }
});

playBtn.addEventListener('click', () => {
    if (imageFiles.length === 0) return;
    isPlaying ? stopPreview() : playPreview();
});

stopBtn.addEventListener('click', () => { stopPreview(); drawFrame(0); });

exportBtn.addEventListener('click', async () => {
    if (imageFiles.length === 0) return;
    stopPreview();
    exportBtn.disabled = true;
    exportStatus.classList.remove('hidden');
    exportProgressContainer.classList.remove('hidden');
    exportProgressBar.style.width = '0%';
    
    recordedChunks = [];
    const stream = canvas.captureStream(currentFPS);
    const options = { mimeType: 'video/webm; codecs=vp9' };
    
    try { mediaRecorder = new MediaRecorder(stream, options); } 
    catch (e) { mediaRecorder = new MediaRecorder(stream); }

    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `SlideVideo_${currentFPS}fps.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
        exportBtn.disabled = false;
        exportStatus.classList.add('hidden');
        exportProgressContainer.classList.add('hidden');
    };

    mediaRecorder.start();
    const frameDuration = 1000 / currentFPS;
    for (let i = 0; i < imageFiles.length; i++) {
        drawFrame(i);
        exportProgressBar.style.width = `${((i + 1) / imageFiles.length) * 100}%`;
        await new Promise(resolve => setTimeout(resolve, frameDuration));
    }
    await new Promise(resolve => setTimeout(resolve, frameDuration));
    mediaRecorder.stop();
});

updateControls();

window.VideoConverter = {
    handleFiles: handleFiles,
    clearAll: clearAllImages,
    loadSpriteImage: (file) => {
        setVideoInputMode('sprite');
        loadSpriteForVideo(file);
    }
};