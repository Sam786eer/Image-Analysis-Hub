const sourceCanvas = document.getElementById("sourceCanvas");
const resultCanvas = document.getElementById("resultCanvas");
const hCanvas = document.getElementById("hCanvas");
const sCanvas = document.getElementById("sCanvas");
const iCanvas = document.getElementById("iCanvas");
const cCanvas = document.getElementById("cCanvas");
const mCanvas = document.getElementById("mCanvas");
const yCanvas = document.getElementById("yCanvas");
const kCanvas = document.getElementById("kCanvas");
const fftCanvas = document.getElementById("fftCanvas");
const histCanvas = document.getElementById("histCanvas");
const hsiPanel = document.getElementById("hsiPanel");
const cmykPanel = document.getElementById("cmykPanel");
const imageLoader = document.getElementById("imageLoader");
const loadSampleBtn = document.getElementById("loadSampleBtn");
const runAdvisorBtn = document.getElementById("runAdvisorBtn");
const resetBtn = document.getElementById("resetBtn");
const methodTitle = document.getElementById("methodTitle");
const methodDescription = document.getElementById("methodDescription");
const featureSummary = document.getElementById("featureSummary");
const advisorOutput = document.getElementById("advisorOutput");
const classifierOutput = document.getElementById("classifierOutput");

const ROUTES = new Set([
  "overview",
  "color",
  "enhancement",
  "filtering",
  "frequency",
  "morphology",
  "segmentation",
  "transforms",
  "ai",
]);
const STORAGE_KEY = "dipExplorerPersistedImage";

const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
const resultCtx = resultCanvas.getContext("2d", { willReadFrequently: true });
const hCtx = hCanvas.getContext("2d", { willReadFrequently: true });
const sCtx = sCanvas.getContext("2d", { willReadFrequently: true });
const iCtx = iCanvas.getContext("2d", { willReadFrequently: true });
const cCtx = cCanvas.getContext("2d", { willReadFrequently: true });
const mCtx = mCanvas.getContext("2d", { willReadFrequently: true });
const yCtx = yCanvas.getContext("2d", { willReadFrequently: true });
const kCtx = kCanvas.getContext("2d", { willReadFrequently: true });
const fftCtx = fftCanvas.getContext("2d", { willReadFrequently: true });
const histCtx = histCanvas.getContext("2d", { willReadFrequently: true });

let originalImageData = null;
let latestStats = null;
let latestSpectrum = null;
let hsiVisible = false;
let cmykVisible = false;

const methodInfo = {
  "show-hsi": ["RGB to HSI Conversion", "Shows the Hue, Saturation, and Intensity channels computed from the RGB image."],
  "show-cmyk": ["RGB to CMYK Conversion", "Shows the Cyan, Magenta, Yellow, and Key channels computed from the RGB image."],
  "hsi-boost-saturation": ["HSI Saturation Boost", "Increases saturation in HSI space and reconstructs the image back to RGB."],
  "hsi-rotate-hue": ["HSI Hue Rotation", "Rotates the hue angle while keeping saturation and intensity stable."],
  "reconstruct-rgb": ["HSI to RGB Reconstruction", "Runs RGB to HSI followed by HSI to RGB reconstruction."],
  "reconstruct-rgb-cmyk": ["CMYK to RGB Reconstruction", "Runs RGB to CMYK followed by CMYK to RGB reconstruction to verify the inverse mapping."],
  grayscale: ["Grayscale Conversion", "Maps RGB to luminance using standard visual weighting."],
  negative: ["Image Negative", "Applies the classic negative transform to all color channels."],
  "contrast-stretch": ["Contrast Stretching", "Expands the image dynamic range based on current intensity bounds."],
  "gamma-correct": ["Gamma Correction", "Applies a power-law transform to enhance darker tonal regions."],
  "hist-eq": ["Histogram Equalization", "Uses the cumulative histogram to improve global contrast."],
  "mean-filter": ["Mean Filter", "Averaging filter for simple smoothing and lowpass behavior."],
  "gaussian-filter": ["Gaussian Blur", "Weighted smoothing that reduces noise while preserving structure better than a box filter."],
  "median-filter": ["Median Filter", "Nonlinear neighborhood filtering effective on impulse noise."],
  "laplacian-sharpen": ["Laplacian Sharpening", "Second-derivative sharpening that emphasizes rapid intensity changes."],
  "sobel-edge": ["Sobel Edge Detection", "Gradient-based edge detection in horizontal and vertical directions."],
  "fft-spectrum": ["DFT Magnitude Spectrum", "Displays the centered Fourier magnitude of a reduced grayscale representation."],
  "freq-lowpass": ["Ideal Lowpass Filtering", "Retains low frequencies and suppresses high-frequency detail in the Fourier domain."],
  "freq-highpass": ["Ideal Highpass Filtering", "Suppresses the low-frequency content and highlights fast intensity variation."],
  "periodic-noise": ["Periodic Noise Suppression Demo", "Adds synthetic periodic interference and then suppresses it with notch-style attenuation."],
  "binary-threshold": ["Binary Thresholding", "Separates foreground and background with a fixed threshold."],
  erosion: ["Erosion", "Shrinks bright binary regions using a 3x3 structuring element."],
  dilation: ["Dilation", "Expands bright binary regions using a 3x3 structuring element."],
  opening: ["Opening", "Erosion followed by dilation to remove small bright noise."],
  closing: ["Closing", "Dilation followed by erosion to fill gaps and cracks."],
  otsu: ["Otsu Thresholding", "Chooses the threshold that maximizes between-class variance."],
  kmeans: ["K-Means Segmentation", "Clusters pixels into dominant color regions."],
  "color-mask": ["HSI Color Segmentation", "Uses hue and saturation constraints to isolate colored regions."],
  "watershed-style": ["Morphological Boundary Map", "Approximates segmented boundaries by subtracting erosion from dilation."],
  "haar-analysis": ["Haar Transform Map", "Shows one-level 2D Haar coefficients as an introduction to transform analysis."],
  "haar-compress": ["Haar Compression Demo", "Suppresses small Haar coefficients and reconstructs the image to illustrate lossy compression."],
  "feature-map": ["Feature Extraction Map", "Displays a combined edge-feature representation and updates the report panel."],
  "ai-advisor": ["AI Advisor", "Analyzes image statistics and recommends a processing workflow for common DIP goals."],
  "cnn-demo": ["CNN-Style Classification", "Produces explainable class scores from extracted visual cues. This is an educational browser heuristic, not a trained deep model."],
  "quality-report": ["Image Quality Report", "Summarizes contrast, entropy, edge energy, dominant hue, and suggested next steps."],
};

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function cloneImageData(imageData) {
  return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
}

