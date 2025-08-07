import Stats from "./Stats.min.js";
import { OrbitControls } from "./OrbitControls.js";

// RENDERER

function getRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    preserveDrawingBuffer: true,
    alpha: true,
  });

  renderer.shadowMap.enabled = true;

  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.setSize(width, height);

  renderer.setClearColor("#000", 1);

  return renderer;
}

// RECORDER

function getTrack(canvas, chunks) {
  const stream = canvas.captureStream(0);

  const track = stream.getVideoTracks()[0];

  if (!track.requestFrame) {
    track.requestFrame = () => stream.requestFrame();
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm",
  });

  recorder.ondataavailable = (e) => chunks.push(e.data);

  recorder.onstop = (e) => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("download", `art_${new Date().toISOString()}.webm`);
    a.setAttribute("href", url);
    a.click();
    URL.revokeObjectURL(url);
    chunks.length = 0;
  };

  return track;
}

// STATS

function getStats() {
  const stats = new Stats();
  document.body.appendChild(stats.dom);
  return stats;
}

// CAMERA

function getCamera() {
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.001,
    100
  );

  camera.position.set(0, 0, 20);

  return camera;
}

// CONTROLS

function getControls(camera) {
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.saveState();

  return controls;
}

// SECTION

const scene = new THREE.Scene();
const camera = getCamera();
const controls = getControls(camera);
const canvas = document.getElementById("canvas");
const renderer = getRenderer(canvas);
const clock = new THREE.Clock();
const chunks = [];
const track = getTrack(canvas, chunks);

scene.add(camera);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.setSize(window.innerWidth, window.innerHeight);
});

function update(delta) {
  if (settings.animate) {
    settings.time += delta * settings.speed_multiplier;
    if (settings.time > settings.t_max) settings.time = settings.t_min;
    else if (settings.time < settings.t_min) settings.time = settings.t_max;
    materialLine.uniforms.time.value = settings.time;
    materialCircle.uniforms.time.value = settings.time;
  }
  stats.update();
}

function render() {
  renderer.render(scene, camera);
  if (recording) track.requestFrame();
}

function animate() {
  const delta = clock.getDelta();
  render();
  update(delta);
  requestAnimationFrame(animate);
}

animate();
