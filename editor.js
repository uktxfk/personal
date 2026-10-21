const fallbackDescriptions = {
  'PUBLIC ART': '公共艺术与空间现场项目。',
  'SPATIAL DESIGN': '空间设计与视觉体验项目。',
  'BRAND EXPERIENCE': '品牌体验与空间表达项目。',
  'DIGITAL MEDIA': '数字媒体与动态视觉项目。',
  'INSTALLATION': '装置艺术与互动体验项目。'
};
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function storedMedia(source) { return { source, pending: false }; }

const projects = window.portfolioProjects.map((project) => {
  const description = project.description || fallbackDescriptions[project.type] || '项目图像档案。';
  const sources = project.detailImages?.length ? project.detailImages : project.images;
  const mediaGroups = project.detailMedia?.length ? project.detailMedia : sources.map((source) => [source]);
  return {
    ...project,
    description,
    designer: project.designer || '黄信达 · XD',
    detailItems: mediaGroups.map((media, index) => ({
      id: `card-${project.slug}-${index}`,
      media: (Array.isArray(media) ? media : [media]).filter(Boolean).map(storedMedia),
      title: project.detailCopy?.[index]?.title || (index === 0 ? project.name : `项目图像 ${String(index + 1).padStart(2, '0')}`),
      description: project.detailCopy?.[index]?.description || (index === 0 ? description : project.name)
    })).filter((item) => item.media.length)
  };
});
let activeIndex = 0;
let draggedIndex = -1;

const selector = document.querySelector('#project-selector');
const nameInput = document.querySelector('#project-name');
const typeInput = document.querySelector('#project-type');
const descriptionInput = document.querySelector('#project-description');
const designerInput = document.querySelector('#project-designer');
const title = document.querySelector('#editor-title');
const mediaCount = document.querySelector('#media-count');
const status = document.querySelector('#editor-status');
const detailCopyList = document.querySelector('#detail-copy-list');
const imageInput = document.querySelector('#image-input');

function syncFormToProject() {
  Object.assign(projects[activeIndex], {
    name: nameInput.value.trim(), type: typeInput.value.trim(),
    description: descriptionInput.value.trim(), designer: designerInput.value.trim()
  });
}

function pendingCount() {
  return projects.reduce((count, project) => count + project.detailItems.reduce(
    (sum, item) => sum + item.media.filter((media) => media.pending).length, 0
  ), 0);
}

function mediaPath(media, includePending) {
  if (!media.pending) return media.source;
  return includePending ? media.targetPath : media.fallbackSource;
}

function serializeProjects(includePending = false) {
  return projects.map(({ detailItems, detailCopy, detailMedia, ...project }) => {
    const cards = detailItems.map((item) => ({
      item,
      media: item.media.map((media) => mediaPath(media, includePending)).filter(Boolean)
    })).filter((card) => card.media.length);
    return {
      ...project,
      detailImages: cards.map((card) => card.media[0]),
      detailMedia: cards.map((card) => card.media),
      detailCopy: cards.map(({ item }) => ({ title: item.title.trim(), description: item.description.trim() }))
    };
  });
}

function renderSelector() {
  selector.replaceChildren();
  projects.forEach((project, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `project-button${index === activeIndex ? ' is-active' : ''}`;
    button.textContent = project.name || `项目 ${index + 1}`;
    button.addEventListener('click', () => { syncFormToProject(); activeIndex = index; render(); });
    selector.append(button);
  });
}

function moveItem(from, to) {
  const items = projects[activeIndex].detailItems;
  if (to < 0 || to >= items.length || from === to) return;
  items.splice(to, 0, items.splice(from, 1)[0]);
  status.textContent = '卡片顺序已调整，记得保存草稿。';
  renderDetailItems();
}

function removeItem(index) {
  const items = projects[activeIndex].detailItems;
  if (items.length === 1) { status.textContent = '每个项目至少需要保留一张详情卡片。'; return; }
  if (!window.confirm(`确定移出第 ${index + 1} 张详情卡片吗？原图片文件会保留。`)) return;
  items.splice(index, 1)[0].media.forEach((media) => { if (media.pending) URL.revokeObjectURL(media.source); });
  status.textContent = '卡片已移出详情页，原图片文件仍会保留。';
  renderDetailItems();
}

