// ==================== SVG CONVERTER PWA - FIXED VERSION ====================
let originalFile = null;
let currentSVG = null;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const previewContainer = document.getElementById('previewContainer');
const downloadBtn = document.getElementById('downloadBtn');
const svgInfo = document.getElementById('svgInfo');

// Range inputs & Values
const colorsInput = document.getElementById('colors');
const detailInput = document.getElementById('detail');
const smoothInput = document.getElementById('smooth');
const colorsValue = document.getElementById('colorsValue');
const detailValue = document.getElementById('detailValue');
const smoothValue = document.getElementById('smoothValue');

let isLoading = false;

// ==================== EVENT LISTENERS ====================
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleImageUpload(file);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file);
});

// Update label pas slider digeser
[colorsInput, detailInput, smoothInput].forEach(input => {
    input.addEventListener('input', () => {
        colorsValue.textContent = colorsInput.value;
        detailValue.textContent = detailInput.value;
        smoothValue.textContent = smoothInput.value;
    });
});

// ==================== IMAGE HANDLING ====================
function handleImageUpload(file) {
    originalFile = file;
    const reader = new FileReader();
    
    reader.onload = (e) => {
        previewContainer.innerHTML = `
            <div style="text-align: center;">
                <img src="${e.target.result}" style="max-width: 100%; border-radius: 10px;">
                <p style="color: #666; margin-top: 10px;">🔄 Memproses gambar...</p>
            </div>
        `;
        controls.style.display = 'block';
        convertToSVG(); // Auto convert pas upload
    };
    reader.readAsDataURL(file);
}

// ==================== THE REAL CONVERSION (ImageTracer) ====================
function convertToSVG() {
    if (!originalFile || isLoading) return;

    isLoading = true;
    showToast('🚀 Lagi diproses, sabar ya...');

    const options = {
        numberofcolors: parseInt(colorsInput.value),
        ltres: (100 - parseInt(detailInput.value)) / 10, // Detail logic
        qtres: (100 - parseInt(detailInput.value)) / 10,
        blurradius: parseInt(smoothInput.value),
        strokewidth: 0, // Biar nggak ada garis hitam kaku
        viewbox: true
    };

    // Pake FileReader buat dapet URL gambar yang bener buat library-nya
    const reader = new FileReader();
    reader.onload = (e) => {
        ImageTracer.imageToSVG(
            e.target.result,
            (svgString) => {
                currentSVG = svgString;
                displaySVG(currentSVG);
                isLoading = false;
                downloadBtn.style.display = 'inline-block';
                showToast('✅ Mantap! Udah jadi vektor.');
            },
            options
        );
    };
    reader.readAsDataURL(originalFile);
}

function displaySVG(svgString) {
    previewContainer.innerHTML = svgString;
    const svgElement = previewContainer.querySelector('svg');
    if (svgElement) {
        svgElement.style.maxWidth = '100%';
        svgElement.style.height = 'auto';
        svgElement.style.background = '#fff';
        svgElement.style.borderRadius = '10px';
    }

    // Update Statistik
    const sizeKB = (new Blob([svgString]).size / 1024).toFixed(2);
    const paths = (svgString.match(/<path/g) || []).length;
    svgInfo.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
            <span>📐 Size: <b>${sizeKB} KB</b></span>
            <span>🎨 Warna: <b>${colorsInput.value}</b></span>
            <span>✏️ Paths: <b>${paths}</b></span>
            <span>✨ Mode: <b>High Color</b></span>
        </div>
    `;
}

// ==================== DOWNLOAD & UI ====================
function downloadSVG() {
    if (!currentSVG) return;
    const blob = new Blob([currentSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vectorin-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    showToast('💾 SVG Aman disimpan!');
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(console.error);
    });
}
