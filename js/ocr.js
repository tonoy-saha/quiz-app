// ── OCR (in-browser, like Google Lens but local) ───────────────────
// Uses Tesseract.js. Supports Bengali ('ben') + English ('eng') by
// default since the sample question banks are Bengali with some
// English terms mixed in (e.g. "Tolerable").
//
// Two accuracy improvements over a bare Tesseract call, both free and
// fully local:
//   1. Preprocessing (grayscale + contrast boost + 2x upscale) before
//      recognition — Tesseract reads clean, high-contrast, larger text
//      meaningfully better than a raw phone photo/scan.
//   2. Cropping — dense multi-column question-bank pages confuse OCR's
//      reading-order detection badly. Feeding it one cropped question
//      at a time (see create_quiz.js's crop tool) instead of a whole
//      page is the single biggest accuracy lever available for this
//      kind of source material.

const OCR = {
  _worker: null,

  async getWorker(onProgress){
    if (this._worker) return this._worker;
    this._worker = await Tesseract.createWorker("ben+eng", 1, {
      logger: (m) => { if (onProgress) onProgress(m); },
    });
    // PSM 6 = "assume a single uniform block of text". Much better fit
    // than the default (which tries to detect page layout/columns)
    // once the input is already a tightly cropped single question,
    // and still reasonable for a whole-image fallback.
    await this._worker.setParameters({ tessedit_pageseg_mode: "6" });
    return this._worker;
  },

  // Runs OCR on an image source (File, Blob, canvas, or data URL) and
  // returns raw text. Always preprocesses first for better accuracy.
  async extractText(image, onProgress){
    const worker = await this.getWorker(onProgress);
    const processed = await preprocessImage(image);
    const { data } = await worker.recognize(processed);
    return data.text;
  },

  async terminate(){
    if (this._worker){
      await this._worker.terminate();
      this._worker = null;
    }
  },
};

// Loads any accepted image source into an HTMLImageElement.
function loadImageElement(source){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (source instanceof HTMLCanvasElement){
      img.src = source.toDataURL();
    } else if (source instanceof Blob || source instanceof File){
      img.src = URL.createObjectURL(source);
    } else {
      img.src = source; // data URL or regular URL string
    }
  });
}

// Grayscale + contrast stretch + 2x upscale, done on a canvas. Returns
// a canvas (Tesseract.js accepts canvas elements directly).
async function preprocessImage(source){
  const img = source instanceof HTMLCanvasElement ? null : await loadImageElement(source);
  const srcCanvas = source instanceof HTMLCanvasElement ? source : null;
  const width = srcCanvas ? srcCanvas.width : img.naturalWidth;
  const height = srcCanvas ? srcCanvas.height : img.naturalHeight;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(srcCanvas || img, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  // First pass: grayscale + find min/max luminance for contrast stretch.
  let min = 255, max = 0;
  const gray = new Uint8ClampedArray(d.length / 4);
  for (let i = 0, p = 0; i < d.length; i += 4, p++){
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    gray[p] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);

  // Second pass: apply contrast-stretched grayscale back into the image.
  for (let i = 0, p = 0; i < d.length; i += 4, p++){
    const stretched = ((gray[p] - min) / range) * 255;
    d[i] = d[i + 1] = d[i + 2] = stretched;
  }
  ctx.putImageData(imgData, 0, 0);

  return canvas;
}