function moveMedia(item, from, to) {
  if (to < 0 || to >= item.media.length || from === to) return;
  item.media.splice(to, 0, item.media.splice(from, 1)[0]);
  status.textContent = '卡片内图片顺序已调整，第一张将作为默认显示。';
  renderDetailItems();
}

function removeMedia(item, index) {
  if (item.media.length === 1) { status.textContent = '一张卡片至少需要保留一张图片。'; return; }
  if (!window.confirm('确定从这张卡片移出该图片吗？原文件会保留。')) return;
  const [removed] = item.media.splice(index, 1);
  if (removed.pending) URL.revokeObjectURL(removed.source);
  status.textContent = '图片已从卡片移出，原文件仍会保留。';
  renderDetailItems();
}

function handleDrop(event, targetIndex) {
  event.preventDefault();
  if (draggedIndex < 0) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  let insertionIndex = targetIndex + (event.clientY > bounds.top + bounds.height / 2 ? 1 : 0);
  const items = projects[activeIndex].detailItems;
  const [moved] = items.splice(draggedIndex, 1);
  if (draggedIndex < insertionIndex) insertionIndex -= 1;
  items.splice(Math.max(0, Math.min(insertionIndex, items.length)), 0, moved);
  draggedIndex = -1;
  status.textContent = '卡片顺序已调整，记得保存草稿。';
  renderDetailItems();
}

async function optimizeImage(file) {
  if (!allowedImageTypes.has(file.type)) throw new Error(`${file.name} 不是支持的图片格式`);
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error(`${file.name} 优化失败`)), 'image/webp', .9
  ));
}

async function pendingMedia(file, project, fallbackSource) {
  const blob = await optimizeImage(file);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const filename = `upload-${stamp}.webp`;
  return {
    source: URL.createObjectURL(blob), targetPath: `assets/detail/${project.slug}/${filename}`,
    filename, blob, fallbackSource, pending: true
  };
}

async function chooseImages({ item, replaceIndex = -1 }) {
  const project = projects[activeIndex];
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.multiple = replaceIndex < 0;
  input.addEventListener('change', async () => {
    const files = [...input.files];
    if (!files.length) return;
    status.textContent = `正在优化 ${files.length} 张图片...`;
    try {
      if (replaceIndex >= 0) {
        const previous = item.media[replaceIndex];
        const replacement = await pendingMedia(files[0], project, previous.pending ? previous.fallbackSource : previous.source);
        if (previous.pending) URL.revokeObjectURL(previous.source);
        item.media.splice(replaceIndex, 1, replacement);
        status.textContent = '图片已替换。写入网站文件夹后永久生效，原文件仍会保留。';
      } else {
        item.media.push(...await Promise.all(files.map((file) => pendingMedia(file, project))));
        status.textContent = `${files.length} 张图片已加入同一卡片，将在详情页手动轮播。`;
      }
      if (projects[activeIndex] === project) renderDetailItems();
    } catch (error) { status.textContent = error.message || '图片优化失败，没有进行修改。'; }
  }, { once: true });
  input.click();
}

function renderMediaEditor(item) {
  const section = document.createElement('div');
  section.className = 'card-media-editor';
  const heading = document.createElement('div');
  heading.className = 'card-media-heading';
  heading.innerHTML = `<span>${item.media.length} 张图片</span>`;
  const add = document.createElement('button');
  add.type = 'button';
  add.textContent = '同卡加图';
  add.addEventListener('click', () => chooseImages({ item }));
  heading.append(add);
  const strip = document.createElement('div');
  strip.className = 'card-media-strip';
  item.media.forEach((media, index) => {
    const thumb = document.createElement('div');
    thumb.className = 'card-media-thumb';
    const image = document.createElement('img');
    image.src = media.source;
    image.alt = '';
    const badge = document.createElement('span');
    badge.textContent = String(index + 1).padStart(2, '0');
    const controls = document.createElement('div');
    controls.className = 'card-media-actions';
    const replace = document.createElement('button');
    replace.type = 'button'; replace.textContent = '换图';
    replace.addEventListener('click', () => chooseImages({ item, replaceIndex: index }));
    const left = document.createElement('button');
    left.type = 'button'; left.textContent = '←'; left.disabled = index === 0;
    left.setAttribute('aria-label', `左移卡片内第 ${index + 1} 张图片`);
    left.addEventListener('click', () => moveMedia(item, index, index - 1));
    const right = document.createElement('button');
    right.type = 'button'; right.textContent = '→'; right.disabled = index === item.media.length - 1;
    right.setAttribute('aria-label', `右移卡片内第 ${index + 1} 张图片`);
    right.addEventListener('click', () => moveMedia(item, index, index + 1));
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = '移除'; remove.disabled = item.media.length === 1;
    remove.addEventListener('click', () => removeMedia(item, index));
    controls.append(replace, left, right, remove);
    thumb.append(image, badge, controls);
    strip.append(thumb);
  });
  section.append(heading, strip);
  return section;
}

