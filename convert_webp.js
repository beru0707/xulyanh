let selectedWebpFiles = [];
let processedWebpBlobs = [];

// Elements
const webpDropzone = document.getElementById('webpDropzone');
const webpInput = document.getElementById('webpInput');
const webpCount = document.getElementById('webpCount');
const webpQualitySlider = document.getElementById('webpQualitySlider');
const webpQualityDisplay = document.getElementById('webpQualityDisplay');
const webpMaxDimension = document.getElementById('webpMaxDimension');
const btnProcessWebp = document.getElementById('btnProcessWebp');

const webpProgressContainer = document.getElementById('webpProgressContainer');
const webpProgressBar = document.getElementById('webpProgressBar');
const webpStatusText = document.getElementById('webpStatusText');
const webpPercentText = document.getElementById('webpPercentText');

const webpResultsContainer = document.getElementById('webpResultsContainer');
const webpResultsTitle = document.getElementById('webpResultsTitle');
const webpResultCount = document.getElementById('webpResultCount');
const webpPlaceholder = document.getElementById('webpPlaceholder');
const webpActionsContainer = document.getElementById('webpActionsContainer');
const btnSaveWebpToFolder = document.getElementById('btnSaveWebpToFolder');

// Lắng nghe thay đổi chất lượng
if (webpQualitySlider && webpQualityDisplay) {
    webpQualitySlider.addEventListener('input', (e) => {
        webpQualityDisplay.textContent = `${e.target.value}%`;
    });
}

// Xử lý Sự kiện Kéo thả / Chọn file
if (webpDropzone && webpInput) {
    webpDropzone.addEventListener('click', () => webpInput.click());
    webpDropzone.addEventListener('dragover', (e) => { e.preventDefault(); webpDropzone.classList.add('dragover'); });
    webpDropzone.addEventListener('dragleave', () => webpDropzone.classList.remove('dragover'));
    webpDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        webpDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleWebpFiles(e.dataTransfer.files);
    });

    webpInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleWebpFiles(e.target.files);
    });
}

function handleWebpFiles(files) {
    selectedWebpFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (webpCount) webpCount.textContent = selectedWebpFiles.length;
    if (btnProcessWebp) btnProcessWebp.disabled = selectedWebpFiles.length === 0;

    // Reset trạng thái
    processedWebpBlobs = [];
    if (webpResultsContainer) {
        webpResultsContainer.innerHTML = '';
        if (webpPlaceholder) webpResultsContainer.appendChild(webpPlaceholder);
    }
    if (webpPlaceholder) webpPlaceholder.classList.remove('hidden');
    if (webpResultsTitle) webpResultsTitle.classList.add('hidden');
    if (webpActionsContainer) webpActionsContainer.classList.add('hidden');
    if (webpProgressContainer) webpProgressContainer.classList.add('hidden');
}

/**
 * Hàm chuyển đổi 1 ảnh sang WebP giữ nguyên hoặc scale kích thước với Canvas
 */
async function convertImageToWebp(file, quality, maxDim) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            let w = img.width;
            let h = img.height;

            // Scale kích thước tối đa (như logic Python LANCZOS)
            if (maxDim > 0) {
                const k = Math.min(1, maxDim / Math.max(w, h));
                if (k < 1) {
                    w = Math.round(w * k);
                    h = Math.round(h * k);
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');

            // Cấu hình khử mờ sắc nét
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, w, h);

            // Export sang format WebP
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (blob) {
                    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                    const webpFile = new File([blob], newFileName, { type: "image/webp" });
                    resolve({ file: webpFile, oldSize: file.size, newSize: blob.size, originalDim: `${img.width}x${img.height}`, newDim: `${w}x${h}` });
                } else {
                    reject(new Error("Lỗi khi tạo Blob WebP"));
                }
            }, 'image/webp', quality);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };

        img.src = url;
    });
}

