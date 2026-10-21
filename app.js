const projects = window.portfolioProjects;

const faces = ['front', 'back', 'right', 'left', 'top', 'bottom'];
const faceProjects = [
  [0, 0, 2, 3, 4, 5, 0, 7, 8],
  [7, 8, 9, 0, 2, 3, 4, 5, 0],
  [5, 0, 7, 8, 9, 0, 2, 3, 4],
  [3, 4, 5, 6, 0, 8, 9, 1, 0],
  [1, 2, 3, 0, 5, 6, 7, 0, 9],
  [8, 0, 1, 2, 3, 4, 0, 6, 7]
];
const facePoses = {
  front: [-15, 22], right: [-15, -68], back: [-15, 202],
  left: [-15, 108], top: [-68, 18], bottom: [68, 18]
};
const scatter = [
  [16, 10, 2], [10, 18, 2], [-18, 8, 2],
  [18, -8, 2], [-14, 12, 2], [-18, -12, 2],
  [12, -18, 2], [-10, -16, 2], [-16, -12, 2]
];
const cube = document.querySelector('#cube');
const scene = document.querySelector('.scene');
const track = document.querySelector('#project-track');
const rail = document.querySelector('.rail');
const metaIndex = document.querySelector('.project-meta__index');
const metaTitle = document.querySelector('.project-meta__title');
const metaType = document.querySelector('.project-meta__type');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const imageCursor = Array(projects.length).fill(0);

faces.forEach((faceName, faceIndex) => {
  const face = document.createElement('div');
  face.className = `face face--${faceName}`;

  for (let tile = 0; tile < 9; tile += 1) {
    const projectIndex = faceProjects[faceIndex][tile];
    const project = projects[projectIndex];
    const [x, y, z] = scatter[tile];
    const square = document.createElement('span');
    square.className = 'tile';
    square.dataset.project = projectIndex;
    square.setAttribute('role', 'img');
    square.setAttribute('aria-label', project.name);
    square.style.setProperty('--image', `url('${project.images[imageCursor[projectIndex]]}')`);
    imageCursor[projectIndex] += 1;
    square.style.setProperty('--idle-z', `${(tile + faceIndex) % 3 * 3}px`);
    square.style.setProperty('--scatter-x', `${x}px`);
    square.style.setProperty('--scatter-y', `${y}px`);
    square.style.setProperty('--scatter-z', `${z}px`);
    face.append(square);
  }
  cube.append(face);
});

console.assert(projects.every((project, index) => imageCursor[index] === project.images.length), '参考图片与魔方位置数量不一致');
console.assert(projects.every((project, index) =>
  faceProjects.filter((face) => face.includes(index)).length === Math.min(project.images.length, faces.length)
), '项目图片没有优先分散到不同魔方面');
console.assert(projects.every((project, index) => project.images.length > 9 || new Set(
  faceProjects.flatMap((face) => face.map((projectIndex, position) => projectIndex === index ? position : -1)).filter((position) => position >= 0)
).size === project.images.length), '同一项目在不同魔方面重复使用了相同位置');

function buildProjectSet() {
  projects.forEach((project, index) => {
    const link = document.createElement('a');
    link.className = 'project-link';
    link.dataset.index = index;
    link.href = `project.html?project=${project.slug}`;
    link.innerHTML = `<span>${project.name}</span>`;
    track.append(link);
  });
}

for (let repeat = 0; repeat < 6; repeat += 1) buildProjectSet();

let cubeX = -18;
let cubeY = 32;
let targetX = cubeX;
let targetY = cubeY;
let railOffset = 0;
let lastFrame = performance.now();

function angleDelta(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function renderRail() {
  const loopHeight = track.scrollHeight / 2;
  if (!loopHeight) return;
  railOffset = ((railOffset % loopHeight) + loopHeight) % loopHeight;
  track.style.transform = `translate3d(0, ${-railOffset}px, 0)`;
}

function animate(time) {
  const delta = Math.min((time - lastFrame) / 1000, .05);
  lastFrame = time;

  if (!reduceMotion) {
    if (scene.classList.contains('has-focus')) {
      const turn = angleDelta(cubeY, targetY);
      cubeX += (targetX - cubeX) * Math.min(1, delta * 3.4);
      cubeY += turn * Math.min(1, delta * 3.4);
      if (Math.abs(turn) < 4 && Math.abs(targetX - cubeX) < 1.2) targetY += delta * 10;
    } else {
      cubeX += (-18 + Math.sin(time / 2200) * 7 - cubeX) * Math.min(1, delta * 1.6);
      cubeY += delta * 15;
      railOffset += delta * 14;
    }
    cube.style.transform = `rotateX(${cubeX}deg) rotateY(${cubeY}deg)`;
  }

  renderRail();
  requestAnimationFrame(animate);
}

if (reduceMotion) renderRail();
else requestAnimationFrame(animate);

function focusProject(index, activeLink) {
  const project = projects[index];
  const [poseX, poseY] = facePoses[project.face];
  scene.classList.add('has-focus');
  rail.classList.add('has-focus');
  targetX = poseX;
  targetY = cubeY + angleDelta(cubeY, poseY);
  if (reduceMotion) cube.style.transform = `rotateX(${poseX}deg) rotateY(${poseY}deg)`;
  document.querySelectorAll('.tile').forEach((tile) => tile.classList.toggle('is-active', Number(tile.dataset.project) === index));
  document.querySelectorAll('.project-link').forEach((link) => link.classList.toggle('is-active', link === activeLink));
  metaIndex.textContent = `${String(index + 1).padStart(2, '0')} / 10`;
  metaTitle.textContent = project.name;
  metaType.textContent = project.type;
}

function clearFocus() {
  scene.classList.remove('has-focus');
  rail.classList.remove('has-focus');
  document.querySelectorAll('.tile, .project-link').forEach((element) => element.classList.remove('is-active'));
}

track.addEventListener('pointerover', (event) => {
  const link = event.target.closest('.project-link');
  if (link) focusProject(Number(link.dataset.index), link);
});

track.addEventListener('focusin', (event) => {
  const link = event.target.closest('.project-link');
  if (link) focusProject(Number(link.dataset.index), link);
});

track.addEventListener('pointerleave', clearFocus);
track.addEventListener('focusout', (event) => {
  if (!track.contains(event.relatedTarget)) clearFocus();
});

document.addEventListener('wheel', (event) => {
  event.preventDefault();
  railOffset += event.deltaY * .78;
  renderRail();
  requestAnimationFrame(() => {
    const link = document.elementFromPoint(event.clientX, event.clientY)?.closest('.project-link');
    if (link) focusProject(Number(link.dataset.index), link);
  });
}, { passive: false });

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') clearFocus();
});