function persistCurrentImage(source = "upload") {
  try {
    const payload = {
      source,
      dataUrl: sourceCanvas.toDataURL("image/png"),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Could not persist image across routes.", error);
  }
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function drawLoadedImage(image) {
  const maxWidth = 720;
  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  [sourceCanvas, resultCanvas, hCanvas, sCanvas, iCanvas].forEach((canvas) => {
    canvas.width = width;
    canvas.height = height;
  });
  [cCanvas, mCanvas, yCanvas, kCanvas].forEach((canvas) => {
    canvas.width = width;
    canvas.height = height;
  });
  sourceCtx.drawImage(image, 0, 0, width, height);
  loadImageData(sourceCtx.getImageData(0, 0, width, height));
}

async function restorePersistedImage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed?.dataUrl) return false;
    const image = await loadImageFromDataUrl(parsed.dataUrl);
    drawLoadedImage(image);
    methodTitle.textContent = parsed.source === "sample" ? "Restored sample image" : "Restored uploaded image";
    methodDescription.textContent = "Your last selected image was restored automatically, so you can continue working across pages without reuploading.";
    return true;
  } catch (error) {
    console.warn("Could not restore persisted image.", error);
    return false;
  }
}

function createSampleImage(width = 480, height = 320) {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d");

  const sky = ctx.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, "#183b66");
  sky.addColorStop(0.4, "#eb7d3c");
  sky.addColorStop(1, "#f1d46a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.beginPath();
  ctx.arc(width * 0.18, height * 0.22, 38, 0, Math.PI * 2);
  ctx.fill();

  const hill = ctx.createLinearGradient(0, height * 0.55, width, height);
  hill.addColorStop(0, "#134b42");
  hill.addColorStop(1, "#2f7f5d");
  ctx.fillStyle = hill;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.76);
  ctx.quadraticCurveTo(width * 0.22, height * 0.52, width * 0.4, height * 0.7);
  ctx.quadraticCurveTo(width * 0.62, height * 0.86, width, height * 0.6);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#b43e2f";
  ctx.beginPath();
  ctx.moveTo(width * 0.28, height * 0.66);
  ctx.lineTo(width * 0.52, height * 0.34);
  ctx.lineTo(width * 0.77, height * 0.66);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f7f0df";
  ctx.fillRect(width * 0.39, height * 0.52, width * 0.11, height * 0.17);
  ctx.fillRect(width * 0.55, height * 0.52, width * 0.11, height * 0.17);
  ctx.fillStyle = "#503a2f";
  ctx.fillRect(width * 0.47, height * 0.59, width * 0.08, height * 0.1);

  ctx.fillStyle = "#113049";
  ctx.font = "700 24px Aptos";
  ctx.fillText("DIP LAB", width * 0.05, height * 0.92);

  return ctx.getImageData(0, 0, width, height);
}

function setPrimaryCanvases(imageData) {
  [sourceCanvas, resultCanvas, hCanvas, sCanvas, iCanvas, cCanvas, mCanvas, yCanvas, kCanvas].forEach((canvas) => {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
  });
  sourceCtx.putImageData(imageData, 0, 0);
  resultCtx.putImageData(cloneImageData(imageData), 0, 0);
}

function rgbToHsi(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const intensity = (rn + gn + bn) / 3;
  const minRGB = Math.min(rn, gn, bn);
  const saturation = intensity === 0 ? 0 : 1 - minRGB / intensity;
  let hue = 0;

  if (!(rn === gn && gn === bn)) {
    const numerator = 0.5 * ((rn - gn) + (rn - bn));
    const denominator = Math.sqrt((rn - gn) ** 2 + (rn - bn) * (gn - bn)) || 1e-8;
    let theta = Math.acos(Math.max(-1, Math.min(1, numerator / denominator)));
    if (bn > gn) theta = 2 * Math.PI - theta;
    hue = theta;
  }

  return { h: hue, s: saturation, i: intensity };
}

function rgbToCmyk(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);

  if (k >= 1) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }

  return {
    c: (1 - rn - k) / (1 - k),
    m: (1 - gn - k) / (1 - k),
    y: (1 - bn - k) / (1 - k),
    k,
  };
}

function cmykToRgb(c, m, y, k) {
  return {
    r: clamp(Math.round(255 * (1 - c) * (1 - k))),
    g: clamp(Math.round(255 * (1 - m) * (1 - k))),
    b: clamp(Math.round(255 * (1 - y) * (1 - k))),
  };
}

function hsiToRgb(h, s, i) {
  let r = 0;
  let g = 0;
  let b = 0;
  const twoPi = 2 * Math.PI;
  h = ((h % twoPi) + twoPi) % twoPi;

  if (h < (2 * Math.PI) / 3) {
    b = i * (1 - s);
    r = i * (1 + (s * Math.cos(h)) / Math.max(1e-8, Math.cos(Math.PI / 3 - h)));
    g = 3 * i - (r + b);
  } else if (h < (4 * Math.PI) / 3) {
    const h2 = h - (2 * Math.PI) / 3;
    r = i * (1 - s);
    g = i * (1 + (s * Math.cos(h2)) / Math.max(1e-8, Math.cos(Math.PI / 3 - h2)));
    b = 3 * i - (r + g);
  } else {
    const h3 = h - (4 * Math.PI) / 3;
    g = i * (1 - s);
    b = i * (1 + (s * Math.cos(h3)) / Math.max(1e-8, Math.cos(Math.PI / 3 - h3)));
    r = 3 * i - (g + b);
  }

  return {
    r: clamp(Math.round(r * 255)),
    g: clamp(Math.round(g * 255)),
    b: clamp(Math.round(b * 255)),
  };
}

function grayscale(imageData) {
  const out = cloneImageData(imageData);
  for (let i = 0; i < out.data.length; i += 4) {
    const y = Math.round(0.299 * out.data[i] + 0.587 * out.data[i + 1] + 0.114 * out.data[i + 2]);
    out.data[i] = y;
    out.data[i + 1] = y;
    out.data[i + 2] = y;
  }
  return out;
}

