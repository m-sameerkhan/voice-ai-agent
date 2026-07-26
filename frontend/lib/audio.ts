/**
 * Captures mic audio, downsamples it to 16kHz mono PCM16, and streams it
 * as binary frames over a websocket to the backend's /ws/stt route.
 *
 * Uses a ScriptProcessorNode rather than an AudioWorklet - it's deprecated
 * but needs zero extra build config and works everywhere for a turn-based
 * (not full-duplex) recording session like this one. If you want to
 * modernize it later, move the callback below into an AudioWorkletProcessor
 * and swap `createScriptProcessor` for `audioWorklet.addModule`.
 */

export interface MicStreamHandle {
  stop: () => void;
}

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function downsampleBuffer(buffer: Float32Array, inRate: number, outRate: number): Float32Array {
  if (outRate === inRate) return buffer;
  const ratio = inRate / outRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export async function startMicStream(
  ws: WebSocket,
  onStop?: () => void
): Promise<MicStreamHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (event) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const input = event.inputBuffer.getChannelData(0);
    const downsampled = downsampleBuffer(input, audioCtx.sampleRate, 16000);
    const pcm = floatTo16BitPCM(downsampled);
    ws.send(pcm);
  };

  source.connect(processor);
  processor.connect(audioCtx.destination);

  return {
    stop: () => {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      audioCtx.close();
      onStop?.();
    },
  };
}
