/**
 * Карусель изображений: динамическая загрузка из массива URL,
 * автопрокрутка, стрелки, точки-индикаторы, адаптивность.
 *
 * @param {HTMLElement} container - контейнер, в который будет вставлена карусель
 * @param {Object} options
 * @param {string[]} options.urls - массив URL изображений
 * @param {number} [options.intervalMs=5000] - интервал автопереключения (мс)
 * @param {boolean} [options.pauseOnHover=true] - останавливать автопрокрутку при наведении
 * @param {string} [options.carouselClass='carousel'] - класс корневого элемента карусели
 * @returns {{ goTo: (index: number) => void, destroy: () => void }} API для перехода по индексу и уничтожения
 */
function createCarousel(container, options = {}) {
  const urls = options.urls || [];
  const intervalMs = Math.max(1000, options.intervalMs ?? 5000);
  const pauseOnHover = options.pauseOnHover !== false;
  const carouselClass = options.carouselClass || "carousel";

  if (!container || !urls.length) {
    return { goTo: () => {}, destroy: () => {} };
  }

  const total = urls.length;
  let currentIndex = 0;
  let autoTimer = null;

  const root = document.createElement("div");
  root.className = carouselClass;
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Карусель изображений");

  const trackWrap = document.createElement("div");
  trackWrap.className = "carousel-track-wrap";

  const track = document.createElement("div");
  track.className = "carousel-track";

  const slides = urls.map((url, i) => {
    const slide = document.createElement("div");
    slide.className = "carousel-slide";
    slide.setAttribute("data-index", String(i));
    const img = document.createElement("img");
    img.src = url;
    img.alt = `Слайд ${i + 1}`;
    img.loading = i === 0 ? "eager" : "lazy";
    slide.appendChild(img);
    track.appendChild(slide);
    return slide;
  });

  trackWrap.appendChild(track);

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "carousel-arrow carousel-arrow-prev";
  prevBtn.setAttribute("aria-label", "Предыдущее изображение");
  prevBtn.innerHTML = "<span aria-hidden=\"true\">&larr;</span>";

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "carousel-arrow carousel-arrow-next";
  nextBtn.setAttribute("aria-label", "Следующее изображение");
  nextBtn.innerHTML = "<span aria-hidden=\"true\">&rarr;</span>";

  const dots = document.createElement("div");
  dots.className = "carousel-dots";
  dots.setAttribute("role", "tablist");
  dots.setAttribute("aria-label", "Выбор слайда");
  const dotButtons = urls.map((_, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "carousel-dot";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-label", `Слайд ${i + 1}`);
    btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
    btn.setAttribute("data-index", String(i));
    dots.appendChild(btn);
    return btn;
  });

  root.appendChild(trackWrap);
  root.appendChild(prevBtn);
  root.appendChild(nextBtn);
  root.appendChild(dots);
  container.appendChild(root);

  function setIndex(index) {
    currentIndex = ((index % total) + total) % total;
    track.style.transform = `translate3d(-${currentIndex * 100}%, 0, 0)`;
    dotButtons.forEach((btn, i) => {
      btn.setAttribute("aria-selected", i === currentIndex ? "true" : "false");
      btn.classList.toggle("carousel-dot-active", i === currentIndex);
    });
    slides.forEach((s, i) => s.classList.toggle("carousel-slide-active", i === currentIndex));
  }

  function goNext() {
    setIndex(currentIndex + 1);
  }

  function goPrev() {
    setIndex(currentIndex - 1);
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(goNext, intervalMs);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  prevBtn.addEventListener("click", () => {
    goPrev();
    startAuto();
  });
  nextBtn.addEventListener("click", () => {
    goNext();
    startAuto();
  });

  dotButtons.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      setIndex(i);
      startAuto();
    });
  });

  if (pauseOnHover) {
    root.addEventListener("mouseenter", stopAuto);
    root.addEventListener("mouseleave", startAuto);
  }

  function onVisibilityChange() {
    if (document.hidden) stopAuto();
    else startAuto();
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  setIndex(0);
  startAuto();

  function destroy() {
    stopAuto();
    root.removeEventListener("mouseenter", stopAuto);
    root.removeEventListener("mouseleave", startAuto);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    root.remove();
  }

  return {
    goTo: setIndex,
    destroy
  };
}

export { createCarousel };