function renderDetailItems() {
  const project = projects[activeIndex];
  const totalImages = project.detailItems.reduce((sum, item) => sum + item.media.length, 0);
  mediaCount.textContent = `${project.detailItems.length} 张卡片 · ${totalImages} 张图片`;
  detailCopyList.replaceChildren();
  project.detailItems.forEach((detail, index) => {
    const item = document.createElement('article');
    item.className = 'detail-copy-item';
    item.addEventListener('dragover', (event) => event.preventDefault());
    item.addEventListener('drop', (event) => handleDrop(event, index));
    const handle = document.createElement('span');
    handle.className = 'detail-drag-handle'; handle.draggable = true; handle.textContent = '⋮⋮';
    handle.setAttribute('role', 'button'); handle.setAttribute('aria-label', `拖动第 ${index + 1} 张卡片`);
    handle.addEventListener('dragstart', (event) => { draggedIndex = index; item.classList.add('is-dragging'); event.dataTransfer.effectAllowed = 'move'; });
    handle.addEventListener('dragend', () => { draggedIndex = -1; item.classList.remove('is-dragging'); });
    const number = document.createElement('span');
    number.className = 'detail-card-number'; number.textContent = String(index + 1).padStart(2, '0');
    const titleLabel = document.createElement('label');
    titleLabel.innerHTML = '<span>卡片标题</span>';
    const titleInput = document.createElement('input');
    titleInput.value = detail.title;
    titleInput.addEventListener('input', () => { detail.title = titleInput.value; status.textContent = '有尚未保存的修改。'; });
    titleLabel.append(titleInput);
    const descriptionLabel = document.createElement('label');
    descriptionLabel.className = 'detail-description-field'; descriptionLabel.innerHTML = '<span>卡片说明</span>';
    const descriptionArea = document.createElement('textarea');
    descriptionArea.rows = 2; descriptionArea.value = detail.description;
    descriptionArea.addEventListener('input', () => { detail.description = descriptionArea.value; status.textContent = '有尚未保存的修改。'; });
    descriptionLabel.append(descriptionArea);
    const actions = document.createElement('div');
    actions.className = 'detail-item-actions';
    [['↑', index - 1, '上移'], ['↓', index + 1, '下移']].forEach(([text, target, label]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'detail-item-action'; button.textContent = text;
      button.disabled = target < 0 || target >= project.detailItems.length;
      button.setAttribute('aria-label', `${label}第 ${index + 1} 张卡片`);
      button.addEventListener('click', () => moveItem(index, target));
      actions.append(button);
    });
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'detail-item-action remove'; remove.textContent = '移出卡片';
    remove.addEventListener('click', () => removeItem(index));
    actions.append(remove);
    item.append(handle, number, titleLabel, descriptionLabel, actions, renderMediaEditor(detail));
    detailCopyList.append(item);
  });
}

function render() {
  const project = projects[activeIndex];
  nameInput.value = project.name; typeInput.value = project.type;
  descriptionInput.value = project.description; designerInput.value = project.designer;
  title.textContent = project.name;
  renderSelector(); renderDetailItems();
}

function saveDraft() {
  syncFormToProject();
  localStorage.setItem('portfolioProjectsDraft', JSON.stringify(serializeProjects(false)));
  renderSelector(); title.textContent = projects[activeIndex].name;
  const pending = pendingCount();
  status.textContent = pending
    ? `文案与已有图片调整已保存，但 ${pending} 张新图片尚未写入。请不要刷新，并使用 Chrome 或 Edge 写入网站文件夹。`
    : '草稿已保存，刷新网站即可查看。';
}

function buildDataFile(data) {
  return `(() => {\n  const defaults = ${JSON.stringify(data, null, 2)};\n\n  window.portfolioProjectDefaults = defaults;\n  try {\n    const draft = localStorage.getItem('portfolioProjectsDraft');\n    window.portfolioProjects = draft ? JSON.parse(draft) : defaults;\n  } catch {\n    window.portfolioProjects = defaults;\n  }\n})();\n`;
}

