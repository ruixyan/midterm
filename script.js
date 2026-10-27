const RAPIDAPI_KEY = "61fae66352msh1149b88bc4b338fp1e189djsnef9335f3667c";
const RAPIDAPI_HOST = "spotify-audio-features-track-analysis.p.rapidapi.com";

const KEY_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

// // key names into numbers
const KEY_NUMBERS = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };

// features fetched + colors
const FEATURES = [
  { field: "key", label: "Key" },
  { field: "mode", label: "Mode" },
  { field: "tempo", label: "Tempo" },
  { field: "time_signature", label: "Time signature" },
  { field: "energy", label: "Energy", color: "#ff6b4a" },
  { field: "valence", label: "Valence (mood)", color: "#ffd23f" },
  { field: "danceability", label: "Danceability", color: "#ff4fa3" },
  { field: "acousticness", label: "Acousticness", color: "#8bd17c" },
  { field: "instrumentalness", label: "Instrumentalness", color: "#4fc3f7" },
  { field: "speechiness", label: "Speechiness", color: "#b388ff" },
  { field: "liveness", label: "Liveness", color: "#e0e0e0" },
  { field: "loudness", label: "Loudness" }
];

// filtering out features without colors
const PLANET_FEATURES = FEATURES.filter(feature => feature.color);

const form = document.getElementById("track-form"); //user input
const statusEl = document.getElementById("status"); //updating status
const tooltipEl = document.getElementById("tooltip"); //hover card

// search is blank upon page load
let currentSong = null;


// ---------- API functions ----------

// rapidapi for audio analysis
async function getAudioFeatures(trackId) {
  const url = `https://${RAPIDAPI_HOST}/tracks/spotify_audio_features?spotify_track_id=${trackId}`;
  const response = await fetch(url, {
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  const data = await response.json();
  console.log("Audio features:", data); // console logging raw data
  const features = data.audio_features || data; // the features may be wrapped in audio_features

  // turning strings in to values
  for (const field in features) {
    const value = features[field];
    if (typeof value === "string" && value !== "" && !isNaN(value)) { //checks if the value is a string, not an empty string, and not NaN (not a number
      features[field] = Number(value);
    }
  }

  features.key = KEY_NUMBERS[features.key] ?? -1;   // (-1 = not detected)
  return features;
}

// API 2: the song's title and cover art (Spotify oEmbed, no key needed)
async function getTrackInfo(trackId) {
  const url = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Couldn't load the song name (${response.status})`);
  }
  const data = await response.json(); // includes title and thumbnail_url
  console.log("Track info:", data);
  return data;
}


// display

// converts raw data to readable format
function formatValue(field, value) {
  if (field === "key") return KEY_NAMES[value] ?? "Not detected";
  if (field === "mode") return value === 1 ? "Major" : "Minor"; // 1 = major, 0 = minor
  if (field === "tempo") return `${Math.round(value)} BPM`; // converts decimal BPM to integer
  if (field === "time_signature") return `${value} beats per bar`; // ex. 4 beats per bar
  if (field === "loudness") return `${value.toFixed(1)} dB`; // fixed to 1 decimal place
  return `${Math.round(value * 100)}%`; // turns everything else into a percentage
}

function showTrack(info) {
  document.getElementById("song-name").textContent = info.title; // sets title
  const coverEl = document.getElementById("cover"); // defines dom element
  coverEl.src = info.thumbnail_url; 
  coverEl.alt = `Cover art for ${info.title}`; // alt text
  coverEl.hidden = false;
}

// updates key
function showFeatures(features) {
  document.getElementById("features").innerHTML = FEATURES.map(feature => `
    <tr>
      <td>${feature.color ? `<span class="dot" style="background:${feature.color}"></span>` : ""}${feature.label}</td>
      <td>${formatValue(feature.field, features[feature.field])}</td>
    </tr>
  `).join("");
}


// ---------- Three.js scene setup ----------

const scene = new THREE.Scene(); //sets scene
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200); //defines camera
camera.position.set(0, 9, 20);
const renderer = new THREE.WebGLRenderer({ antialias: true }); //sets renderer
renderer.setPixelRatio(window.devicePixelRatio); 
document.getElementById("visualizer").appendChild(renderer.domElement); // adds the <canvas> to the page

// sets up orbit controls
const controls = new THREE.OrbitControls(camera, renderer.domElement); 
controls.enableDamping = true; // smooth slow-down after dragging

// sets up pointlights
scene.add(new THREE.PointLight(0xffffff, 1.6));
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

// bg stars
function makeStars(count) {
  const positions = new Float32Array(count * 3); // list to store stars with x, y, z
  for (let i = 0; i < count; i++) { //setting random placements
    const direction = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    const distance = 60 + Math.random() * 60;
    positions[i * 3] = direction.x * distance;
    positions[i * 3 + 1] = direction.y * distance;
    positions[i * 3 + 2] = direction.z * distance;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 }));
}
scene.add(makeStars(1500));


// sun

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 48, 24),
  new THREE.MeshBasicMaterial({ color: 0x888888 })
);
// glow
const glow = new THREE.Mesh(
  new THREE.SphereGeometry(2, 48, 24),
  new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending })
);
sun.add(glow);
scene.add(sun);


// planets

function makeOrbitLine(radius) {
  const points = [];
  for (let i = 0; i <= 96; i++) { //96 short segments
    const angle = (i / 96) * Math.PI * 2; 
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 }));
}