// Bắt đầu xử lý hàng loạt
if (btnProcessWebp) {
    btnProcessWebp.addEventListener('click', async () => {
        if (selectedWebpFiles.length === 0) return;

        btnProcessWebp.disabled = true;
        if (webpProgressContainer) webpProgressContainer.classList.remove('hidden');
        if (webpActionsContainer) webpActionsContainer.classList.add('hidden');
        if (webpPlaceholder) webpPlaceholder.classList.add('hidden');
        if (webpResultsContainer) webpResultsContainer.innerHTML = '';
        processedWebpBlobs = [];

        const quality = parseFloat(webpQualitySlider.value) / 100;
        const maxDim = parseInt(webpMaxDimension.value) || 2048;

        for (let i = 0; i < selectedWebpFiles.length; i++) {
            const file = selectedWebpFiles[i];

            if (webpStatusText) webpStatusText.textContent = `Đang chuyển đổi (${i + 1}/${selectedWebpFiles.length}): ${file.name}...`;

            try {
                const result = await convertImageToWebp(file, quality, maxDim);
                processedWebpBlobs.push(result.file);

                // Hiển thị Khung kết quả + Thống kê dung lượng giảm được
                const oldKB = Math.round(result.oldSize / 1024);
                const newKB = Math.round(result.newSize / 1024);
                const reducePercent = Math.round(((result.oldSize - result.newSize) / result.oldSize) * 100);

                const itemCard = document.createElement('div');
                itemCard.className = "p-2 border border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center text-center text-xs space-y-1 shadow-sm";

                const img = document.createElement('img');
                img.src = URL.createObjectURL(result.file);
                img.className = "w-full h-24 object-contain rounded bg-[repeating-conic-gradient(#0000000b_0_25%,_transparent_0_50%)] [background-size:12px_12px]";

                const nameText = document.createElement('div');
                nameText.className = "font-medium truncate w-full text-gray-700";
                nameText.textContent = result.file.name;

                const sizeBadge = document.createElement('div');
                sizeBadge.className = "text-[10px] text-gray-500";
                sizeBadge.innerHTML = `<span class="line-through text-red-400">${oldKB}KB</span> ➔ <span class="text-green-600 font-bold">${newKB}KB</span> (${reducePercent > 0 ? '-' + reducePercent + '%' : '+KB'})`;

                itemCard.appendChild(img);
                itemCard.appendChild(nameText);
                itemCard.appendChild(sizeBadge);
                if (webpResultsContainer) webpResultsContainer.appendChild(itemCard);

            } catch (err) {
                console.error("Lỗi khi convert ảnh:", file.name, err);
            }

            // Cập nhật thanh tiến trình
            const percent = Math.round(((i + 1) / selectedWebpFiles.length) * 100);
            if (webpProgressBar) webpProgressBar.style.width = `${percent}%`;
            if (webpPercentText) webpPercentText.textContent = `${percent}%`;
        }

        if (webpStatusText) webpStatusText.textContent = "Hoàn tất chuyển đổi tất cả ảnh sang WebP!";
        btnProcessWebp.disabled = false;

        if (processedWebpBlobs.length > 0) {
            if (webpResultsTitle) webpResultsTitle.classList.remove('hidden');
            if (webpResultCount) webpResultCount.textContent = processedWebpBlobs.length;
            if (webpActionsContainer) webpActionsContainer.classList.remove('hidden');
        }
    });
}

// Lưu/Chọn Thư mục Tải về trên Máy tính
if (btnSaveWebpToFolder) {
    btnSaveWebpToFolder.addEventListener('click', async () => {
        if (processedWebpBlobs.length === 0) return;

        if ('showDirectoryPicker' in window) {
            try {
                // Mở Dialog chọn Folder
                const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                
                for (const file of processedWebpBlobs) {
                    const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();
                }
                alert(`Đã lưu thành công ${processedWebpBlobs.length} file WebP vào thư mục!`);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error(err);
                    alert('Có lỗi xảy ra khi lưu file vào thư mục.');
                }
            }
        } else {
            // Fallback tải xuống từng file nếu trình duyệt không hỗ trợ File System Access API
            for (let i = 0; i < processedWebpBlobs.length; i++) {
                const file = processedWebpBlobs[i];
                const url = URL.createObjectURL(file);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                await new Promise(r => setTimeout(r, 150));
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }
    });
}