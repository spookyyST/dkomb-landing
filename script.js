const FORM_ENDPOINT = "";

const body = document.body;
const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector("#siteNav");
const navLinks = [...document.querySelectorAll("[data-nav-link]")];
const revealNodes = [...document.querySelectorAll(".reveal")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const form = document.querySelector("#requestForm");
const formStatus = document.querySelector("#formStatus");
const pageLoader = document.querySelector("#pageLoader");
const pageLoaderPercent = document.querySelector("[data-page-loader-percent]");
const pageLoaderBar = document.querySelector("[data-page-loader-bar]");
const letterFillNodes = [...document.querySelectorAll("[data-letter-fill]")];
const hero = document.querySelector("#hero");
const sequenceCanvas = document.querySelector(".hero__sequence-canvas");
const sequenceLoader = document.querySelector(".hero__sequence-loader");
const heroSide = document.querySelector(".hero__side");
const heroMissionQuestion = document.querySelector("[data-hero-question]");
const heroMissionCopy = document.querySelector(".hero__mission-copy");
const splitShowcase = document.querySelector(".split-showcase");
const splitLeftPanel = splitShowcase?.querySelector(".split-showcase__panel--left");
const splitRightPanel = splitShowcase?.querySelector(".split-showcase__panel--right");
const splitImages = splitShowcase ? [...splitShowcase.querySelectorAll("img")] : [];
let sequenceCurrentFrame = -1;
let sequenceRenderRequest = 0;
let sequenceContext;
const sequenceFrameCount = 180;
const sequenceInitialPreloadCount = 40;
const sequencePreloadWorkerCount = 5;
const sequenceImages = [];
const sequenceFramePromises = [];
const sequencePlayhead = { frame: 0 };
let sequenceLoadedCount = 0;

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function resetInitialScrollPosition() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

window.addEventListener("beforeunload", resetInitialScrollPosition);
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  resetInitialScrollPosition();
  window.ScrollTrigger?.refresh();
});

function setHeaderState() {
  const scrollProgress = Math.min(window.scrollY / (window.innerHeight * 0.9), 1);
  header?.classList.toggle("is-scrolled", scrollProgress >= 0.98);
  header?.style.setProperty("--header-scroll", String(scrollProgress));
  if (window.scrollY < window.innerHeight * 0.65) {
    navLinks.forEach((link) => link.classList.remove("is-active"));
  }
}

function closeMenu() {
  body.classList.remove("nav-open");
  header?.classList.remove("is-menu-open");
  navToggle?.setAttribute("aria-expanded", "false");
}

function setStatus(message, type = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = "form-status";
  if (type) formStatus.classList.add(`is-${type}`);
}

function setLoadingProgress(percent) {
  const normalizedPercent = Math.min(Math.max(Math.round(percent), 0), 100);
  if (sequenceLoader) sequenceLoader.textContent = `${normalizedPercent}%`;
  if (pageLoaderPercent) pageLoaderPercent.textContent = `${normalizedPercent}%`;
  pageLoaderBar?.style.setProperty("--loader-progress", `${normalizedPercent}%`);
}

function hidePageLoader() {
  body.classList.remove("is-loading");
  pageLoader?.classList.add("is-hidden");
}

function isContactValueValid(value) {
  const normalized = value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[+\d][\d\s()-.]{6,}$/;
  return emailPattern.test(normalized) || phonePattern.test(normalized);
}

function getFormPayload(formElement) {
  const formData = new FormData(formElement);
  return {
    name: String(formData.get("name") || "").trim(),
    contact: String(formData.get("contact") || "").trim(),
    message: String(formData.get("message") || "").trim(),
    source: "dkomb.ru static landing",
    createdAt: new Date().toISOString(),
  };
}

function validatePayload(payload) {
  if (!payload.name) {
    return "Укажите имя.";
  }

  if (!payload.contact) {
    return "Укажите телефон или почту.";
  }

  if (!isContactValueValid(payload.contact)) {
    return "Проверьте формат телефона или почты.";
  }

  return "";
}

function initIcons() {
  if (!window.lucide) return;
  window.lucide.createIcons({
    attrs: {
      "stroke-width": 1.7,
    },
  });
}

function initLetterFill() {
  letterFillNodes.forEach((node) => {
    const letters = [...node.textContent];
    node.textContent = "";

    letters.forEach((letter, index) => {
      const span = document.createElement("span");
      span.className = "hero__mission-letter";
      span.style.setProperty("--letter-index", String(index));

      if (letter === " ") {
        span.classList.add("hero__mission-letter--space");
        span.innerHTML = "&nbsp;";
      } else {
        span.textContent = letter;
      }

      node.append(span);
    });
  });

  updateLetterFill();
}