// each planet sits inside two groups: one for its orbit, and one for its spin.
const planets = PLANET_FEATURES.map((feature, i) => { // one planet per audio feature
  const radius = 3.5 + i * 1.6; // orbit radius

  const tilt = new THREE.Group();
  const spinner = new THREE.Group();
  spinner.rotation.y = Math.random() * Math.PI * 2; // random starting point on the orbit

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.MeshStandardMaterial({ color: feature.color })
  );
  mesh.position.x = radius;
  mesh.scale.setScalar(0.4);
  mesh.userData.feature = feature; // remembered for the hover label

  spinner.add(mesh);
  tilt.add(makeOrbitLine(radius), spinner);
  scene.add(tilt);

  return { mesh, tilt, spinner, radius, index: i };
});


// updating visualizer with audio features

function updateVisualizer(features) {
  if (KEY_NAMES[features.key]) { //setting color based on key
    const hue = features.key / 12;
    sun.material.color.setHSL(hue, 0.9, 0.55);
    glow.material.color.setHSL(hue, 0.9, 0.55);
  } else {
    sun.material.color.set(0xffffff); // white default
    glow.material.color.set(0xffffff);
  }

  const minor = features.mode === 0;
  planets.forEach(planet => {
    // determine size
    const value = features[planet.mesh.userData.feature.field] || 0;
    planet.mesh.scale.setScalar(0.15 + value * 0.6);

    // if minor, tilt orbit
    planet.tilt.rotation.x = minor ? Math.sin(planet.index * 2.1) * 0.5 : 0;
    planet.tilt.rotation.z = minor ? Math.cos(planet.index * 1.7) * 0.3 : 0;
  });
}


// hover labels

const raycaster = new THREE.Raycaster(); // finds what's under the mouse in 3D
const pointer = new THREE.Vector2();
let paused = false; // true while the mouse is over the sun or a planet

// hover card text
function describe(object) {
  if (object === sun) {
    if (!currentSong) return "The song";
    return `Key: ${formatValue("key", currentSong.key)} ${formatValue("mode", currentSong.mode)}, ${formatValue("tempo", currentSong.tempo)}`;
  }
  const feature = object.userData.feature; // if not sun, then a planet
  if (!currentSong) return feature.label;
  return `${feature.label}: ${formatValue(feature.field, currentSong[feature.field])}`;
}

function handlePointerMove(event) {
  // convert the mouse position to -1…1 across the screen, which Three.js expects
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([sun, ...planets.map(planet => planet.mesh)]);

  if (hits.length === 0) {
    hideTooltip();
    return;
  }

  paused = true; // stop the orbits while hovering
  tooltipEl.textContent = describe(hits[0].object); // sets the text
  tooltipEl.style.left = `${event.clientX + 14}px`;
  tooltipEl.style.top = `${event.clientY + 14}px`;
  tooltipEl.hidden = false;
  renderer.domElement.style.cursor = "pointer";
}

// mouse off
function hideTooltip() {
  paused = false;
  tooltipEl.hidden = true;
  renderer.domElement.style.cursor = "";
}


// animate

const clock = new THREE.Clock();

// 60 fps
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();    // seconds since the last frame
  const elapsed = clock.elapsedTime; // seconds since the page loaded
  const beatsPerSecond = (currentSong?.tempo || 60) / 60; // 60 BPM until a song loads

  // if not paused, then orbit speed determined by BPM
  if (!paused) {
    planets.forEach(planet => {
      planet.spinner.rotation.y += (beatsPerSecond * 0.8 / planet.radius) * delta;
    });
  }

  // the sun pulses with bpm
  const pulse = 1 + 0.06 * Math.sin(beatsPerSecond * elapsed * Math.PI * 2);
  sun.scale.setScalar(pulse);

  controls.update(); // needed every frame for the smooth slow-down
  renderer.render(scene, camera);
}

// canvas resized
function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  renderer.setSize(window.innerWidth, window.innerHeight);
  // makes sure the orbit lines aren't cut off by panel
  if (window.innerWidth > 800) {
    camera.setViewOffset(window.innerWidth, window.innerHeight, -220, 0, window.innerWidth, window.innerHeight);
  } else {
    camera.clearViewOffset();
  }
  camera.updateProjectionMatrix();
}


// main

async function handleSubmit(event) {
  event.preventDefault(); // stop the page from reloading

  // pulling the ID out of a link like open.spotify.com/track/ABC123?si=...
  const input = document.getElementById("track-input").value.trim(); // trim spaces
  const match = input.match(/track\/([A-Za-z0-9]+)/); 
  const trackId = match ? match[1] : input;

  statusEl.textContent = "Loading…"; // status message
  try {
    // run both at the same time
    const [info, features] = await Promise.all([ //wait until both are done
      getTrackInfo(trackId),
      getAudioFeatures(trackId)
    ]);
    currentSong = features; // for hover labels
    showTrack(info); // sets title
    showFeatures(features); // sets features
    updateVisualizer(features); // sets visualizer
    statusEl.textContent = ""; // clear status
  } catch (error) {
    statusEl.textContent = error.message; 
  }
}

form.addEventListener("submit", handleSubmit);
renderer.domElement.addEventListener("pointermove", handlePointerMove);
renderer.domElement.addEventListener("pointerleave", hideTooltip); // mouse left the canvas, e.g. onto a panel
window.addEventListener("resize", resize);
resize(); // run once for canvas size
animate(); 