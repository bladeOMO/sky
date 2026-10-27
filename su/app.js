(() => {
  'use strict';
  const world = document.querySelector('#world');
  const scenes = [...document.querySelectorAll('.scene')];
  const cross = document.querySelector('#cross-scene');
  const pageCount = document.querySelector('#page-count');
  const chapter = document.querySelector('#chapter');
  const motionToggle = document.querySelector('#motion-toggle');
  const backButton = document.querySelector('#back-button');
  const viewportSize = document.querySelector('#viewport-size');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const titles = ['', '', '', '虚恋', '病恋', '树洞', '喜点', '雷点 / 须知', '其他'];
  const narratives = [
    '我到了一个奇怪的地方，这里凭空出现了一扇巨大的窗户。',
    '神像上似乎刻画着一些文字 触碰的时候有许多灰尘',
    '…？这都是什么 算了 都试试看吧'
  ];
  let current = 0;
  let turnTimer = null;
  let choiceTimer = null;
  let cleanupTimer = null;
  let stormTimer = null;
  let typing = false;
  let paused = reduced.matches;
  let portrait = false;
  let inputStart = null;

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
    const oldIndex = current;
    const direction = index >= oldIndex ? 1 : -1;
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
    chapter.textContent = titles[index];
    pageCount.textContent = String(index + 1).padStart(2, '0') + ' / 09';
    document.title = index <= 2 ? '溯 · 蓝色圣堂' : '溯 · ' + titles[index];
    backButton.hidden = index === 0;
    if (updateHash && location.hash !== '#' + incoming.id) history.pushState(null, '', '#' + incoming.id);
    startNarration(index);
    restoreViewport();
    requestAnimationFrame(restoreViewport);
  }

  function goDelta(delta) {
    if (typing) { finishNarration(); return; }
    if (current < 2) { if (delta > 0) show(current + 1); else if (current > 0) show(current - 1); return; }
    if (current === 2) { if (delta > 0) show(3); else show(1); return; }
    if (current === 3 && delta < 0) { show(2); return; }
    show(current + delta);
  }

  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => show(Number(button.dataset.go)));
  });
  backButton.addEventListener('click', () => show(current > 2 ? 2 : current - 1));
  document.querySelectorAll('.narration-text').forEach(button => button.addEventListener('click', finishNarration));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); goDelta(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goDelta(-1); }
    if (event.key === 'Escape' && current > 2) show(2);
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
  show(startIndex >= 0 ? startIndex : 0, false, false);
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