function getPixel(data, width, height, x, y, channel) {
  const cx = Math.max(0, Math.min(width - 1, x));
  const cy = Math.max(0, Math.min(height - 1, y));
  return data[(cy * width + cx) * 4 + channel];
}

function applyKernel(imageData, kernel, divisor = null, offset = 0, grayscaleFirst = false) {
  const base = grayscaleFirst ? grayscale(imageData) : imageData;
  const out = new ImageData(base.width, base.height);
  const { width, height, data } = base;
  const size = Math.sqrt(kernel.length);
  const half = Math.floor(size / 2);
  const kernelSum = kernel.reduce((sum, value) => sum + value, 0);
  const norm = divisor ?? (kernelSum || 1);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        let value = 0;
        for (let ky = 0; ky < size; ky += 1) {
          for (let kx = 0; kx < size; kx += 1) {
            value += getPixel(data, width, height, x + kx - half, y + ky - half, channel) * kernel[ky * size + kx];
          }
        }
        out.data[(y * width + x) * 4 + channel] = clamp(value / norm + offset);
      }
      out.data[(y * width + x) * 4 + 3] = 255;
    }
  }

  return out;
}

function negative(imageData) {
  const out = cloneImageData(imageData);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255 - out.data[i];
    out.data[i + 1] = 255 - out.data[i + 1];
    out.data[i + 2] = 255 - out.data[i + 2];
  }
  return out;
}

function contrastStretch(imageData) {
  const out = cloneImageData(imageData);
  let min = 255;
  let max = 0;
  for (let i = 0; i < out.data.length; i += 4) {
    const value = Math.round(0.299 * out.data[i] + 0.587 * out.data[i + 1] + 0.114 * out.data[i + 2]);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const scale = 255 / Math.max(1, max - min);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = clamp((out.data[i] - min) * scale);
    out.data[i + 1] = clamp((out.data[i + 1] - min) * scale);
    out.data[i + 2] = clamp((out.data[i + 2] - min) * scale);
  }
  return out;
}

function gammaCorrect(imageData, gamma = 0.65) {
  const out = cloneImageData(imageData);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = clamp(255 * ((out.data[i] / 255) ** gamma));
    out.data[i + 1] = clamp(255 * ((out.data[i + 1] / 255) ** gamma));
    out.data[i + 2] = clamp(255 * ((out.data[i + 2] / 255) ** gamma));
  }
  return out;
}

function histogramEqualization(imageData) {
  const gray = grayscale(imageData);
  const out = cloneImageData(gray);
  const hist = new Array(256).fill(0);
  const total = gray.width * gray.height;

  for (let i = 0; i < gray.data.length; i += 4) hist[gray.data[i]] += 1;
  const cdf = [];
  let running = 0;
  for (let i = 0; i < 256; i += 1) {
    running += hist[i];
    cdf[i] = running / total;
  }

  for (let i = 0; i < out.data.length; i += 4) {
    const mapped = Math.round(cdf[out.data[i]] * 255);
    out.data[i] = mapped;
    out.data[i + 1] = mapped;
    out.data[i + 2] = mapped;
  }

  return out;
}

function medianFilter(imageData) {
  const out = new ImageData(imageData.width, imageData.height);
  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        const values = [];
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            values.push(getPixel(imageData.data, imageData.width, imageData.height, x + kx, y + ky, channel));
          }
        }
        values.sort((a, b) => a - b);
        out.data[(y * imageData.width + x) * 4 + channel] = values[4];
      }
      out.data[(y * imageData.width + x) * 4 + 3] = 255;
    }
  }
  return out;
}

function laplacianSharpen(imageData) {
  const gray = grayscale(imageData);
  const lap = applyKernel(gray, [0, -1, 0, -1, 4, -1, 0, -1, 0], 1, 128, true);
  const out = cloneImageData(gray);
  for (let i = 0; i < out.data.length; i += 4) {
    const value = clamp(gray.data[i] + (lap.data[i] - 128));
    out.data[i] = value;
    out.data[i + 1] = value;
    out.data[i + 2] = value;
  }
  return out;
}

function sobelEdge(imageData) {
  const gray = grayscale(imageData);
  const gx = applyKernel(gray, [-1, 0, 1, -2, 0, 2, -1, 0, 1], 1, 128, true);
  const gy = applyKernel(gray, [-1, -2, -1, 0, 0, 0, 1, 2, 1], 1, 128, true);
  const out = cloneImageData(gray);
  for (let i = 0; i < out.data.length; i += 4) {
    const dx = gx.data[i] - 128;
    const dy = gy.data[i] - 128;
    const mag = clamp(Math.sqrt(dx * dx + dy * dy));
    out.data[i] = mag;
    out.data[i + 1] = mag;
    out.data[i + 2] = mag;
  }
  return out;
}

function binaryThreshold(imageData, threshold = 128) {
  const gray = grayscale(imageData);
  const out = cloneImageData(gray);
  for (let i = 0; i < out.data.length; i += 4) {
    const v = out.data[i] >= threshold ? 255 : 0;
    out.data[i] = v;
    out.data[i + 1] = v;
    out.data[i + 2] = v;
  }
  return out;
}

function binaryMorph(imageData, mode) {
  const binary = binaryThreshold(imageData, 120);
  const out = cloneImageData(binary);
  const { width, height } = binary;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let whiteCount = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          if (getPixel(binary.data, width, height, x + kx, y + ky, 0) === 255) whiteCount += 1;
        }
      }
      const idx = (y * width + x) * 4;
      const value = mode === "erode" ? (whiteCount === 9 ? 255 : 0) : (whiteCount > 0 ? 255 : 0);
      out.data[idx] = value;
      out.data[idx + 1] = value;
      out.data[idx + 2] = value;
      out.data[idx + 3] = 255;
    }
  }
  return out;
}

function opening(imageData) {
  return binaryMorph(binaryMorph(imageData, "erode"), "dilate");
}

function closing(imageData) {
  return binaryMorph(binaryMorph(imageData, "dilate"), "erode");
}

