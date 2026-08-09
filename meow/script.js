const sampleCanvas = document.querySelector("#sampleCanvas");
const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
const pixelCanvas = document.querySelector("#pixelCanvas");
const pixelCtx = pixelCanvas.getContext("2d");
const backgroundMusic = document.querySelector("#backgroundMusic");
const lyricBackground = document.querySelector("#lyricBackground");

const sourceId = "01";
const frameCount = 13;
const frameRate = 12;
const pixelBlock = 2;
const saturation = 1.32;
const contrast = 1.12;
const showGridGap = false;
const recordingMode = new URLSearchParams(window.location.search).get("record") === "1";

let activeFrames = [];
let lyricsReady = false;
let framesReady = false;
let framesLoadingPromise = null;
let sourceStartedAt = performance.now();
let lastFrameIndex = -1;
let lastCanvasSize = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function padFrame(number) {
  return String(number).padStart(3, "0");
}

function adjustChannel(value, gray) {
  const contrasted = (value - 128) * contrast + 128;
  const saturated = gray + (contrasted - gray) * saturation;
  return clamp(Math.round(saturated), 0, 255);
}

function fitCanvasToDevice() {
  const ratio = window.devicePixelRatio || 1;
  const rect = pixelCanvas.getBoundingClientRect();
  const size = Math.max(320, Math.floor(rect.width * ratio));

  if (pixelCanvas.width !== size || pixelCanvas.height !== size) {
    pixelCanvas.width = size;
    pixelCanvas.height = size;
    return true;
  }

  return size !== lastCanvasSize;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadFrames() {
  if (framesLoadingPromise) {
    return framesLoadingPromise;
  }

  framesLoadingPromise = (async () => {
    activeFrames = [];
    framesReady = false;

    for (let index = 0; index < frameCount; index += 1) {
      try {
        const frame = await loadImage(`./frames/${sourceId}/frame-${padFrame(index + 1)}.png`);
        activeFrames.push(frame);

        if (activeFrames.length === 1) {
          sourceStartedAt = performance.now();
          lastFrameIndex = -1;
        }
      } catch {
        break;
      }
    }

    framesReady = activeFrames.length > 0;
    return activeFrames;
  })();

  return framesLoadingPromise;
}

async function loadLyrics() {
  if (!lyricBackground) {
    return;
  }

  try {
    const response = await fetch("./music.txt", { cache: "no-store" });
    const text = await response.text();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return;
    }

    const uniqueLines = [...new Set(lines)];
    const rowCount = 7;
    lyricBackground.textContent = "";

    for (let row = 0; row < rowCount; row += 1) {
      const track = document.createElement("div");
      track.className = "lyric-track";
      track.style.top = `${8 + row * 14}%`;
      track.style.left = `${row % 2 === 0 ? -18 : -34}%`;
      track.style.setProperty("--duration", `${34 + row * 5}s`);

      const repeated = Array.from({ length: 14 }, (_, index) => uniqueLines[(index + row) % uniqueLines.length]);
      repeated.forEach((line) => {
        const span = document.createElement("span");
        span.textContent = line;
        track.appendChild(span);
      });

      lyricBackground.appendChild(track);
    }

    lyricBackground.classList.add("is-ready");
    if (recordingMode) {
      lyricBackground.style.transition = "none";
      lyricBackground.style.opacity = "1";
    }
    lyricsReady = true;
  } catch {
    lyricBackground.classList.remove("is-ready");
    lyricsReady = true;
  }
}

