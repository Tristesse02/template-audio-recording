class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super(); // Call the constructor of the base class
    this.buffer = []; // Buffer to accumulate audio data
    this.targetChunkSize = 1024; // Target chunk size in samples
  }

  process(inputs) {
    const input = inputs[0]; // Receive audio samples in Float32Array
    if (input && input.length > 0) {
      const float32Array = input[0];
      for (let i = 0; i < float32Array.length; i++) {
        const int16Sample = Math.max(
          -32768,
          Math.min(32767, Math.floor(float32Array[i] * 32768))
        ); // Convert to Int16 by multiplying 32768, bound by -32768 and 32767
        this.buffer.push(int16Sample); // accumulating audio data

        // Check if the buffer has reached the target size
        if (this.buffer.length >= this.targetChunkSize) { // If the buffer is full
          const chunk = new Int16Array(
            this.buffer.slice(0, this.targetChunkSize)
          );
          this.port.postMessage(chunk.buffer); // Send the fixed-size chunk
          this.buffer = this.buffer.slice(this.targetChunkSize); // Remove sent data
        }
      }
    }

    return true; // Keep the processor alive
  }
}

registerProcessor("audio-processor", AudioProcessor);