function updateLetterFill(progress = 0) {
  letterFillNodes.forEach((node) => {
    const letters = [...node.querySelectorAll(".hero__mission-letter")];
    const filledCount = Math.floor(progress * letters.length);
    const revealProgress = Math.min(Math.max((progress - 0.08) / 0.24, 0), 1);
    const copyProgress = Math.min(Math.max((progress - 0.92) / 0.08, 0), 1);

    node.style.setProperty("--mission-reveal", String(revealProgress));
    heroMissionCopy?.style.setProperty("--mission-copy-reveal", String(copyProgress));

    letters.forEach((letter, index) => {
      letter.classList.toggle("is-filled", index < filledCount);
    });
  });

  heroMissionQuestion?.classList.toggle("is-flipped", progress >= 0.24);

  if (heroSide) {
    const sideProgress = Math.min(Math.max((progress - 0.16) / 0.3, 0), 1);
    heroSide.style.setProperty("--side-reveal", String(sideProgress));
  }
}

function getSequenceFramePath(index) {
  return `assets/frames_train_180_webp/frame_${String(index + 1).padStart(4, "0")}.webp`;
}

function getSequenceCoverRect(image) {
  const canvasRatio = sequenceCanvas.width / sequenceCanvas.height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  let width = sequenceCanvas.width;
  let height = sequenceCanvas.height;
  let x = 0;
  let y = 0;

  if (imageRatio > canvasRatio) {
    height = sequenceCanvas.height;
    width = height * imageRatio;
    x = (sequenceCanvas.width - width) / 2;
  } else {
    width = sequenceCanvas.width;
    height = width / imageRatio;
    y = (sequenceCanvas.height - height) / 2;
  }

  return { x, y, width, height };
}

function drawSequenceImage(image) {
  if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;

  const rect = getSequenceCoverRect(image);
  sequenceContext.drawImage(image, rect.x, rect.y, rect.width, rect.height);
}

function drawSequenceFrame(frame) {
  if (!sequenceCanvas || !sequenceContext) return;

  const clampedFrame = Math.min(Math.max(frame, 0), sequenceFrameCount - 1);
  const frameIndex = Math.round(clampedFrame);

  if (frameIndex === sequenceCurrentFrame) return;

  const image = sequenceImages[frameIndex];
  if (!image?.complete) {
    loadSequenceFrame(frameIndex).then(() => {
      sequenceCurrentFrame = -1;
      renderSequenceFrame();
    });
    return;
  }

  sequenceContext.clearRect(0, 0, sequenceCanvas.width, sequenceCanvas.height);
  drawSequenceImage(image);

  sequenceCurrentFrame = frameIndex;
}

function renderSequenceFrame() {
  if (sequenceRenderRequest) return;

  sequenceRenderRequest = window.requestAnimationFrame(() => {
    sequenceRenderRequest = 0;
    drawSequenceFrame(sequencePlayhead.frame);
  });
}

function resizeSequenceCanvas() {
  if (!sequenceCanvas) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  sequenceCanvas.width = Math.round(window.innerWidth * pixelRatio);
  sequenceCanvas.height = Math.round(window.innerHeight * pixelRatio);
  sequenceCurrentFrame = -1;
  drawSequenceFrame(sequencePlayhead.frame);
}

function updateSequenceLoadingProgress() {
  setLoadingProgress((sequenceLoadedCount / sequenceFrameCount) * 100);
}

function loadSequenceFrame(index) {
  if (sequenceFramePromises[index]) return sequenceFramePromises[index];

  const image = new Image();
  image.decoding = "async";
  sequenceImages[index] = image;

  sequenceFramePromises[index] = new Promise((resolve) => {
    const finishImageLoad = async () => {
      try {
        await image.decode?.();
      } catch {
        // Some browsers reject decode for cached or partially decoded images; the loaded image can still be drawn.
      }

      sequenceLoadedCount += 1;
      updateSequenceLoadingProgress();
      resolve(image);
    };

    image.addEventListener("load", finishImageLoad, { once: true });

    image.addEventListener(
      "error",
      () => {
        sequenceLoadedCount += 1;
        updateSequenceLoadingProgress();
        resolve(image);
      },
      { once: true },
    );
  });

  image.src = getSequenceFramePath(index);
  return sequenceFramePromises[index];
}

function preloadSequenceFrameRange(startIndex, endIndex, onFrameLoaded) {
  let nextFrameIndex = startIndex;

  const loadNextFrame = async () => {
    if (nextFrameIndex >= endIndex) return;
    const frameIndex = nextFrameIndex;
    nextFrameIndex += 1;
    await loadSequenceFrame(frameIndex);
    onFrameLoaded?.(frameIndex);
    await loadNextFrame();
  };

  return Promise.all(Array.from({ length: sequencePreloadWorkerCount }, loadNextFrame));
}