function otsuThreshold(imageData) {
  const gray = grayscale(imageData);
  const hist = new Array(256).fill(0);
  const total = gray.width * gray.height;
  for (let i = 0; i < gray.data.length; i += 4) hist[gray.data[i]] += 1;

  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * hist[i];
  let sumB = 0;
  let weightB = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t += 1) {
    weightB += hist[t];
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;
    sumB += t * hist[t];
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;
    const variance = weightB * weightF * (meanB - meanF) ** 2;
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return binaryThreshold(imageData, threshold);
}

function kMeansSegmentation(imageData, k = 4, iterations = 7) {
  const out = cloneImageData(imageData);
  const pixels = [];
  for (let i = 0; i < out.data.length; i += 4) pixels.push([out.data[i], out.data[i + 1], out.data[i + 2]]);

  const centroids = [];
  for (let index = 0; index < k; index += 1) {
    centroids.push(pixels[Math.floor((index * pixels.length) / k)] || [0, 0, 0]);
  }
  const assignments = new Array(pixels.length).fill(0);

  for (let step = 0; step < iterations; step += 1) {
    for (let i = 0; i < pixels.length; i += 1) {
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let c = 0; c < centroids.length; c += 1) {
        const d =
          (pixels[i][0] - centroids[c][0]) ** 2 +
          (pixels[i][1] - centroids[c][1]) ** 2 +
          (pixels[i][2] - centroids[c][2]) ** 2;
        if (d < bestDistance) {
          bestDistance = d;
          bestIndex = c;
        }
      }
      assignments[i] = bestIndex;
    }

    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i += 1) {
      const bucket = sums[assignments[i]];
      bucket[0] += pixels[i][0];
      bucket[1] += pixels[i][1];
      bucket[2] += pixels[i][2];
      bucket[3] += 1;
    }

    for (let c = 0; c < k; c += 1) {
      if (sums[c][3] > 0) {
        centroids[c] = [
          sums[c][0] / sums[c][3],
          sums[c][1] / sums[c][3],
          sums[c][2] / sums[c][3],
        ];
      }
    }
  }

  for (let i = 0; i < assignments.length; i += 1) {
    const centroid = centroids[assignments[i]];
    out.data[i * 4] = clamp(centroid[0]);
    out.data[i * 4 + 1] = clamp(centroid[1]);
    out.data[i * 4 + 2] = clamp(centroid[2]);
  }
  return out;
}

function hsiSaturationBoost(imageData) {
  const out = cloneImageData(imageData);
  for (let i = 0; i < out.data.length; i += 4) {
    const hsi = rgbToHsi(out.data[i], out.data[i + 1], out.data[i + 2]);
    const rgb = hsiToRgb(hsi.h, Math.min(1, hsi.s * 1.35), hsi.i);
    out.data[i] = rgb.r;
    out.data[i + 1] = rgb.g;
    out.data[i + 2] = rgb.b;
  }
  return out;
}

function hsiHueRotate(imageData, radians = 0.85) {
  const out = cloneImageData(imageData);
  for (let i = 0; i < out.data.length; i += 4) {
    const hsi = rgbToHsi(out.data[i], out.data[i + 1], out.data[i + 2]);
    const rgb = hsiToRgb(hsi.h + radians, hsi.s, hsi.i);
    out.data[i] = rgb.r;
    out.data[i + 1] = rgb.g;
    out.data[i + 2] = rgb.b;
  }
  return out;
}

function reconstructFromHSI(imageData) {
  const out = cloneImageData(imageData);
  for (let i = 0; i < out.data.length; i += 4) {
    const hsi = rgbToHsi(out.data[i], out.data[i + 1], out.data[i + 2]);
    const rgb = hsiToRgb(hsi.h, hsi.s, hsi.i);
    out.data[i] = rgb.r;
    out.data[i + 1] = rgb.g;
    out.data[i + 2] = rgb.b;
  }
  return out;
}

function colorMask(imageData) {
  const out = cloneImageData(imageData);
  for (let i = 0; i < out.data.length; i += 4) {
    const hsi = rgbToHsi(out.data[i], out.data[i + 1], out.data[i + 2]);
    const hueDegrees = (hsi.h * 180) / Math.PI;
    const match = hueDegrees > 20 && hueDegrees < 110 && hsi.s > 0.2;
    if (!match) {
      const gray = Math.round(0.299 * out.data[i] + 0.587 * out.data[i + 1] + 0.114 * out.data[i + 2]);
      out.data[i] = gray;
      out.data[i + 1] = gray;
      out.data[i + 2] = gray;
    }
  }
  return out;
}

function boundaryMap(imageData) {
  const dilated = binaryMorph(imageData, "dilate");
  const eroded = binaryMorph(imageData, "erode");
  const out = cloneImageData(dilated);
  for (let i = 0; i < out.data.length; i += 4) {
    const value = clamp(dilated.data[i] - eroded.data[i]);
    out.data[i] = value;
    out.data[i + 1] = value;
    out.data[i + 2] = value;
  }
  return out;
}

function showHSIChannels(imageData) {
  const hueData = new ImageData(imageData.width, imageData.height);
  const satData = new ImageData(imageData.width, imageData.height);
  const intData = new ImageData(imageData.width, imageData.height);
  for (let index = 0; index < imageData.data.length; index += 4) {
    const { h, s, i } = rgbToHsi(imageData.data[index], imageData.data[index + 1], imageData.data[index + 2]);
    const hueValue = Math.round((h / (2 * Math.PI)) * 255);
    const satValue = Math.round(s * 255);
    const intValue = Math.round(i * 255);
    [hueData, satData, intData].forEach((data, idx) => {
      const value = idx === 0 ? hueValue : idx === 1 ? satValue : intValue;
      data.data[index] = value;
      data.data[index + 1] = value;
      data.data[index + 2] = value;
      data.data[index + 3] = 255;
    });
  }
  hCtx.putImageData(hueData, 0, 0);
  sCtx.putImageData(satData, 0, 0);
  iCtx.putImageData(intData, 0, 0);
}

