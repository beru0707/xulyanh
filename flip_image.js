let selectedFlipFiles = [];
let processedFlipResults = []; // Lưu danh sách Blob kết quả

document.addEventListener('DOMContentLoaded', () => {
    const flipDropzone = document.getElementById('flipDropzone');
    const flipInput = document.getElementById('flipInput');
    const flipCount = document.getElementById('flipCount');
    const btnProcessFlip = document.getElementById('btnProcessFlip');
    const flipProgressContainer = document.getElementById('flipProgressContainer');
    const flipProgressBar = document.getElementById('flipProgressBar');
    const flipStatusText = document.getElementById('flipStatusText');
    const flipPercentText = document.getElementById('flipPercentText');
    const flipActionsContainer = document.getElementById('flipActionsContainer');
    const btnSaveFlipToFolder = document.getElementById('btnSaveFlipToFolder');
    const flipResultsContainer = document.getElementById('flipResultsContainer');
    const flipPlaceholder = document.getElementById('flipPlaceholder');
    const flipResultsTitle = document.getElementById('flipResultsTitle');
    const flipResultCount = document.getElementById('flipResultCount');

    // Drag and drop events
    flipDropzone.addEventListener('click', () => flipInput.click());
    
    flipDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        flipDropzone.classList.add('dragover');
    });

    flipDropzone.addEventListener('dragleave', () => {
        flipDropzone.classList.remove('dragover');
    });

    flipDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        flipDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFlipFilesSelect(e.dataTransfer.files);
        }
    });

    flipInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFlipFilesSelect(e.target.files);
        }
    });

    function handleFlipFilesSelect(files) {
        selectedFlipFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        flipCount.textContent = selectedFlipFiles.length;
        btnProcessFlip.disabled = selectedFlipFiles.length === 0;
    }

    // Xử lý Lật ảnh hàng loạt qua Canvas
    btnProcessFlip.addEventListener('click', async () => {
        if (selectedFlipFiles.length === 0) return;

        const direction = document.querySelector('input[name="flipDirection"]:checked').value; // 'horizontal' | 'vertical' | 'rotate'
        let angle = parseFloat(document.getElementById('flipRotateAngle').value);
        if (isNaN(angle)) angle = 45;
        const options = { angle };

        btnProcessFlip.disabled = true;
        flipProgressContainer.classList.remove('hidden');
        flipActionsContainer.classList.add('hidden');
        flipResultsContainer.innerHTML = '';
        processedFlipResults = [];

        const total = selectedFlipFiles.length;

        for (let i = 0; i < total; i++) {
            const file = selectedFlipFiles[i];
            
            // Cập nhật progress
            const percent = Math.round(((i + 1) / total) * 100);
            flipProgressBar.style.width = `${percent}%`;
            flipPercentText.textContent = `${percent}%`;
            flipStatusText.textContent = `Đang xử lý: ${file.name}`;

            try {
                const flippedBlob = await flipSingleImage(file, direction, options);
                processedFlipResults.push({
                    name: getFlippedFileName(file.name, direction, options),
                    blob: flippedBlob,
                    originalName: file.name
                });

                // Render Thumbnail Preview
                renderFlipThumbnail(flippedBlob, file.name, getFlippedFileName(file.name, direction, options));

            } catch (err) {
                console.error(`Lỗi khi xử lý ảnh ${file.name}:`, err);
            }
        }

        flipStatusText.textContent = 'Hoàn tất!';
        flipResultsTitle.classList.remove('hidden');
        flipResultCount.textContent = processedFlipResults.length;
        flipActionsContainer.classList.remove('hidden');
        btnProcessFlip.disabled = false;
    });

    // Hàm đọc & lật / xoay 1 ảnh bằng Canvas
    function flipSingleImage(file, direction, options) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const isRotate = direction === 'rotate';

                if (isRotate) {
                    // Xoay: mở rộng canvas vừa đủ chứa toàn bộ ảnh sau khi xoay
                    const rad = (options.angle * Math.PI) / 180;
                    const sin = Math.abs(Math.sin(rad));
                    const cos = Math.abs(Math.cos(rad));
                    canvas.width = Math.ceil(img.width * cos + img.height * sin);
                    canvas.height = Math.ceil(img.width * sin + img.height * cos);

                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate(rad);
                    ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.save();
                    if (direction === 'horizontal') {
                        ctx.scale(-1, 1);
                        ctx.drawImage(img, -img.width, 0, img.width, img.height);
                    } else {
                        ctx.scale(1, -1);
                        ctx.drawImage(img, 0, -img.height, img.width, img.height);
                    }
                    ctx.restore();
                }

                URL.revokeObjectURL(url);

                // Xoay luôn xuất PNG để giữ nền trong suốt ở các góc; lật giữ định dạng JPEG gốc
                const outputType = (!isRotate && file.type === 'image/jpeg') ? 'image/jpeg' : 'image/png';
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Lỗi chuyển đổi Blob'));
                }, outputType, 0.95);
            };

            img.onerror = reject;
            img.src = url;
        });
    }

    // Tạo tên file mới
    function getFlippedFileName(originalName, direction, options) {
        const extIndex = originalName.lastIndexOf('.');
        const baseName = extIndex !== -1 ? originalName.substring(0, extIndex) : originalName;
        let ext = extIndex !== -1 ? originalName.substring(extIndex) : '.png';
        let suffix;
        if (direction === 'rotate') {
            const ang = String(options.angle).replace('-', 'm').replace('.', '_');
            suffix = `_rot${ang}`;
            ext = '.png';
        } else {
            suffix = direction === 'horizontal' ? '_flipped_h' : '_flipped_v';
        }
        return `${baseName}${suffix}${ext}`;
    }

    // Render Preview
    function renderFlipThumbnail(blob, originalName, outputName) {
        if (flipPlaceholder) flipPlaceholder.classList.add('hidden');

        const url = URL.createObjectURL(blob);
        const card = document.createElement('div');
        card.className = 'bg-white border rounded-lg p-2 flex flex-col items-center shadow-sm relative group';
        
        card.innerHTML = `
            <img src="${url}" class="w-full h-24 object-contain rounded bg-gray-50 mb-2 border">
            <span class="text-[11px] text-gray-600 truncate w-full text-center">${originalName}</span>
            <a href="${url}" download="${outputName}" class="mt-1 text-xs text-indigo-600 hover:underline">Tải ảnh</a>
        `;
        flipResultsContainer.appendChild(card);
    }

    // Lưu hàng loạt vào Folder bằng File System Access API
    btnSaveFlipToFolder.addEventListener('click', async () => {
        if (processedFlipResults.length === 0) return;

        try {
            if ('showDirectoryPicker' in window) {
                const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                for (const item of processedFlipResults) {
                    const fileHandle = await dirHandle.getFileHandle(item.name, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(item.blob);
                    await writable.close();
                }
                alert(`Đã lưu thành công ${processedFlipResults.length} ảnh vào thư mục!`);
            } else {
                // Tải từng file nếu trình duyệt không hỗ trợ DirectoryPicker
                processedFlipResults.forEach(item => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(item.blob);
                    a.download = item.name;
                    a.click();
                });
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Lỗi khi lưu thư mục:', err);
                alert('Có lỗi xảy ra khi lưu tệp.');
            }
        }
    });
});