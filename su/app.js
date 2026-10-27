(() => {
  'use strict';
  const world = document.querySelector('#world');
  const COVER = 10;
  const scenes = [...document.querySelectorAll('.scene:not(.cover)'), document.querySelector('#cover')];
  const cross = document.querySelector('#cross-scene');
  const pageCount = document.querySelector('#page-count');
  const chapter = document.querySelector('#chapter');
  const motionToggle = document.querySelector('#motion-toggle');
  const backButton = document.querySelector('#back-button');
  const viewportSize = document.querySelector('#viewport-size');
  const endingLines = [...document.querySelector('#ending-text').children];
  const endingControl = document.querySelector('#ending-control');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.art-image').forEach(image => {
    async function revealImage() {
      try { if (image.decode) await image.decode(); } catch (_) {}
      if (image.naturalWidth > 0) image.classList.add('art-ready');
    }
    image.addEventListener('load', revealImage);
    if (image.complete) revealImage();
  });
  const titles = ['', '', '', '虚恋', '病恋', '树洞', '喜点', '雷点 / 须知', '其他', 'END'];
  const narratives = [
    '我到了一个奇怪的地方，这里凭空出现了一扇巨大的窗户。',
    '神像上似乎刻画着一些文字 触碰的时候有许多灰尘',
    '…？这都是什么 算了 都试试看吧'
  ];
  let current = COVER;
  let turnTimer = null;
  let choiceTimer = null;
  let cleanupTimer = null;
  let stormTimer = null;
  let typing = false;
  let paused = reduced.matches;
  let portrait = false;
  let inputStart = null;
  let endingTimer = null;
  let endingComplete = false;
  let endingReturn = 2;
  const coverCopy = document.querySelector('#cover-copy');
  const coverTyped = document.querySelector('.cover-typed');
  const coverChoices = document.querySelector('#cover-choices');
  const fog = document.querySelector('#cover-fog');
  const fogContext = fog.getContext('2d');
  const coverText = '一颗心脏重250g，一朵玫瑰重2g\n你是愿意选择用一颗心脏换取一百朵玫瑰\n亦或者用一百朵玫瑰换取一颗心脏?';
  let coverTimer = null;
  let fogFrame = null;
  let coverPhase = 'typing';

  function stopCover() {
    clearTimeout(coverTimer);
    cancelAnimationFrame(fogFrame);
  }

  function showCoverChoices(keepText = false) {
    stopCover();
    coverPhase = 'ready';
    if (fogContext) fogContext.clearRect(0, 0, fog.width, fog.height);
    fog.classList.add('cleared');
    if (!keepText) coverCopy.classList.add('finished');
    coverChoices.inert = false;
    coverChoices.classList.add('ready');
  }

  function paintFog() {
    fog.width = portrait ? 450 : 720;
    fog.height = Math.round(fog.width * world.clientHeight / world.clientWidth);
    if (!fogContext) return;
    fogContext.globalCompositeOperation = 'source-over';
    fogContext.fillStyle = 'rgba(8, 17, 37, .78)';
    fogContext.fillRect(0, 0, fog.width, fog.height);
    const glow = fogContext.createRadialGradient(fog.width * .5, fog.height * .4, 0, fog.width * .5, fog.height * .4, fog.height * .75);
    glow.addColorStop(0, 'rgba(116, 139, 172, .18)');
    glow.addColorStop(1, 'rgba(8, 17, 37, 0)');
    fogContext.fillStyle = glow;
    fogContext.fillRect(0, 0, fog.width, fog.height);
  }

  function wipeFog() {
    if (current !== COVER) return;
    coverPhase = 'wiping';
    coverCopy.classList.add('finished');
    if (paused || reduced.matches || !fogContext) { showCoverChoices(paused || reduced.matches); return; }
    const w = fog.width, h = fog.height;
    const radius = Math.min(w, h) * .27;
    const points = [];
    for (let row = 0; row <= 7; row += 1) {
      const y = row * h / 7;
      points.push({ x: row % 2 ? w + radius : -radius, y });
      points.push({ x: row % 2 ? -radius : w + radius, y });
    }
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    const total = lengths.reduce((a, b) => a + b, 0);
    function erase(distance) {
      let segment = 0;
      while (segment < lengths.length - 1 && distance > lengths[segment]) distance -= lengths[segment++];
      const a = points[segment], b = points[segment + 1];
      const t = Math.min(1, distance / lengths[segment]);
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      const brush = fogContext.createRadialGradient(x, y, 0, x, y, radius);
      brush.addColorStop(0, 'rgba(0,0,0,1)');
      brush.addColorStop(.72, 'rgba(0,0,0,1)');
      brush.addColorStop(1, 'rgba(0,0,0,0)');
      fogContext.globalCompositeOperation = 'destination-out';
      fogContext.fillStyle = brush;
      fogContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    let elapsed = 0, last = null, erased = 0, lastPaint = 0;
    function frame(now) {
      if (current !== COVER) return;
      if (last !== null && !document.hidden) elapsed += now - last;
      last = now;
      if (now - lastPaint > 32) {
        const target = Math.min(1, elapsed / 3900) * total;
        for (let d = erased; d < target; d += radius * .18) erase(d);
        erased = target;
        lastPaint = now;
      }
      if (elapsed >= 3900) { showCoverChoices(); return; }
      fogFrame = requestAnimationFrame(frame);
    }
    fogFrame = requestAnimationFrame(frame);
  }

  function finishCoverText() {
    if (current !== COVER || coverPhase !== 'typing') return;
    clearTimeout(coverTimer);
    coverTyped.textContent = coverText;
    coverPhase = 'reading';
    if (paused || reduced.matches) showCoverChoices(true);
    else coverTimer = setTimeout(wipeFog, 1800);
  }

  function startCover() {
    stopCover();
    coverPhase = 'typing';
    coverCopy.classList.remove('finished');
    coverChoices.classList.remove('ready');
    coverChoices.inert = true;
    fog.classList.remove('cleared');
    paintFog();
    coverTyped.textContent = '';
    if (paused || reduced.matches) { finishCoverText(); return; }
    const letters = [...coverText];
    let cursor = 0;
    function tick() {
      if (current !== COVER) return;
      if (document.hidden) { coverTimer = setTimeout(tick, 200); return; }
      coverTyped.textContent = letters.slice(0, ++cursor).join('');
      if (cursor === letters.length) finishCoverText();
      else coverTimer = setTimeout(tick, /[，?\n]/.test(letters[cursor - 1]) ? 260 : 72);
    }
    coverTimer = setTimeout(tick, 450);
  }
  coverCopy.addEventListener('click', finishCoverText);

  function finishEnding() {
    clearTimeout(endingTimer);
    endingLines.forEach(line => line.classList.add('revealed'));
    endingComplete = true;
    endingControl.textContent = '重看结尾';
  }

  function startEnding() {
    clearTimeout(endingTimer);
    endingComplete = false;
    endingControl.textContent = '显示全文';
    endingLines.forEach(line => line.classList.remove('revealed'));
    if (paused || reduced.matches) { finishEnding(); return; }
    let cursor = 0;
    function reveal() {
      if (current !== 9) return;
      if (document.hidden) { endingTimer = setTimeout(reveal, 250); return; }
      endingLines[cursor].classList.add('revealed');
      cursor += 1;
      if (cursor === endingLines.length) {
        endingComplete = true;
        endingControl.textContent = '重看结尾';
      } else {
        endingTimer = setTimeout(reveal, cursor === 1 || cursor >= 10 ? 1800 : 1250);
      }
    }
    endingTimer = setTimeout(reveal, 900);
  }
  endingControl.addEventListener('click', () => endingComplete ? startEnding() : finishEnding());

  function previousPage() {
    return current === 9 ? endingReturn : current === 0 ? COVER : current > 2 ? 2 : current - 1;
  }

  function restoreViewport() {
    world.scrollLeft = 0;
    world.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollLeft = 0;
    document.body.scrollTop = 0;
  }

  function fit() {
    const bounds = viewportSize.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    portrait = height > width;
    const portraitHeight = Math.max(1600, height * 900 / width);
    const scale = portrait ? Math.min(width / 900, height / portraitHeight) : Math.min(width / 1600, height / 900);
    world.style.setProperty('--portrait-height', portraitHeight + 'px');
    world.style.setProperty('--scale', String(scale));
    world.style.setProperty('--rotation', '0deg');
    world.style.top = (height / 2) + 'px';
  }

  function unlockChoices(index) {
    const choices = document.querySelector('#choices-' + index);
    if (!choices) return;
    choices.inert = false;
    choices.classList.add('ready');
  }

  function finishNarration() {
    if (current > 2) return;
    clearTimeout(turnTimer);
    clearTimeout(choiceTimer);
    const typed = document.querySelector('#narration-' + current + ' .typed');
    typed.textContent = narratives[current];
    typed.classList.remove('typing');
    typing = false;
    unlockChoices(current);
  }

  function startNarration(index) {
    if (index > 2) return;
    const typed = document.querySelector('#narration-' + index + ' .typed');
    const choices = document.querySelector('#choices-' + index);
    if (choices) {
      choices.inert = true;
      choices.classList.remove('ready');
    }
    typed.textContent = '';
    typed.classList.remove('typing');
    if (reduced.matches || paused) {
      finishNarration();
      return;
    }
    typing = true;
    typed.classList.add('typing');
    let cursor = 0;
    const letters = [...narratives[index]];
    function tick() {
      if (index !== current) return;
      if (document.hidden) { turnTimer = setTimeout(tick, 200); return; }
      cursor += 1;
      typed.textContent = letters.slice(0, cursor).join('');
      if (cursor < letters.length) {
        turnTimer = setTimeout(tick, /[。，？]/.test(letters[cursor - 1]) ? 260 : 74);
      } else {
        typed.classList.remove('typing');
        typing = false;
        choiceTimer = setTimeout(() => { if (current === index) unlockChoices(index); }, 350);
      }
    }
    turnTimer = setTimeout(tick, 500);
  }

  function show(index, updateHash = true, animate = true) {
    if (!Number.isInteger(index) || index < 0 || index >= scenes.length) return;
    clearTimeout(turnTimer);
    clearTimeout(choiceTimer);
    clearTimeout(cleanupTimer);
    clearTimeout(endingTimer);
    stopCover();
    typing = false;
    const oldIndex = current;
    if (index === 9 && oldIndex !== 9 && animate) endingReturn = oldIndex;
    const direction = (index === COVER ? -1 : index) >= (oldIndex === COVER ? -1 : oldIndex) ? 1 : -1;
    scenes.forEach((scene, i) => {
      scene.classList.remove('enter-left', 'exit-left', 'exit-right');
      scene.inert = i !== index;
      if (i !== oldIndex && i !== index) scene.classList.remove('active');
    });
    const old = scenes[oldIndex];
    const incoming = scenes[index];
    current = index;
    if (old !== incoming && animate && !reduced.matches && !paused) {
      world.classList.add('turning');
      incoming.classList.add('no-transition');
      incoming.classList.remove('active');
      if (direction < 0) incoming.classList.add('enter-left');
      void incoming.offsetWidth;
      incoming.classList.remove('no-transition');
      old.classList.remove('active');
      old.classList.add(direction > 0 ? 'exit-left' : 'exit-right');
      incoming.classList.remove('enter-left');
      incoming.classList.add('active');
      cleanupTimer = setTimeout(() => {
        old.classList.remove('exit-left', 'exit-right');
        world.classList.remove('turning');
      }, 700);
    } else {
      world.classList.remove('turning');
      scenes.forEach((scene, i) => {
        scene.classList.add('no-transition');
        scene.classList.toggle('active', i === index);
      });
      void world.offsetWidth;
      scenes.forEach(scene => scene.classList.remove('no-transition'));
    }
    cross.classList.toggle('visible', index >= 2 && index <= 6);
    cross.classList.toggle('hub', index === 2);
    world.classList.toggle('story', index < 2);
    chapter.textContent = titles[index] || '';
    pageCount.textContent = String(index === COVER ? 1 : index + 2).padStart(2, '0') + ' / ' + String(scenes.length).padStart(2, '0');
    document.title = index <= 2 || index === COVER ? '溯 · 蓝色圣堂' : '溯 · ' + titles[index];
    backButton.hidden = index === COVER;
    if (updateHash && location.hash !== '#' + incoming.id) history.pushState(null, '', '#' + incoming.id);
    startNarration(index);
    if (index === 9) startEnding();
    if (index === COVER) startCover();
    restoreViewport();
    requestAnimationFrame(restoreViewport);
  }

  function goDelta(delta) {
    if (current === COVER) { finishCoverText(); return; }
    if (current === 9) {
      if (delta < 0) show(endingReturn);
      else if (!endingComplete) finishEnding();
      return;
    }
    if (typing) { finishNarration(); return; }
    if (current < 2) { if (delta > 0) show(current + 1); else if (current > 0) show(current - 1); return; }
    if (current === 2) { if (delta > 0) show(3); else show(1); return; }
    if (current === 3 && delta < 0) { show(2); return; }
    show(current + delta);
  }

  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => show(Number(button.dataset.go)));
  });
  backButton.addEventListener('click', () => show(previousPage()));
  document.querySelectorAll('.narration-text').forEach(button => button.addEventListener('click', finishNarration));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); goDelta(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goDelta(-1); }
    if (event.key === 'Escape' && current > 2 && current !== COVER) show(previousPage());
  });

  world.addEventListener('pointerdown', event => {
    inputStart = world.classList.contains('turning') || event.target.closest('button, a') ? null : { x: event.clientX, y: event.clientY };
  });
  world.addEventListener('pointerup', event => {
    if (!inputStart) return;
    const dx = event.clientX - inputStart.x;
    const dy = event.clientY - inputStart.y;
    inputStart = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      event.preventDefault();
      goDelta(dx < 0 ? 1 : -1);
    }
  });
  world.addEventListener('pointercancel', () => { inputStart = null; });

  function scheduleStorm() {
    clearTimeout(stormTimer);
    stormTimer = setTimeout(() => {
      if (current === 0 && !paused && !document.hidden) {
        const opening = scenes[0];
        opening.classList.remove('flash');
        void opening.offsetWidth;
        opening.classList.add('flash');
      }
      scheduleStorm();
    }, 8000 + Math.random() * 11000);
  }

  function setMotion(value) {
    paused = value;
    world.classList.toggle('paused', paused);
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionToggle.textContent = paused ? '开启动效' : '暂停动态';
    if (paused && typing) finishNarration();
    if (paused && current === 9) finishEnding();
    if (paused && current === COVER) { coverTyped.textContent = coverText; showCoverChoices(true); }
  }
  motionToggle.addEventListener('click', () => setMotion(!paused));
  reduced.addEventListener('change', event => setMotion(event.matches));
  const dust = document.querySelector('#dust');
  for (let i = 0; i < 24; i += 1) {
    const dot = document.createElement('i');
    dot.style.left = (8 + Math.random() * 84) + '%';
    dot.style.top = (10 + Math.random() * 80) + '%';
    dot.style.animationDelay = (-Math.random() * 25) + 's';
    dot.style.animationDuration = (19 + Math.random() * 17) + 's';
    dust.append(dot);
  }
  const startId = location.hash.slice(1);
  const startIndex = scenes.findIndex(scene => scene.id === startId);
  fit();
  setMotion(paused);
  show(startIndex >= 0 ? startIndex : COVER, false, false);
  window.addEventListener('resize', fit);
  window.addEventListener('load', restoreViewport);
  world.addEventListener('scroll', restoreViewport);
  window.addEventListener('orientationchange', fit);
  window.visualViewport?.addEventListener('resize', fit);
  window.addEventListener('hashchange', () => {
    const index = scenes.findIndex(scene => scene.id === location.hash.slice(1));
    if (index >= 0 && index !== current) show(index, false);
  });
  window.addEventListener('pageshow', () => { fit(); restoreViewport(); });
  scheduleStorm();
})();