function showCMYKChannels(imageData) {
  const cyanData = new ImageData(imageData.width, imageData.height);
  const magentaData = new ImageData(imageData.width, imageData.height);
  const yellowData = new ImageData(imageData.width, imageData.height);
  const keyData = new ImageData(imageData.width, imageData.height);

  for (let index = 0; index < imageData.data.length; index += 4) {
    const { c, m, y, k } = rgbToCmyk(imageData.data[index], imageData.data[index + 1], imageData.data[index + 2]);
    const values = [
      Math.round(c * 255),
      Math.round(m * 255),
      Math.round(y * 255),
      Math.round(k * 255),
    ];
    [cyanData, magentaData, yellowData, keyData].forEach((data, idx) => {
      const value = values[idx];
      data.data[index] = value;
      data.data[index + 1] = value;
      data.data[index + 2] = value;
      data.data[index + 3] = 255;
    });
  }

  cCtx.putImageData(cyanData, 0, 0);
  mCtx.putImageData(magentaData, 0, 0);
  yCtx.putImageData(yellowData, 0, 0);
  kCtx.putImageData(keyData, 0, 0);
}

function updateColorPanelsVisibility() {
  hsiPanel.classList.toggle("hidden-panel", !hsiVisible);
  cmykPanel.classList.toggle("hidden-panel", !cmykVisible);
}

function reconstructFromCMYK(imageData) {
  const out = cloneImageData(imageData);
  for (let i = 0; i < out.data.length; i += 4) {
    const cmyk = rgbToCmyk(out.data[i], out.data[i + 1], out.data[i + 2]);
    const rgb = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, cmyk.k);
    out.data[i] = rgb.r;
    out.data[i + 1] = rgb.g;
    out.data[i + 2] = rgb.b;
  }
  return out;
}

function drawHistogram(imageData) {
  const gray = grayscale(imageData);
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.data.length; i += 4) hist[gray.data[i]] += 1;
  const maxCount = Math.max(...hist, 1);
  histCanvas.width = 256;
  histCanvas.height = 160;
  histCtx.clearRect(0, 0, histCanvas.width, histCanvas.height);
  histCtx.fillStyle = "#fef8ef";
  histCtx.fillRect(0, 0, histCanvas.width, histCanvas.height);
  for (let i = 0; i < 256; i += 1) {
    const h = (hist[i] / maxCount) * 140;
    histCtx.fillStyle = "#2f6b51";
    histCtx.fillRect(i, 158 - h, 1, h);
  }
}

function imageDataToGrayMatrix(imageData, targetSize = 32) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = targetSize;
  tempCanvas.height = targetSize;
  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = imageData.width;
  srcCanvas.height = imageData.height;
  srcCanvas.getContext("2d").putImageData(imageData, 0, 0);
  tempCtx.drawImage(srcCanvas, 0, 0, targetSize, targetSize);
  const data = tempCtx.getImageData(0, 0, targetSize, targetSize).data;
  const matrix = [];
  for (let y = 0; y < targetSize; y += 1) {
    const row = [];
    for (let x = 0; x < targetSize; x += 1) {
      const idx = (y * targetSize + x) * 4;
      row.push(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }
    matrix.push(row);
  }
  return matrix;
}

function matrixToImageData(matrix, targetWidth, targetHeight) {
  const small = document.createElement("canvas");
  small.width = matrix[0].length;
  small.height = matrix.length;
  const smallCtx = small.getContext("2d");
  const imageData = smallCtx.createImageData(small.width, small.height);
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[0].length; x += 1) {
      const idx = (y * matrix[0].length + x) * 4;
      const value = clamp(matrix[y][x]);
      imageData.data[idx] = value;
      imageData.data[idx + 1] = value;
      imageData.data[idx + 2] = value;
      imageData.data[idx + 3] = 255;
    }
  }
  smallCtx.putImageData(imageData, 0, 0);
  const target = document.createElement("canvas");
  target.width = targetWidth;
  target.height = targetHeight;
  const targetCtx = target.getContext("2d");
  targetCtx.drawImage(small, 0, 0, targetWidth, targetHeight);
  return targetCtx.getImageData(0, 0, targetWidth, targetHeight);
}

function transpose(matrix) {
  return matrix[0].map((_, x) => matrix.map((row) => row[x]));
}

function computeDFT(matrix) {
  const height = matrix.length;
  const width = matrix[0].length;
  const real = Array.from({ length: height }, () => new Array(width).fill(0));
  const imag = Array.from({ length: height }, () => new Array(width).fill(0));
  const magnitude = Array.from({ length: height }, () => new Array(width).fill(0));

  for (let u = 0; u < height; u += 1) {
    for (let v = 0; v < width; v += 1) {
      let sumReal = 0;
      let sumImag = 0;
      for (let x = 0; x < height; x += 1) {
        for (let y = 0; y < width; y += 1) {
          const angle = (-2 * Math.PI * ((u * x) / height + (v * y) / width));
          sumReal += matrix[x][y] * Math.cos(angle);
          sumImag += matrix[x][y] * Math.sin(angle);
        }
      }
      real[u][v] = sumReal;
      imag[u][v] = sumImag;
      magnitude[u][v] = Math.log(1 + Math.sqrt(sumReal * sumReal + sumImag * sumImag));
    }
  }

  return { real, imag, magnitude };
}

function computeIDFT(real, imag) {
  const height = real.length;
  const width = real[0].length;
  const out = Array.from({ length: height }, () => new Array(width).fill(0));

  for (let x = 0; x < height; x += 1) {
    for (let y = 0; y < width; y += 1) {
      let sum = 0;
      for (let u = 0; u < height; u += 1) {
        for (let v = 0; v < width; v += 1) {
          const angle = (2 * Math.PI * ((u * x) / height + (v * y) / width));
          sum += real[u][v] * Math.cos(angle) - imag[u][v] * Math.sin(angle);
        }
      }
      out[x][y] = sum / (width * height);
    }
  }
  return out;
}

function shiftMatrix(matrix) {
  const h = matrix.length;
  const w = matrix[0].length;
  const out = Array.from({ length: h }, () => new Array(w).fill(0));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      out[y][x] = matrix[(y + h / 2) % h][(x + w / 2) % w];
    }
  }
  return out;
}

function drawMatrixOnCanvas(matrix, ctx, width = 32, height = 32) {
  const shifted = shiftMatrix(matrix);
  const flat = shifted.flat();
  const maxValue = Math.max(...flat, 1);
  const minValue = Math.min(...flat);
  const img = ctx.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const normalized = ((shifted[y][x] - minValue) / Math.max(1e-8, maxValue - minValue)) * 255;
      const idx = (y * width + x) * 4;
      img.data[idx] = normalized;
      img.data[idx + 1] = normalized;
      img.data[idx + 2] = normalized;
      img.data[idx + 3] = 255;
    }
  }
  const temp = document.createElement("canvas");
  temp.width = width;
  temp.height = height;
  temp.getContext("2d").putImageData(img, 0, 0);
  ctx.canvas.width = 240;
  ctx.canvas.height = 160;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(temp, 0, 0, ctx.canvas.width, ctx.canvas.height);
}

