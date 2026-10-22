// ==========================================
// TÍNH NĂNG CHỐNG TRÙNG LẶP ẢNH (ANTI-DUP)
// ==========================================

let antiDupList = [];

// DOM Elements
const antiDupDropzone = document.getElementById('antiDupDropzone');
const antiDupInput = document.getElementById('antiDupInput');
const btnProcessAntiDup = document.getElementById('btnProcessAntiDup');
const btnSaveAntiDupToFolder = document.getElementById('btnSaveAntiDupToFolder');
const antiDupResultsContainer = document.getElementById('antiDupResultsContainer');
const antiDupEmptyState = document.getElementById('antiDupEmptyState');
const antiDupCount = document.getElementById('antiDupCount');
const antiDupProcessedCount = document.getElementById('antiDupProcessedCount');

// Xử lý sự kiện kéo thả
antiDupDropzone.addEventListener('click', () => antiDupInput.click());

antiDupDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    antiDupDropzone.classList.add('dragover');
});

antiDupDropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    antiDupDropzone.classList.remove('dragover');
});

antiDupDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    antiDupDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleAntiDupFiles(e.dataTransfer.files);
    }
});

antiDupInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleAntiDupFiles(e.target.files);
    }
    e.target.value = ''; 
});

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function handleAntiDupFiles(files) {
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            antiDupList.push({
                id: Math.random().toString(36).substring(2, 9),
                file: file,
                originalName: file.name,
                origUrl: e.target.result,
                procUrl: null,
                origSize: formatBytes(file.size),
                processed: false
            });
            renderAntiDupGallery();
        };
        reader.readAsDataURL(file);
    });
}

function renderAntiDupGallery() {
    antiDupCount.textContent = antiDupList.length;
    const pCount = antiDupList.filter(img => img.processed).length;
    antiDupProcessedCount.textContent = pCount;

    btnProcessAntiDup.disabled = antiDupList.length === 0;
    btnSaveAntiDupToFolder.disabled = pCount === 0;

    if (antiDupList.length === 0) {
        antiDupEmptyState.style.display = 'block';
        antiDupResultsContainer.innerHTML = '';
        antiDupResultsContainer.appendChild(antiDupEmptyState);
        return;
    }

    antiDupEmptyState.style.display = 'none';
    antiDupResultsContainer.innerHTML = '';

    antiDupList.forEach(img => {
        const card = document.createElement('div');
        card.className = "bg-white border border-gray-200 rounded-xl p-3 flex flex-col shadow-sm relative group";
        
        card.innerHTML = `
            <div class="relative aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 mb-2">
                <img src="${img.processed ? img.procUrl : img.origUrl}" class="max-h-full max-w-full object-contain">
                <span class="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm ${img.processed ? 'bg-green-100 text-green-700' : 'bg-white text-gray-500'}">
                    ${img.processed ? 'Đã Làm Mới' : 'Gốc'}
                </span>
                <button onclick="removeAntiDupImage('${img.id}')" class="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 hover:bg-red-50 text-red-500 rounded flex items-center justify-center transition opacity-0 group-hover:opacity-100 shadow-sm">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <h4 class="text-xs font-semibold text-gray-700 truncate" title="${img.originalName}">${img.originalName}</h4>
            <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>${img.origSize}</span>
                ${img.processed ? '<span class="text-green-600"><i class="fa-solid fa-check"></i> Xong</span>' : '<span>Chờ xử lý</span>'}
            </div>
        `;
        antiDupResultsContainer.appendChild(card);
    });
}

window.removeAntiDupImage = function(id) {
    antiDupList = antiDupList.filter(img => img.id !== id);
    renderAntiDupGallery();
};

btnProcessAntiDup.addEventListener('click', () => {
    if (antiDupList.length === 0) return;
    
    const resizeVariance = parseFloat(document.getElementById('antiDup-param-resize').value) / 100;
    const cropPixels = parseInt(document.getElementById('antiDup-param-crop').value);
    const noiseLevel = parseInt(document.getElementById('antiDup-param-noise').value);
    // Tính năng xóa EXIF luôn hoạt động ngầm qua Canvas
    
    let processedCount = 0;
    btnProcessAntiDup.disabled = true;
    btnProcessAntiDup.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

    antiDupList.forEach((imgObj) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // 1. Resize
            let scale = 1.0;
            if (resizeVariance > 0) {
                scale = 1.0 + ((Math.random() * 2 - 1) * resizeVariance);
            }

            // 2. Crop
            let srcW = img.width - (cropPixels * 2);
            let srcH = img.height - (cropPixels * 2);
            let targetW = Math.round(srcW * scale);
            let targetH = Math.round(srcH * scale);

            canvas.width = targetW;
            canvas.height = targetH;
            ctx.drawImage(img, cropPixels, cropPixels, srcW, srcH, 0, 0, targetW, targetH);

            // 3. Noise & Micro Color Shift
            if (noiseLevel > 0 || true) {
                const imgData = ctx.getImageData(0, 0, targetW, targetH);
                const data = imgData.data;
                const intensity = noiseLevel * 1.5;
                const rShift = (Math.random() - 0.5) * 2; // Dịch màu cực nhẹ (-1 đến 1)

                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, Math.max(0, data[i] + rShift + (Math.random()-0.5)*intensity)); // R
                    data[i+1] = Math.min(255, Math.max(0, data[i+1] + rShift + (Math.random()-0.5)*intensity)); // G
                    data[i+2] = Math.min(255, Math.max(0, data[i+2] + rShift + (Math.random()-0.5)*intensity)); // B
                }
                ctx.putImageData(imgData, 0, 0);
            }

            const ext = imgObj.file.name.split('.').pop().toLowerCase();
            const mime = (ext === 'png') ? 'image/png' : 'image/jpeg';
            imgObj.procUrl = canvas.toDataURL(mime, (mime==='image/jpeg' ? 0.95 : undefined));
            imgObj.processed = true;

            processedCount++;
            if (processedCount === antiDupList.length) {
                btnProcessAntiDup.innerHTML = '<i class="fa-solid fa-check"></i> Đã Xử Lý Xong';
                setTimeout(() => { 
                    btnProcessAntiDup.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Xử Lý & Làm Mới Ảnh';
                    btnProcessAntiDup.disabled = false;
                }, 2000);
                renderAntiDupGallery();
            }
        };
        img.src = imgObj.origUrl;
    });
});

// Lưu hàng loạt thông qua File System Access API
btnSaveAntiDupToFolder.addEventListener('click', async () => {
    const processedImages = antiDupList.filter(img => img.processed);
    if (processedImages.length === 0) return;

    try {
        const dirHandle = await window.showDirectoryPicker({
            startIn: 'downloads'
        });
        
        for (let imgObj of processedImages) {
            const ext = imgObj.file.name.split('.').pop();
            const base = imgObj.file.name.substring(0, imgObj.file.name.lastIndexOf('.'));
            const newName = `${base}_antidup.${ext}`;
            
            const fileHandle = await dirHandle.getFileHandle(newName, { create: true });
            const writable = await fileHandle.createWritable();
            
            const response = await fetch(imgObj.procUrl);
            const blob = await response.blob();
            
            await writable.write(blob);
            await writable.close();
        }
        alert(`Đã lưu thành công ${processedImages.length} ảnh vào thư mục!`);
    } catch (err) {
        console.error("Lỗi khi lưu ảnh:", err);
    }
});