function preloadSequenceFramesInBackground() {
  preloadSequenceFrameRange(sequenceInitialPreloadCount, sequenceFrameCount).then(() => {
    setLoadingProgress(100);
    sequenceLoader?.classList.add("is-hidden");
  });
}

function initSequenceScrollTrigger() {
  if (!hero || !window.gsap || !window.ScrollTrigger) return;

  window.gsap.registerPlugin(window.ScrollTrigger);
  updateSplitShowcase(0);

  const timeline = window.gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: "top top",
      end: "+=620%",
      pin: true,
      scrub: 1.1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        updateLetterFill(Math.min(self.progress / 0.8, 1));
        updateSplitShowcase(self.progress);
      },
    },
  });

  timeline.to(sequencePlayhead, {
    frame: sequenceFrameCount - 1,
    ease: "none",
    onUpdate: renderSequenceFrame,
    duration: 4,
  });
}

function updateSplitShowcase(scrollProgress = 0) {
  if (!splitLeftPanel || !splitRightPanel) return;

  const panelProgress = Math.min(Math.max((scrollProgress - 0.7) / 0.24, 0), 1);
  const easedProgress = panelProgress * panelProgress * (3 - 2 * panelProgress);
  const topY = -100 + easedProgress * 100;
  const bottomY = 100 - easedProgress * 100;
  const imageScale = 1.08 - easedProgress * 0.08;
  const captionProgress = Math.min(Math.max((panelProgress - 0.78) / 0.22, 0), 1);

  splitShowcase.style.opacity = panelProgress > 0 ? "1" : "0";
  splitShowcase.style.setProperty("--split-caption-reveal", String(captionProgress));
  splitLeftPanel.style.transform = `translateY(${topY}%)`;
  splitRightPanel.style.transform = `translateY(${bottomY}%)`;
  splitImages.forEach((image) => {
    image.style.transform = `scale(${imageScale})`;
  });
}

async function initHeroSequence() {
  if (!sequenceCanvas) {
    hidePageLoader();
    return;
  }

  sequenceContext = sequenceCanvas.getContext("2d");
  resizeSequenceCanvas();

  let startupLoadedCount = 0;
  setLoadingProgress(0);
  await preloadSequenceFrameRange(0, sequenceInitialPreloadCount, () => {
    startupLoadedCount += 1;
    setLoadingProgress((startupLoadedCount / sequenceInitialPreloadCount) * 100);
  });
  setLoadingProgress(100);
  sequenceLoader?.classList.add("is-hidden");

  drawSequenceFrame(0);
  updateLetterFill(0);
  initSequenceScrollTrigger();
  resetInitialScrollPosition();
  window.ScrollTrigger?.refresh();
  window.setTimeout(hidePageLoader, 260);
  window.setTimeout(preloadSequenceFramesInBackground, 320);

  window.addEventListener("resize", () => {
    resizeSequenceCanvas();
    window.ScrollTrigger?.refresh();
  });
}

function initReveal() {
  if (!("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  revealNodes.forEach((node) => {
    const delay = node.dataset.revealDelay;
    if (delay) node.style.setProperty("--reveal-delay", `${delay}ms`);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  revealNodes.forEach((node) => observer.observe(node));
}

function initActiveNav() {
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${visible.target.id}`;
        link.classList.toggle("is-active", isActive);
      });
    },
    {
      threshold: [0.24, 0.42, 0.62],
      rootMargin: "-18% 0px -55% 0px",
    },
  );

  sections.forEach((section) => observer.observe(section));
}

function initNavigation() {
  navToggle?.addEventListener("click", () => {
    const isOpen = header?.classList.toggle("is-menu-open");
    body.classList.toggle("nav-open", Boolean(isOpen));
    navToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  });

  nav?.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (!link) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("scroll", setHeaderState, { passive: true });
  setHeaderState();
}

async function handleSubmit(event) {
  event.preventDefault();
  if (!form) return;

  const payload = getFormPayload(form);
  const validationError = validatePayload(payload);

  if (validationError) {
    setStatus(validationError, "error");
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton?.setAttribute("disabled", "true");
  setStatus("Запрос готовится к отправке...");

  try {
    if (FORM_ENDPOINT) {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 480));
      console.info("Demo form payload", payload);
    }

    form.reset();
    setStatus("Запрос принят в демо-режиме. Для боевого сайта укажите FORM_ENDPOINT.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Не удалось отправить запрос. Проверьте обработчик формы.", "error");
  } finally {
    submitButton?.removeAttribute("disabled");
  }
}

function initForm() {
  form?.addEventListener("submit", handleSubmit);
}

document.addEventListener("DOMContentLoaded", () => {
  resetInitialScrollPosition();
  initIcons();
  initLetterFill();
  initHeroSequence();
  initReveal();
  initActiveNav();
  initNavigation();
  initForm();
});
