// ── OCR (in-browser, like Google Lens but local) ───────────────────
// Uses Tesseract.js. Supports Bengali ('ben') + English ('eng') by
// default since the sample question banks are Bengali with some
// English terms mixed in (e.g. "Tolerable").

const OCR = {
  _worker: null,

  async getWorker(onProgress){
    if (this._worker) return this._worker;
    this._worker = await Tesseract.createWorker("ben+eng", 1, {
      logger: (m) => { if (onProgress) onProgress(m); },
    });
    return this._worker;
  },

  // Runs OCR on a single image (File, Blob, or data URL) and returns raw text
  async extractText(image, onProgress){
    const worker = await this.getWorker(onProgress);
    const { data } = await worker.recognize(image);
    return data.text;
  },

  async terminate(){
    if (this._worker){
      await this._worker.terminate();
      this._worker = null;
    }
  },
};
