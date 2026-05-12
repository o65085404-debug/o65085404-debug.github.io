// ==================== SVG CONVERTER PWA - ULTRA LIGHT ====================
let originalImage = null;
let currentSVG = null;
let worker = null;
let conversionTimeout = null; // Untuk debounce

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

// Loading indicator
let isLoading = false;

// ==================== WEB WORKER SETUP ====================
// Bikin worker inline biar gak perlu file terpisah
const workerCode = `
  self.onmessage = function(e) {
    const { imageData, options } = e.data;
    
    try {
      // Simple tracing algorithm (ringan & cepat)
      const svg = traceToSVG(imageData, options);
      self.postMessage({ svg, success: true });
    } catch (error) {
      self.postMessage({ error: error.message, success: false });
    }
  };
  
  function traceToSVG(imageData, options) {
    const { width, height, data } = imageData;
    const colors = options.colors || 16;
    const detail = options.detail || 50;
    const smooth = options.smooth || 2;
    
    // Quantize colors
    const quantizedData = quantizeColors(data, colors);
    
    // Find edges
    const edges = findEdges(quantizedData, width, height, detail / 100);
    
    // Generate SVG paths
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">';
    svg += '<rect width="100%" height="100%" fill="white"/>';
    
    // Convert edges to paths
    const paths = edgesToPaths(edges, width, height, smooth);
    svg += paths;
    svg += '</svg>';
    
    return svg;
  }
  
  function quantizeColors(data, levels) {
    const result = new Uint8ClampedArray(data.length);
    const step = 256 / levels;
    
    for (let i = 0; i < data.length; i += 4) {
      result[i] = Math.round(data[i] / step) * step;
      result[i + 1] = Math.round(data[i + 1] / step) * step;
      result[i + 2] = Math.round(data[i + 2] / step) * step;
      result[i + 3] = 255;
    }
    
    return result;
  }
  
  function findEdges(data, width, height, threshold) {
    const edges = new Uint8Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const right = (y * width + (x + 1)) * 4;
        const bottom = ((y + 1) * width + x) * 4;
        
        const diff1 = Math.abs(data[idx] - data[right]) + 
                     Math.abs(data[idx + 1] - data[right + 1]) + 
                     Math.abs(data[idx + 2] - data[right + 2]);
                     
        const diff2 = Math.abs(data[idx] - data[bottom]) + 
                     Math.abs(data[idx + 1] - data[bottom + 1]) + 
                     Math.abs(data[idx + 2] - data[bottom + 2]);
        
        if (diff1 > threshold * 20 || diff2 > threshold * 20) {
          edges[y * width + x] = 1;
        }
      }
    }
    
    return edges;
  }
  
  function edgesToPaths(edges, width, height, smooth) {
    let paths = '';
    const visited = new Uint8Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edges[y * width + x] && !visited[y * width + x]) {
          // Trace path
          const points = tracePath(edges, visited, x, y, width, height);
          
          if (points.length > 2) {
            // Simplify path (Douglas-Peucker)
            const simplified = simplifyPath(points, smooth);
            
            if (simplified.length > 1) {
              let d = '<path d="M ' + simplified[0].x + ' ' + simplified[0].y;
              for (let i = 1; i < simplified.length; i++) {
                d += ' L ' + simplified[i].x + ' ' + simplified[i].y;
              }
              d += '" fill="none" stroke="black" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/>';
              paths += d;
            }
          }
        }
      }
    }
    
    return paths;
  }
  
  function tracePath(edges, visited, startX, startY, width, height) {
    const points = [{ x: startX, y: startY }];
    visited[startY * width + startX] = 1;
    
    const stack = [{ x: startX, y: startY }];
    const dirs = [[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]];
    
    while (stack.length > 0) {
      const current = stack.pop();
      let found = false;
      
      for (const [dx, dy] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (edges[ny * width + nx] && !visited[ny * width + nx]) {
            points.push({ x: nx, y: ny });
            visited[ny * width + nx] = 1;
            stack.push({ x: nx, y: ny });
            found = true;
            break;
          }
        }
      }
    }
    
    return points;
  }
  
  function simplifyPath(points, tolerance) {
    if (points.length <= 2) return points;
    
    // Simple downsampling based on tolerance
    const step = Math.max(1, Math.floor(tolerance));
    const result = [];
    
    for (let i = 0; i < points.length; i += step) {
      result.push(points[i]);
    }
    
    // Always include last point
    if (result[result.length - 1] !== points[points.length - 1]) {
      result.push(points[points.length - 1]);
    }
    
    return result;
  }
`;

// Create Worker
function createWorker() {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  return new Worker(workerUrl);
}

// Initialize worker
function initWorker() {
  if (worker) {
    worker.terminate();
  }
  worker = createWorker();
  
  worker.onmessage = function(e) {
    isLoading = false;
    
    if (e.data.success) {
      currentSVG = e.data.svg;
      displaySVG(currentSVG);
      downloadBtn.style.display = 'inline-block';
      showToast('✅ Konversi selesai!');
    } else {
      showToast('❌ Error: ' + e.data.error);
    }
    
    updateControlsState(false);
  };
  
  worker.onerror = function(e) {
    isLoading = false;
    showToast('❌ Worker error!');
    updateControlsState(false);
  };
}

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
  }
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleImageUpload(file);
});

