const projects = window.portfolioProjects;
const slug = new URLSearchParams(window.location.search).get('project');
const foundIndex = projects.findIndex((item) => item.slug === slug);
const currentIndex = foundIndex < 0 ? 0 : foundIndex;
const project = projects[currentIndex];
const fallbackMedia = project.detailImages?.length ? project.detailImages : project.images;
const mediaGroups = project.detailMedia?.length ? project.detailMedia : fallbackMedia.map((src) => [src]);
const descriptions = {
  'PUBLIC ART': '公共艺术与空间现场项目。',
  'SPATIAL DESIGN': '空间设计与视觉体验项目。',
  'BRAND EXPERIENCE': '品牌体验与空间表达项目。',
  'DIGITAL MEDIA': '数字媒体与动态视觉项目。',
  'INSTALLATION': '装置艺术与互动体验项目。'
};

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function createMedia(src, cardIndex, mediaIndex) {
  if (/\.(mp4|webm|mov)$/i.test(src)) {
    const video = document.createElement('video');
    video.src = src;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('aria-label', `${project.name} 第 ${cardIndex + 1} 张卡片视频 ${mediaIndex + 1}`);
    return video;
  }
  const image = document.createElement('img');
  image.src = src;
  image.alt = `${project.name} 第 ${cardIndex + 1} 张卡片图片 ${mediaIndex + 1}`;
  image.decoding = 'async';
  image.loading = cardIndex === 0 && mediaIndex === 0 ? 'eager' : 'lazy';
  return image;
}

function createCarousel(media, cardIndex) {
  const figure = document.createElement('figure');
  figure.className = 'project-media';
  const stage = document.createElement('div');
  stage.className = 'media-stage';
  let active = 0;
  const slides = media.map((src, mediaIndex) => {
    const slide = document.createElement('div');
    slide.className = `media-slide${mediaIndex === 0 ? ' is-active' : ''}`;
    slide.hidden = mediaIndex !== 0;
    slide.append(createMedia(src, cardIndex, mediaIndex));
    stage.append(slide);
    return slide;
  });
  figure.append(stage);
  if (media.length === 1) return figure;

  const controls = document.createElement('div');
  controls.className = 'media-controls';
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'media-arrow';
  previous.textContent = '←';
  previous.setAttribute('aria-label', '上一张图片');
  const dots = document.createElement('div');
  dots.className = 'media-dots';
  dots.setAttribute('aria-label', '选择图片');
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'media-arrow';
  next.textContent = '→';
  next.setAttribute('aria-label', '下一张图片');
  const dotButtons = media.map((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `media-dot${index === 0 ? ' is-active' : ''}`;
    dot.setAttribute('aria-label', `查看第 ${index + 1} 张图片`);
    dots.append(dot);
    return dot;
  });
  const show = (index) => {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const selected = slideIndex === active;
      slide.hidden = !selected;
      slide.classList.toggle('is-active', selected);
      dotButtons[slideIndex].classList.toggle('is-active', selected);
    });
  };
  previous.addEventListener('click', () => show(active - 1));
  next.addEventListener('click', () => show(active + 1));
  dotButtons.forEach((dot, index) => dot.addEventListener('click', () => show(index)));
  controls.append(previous, dots, next);
  figure.append(controls);
  return figure;
}

document.title = `${project.name} | XD`;
const list = document.querySelector('#project-list');
mediaGroups.forEach((group, index) => {
  const media = (Array.isArray(group) ? group : [group]).filter(Boolean);
  if (!media.length) return;
  const row = document.createElement('article');
  const copy = project.detailCopy?.[index];
  const heading = copy?.title || (index === 0 ? project.name : `项目图像 ${String(index + 1).padStart(2, '0')}`);
  const description = copy?.description || (index === 0 ? project.description || descriptions[project.type] || '项目图像档案。' : project.name);
  row.className = 'project-row';
  row.innerHTML = `
    <div class="project-copy">
      <div>
        <p class="eyebrow">${escapeHTML(project.type)}</p>
        <h${index === 0 ? '1' : '2'}>${escapeHTML(heading)}</h${index === 0 ? '1' : '2'}>
        <p class="description">${escapeHTML(description)}</p>
      </div>
      <dl>
        <div><dt>项目类别</dt><dd>${escapeHTML(project.type)}</dd></div>
        <div><dt>卡片</dt><dd>${String(index + 1).padStart(2, '0')} / ${String(mediaGroups.length).padStart(2, '0')}</dd></div>
        <div><dt>图像</dt><dd>${String(media.length).padStart(2, '0')}</dd></div>
        <div><dt>设计</dt><dd>${escapeHTML(project.designer || '黄信达 · XD')}</dd></div>
      </dl>
    </div>`;
  row.append(createCarousel(media, index));
  list.append(row);
});

function setProjectLink(selector, index) {
  const item = projects[(index + projects.length) % projects.length];
  const link = document.querySelector(selector);
  link.href = `project.html?project=${item.slug}`;
  link.querySelector('strong').textContent = item.name;
}

setProjectLink('#previous-project', currentIndex - 1);
setProjectLink('#next-project', currentIndex + 1);
console.assert(mediaGroups.length > 0, '项目必须至少包含一张详情卡片');
console.assert(document.querySelectorAll('.project-row').length === mediaGroups.length, '详情卡片渲染数量不一致');
