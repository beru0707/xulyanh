// Quản lý trạng thái
let selectedVideoFile = null;
let extractedFramesBlobs = []; // Danh sách File/Blob các khung hình trích xuất

const videoExtractDropzone = document.getElementById('videoExtractDropzone');
const videoExtractInput = document.getElementById('videoExtractInput');
const videoDropzoneText = document.getElementById('videoDropzoneText');
const videoExtractPreview = document.getElementById('extractVideoPreview');
const videoExtractPlaceholder = document.getElementById('videoExtractPlaceholder');

const btnStartExtract = document.getElementById('btnStartExtract');
const extractTotalFrames = document.getElementById('extractTotalFrames'); // Lấy ô nhập số lượng ảnh
const extractImageFormat = document.getElementById('extractImageFormat');
const extractFileNamePrefix = document.getElementById('extractFileNamePrefix');

const extractProgressContainer = document.getElementById('extractProgressContainer');
const extractProgressBar = document.getElementById('extractProgressBar');
const extractStatusText = document.getElementById('extractStatusText');
const extractPercentText = document.getElementById('extractPercentText');

const extractResultsTitle = document.getElementById('extractResultsTitle');
const extractResultCount = document.getElementById('extractResultCount');
const extractResultsContainer = document.getElementById('extractResultsContainer');

const btnSendExtractedToVideo = document.getElementById('btnSendExtractedToVideo');
const btnDownloadExtractedAll = document.getElementById('btnDownloadExtractedAll');

// Xử lý Sự kiện Drag & Drop Video
videoExtractDropzone.addEventListener('click', () => videoExtractInput.click());
videoExtractDropzone.addEventListener('dragover', (e) => { e.preventDefault(); videoExtractDropzone.classList.add('dragover'); });
videoExtractDropzone.addEventListener('dragleave', () => videoExtractDropzone.classList.remove('dragover'));
videoExtractDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    videoExtractDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleVideoFile(e.dataTransfer.files[0]);
});

videoExtractInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleVideoFile(e.target.files[0]);
});

function handleVideoFile(file) {
    if (!file.type.startsWith('video/')) {
        alert("Vui lòng chọn file dạng Video!");
        return;
    }
    selectedVideoFile = file;
    videoDropzoneText.textContent = `Đã chọn: ${file.name}`;

    const videoUrl = URL.createObjectURL(file);
    videoExtractPreview.src = videoUrl;
    videoExtractPreview.classList.remove('hidden');
    videoExtractPlaceholder.classList.add('hidden');

    btnStartExtract.disabled = false;
    resetExtractState();
}

function resetExtractState() {
    extractedFramesBlobs = [];
    extractResultsContainer.innerHTML = '';
    extractResultsTitle.classList.add('hidden');
    btnSendExtractedToVideo.classList.add('hidden');
    btnDownloadExtractedAll.classList.add('hidden');
    extractProgressContainer.classList.add('hidden');
}

// Bắt đầu Trích xuất Khung hình
btnStartExtract.addEventListener('click', async () => {
    if (!selectedVideoFile) return;

    resetExtractState();
    btnStartExtract.disabled = true;
    extractProgressContainer.classList.remove('hidden');

    const targetFrameCount = parseInt(extractTotalFrames.value) || 10;
    const format = extractImageFormat.value || 'png';
    const prefix = extractFileNamePrefix.value.trim() || 'frame';

    try {
        await extractFramesNativeCanvas(selectedVideoFile, targetFrameCount, format, prefix);
    } catch (err) {
        console.error("Lỗi khi trích xuất khung hình:", err);
        alert("Có lỗi xảy ra trong quá trình trích xuất khung hình từ video.");
    } finally {
        btnStartExtract.disabled = false;
    }
});

/**
 * Trích xuất đúng `targetCount` số lượng khung hình từ Video
 */
async function extractFramesNativeCanvas(file, targetCount, format, prefix) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = async () => {
            const duration = video.duration;
            const width = video.videoWidth;
            const height = video.videoHeight;

            // Khởi tạo Canvas với độ phân giải thực của Video
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Cấu hình khử mờ / sắc nét tối đa
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Tính khoảng cách thời gian giữa mỗi ảnh
            const step = targetCount > 1 ? duration / (targetCount - 1) : 0;
            const mimeType = format === 'png' ? 'image/png' : (format === 'webp' ? 'image/webp' : 'image/jpeg');

            for (let i = 0; i < targetCount; i++) {
                // Đảm bảo không vượt quá độ dài thời gian video
                const currentTime = Math.min(i * step, duration);
                video.currentTime = currentTime;

                // Đợi video seek tới mốc thời gian chỉ định
                await new Promise((res) => {
                    const onSeeked = () => {
                        video.removeEventListener('seeked', onSeeked);
                        res();
                    };
                    video.addEventListener('seeked', onSeeked);
                });

                // Vẽ khung hình sắc nét lên canvas
                ctx.drawImage(video, 0, 0, width, height);

                // Tạo file Blob ảnh chất lượng cao
                const blob = await new Promise((res) => canvas.toBlob(res, mimeType, 1.0));
                const fileName = `${prefix}_${String(i + 1).padStart(3, '0')}.${format}`;
                const frameFile = new File([blob], fileName, { type: mimeType });
                extractedFramesBlobs.push(frameFile);

                // Hiển thị Preview kết quả
                const imgElement = document.createElement('img');
                imgElement.src = URL.createObjectURL(blob);
                imgElement.className = "w-full h-auto border border-gray-200 rounded shadow-sm object-contain";
                extractResultsContainer.appendChild(imgElement);

                // Cập nhật Tiến trình
                const percent = Math.round(((i + 1) / targetCount) * 100);
                extractProgressBar.style.width = `${percent}%`;
                extractPercentText.textContent = `${percent}%`;
                extractStatusText.textContent = `Đang trích xuất (${i + 1}/${targetCount})...`;
            }

            // Hoàn tất
            extractProgressBar.style.width = `100%`;
            extractPercentText.textContent = `100%`;
            extractStatusText.textContent = `Trích xuất hoàn tất ${targetCount} khung hình!`;

            extractResultsTitle.classList.remove('hidden');
            extractResultCount.textContent = extractedFramesBlobs.length;
            btnSendExtractedToVideo.classList.remove('hidden');
            btnDownloadExtractedAll.classList.remove('hidden');

            URL.revokeObjectURL(video.src);
            resolve();
        };

        video.onerror = (e) => reject(e);
    });
}

// Chuyển danh sách khung hình trích xuất được sang Tab 3 (Convert to Video)
btnSendExtractedToVideo.addEventListener('click', () => {
    if (extractedFramesBlobs.length === 0) return;
    switchTab('convertVideo');
    if (window.VideoConverter) {
        window.VideoConverter.clearAll();
        window.VideoConverter.handleFiles(extractedFramesBlobs);
    }
});

// Tải / Lưu toàn bộ khung hình vào Thư mục
btnDownloadExtractedAll.addEventListener('click', async () => {
    if (extractedFramesBlobs.length === 0) return;

    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            for (const file of extractedFramesBlobs) {
                const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(file);
                await writable.close();
            }
            alert(`Đã lưu thành công ${extractedFramesBlobs.length} khung hình vào thư mục của bạn!`);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                alert('Có lỗi xảy ra khi lưu file vào thư mục.');
            }
        }
    } else {
        // Fallback tải từng ảnh
        for (let i = 0; i < extractedFramesBlobs.length; i++) {
            const file = extractedFramesBlobs[i];
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