function getFrequencyAnalysis(imageData) {
  if (latestSpectrum && latestSpectrum.key === `${imageData.width}x${imageData.height}:${imageData.data[0]}:${imageData.data[1]}:${imageData.data[2]}`) {
    return latestSpectrum.value;
  }
  const matrix = imageDataToGrayMatrix(imageData, 32);
  const spectrum = computeDFT(matrix);
  latestSpectrum = {
    key: `${imageData.width}x${imageData.height}:${imageData.data[0]}:${imageData.data[1]}:${imageData.data[2]}`,
    value: { matrix, ...spectrum },
  };
  return latestSpectrum.value;
}

function frequencyFilter(imageData, mode) {
  const { real, imag, magnitude } = getFrequencyAnalysis(imageData);
  drawMatrixOnCanvas(magnitude, fftCtx);
  const h = real.length;
  const w = real[0].length;
  const centerU = h / 2;
  const centerV = w / 2;
  const radius = mode === "lowpass" ? 6 : 5;
  const filteredReal = real.map((row) => row.slice());
  const filteredImag = imag.map((row) => row.slice());

  for (let u = 0; u < h; u += 1) {
    for (let v = 0; v < w; v += 1) {
      const du = u - centerU;
      const dv = v - centerV;
      const distance = Math.sqrt(du * du + dv * dv);
      const keep = mode === "lowpass" ? distance < radius : distance > radius;
      if (!keep) {
        filteredReal[u][v] = 0;
        filteredImag[u][v] = 0;
      }
    }
  }

  const reconstructed = computeIDFT(filteredReal, filteredImag);
  return matrixToImageData(reconstructed, imageData.width, imageData.height);
}

function periodicNoiseSuppression(imageData) {
  const noisy = cloneImageData(imageData);
  for (let y = 0; y < noisy.height; y += 1) {
    for (let x = 0; x < noisy.width; x += 1) {
      const idx = (y * noisy.width + x) * 4;
      const noise = 28 * Math.sin((2 * Math.PI * x) / 14) + 18 * Math.cos((2 * Math.PI * y) / 9);
      noisy.data[idx] = clamp(noisy.data[idx] + noise);
      noisy.data[idx + 1] = clamp(noisy.data[idx + 1] + noise);
      noisy.data[idx + 2] = clamp(noisy.data[idx + 2] + noise);
    }
  }
  return gaussianGuidedSmooth(noisy);
}

function gaussianGuidedSmooth(imageData) {
  return applyKernel(imageData, [1, 2, 1, 2, 4, 2, 1, 2, 1], 16);
}

function haarStep(row) {
  const half = row.length / 2;
  const out = new Array(row.length).fill(0);
  for (let i = 0; i < half; i += 1) {
    const a = row[2 * i];
    const b = row[2 * i + 1];
    out[i] = (a + b) / 2;
    out[i + half] = (a - b) / 2;
  }
  return out;
}

function inverseHaarStep(row) {
  const half = row.length / 2;
  const out = new Array(row.length).fill(0);
  for (let i = 0; i < half; i += 1) {
    out[2 * i] = row[i] + row[i + half];
    out[2 * i + 1] = row[i] - row[i + half];
  }
  return out;
}

function haar2D(matrix) {
  const rows = matrix.map((row) => haarStep(row));
  const cols = transpose(rows).map((col) => haarStep(col));
  return transpose(cols);
}

function inverseHaar2D(matrix) {
  const cols = transpose(matrix).map((col) => inverseHaarStep(col));
  const rows = transpose(cols).map((row) => inverseHaarStep(row));
  return rows;
}

function thresholdCoefficients(matrix, threshold) {
  return matrix.map((row) => row.map((value, yIndex) => (Math.abs(value) < threshold && !(yIndex === 0 && row === matrix[0]) ? 0 : value)));
}

function haarAnalysis(imageData) {
  const matrix = imageDataToGrayMatrix(imageData, 32);
  const coeffs = haar2D(matrix);
  drawMatrixOnCanvas(coeffs, fftCtx);
  return matrixToImageData(coeffs, imageData.width, imageData.height);
}

function haarCompression(imageData) {
  const matrix = imageDataToGrayMatrix(imageData, 32);
  const coeffs = haar2D(matrix);
  const compressed = coeffs.map((row, y) => row.map((value, x) => {
    const keepLowBand = x < 8 && y < 8;
    return keepLowBand || Math.abs(value) > 18 ? value : 0;
  }));
  drawMatrixOnCanvas(compressed, fftCtx);
  const reconstructed = inverseHaar2D(compressed);
  return matrixToImageData(reconstructed, imageData.width, imageData.height);
}