// Paste dengan CTRL+V
document.addEventListener('paste', (e) => {
  const items = e.clipboardData.items;
  for (let item of items) {
    if (item.type.startsWith('image/')) {
      handleImageUpload(item.getAsFile());
      break;
    }
  }
});

// SLIDER DENGAN DEBOUNCE BIAR GAK NGELAG! 🔥
function debouncedConvert() {
  if (isLoading) return;
  
  // Clear timeout sebelumnya
  if (conversionTimeout) {
    clearTimeout(conversionTimeout);
  }
  
  // Update display values segera (responsive)
  updateSliderValues();
  
  // Tunda konversi 300ms (biar gak ngerender setiap gerakan slider)
  conversionTimeout = setTimeout(() => {
    if (originalImage) {
      convertToSVG();
    }
  }, 300);
}

colorsInput.addEventListener('input', debouncedConvert);
detailInput.addEventListener('input', debouncedConvert);
smoothInput.addEventListener('input', debouncedConvert);

function updateSliderValues() {
  colorsValue.textContent = colorsInput.value;
  detailValue.textContent = detailInput.value;
  smoothValue.textContent = smoothInput.value;
}

// ==================== IMAGE HANDLING ====================
function handleImageUpload(file) {
  // Validasi ukuran file (max 5MB untuk performa)
  if (file.size > 5 * 1024 * 1024) {
    showToast('❌ Gambar terlalu besar! Max 5MB');
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Resize gambar kalo kegedean (max 1000px)
      let { width, height } = img;
      const MAX_SIZE = 800;
      
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      // Create canvas dengan ukuran yang sudah diresize
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Simpan image data untuk konversi
      originalImage = {
        data: ctx.getImageData(0, 0, width, height),
        width: width,
        height: height
      };
      
      // Tampilkan preview gambar asli
      showOriginalPreview(img, width, height);
      
      // Tampilkan controls
      controls.style.display = 'block';
      
      // Konversi otomatis
      convertToSVG();
      
      showToast('✅ Gambar siap! ' + width + 'x' + height + 'px');
    };
    img.src = e.target.result;
  };
  
  reader.readAsDataURL(file);
}

function showOriginalPreview(img, width, height) {
  previewContainer.innerHTML = `
    <div style="text-align: center;">
      <img src="${img.src}" style="max-width: 100%; height: auto; border-radius: 10px;" alt="Preview">
      <p style="color: #666; margin-top: 10px;">📏 ${width}x${height}px</p>
      <p style="color: #999; font-size: 0.9em;">🔄 Mengkonversi...</p>
    </div>
  `;
}

// ==================== SVG CONVERSION ====================
function convertToSVG() {
  if (!originalImage || isLoading) return;
  
  isLoading = true;
  updateControlsState(true);
  showToast('🔄 Mengkonversi...');
  
  const options = {
    colors: parseInt(colorsInput.value),
    detail: parseInt(detailInput.value),
    smooth: parseInt(smoothInput.value)
  };
  
  // Kirim ke worker
  worker.postMessage({
    imageData: originalImage.data,
    options: options
  });
}

function displaySVG(svgString) {
  previewContainer.innerHTML = svgString;
  
  const svgElement = previewContainer.querySelector('svg');
  if (svgElement) {
    svgElement.style.maxWidth = '100%';
    svgElement.style.height = 'auto';
    svgElement.style.background = '#f9f9f9';
    svgElement.style.borderRadius = '10px';
  }
  
  // Update info
  const svgSize = new Blob([svgString]).size;
  const sizeKB = (svgSize / 1024).toFixed(2);
  const pathsCount = (svgString.match(/<path/g) || []).length;
  
  svgInfo.innerHTML = `
    <p>📐 Ukuran: ${sizeKB} KB</p>
    <p>🎨 Warna: ${colorsInput.value}</p>
    <p>📏 Dimensi: ${originalImage.width}x${originalImage.height}px</p>
    <p>✏️ Paths: ${pathsCount}</p>
  `;
}

// ==================== DOWNLOAD ====================
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
  
  showToast('💾 SVG berhasil didownload! 🎉');
}

// ==================== UI HELPERS ====================
function updateControlsState(disabled) {
  colorsInput.disabled = disabled;
  detailInput.disabled = disabled;
  smoothInput.disabled = disabled;
  
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => btn.disabled = disabled);
}

let toastTimeout;
function showToast(message) {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ==================== PWA SETUP ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('📦 Service Worker registered'))
      .catch(err => console.log('❌ SW registration failed:', err));
  });
}

// Install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  setTimeout(() => {
    if (deferredPrompt) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = '📱 Install Aplikasi';
      btn.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:999;';
      
      btn.onclick = () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(result => {
          if (result.outcome === 'accepted') console.log('✅ App installed');
          deferredPrompt = null;
          btn.remove();
        });
      };
      
      document.body.appendChild(btn);
    }
  }, 5000);
});

// ==================== INIT ====================
initWorker();
console.log('🚀 SVG Converter Siap! Ringan & Anti Lag!');