let selectedBgFiles = [];
let processedBgBlobs = [];

// API Key Remove.bg của bạn
const REMOVE_BG_API_KEY = 'WYo4ii25rHsNuK4gbV82JDoG';

// Lấy tham chiếu các phần tử HTML
const bgInput = document.getElementById('bgInput');
const bgDropzone = document.getElementById('bgDropzone');
const bgCount = document.getElementById('bgCount');
const btnProcessBg = document.getElementById('btnProcessBg');
const bgResultsContainer = document.getElementById('bgResultsContainer');
const bgResultsTitle = document.getElementById('bgResultsTitle');
const bgResultCount = document.getElementById('bgResultCount');

const bgProgressContainer = document.getElementById('bgProgressContainer');
const bgProgressBar = document.getElementById('bgProgressBar');
const bgStatusText = document.getElementById('bgStatusText');
const bgPercentText = document.getElementById('bgPercentText');

const bgActionsContainer = document.getElementById('bgActionsContainer');
const btnSendBgToVideo = document.getElementById('btnSendBgToVideo');
const btnSaveBgToFolder = document.getElementById('btnSaveBgToFolder');

// Xử lý Sự kiện Kéo thả / Chọn file
if (bgDropzone && bgInput) {
    bgDropzone.addEventListener('click', () => bgInput.click());
    bgDropzone.addEventListener('dragover', (e) => { e.preventDefault(); bgDropzone.classList.add('dragover'); });
    bgDropzone.addEventListener('dragleave', () => bgDropzone.classList.remove('dragover'));
    bgDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        bgDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleBgFiles(e.dataTransfer.files);
    });

    bgInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleBgFiles(e.target.files);
    });
}

function handleBgFiles(files) {
    selectedBgFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (bgCount) bgCount.textContent = selectedBgFiles.length;
    if (btnProcessBg) btnProcessBg.disabled = selectedBgFiles.length === 0;

    // Reset trạng thái
    processedBgBlobs = [];
    if (bgResultsContainer) bgResultsContainer.innerHTML = '';
    if (bgResultsTitle) bgResultsTitle.classList.add('hidden');
    if (bgActionsContainer) bgActionsContainer.classList.add('hidden');
    if (bgProgressContainer) bgProgressContainer.classList.add('hidden');
}

// Hàm gọi API Remove.bg
async function removeBgViaAPI(file) {
    const formData = new FormData();
    formData.append('image_file', file);
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
            'X-Api-Key': REMOVE_BG_API_KEY
        },
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    return await response.blob();
}

// Bắt đầu Xóa nền Hàng loạt qua Remove.bg API
if (btnProcessBg) {
    btnProcessBg.addEventListener('click', async () => {
        if (selectedBgFiles.length === 0) return;

        btnProcessBg.disabled = true;
        if (bgProgressContainer) bgProgressContainer.classList.remove('hidden');
        if (bgActionsContainer) bgActionsContainer.classList.add('hidden');
        if (bgResultsTitle) bgResultsTitle.classList.add('hidden');
        if (bgResultsContainer) bgResultsContainer.innerHTML = '';
        processedBgBlobs = [];

        for (let i = 0; i < selectedBgFiles.length; i++) {
            const file = selectedBgFiles[i];

            if (bgStatusText) bgStatusText.textContent = `Đang gửi API xử lý (${i + 1}/${selectedBgFiles.length}): ${file.name}...`;

            try {
                // Gọi Remove.bg API
                const blob = await removeBgViaAPI(file);

                // Đổi tên file thành dạng _nobg.png
                const newFileName = file.name.replace(/\.[^/.]+$/, "") + "_nobg.png";
                const resultFile = new File([blob], newFileName, { type: "image/png" });
                processedBgBlobs.push(resultFile);

                // Hiển thị khung xem trước ảnh dạng nền caro (Alpha transparent)
                const imgContainer = document.createElement('div');
                imgContainer.className = "relative p-1 border border-gray-200 rounded-lg bg-[repeating-conic-gradient(#0000000b_0_25%,_transparent_0_50%)] [background-size:16px_16px] overflow-hidden group";

                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                img.className = "w-full h-28 object-contain rounded";

                const nameBadge = document.createElement('div');
                nameBadge.className = "text-[10px] text-gray-500 truncate mt-1 text-center";
                nameBadge.textContent = newFileName;

                imgContainer.appendChild(img);
                imgContainer.appendChild(nameBadge);
                if (bgResultsContainer) bgResultsContainer.appendChild(imgContainer);

            } catch (err) {
                console.error("Lỗi khi xóa nền ảnh qua Remove.bg API:", file.name, err);
                alert(`Lỗi khi xử lý ${file.name}: ${err.message}`);
            }

            // Cập nhật tiến trình
            const percent = Math.round(((i + 1) / selectedBgFiles.length) * 100);
            if (bgProgressBar) bgProgressBar.style.width = `${percent}%`;
            if (bgPercentText) bgPercentText.textContent = `${percent}%`;
        }

        if (bgStatusText) bgStatusText.textContent = "Hoàn tất xóa nền tất cả ảnh!";
        btnProcessBg.disabled = false;

        if (processedBgBlobs.length > 0) {
            if (bgResultsTitle) bgResultsTitle.classList.remove('hidden');
            if (bgResultCount) bgResultCount.textContent = processedBgBlobs.length;
            if (bgActionsContainer) bgActionsContainer.classList.remove('hidden');
        }
    });
}

// Chuyển kết quả xóa nền sang Tab 3 (Convert Video)
if (btnSendBgToVideo) {
    btnSendBgToVideo.addEventListener('click', () => {
        if (processedBgBlobs.length === 0) return;
        if (typeof switchTab === 'function') switchTab('convertVideo');
        if (window.VideoConverter) {
            window.VideoConverter.clearAll();
            window.VideoConverter.handleFiles(processedBgBlobs);
        }
    });
}

// Lưu toàn bộ tệp kết quả vào Folder máy tính
if (btnSaveBgToFolder) {
    btnSaveBgToFolder.addEventListener('click', async () => {
        if (processedBgBlobs.length === 0) return;

        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                for (const file of processedBgBlobs) {
                    const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();
                }
                alert(`Đã lưu thành công ${processedBgBlobs.length} ảnh đã xóa nền vào thư mục!`);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error(err);
                    alert('Có lỗi xảy ra khi lưu file vào thư mục.');
                }
            }
        } else {
            // Fallback tải từng ảnh
            for (let i = 0; i < processedBgBlobs.length; i++) {
                const file = processedBgBlobs[i];
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
}