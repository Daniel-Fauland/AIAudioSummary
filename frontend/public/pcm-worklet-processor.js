class PCMWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer to accumulate samples until we have enough for AssemblyAI (min 50ms)
    // 1600 samples at 16kHz = 100ms — comfortably within the 50-1000ms range
    this._buffer = new Int16Array(1600);
    this._offset = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const float32Data = input[0];
    const ratio = Math.round(sampleRate / 16000);
    const outputLength = Math.floor(float32Data.length / ratio);

    for (let i = 0; i < outputLength; i++) {
      const sample = float32Data[i * ratio];
      const clamped = Math.max(-1, Math.min(1, sample));
      this._buffer[this._offset++] = clamped * 0x7fff;

      if (this._offset >= this._buffer.length) {
        this.port.postMessage(this._buffer.buffer.slice(0));
        this._offset = 0;
      }
    }

    return true;
  }
}

registerProcessor("pcm-worklet-processor", PCMWorkletProcessor);