async function addImages(files) {
  const selectedFiles = [...files];
  if (!selectedFiles.length) return;
  const project = projects[activeIndex];
  status.textContent = `正在优化 ${selectedFiles.length} 张图片...`;
  try {
    const media = await Promise.all(selectedFiles.map((file) => pendingMedia(file, project)));
    media.forEach((entry) => project.detailItems.push({
      id: `card-${Date.now()}-${Math.random()}`, media: [entry],
      title: `项目图像 ${String(project.detailItems.length + 1).padStart(2, '0')}`, description: project.name
    }));
    status.textContent = `${media.length} 张图片已作为新卡片加入末尾。写入网站文件夹前请不要刷新。`;
    if (projects[activeIndex] === project) renderDetailItems();
  } catch (error) { status.textContent = error.message || '图片优化失败，没有添加任何图片。'; }
  finally { imageInput.value = ''; }
}

async function writeToFolder() {
  syncFormToProject();
  if (!window.showDirectoryPicker) { status.textContent = '当前浏览器不支持直接写入，请使用 Chrome 或 Edge 打开编辑器。'; return; }
  const pendingItems = projects.flatMap((project) => project.detailItems.flatMap((item) => item.media
    .filter((media) => media.pending).map((media) => ({ project, media }))));
  if (pendingItems.some(({ media }) => !media.blob)) { status.textContent = '新增图片数据不完整，请重新选择图片。'; return; }
  try {
    const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
    await directory.getFileHandle('index.html');
    const projectDataFile = await directory.getFileHandle('project-data.js');
    const detailDirectory = await (await directory.getDirectoryHandle('assets')).getDirectoryHandle('detail');
    status.textContent = '正在写入新增图片和内容数据...';
    for (const { project, media } of pendingItems) {
      const projectDirectory = await detailDirectory.getDirectoryHandle(project.slug);
      const imageFile = await projectDirectory.getFileHandle(media.filename, { create: true });
      const writable = await imageFile.createWritable();
      await writable.write(media.blob); await writable.close();
    }
    const data = serializeProjects(true);
    const writable = await projectDataFile.createWritable();
    await writable.write(buildDataFile(data)); await writable.close();
    pendingItems.forEach(({ media }) => {
      URL.revokeObjectURL(media.source); media.source = media.targetPath; media.pending = false;
      delete media.blob; delete media.filename; delete media.targetPath; delete media.fallbackSource;
    });
    localStorage.setItem('portfolioProjectsDraft', JSON.stringify(data));
    renderDetailItems();
    status.textContent = '网站文件已更新，换图、同卡多图、顺序和文案均已永久保存。';
  } catch (error) {
    status.textContent = error.name === 'AbortError' ? '已取消选择文件夹。' : '写入失败，请确认选择的是 portfolio-preview\\dist 文件夹。页面内容没有被删除。';
  }
}

function downloadDataFile() {
  syncFormToProject();
  const pending = pendingCount();
  const data = serializeProjects(false);
  localStorage.setItem('portfolioProjectsDraft', JSON.stringify(data));
  const url = URL.createObjectURL(new Blob([buildDataFile(data)], { type: 'text/javascript;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'project-data.js'; link.click(); URL.revokeObjectURL(url);
  status.textContent = pending ? `发布文件已下载，但未包含 ${pending} 张新增或替换图片。请先写入网站文件夹。` : '发布文件已下载。';
}

[nameInput, typeInput, descriptionInput, designerInput].forEach((input) => {
  input.addEventListener('input', () => { status.textContent = '有尚未保存的修改。'; });
});
document.querySelector('#add-images').addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', () => addImages(imageInput.files));
document.querySelector('#save-draft').addEventListener('click', saveDraft);
document.querySelector('#save-folder').addEventListener('click', writeToFolder);
document.querySelector('#download-file').addEventListener('click', downloadDataFile);
document.querySelector('#preview-project').addEventListener('click', () => {
  saveDraft(); window.open(`project.html?project=${projects[activeIndex].slug}`, '_blank', 'noopener');
});

render();
console.assert(projects.length === 10, '项目编辑器应加载全部项目');
console.assert(projects.every((project) => project.detailItems.length > 0), '每个项目至少需要一张详情卡片');
console.assert(projects.every((project) => project.detailItems.every((item) => item.media.length > 0)), '每张卡片至少需要一张图片');