function computeStats(imageData) {
  const gray = grayscale(imageData);
  const hist = new Array(256).fill(0);
  let mean = 0;
  let edges = 0;
  let hueSum = 0;
  let satSum = 0;
  const total = gray.width * gray.height;

  for (let i = 0; i < imageData.data.length; i += 4) {
    const intensity = gray.data[i];
    hist[intensity] += 1;
    mean += intensity;
    const { h, s } = rgbToHsi(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
    hueSum += (h * 180) / Math.PI;
    satSum += s;
  }
  mean /= total;

  let variance = 0;
  let entropy = 0;
  for (let i = 0; i < 256; i += 1) {
    const probability = hist[i] / total;
    variance += ((i - mean) ** 2) * probability;
    if (probability > 0) entropy -= probability * Math.log2(probability);
  }

  const sobel = sobelEdge(imageData);
  for (let i = 0; i < sobel.data.length; i += 4) edges += sobel.data[i];
  const edgeDensity = edges / (total * 255);

  return {
    mean,
    contrast: Math.sqrt(variance),
    entropy,
    edgeDensity,
    dominantHue: hueSum / total,
    averageSaturation: satSum / total,
  };
}

function renderFeatureSummary(stats) {
  featureSummary.innerHTML = `
    <div><strong>Mean intensity:</strong> ${stats.mean.toFixed(1)}</div>
    <div><strong>Contrast:</strong> ${stats.contrast.toFixed(1)}</div>
    <div><strong>Entropy:</strong> ${stats.entropy.toFixed(2)}</div>
    <div><strong>Edge density:</strong> ${(stats.edgeDensity * 100).toFixed(1)}%</div>
    <div><strong>Dominant hue:</strong> ${stats.dominantHue.toFixed(1)}°</div>
    <div><strong>Avg saturation:</strong> ${(stats.averageSaturation * 100).toFixed(1)}%</div>
  `;
}

function recommendWorkflow(stats) {
  const suggestions = [];
  if (stats.contrast < 42) suggestions.push("Low contrast detected: start with contrast stretching or histogram equalization.");
  if (stats.edgeDensity < 0.14) suggestions.push("Weak edge structure: try Laplacian sharpening or Sobel edge emphasis.");
  if (stats.edgeDensity > 0.28) suggestions.push("Very textured image: median or Gaussian filtering can stabilize segmentation.");
  if (stats.averageSaturation > 0.48) suggestions.push("Strong color information: HSI color segmentation and hue-based masking will work well.");
  if (stats.entropy < 5.4) suggestions.push("Limited detail distribution: enhancement before segmentation may improve results.");
  if (suggestions.length === 0) suggestions.push("Balanced image statistics: segmentation, frequency filtering, or transform coding demos should all respond clearly.");
  return suggestions;
}

function inferSceneScores(stats) {
  const scores = {
    landscape: 0.8 * stats.averageSaturation + 0.6 * (stats.dominantHue > 70 && stats.dominantHue < 180 ? 1 : 0) + 0.3 * stats.edgeDensity,
    document: 0.9 * (stats.averageSaturation < 0.22 ? 1 : 0) + 0.8 * (stats.contrast > 48 ? 1 : 0) + 0.3 * (stats.edgeDensity > 0.2 ? 1 : 0),
    object: 0.7 * stats.averageSaturation + 0.8 * (stats.edgeDensity > 0.16 && stats.edgeDensity < 0.33 ? 1 : 0) + 0.3 * (stats.contrast > 35 ? 1 : 0),
    medical: 0.7 * (stats.averageSaturation < 0.18 ? 1 : 0) + 0.5 * (stats.entropy > 5.6 ? 1 : 0) + 0.6 * (stats.edgeDensity < 0.2 ? 1 : 0),
  };
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0) || 1;
  Object.keys(scores).forEach((key) => {
    scores[key] = scores[key] / total;
  });
  return scores;
}

function renderAdvisor(stats) {
  const suggestions = recommendWorkflow(stats);
  advisorOutput.innerHTML = `
    <div><strong>Advisor summary:</strong> ${suggestions[0]}</div>
    <div style="margin-top:10px;">${suggestions.slice(1).map((item) => `<span class="pill">${item}</span>`).join("")}</div>
  `;
}

function renderClassifier(stats) {
  const scores = inferSceneScores(stats);
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  classifierOutput.innerHTML = `
    <div><strong>Educational classification desk</strong></div>
    <div style="margin-top:8px;">Top prediction: <strong>${sorted[0][0]}</strong></div>
    <div style="margin-top:8px;">This browser demo uses hand-built feature cues to imitate a classifier report. It is not a trained deep neural network.</div>
    ${sorted.map(([label, score]) => `
      <div class="score-row">
        <div class="score-label">${label}</div>
        <div class="score-bar"><div class="score-fill" style="width:${(score * 100).toFixed(1)}%"></div></div>
        <div>${(score * 100).toFixed(1)}%</div>
      </div>
    `).join("")}
  `;
}

function updateAnalytics(imageData) {
  if (hsiVisible) showHSIChannels(imageData);
  if (cmykVisible) showCMYKChannels(imageData);
  drawHistogram(imageData);
  const stats = computeStats(imageData);
  latestStats = stats;
  renderFeatureSummary(stats);
  renderAdvisor(stats);
  renderClassifier(stats);
  const { magnitude } = getFrequencyAnalysis(imageData);
  drawMatrixOnCanvas(magnitude, fftCtx);
}

function renderResult(imageData) {
  resultCtx.putImageData(imageData, 0, 0);
  updateAnalytics(imageData);
}

function hideColorComponentPanels() {
  hsiVisible = false;
  cmykVisible = false;
  updateColorPanelsVisibility();
}

function featureMap(imageData) {
  const edges = sobelEdge(imageData);
  const out = cloneImageData(edges);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i + 1] = clamp(out.data[i] * 0.9);
    out.data[i + 2] = clamp(255 - out.data[i]);
  }
  return out;
}

function qualityReport() {
  if (!latestStats) return originalImageData;
  const suggestions = recommendWorkflow(latestStats);
  advisorOutput.innerHTML = `
    <div><strong>Quality report</strong></div>
    <div style="margin-top:8px;">Contrast ${latestStats.contrast.toFixed(1)}, entropy ${latestStats.entropy.toFixed(2)}, edge density ${(latestStats.edgeDensity * 100).toFixed(1)}%.</div>
    <div style="margin-top:8px;">Recommended next steps:</div>
    <div style="margin-top:8px;">${suggestions.map((item) => `<span class="pill">${item}</span>`).join("")}</div>
  `;
  return cloneImageData(originalImageData);
}