function drawPixelatedImage(image) {
  const sourceSize = 120;
  const scale = pixelCanvas.width / sourceSize;
  const gap = showGridGap ? Math.max(1, Math.floor(pixelCanvas.width / 360)) : 0;

  sampleCtx.clearRect(0, 0, sourceSize, sourceSize);
  sampleCtx.drawImage(image, 0, 0, sourceSize, sourceSize);
  const frame = sampleCtx.getImageData(0, 0, sourceSize, sourceSize).data;

  pixelCtx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);

  for (let y = 0; y < sourceSize; y += pixelBlock) {
    for (let x = 0; x < sourceSize; x += pixelBlock) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;

      for (let yy = y; yy < Math.min(y + pixelBlock, sourceSize); yy += 1) {
        for (let xx = x; xx < Math.min(x + pixelBlock, sourceSize); xx += 1) {
          const index = (yy * sourceSize + xx) * 4;
          r += frame[index];
          g += frame[index + 1];
          b += frame[index + 2];
          a += frame[index + 3];
          count += 1;
        }
      }

      r /= count;
      g /= count;
      b /= count;
      a /= count;

      if (a < 8) {
        continue;
      }

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const rr = adjustChannel(r, gray);
      const gg = adjustChannel(g, gray);
      const bb = adjustChannel(b, gray);
      const brightness = gray / 255;
      const pixelX = Math.round(x * scale);
      const pixelY = Math.round(y * scale);
      const pixelW = Math.max(1, Math.ceil(pixelBlock * scale) - gap);
      const pixelH = Math.max(1, Math.ceil(pixelBlock * scale) - gap);

      pixelCtx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${a / 255})`;
      pixelCtx.fillRect(pixelX, pixelY, pixelW, pixelH);

      if (brightness > 0.7) {
        pixelCtx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.14, brightness * 0.1)})`;
        pixelCtx.fillRect(pixelX, pixelY, pixelW, Math.max(1, Math.floor(pixelH * 0.16)));
      }
    }
  }
}

function drawLoop(now) {
  if (recordingMode) {
    requestAnimationFrame(drawLoop);
    return;
  }

  const resized = fitCanvasToDevice();

  if (activeFrames.length > 0) {
    const elapsed = (now - sourceStartedAt) / 1000;
    const frameIndex = Math.floor(elapsed * frameRate) % activeFrames.length;

    if (frameIndex !== lastFrameIndex || resized) {
      lastFrameIndex = frameIndex;
      lastCanvasSize = pixelCanvas.width;
      drawPixelatedImage(activeFrames[frameIndex]);
    }
  } else {
    pixelCtx.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);
  }

  requestAnimationFrame(drawLoop);
}

function setRecordingLyrics(timeSeconds) {
  if (!lyricBackground) {
    return;
  }

  const tracks = lyricBackground.querySelectorAll(".lyric-track");
  tracks.forEach((track, index) => {
    const duration = Number.parseFloat(track.style.getPropertyValue("--duration")) || 30;
    const progress = (timeSeconds % duration) / duration;
    const reverse = index % 2 === 1;
    const from = reverse ? -58 : -8;
    const to = reverse ? -8 : -58;
    const translate = from + (to - from) * progress;
    track.style.animation = "none";
    track.style.transform = `translate3d(${translate}%, 0, 0)`;
  });
}

window.__renderRecordingFrame = (frameNumber, outputFps = 30) => {
  const resized = fitCanvasToDevice();
  const timeSeconds = frameNumber / outputFps;

  if (activeFrames.length > 0) {
    const frameIndex = Math.floor(timeSeconds * frameRate) % activeFrames.length;
    if (frameIndex !== lastFrameIndex || resized) {
      lastFrameIndex = frameIndex;
      lastCanvasSize = pixelCanvas.width;
      drawPixelatedImage(activeFrames[frameIndex]);
    }
  }

  if (lyricsReady) {
    setRecordingLyrics(timeSeconds);
  }

  return {
    framesReady: activeFrames.length,
    complete: framesReady && activeFrames.length === frameCount,
    lyricsReady,
    frameNumber,
    timeSeconds,
  };
};

const appReady = Promise.all([loadFrames(), loadLyrics()]).then(() => true);
window.__recordingReady = appReady;

function playBackgroundMusic() {
  if (!backgroundMusic || !backgroundMusic.paused) {
    return;
  }

  backgroundMusic.volume = 0.82;
  backgroundMusic.play().catch(() => {});
}

window.addEventListener("resize", () => {
  lastCanvasSize = 0;
});

document.addEventListener("click", playBackgroundMusic, { once: true });
document.addEventListener("touchstart", playBackgroundMusic, { once: true });
document.addEventListener("keydown", playBackgroundMusic, { once: true });

requestAnimationFrame(drawLoop);
if (!recordingMode) {
  playBackgroundMusic();
}
