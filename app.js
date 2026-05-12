// ==================== SVG CONVERTER PWA ====================
let originalImage = null;
let currentSVG = null;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const previewContainer = document.getElementById('previewContainer');
const downloadBtn = document.getElementById('downloadBtn');
const svgInfo = document.getElementById('svgInfo');

// Range inputs
const colorsInput = document.getElementById('colors');
const detailInput = document.getElementById('detail');
const smoothInput = document.getElementById('smooth');

// Value displays
const colorsValue = document.getElementById('colorsValue');
const detailValue = document.getElementById('detailValue');
const smoothValue = document.getElementById('smoothValue');

// ==================== EVENT LISTENERS ====================
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    } else {
        showToast('❌ Tolong upload file gambar!');
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleImageUpload(file);
    }
});

// Paste dari clipboard
document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            handleImageUpload(file);
            break;
        }
    }
});

// Range input updates
colorsInput.addEventListener('input', (e) => {
    colorsValue.textContent = e.target.value;
    if (originalImage) convertToSVG();
});

detailInput.addEventListener('input', (e) => {
    detailValue.textContent = e.target.value;
    if (originalImage) convertToSVG();
});

smoothInput.addEventListener('input', (e) => {
    smoothValue.textContent = e.target.value;
    if (originalImage) convertToSVG();
});

// ==================== IMAGE HANDLING ====================
function handleImageUpload(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            controls.style.display = 'block';
            
            // Show original image
            previewContainer.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            previewContainer.appendChild(canvas);
            
            // Auto convert
            convertToSVG();
            
            showToast('✅ Gambar berhasil diupload!');
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// ==================== SVG CONVERSION ====================
function convertToSVG() {
    if (!originalImage) return;
    
    showToast('🔄 Mengkonversi ke SVG...');
    
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(originalImage, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // ImageTracer options
    const options = {
        ltres: detailInput.value / 100,
        qtres: detailInput.value / 100,
        pathomit: parseInt(smoothInput.value),
        colorsampling: 2,
        numberofcolors: parseInt(colorsInput.value),
        mincolorratio: 0.02,
        colorquantcycles: 3,
        scale: 1,
        strokewidth: 1,
        linefilter: detailInput.value > 50,
        rightangleenhance: true,
        blurradius: parseInt(smoothInput.value) / 2,
        blurdelta: 20
    };
    
    try {
        // Convert to SVG
        currentSVG = ImageTracer.imagedataToSVG(imageData, options);
        
        // Display SVG
        previewContainer.innerHTML = currentSVG;
        
        // Style SVG preview
        const svgElement = previewContainer.querySelector('svg');
        if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
        }
        
        // Show download button
        downloadBtn.style.display = 'inline-block';
        
        // Update info
        const svgSize = new Blob([currentSVG]).size;
        const sizeKB = (svgSize / 1024).toFixed(2);
        svgInfo.innerHTML = `
            <p>📐 Ukuran file: ${sizeKB} KB</p>
            <p>🎨 Jumlah warna: ${colorsInput.value}</p>
            <p>📏 Dimensi: ${originalImage.width}x${originalImage.height}px</p>
        `;
        
        showToast('✅ Konversi berhasil!');
    } catch (error) {
        console.error('Conversion error:', error);
        showToast('❌ Gagal mengkonversi gambar!');
    }
}

// ==================== DOWNLOAD SVG ====================
function downloadSVG() {
    if (!currentSVG) {
        showToast('❌ Konversi gambar dulu!');
        return;
    }
    
    const blob = new Blob([currentSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('💾 SVG berhasil didownload!');
}

// ==================== UTILS ====================
function showToast(message) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ==================== PWA REGISTRATION ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}

// PWA Install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button after 5 seconds
    setTimeout(() => {
        if (deferredPrompt) {
            const installBtn = document.createElement('button');
            installBtn.className = 'btn btn-primary';
            installBtn.textContent = '📱 Install Aplikasi';
            installBtn.style.position = 'fixed';
            installBtn.style.bottom = '20px';
            installBtn.style.left = '50%';
            installBtn.style.transform = 'translateX(-50%)';
            installBtn.style.zIndex = '999';
            
            installBtn.addEventListener('click', () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    }
                    deferredPrompt = null;
                    installBtn.remove();
                });
            });
            
            document.body.appendChild(installBtn);
        }
    }, 5000);
});

console.log('🚀 SVG Converter PWA siap digunakan!');