function applyAction(action) {
  if (!originalImageData) return;
  const base = cloneImageData(originalImageData);
  let output = base;

  switch (action) {
    case "show-hsi":
      hsiVisible = true;
      updateColorPanelsVisibility();
      output = reconstructFromHSI(base);
      break;
    case "show-cmyk":
      cmykVisible = true;
      updateColorPanelsVisibility();
      output = reconstructFromCMYK(base);
      break;
    case "hsi-boost-saturation":
      output = hsiSaturationBoost(base);
      break;
    case "hsi-rotate-hue":
      output = hsiHueRotate(base);
      break;
    case "reconstruct-rgb":
      hideColorComponentPanels();
      output = reconstructFromHSI(base);
      break;
    case "reconstruct-rgb-cmyk":
      hideColorComponentPanels();
      output = reconstructFromCMYK(base);
      break;
    case "grayscale":
      output = grayscale(base);
      break;
    case "negative":
      output = negative(base);
      break;
    case "contrast-stretch":
      output = contrastStretch(base);
      break;
    case "gamma-correct":
      output = gammaCorrect(base);
      break;
    case "hist-eq":
      output = histogramEqualization(base);
      break;
    case "mean-filter":
      output = applyKernel(base, [1, 1, 1, 1, 1, 1, 1, 1, 1], 9);
      break;
    case "gaussian-filter":
      output = gaussianGuidedSmooth(base);
      break;
    case "median-filter":
      output = medianFilter(base);
      break;
    case "laplacian-sharpen":
      output = laplacianSharpen(base);
      break;
    case "sobel-edge":
      output = sobelEdge(base);
      break;
    case "fft-spectrum":
      output = grayscale(base);
      break;
    case "freq-lowpass":
      output = frequencyFilter(base, "lowpass");
      break;
    case "freq-highpass":
      output = frequencyFilter(base, "highpass");
      break;
    case "periodic-noise":
      output = periodicNoiseSuppression(base);
      break;
    case "binary-threshold":
      output = binaryThreshold(base);
      break;
    case "erosion":
      output = binaryMorph(base, "erode");
      break;
    case "dilation":
      output = binaryMorph(base, "dilate");
      break;
    case "opening":
      output = opening(base);
      break;
    case "closing":
      output = closing(base);
      break;
    case "otsu":
      output = otsuThreshold(base);
      break;
    case "kmeans":
      output = kMeansSegmentation(base);
      break;
    case "color-mask":
      output = colorMask(base);
      break;
    case "watershed-style":
      output = boundaryMap(base);
      break;
    case "haar-analysis":
      output = haarAnalysis(base);
      break;
    case "haar-compress":
      output = haarCompression(base);
      break;
    case "feature-map":
      output = featureMap(base);
      break;
    case "ai-advisor":
      renderAdvisor(latestStats || computeStats(base));
      output = cloneImageData(base);
      break;
    case "cnn-demo":
      renderClassifier(latestStats || computeStats(base));
      output = featureMap(base);
      break;
    case "quality-report":
      output = qualityReport();
      break;
    default:
      output = base;
  }

  const [title, description] = methodInfo[action] || ["Custom Operation", "Processed image."];
  methodTitle.textContent = title;
  if (action === "reconstruct-rgb") {
    methodDescription.textContent = "RGB was converted to HSI and reconstructed back to RGB. The processed image should match the original very closely, so little or no visible change is expected.";
  } else if (action === "reconstruct-rgb-cmyk") {
    methodDescription.textContent = "RGB was converted to CMYK and reconstructed back to RGB. The processed image should look almost identical to the original, so this button is mainly a conversion-validation demo.";
  } else {
    methodDescription.textContent = description;
  }
  renderResult(output);
}

function loadImageData(imageData) {
  originalImageData = cloneImageData(imageData);
  latestSpectrum = null;
  setPrimaryCanvases(originalImageData);
  hsiVisible = false;
  cmykVisible = false;
  updateColorPanelsVisibility();
  renderResult(cloneImageData(originalImageData));
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const image = new Image();
  image.onload = () => {
    drawLoadedImage(image);
    persistCurrentImage("upload");
    methodTitle.textContent = "Uploaded image";
    methodDescription.textContent = "The image is loaded and saved for the whole website session, so other pages can use it without another upload.";
  };
  image.src = URL.createObjectURL(file);
}

function setupPages() {
  const tabs = document.querySelectorAll(".page-tab");
  const panels = document.querySelectorAll(".page-view");
  const usingHashRoutes = window.location.hostname.endsWith("github.io");

  function basePath() {
    const path = window.location.pathname;
    if (path.endsWith(".html")) {
      return path.replace(/[^/]+$/, "");
    }
    return path.endsWith("/") ? path : `${path}/`;
  }

  function normalizeRoute() {
    if (usingHashRoutes) {
      const hash = window.location.hash.replace(/^#\/?/, "");
      if (!hash) return "overview";
      return ROUTES.has(hash) ? hash : "overview";
    }

    const cleaned = window.location.pathname.replace(/\/+$/, "") || "/";
    if (cleaned === "/") return "overview";
    const slug = cleaned.slice(1);
    return ROUTES.has(slug) ? slug : "overview";
  }

  function routeHref(page) {
    if (usingHashRoutes) {
      return page === "overview" ? `${basePath()}#/overview` : `${basePath()}#/${page}`;
    }
    return page === "overview" ? "/" : `/${page}`;
  }

  function routeLabel(page) {
    if (page === "overview") return "Overview";
    if (page === "ai") return "AI Analysis";
    return page.charAt(0).toUpperCase() + page.slice(1);
  }

  function setActivePage(page) {
    tabs.forEach((button) => {
      const targetPage = button.dataset.pageLink;
      button.setAttribute("href", routeHref(targetPage));
      button.classList.toggle("active", targetPage === page);
    });
    panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.view === page));
    document.title = `${routeLabel(page)} | Image Analysis Hub`;
  }

  if (usingHashRoutes) {
    window.addEventListener("hashchange", () => {
      setActivePage(normalizeRoute());
    });
  } else {
    window.addEventListener("popstate", () => {
      setActivePage(normalizeRoute());
    });
  }

  setActivePage(normalizeRoute());
}

function setupActions() {
  document.querySelectorAll(".action-btn").forEach((button) => {
    button.addEventListener("click", () => applyAction(button.dataset.action));
  });
}

imageLoader.addEventListener("change", handleUpload);
loadSampleBtn.addEventListener("click", () => {
  loadImageData(createSampleImage());
  persistCurrentImage("sample");
  methodTitle.textContent = "Loaded sample image";
  methodDescription.textContent = "The generated scene includes edges, color regions, and texture so both basic and advanced modules show visible changes across all pages.";
});
runAdvisorBtn.addEventListener("click", () => applyAction("ai-advisor"));
resetBtn.addEventListener("click", () => {
  if (!originalImageData) return;
  hsiVisible = false;
  cmykVisible = false;
  updateColorPanelsVisibility();
  methodTitle.textContent = "Reset to original";
  methodDescription.textContent = "All visual panels were refreshed from the source image.";
  renderResult(cloneImageData(originalImageData));
});

async function initializeApp() {
  setupPages();
  setupActions();
  const restored = await restorePersistedImage();
  if (!restored) {
    loadImageData(createSampleImage());
    persistCurrentImage("sample");
  }
}

initializeApp();
