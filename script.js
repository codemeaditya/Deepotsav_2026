
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(window.location.search);

  const creatorView = $("creatorView");
  const experience = $("experience");
  const notFound = $("notFound");
  const sharePanel = $("sharePanel");
  const audio = $("backgroundMusic");
  const musicToggle = $("musicToggle");
  const musicToggleText = $("musicToggleText");
  const toast = $("toast");

  const DEFAULT_MESSAGE =
    "May your home glow with happiness, peace and prosperity. May every diya bring a new reason to smile.";

  // Keep both MP3 files beside index.html.
  const musicFiles = {
    traditional: "traditional.mp3",
    celebration: "celebration.mp3"
  };

  const slides = Array.from(document.querySelectorAll(".slide"));
  const totalSlides = slides.length;

  let currentSlide = 0;
  let cameraStream = null;
  let photoData = "";
  let selectedMood = "traditional";
  let generatedGreetingUrl = "";
  let toastTimer = null;
  let musicStarted = false;
  let autoplayFallbackBound = false;

  // ---------------- GENERAL HELPERS ----------------

  function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    window.clearTimeout(toastTimer);

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  function safeText(value, fallback = "", max = 180) {
    const clean = String(value || "")
      .trim()
      .replace(/[<>]/g, "")
      .slice(0, max);

    return clean || fallback;
  }

  function normalizeMood(mood) {
    return mood === "celebration"
      ? "celebration"
      : "traditional";
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }


  // =========================================
  // MUSIC SYSTEM
  // =========================================

  function updateMusicButton(isPlaying) {
    if (!musicToggleText || !musicToggle) return;

    musicToggleText.textContent = isPlaying
      ? "Pause music"
      : "Enable music";

    musicToggle.setAttribute(
      "aria-label",
      isPlaying ? "Pause music" : "Enable music"
    );

    musicToggle.setAttribute(
      "aria-pressed",
      String(isPlaying)
    );

    musicToggle.classList.toggle("muted", !isPlaying);
  }


  function setMusicMood(mood) {
    selectedMood = normalizeMood(mood);

    if (!audio) return;

    const nextSource = musicFiles[selectedMood];
    const currentSource = audio.dataset.currentFile || "";

    if (currentSource === nextSource) return;

    audio.pause();

    audio.src = nextSource;
    audio.dataset.currentFile = nextSource;

    audio.load();

    musicStarted = false;

    updateMusicButton(false);
  }


  async function playMusic() {
    if (!audio) return false;

    if (!audio.src) {
      setMusicMood(selectedMood);
    }

    try {
      await audio.play();

      musicStarted = true;

      updateMusicButton(true);

      return true;

    } catch (error) {
      musicStarted = false;

      updateMusicButton(false);

      return false;
    }
  }


  function bindAutoplayFallback() {
    if (autoplayFallbackBound) return;

    autoplayFallbackBound = true;

    const startOnFirstInteraction = async (event) => {

      if (event.target?.closest?.("#musicToggle")) return;

      if (!musicStarted) {
        await playMusic();
      }

      if (musicStarted) {

        document.removeEventListener(
          "click",
          startOnFirstInteraction,
          true
        );

        document.removeEventListener(
          "keydown",
          startOnFirstInteraction,
          true
        );

        document.removeEventListener(
          "touchstart",
          startOnFirstInteraction,
          true
        );

        autoplayFallbackBound = false;
      }
    };

    document.addEventListener(
      "click",
      startOnFirstInteraction,
      true
    );

    document.addEventListener(
      "keydown",
      startOnFirstInteraction,
      true
    );

    document.addEventListener(
      "touchstart",
      startOnFirstInteraction,
      {
        capture: true,
        passive: true
      }
    );
  }


  async function startMusicAutomatically() {
    const started = await playMusic();

    if (!started) {

      bindAutoplayFallback();

      if (musicToggleText) {
        musicToggleText.textContent = "Tap to play music";
      }

      if (musicToggle) {
        musicToggle.setAttribute(
          "aria-label",
          "Tap to play music"
        );
      }
    }
  }


  async function toggleMusic() {

    if (!audio.src) {
      setMusicMood(selectedMood);
    }

    if (!audio.paused) {

      audio.pause();

      musicStarted = false;

      updateMusicButton(false);

      return;
    }

    const started = await playMusic();

    if (!started) {

      if (musicToggleText) {
        musicToggleText.textContent = "Try music again";
      }

      showToast(
        "Music could not start. Check that the MP3 files are beside index.html."
      );
    }
  }


  musicToggle?.addEventListener(
    "click",
    toggleMusic
  );


  audio?.addEventListener("play", () => {
    musicStarted = true;
    updateMusicButton(true);
  });


  audio?.addEventListener("pause", () => {
    musicStarted = false;
    updateMusicButton(false);
  });


  audio?.addEventListener("error", () => {
    updateMusicButton(false);

    showToast(
      "Music file not found. Keep both MP3 files beside index.html."
    );
  });


  $("musicMood")?.addEventListener(
    "change",
    async (event) => {

      setMusicMood(event.target.value);

      const started = await playMusic();

      if (!started) {
        bindAutoplayFallback();
      }
    }
  );


  // =========================================
  // PERSONALIZED GREETING LINK
  // =========================================

  function makeShareUrl(to, from, message, mood) {

    const url = new URL(window.location.href);

    url.search = "";
    url.hash = "";

    url.searchParams.set("to", to);
    url.searchParams.set("from", from);

    if (message) {
      url.searchParams.set("msg", message);
    }

    url.searchParams.set(
      "music",
      normalizeMood(mood)
    );

    return url.toString();
  }


  function openGreetingPreview(to, from, message, mood) {

    setText("recipientName", to);
    setText("senderName", from);

    setText(
      "personalMessage",
      message || DEFAULT_MESSAGE
    );

    creatorView?.classList.add("hidden");
    notFound?.classList.add("hidden");

    experience?.classList.remove("hidden");

    currentSlide = 0;

    setMusicMood(mood);

    updateSlide();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }


  $("wishForm")?.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();

      const to = safeText(
        $("recipientInput")?.value,
        "",
        45
      );

      const from = safeText(
        $("senderInput")?.value,
        "",
        45
      );

      const message = safeText(
        $("messageInput")?.value,
        "",
        180
      );

      const mood = normalizeMood(
        $("musicMood")?.value
      );


      if (!to || !from) {
        showToast("Please enter both names.");
        return;
      }


      generatedGreetingUrl = makeShareUrl(
        to,
        from,
        message,
        mood
      );


      const generatedUrl = $("generatedUrl");

      if (generatedUrl) {
        generatedUrl.value = generatedGreetingUrl;
      }


      sharePanel?.classList.remove("hidden");

      openGreetingPreview(
        to,
        from,
        message,
        mood
      );

      startMusicAutomatically();

      window.history.replaceState(
        {},
        "",
        generatedGreetingUrl
      );

      showToast(
        "Your Diwali greeting is ready. Copy or share its link below!"
      );
    }
  );


  // =========================================
  // COPY LINK & WHATSAPP
  // =========================================

  async function copyGreetingLink() {

    const input = $("generatedUrl");

    const link =
      generatedGreetingUrl ||
      input?.value ||
      window.location.href;


    try {

      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {

        await navigator.clipboard.writeText(link);

        showToast("Personalized link copied!");

      } else if (input) {

        input.focus();
        input.select();

        input.setSelectionRange(
          0,
          input.value.length
        );

        showToast(
          "Link selected. Copy it from your keyboard."
        );
      }

    } catch (error) {

      input?.focus();
      input?.select();

      showToast("Select the link and copy it.");
    }
  }


  function shareOnWhatsApp() {

    const link =
      generatedGreetingUrl ||
      window.location.href;

    const text =
      `A little Diwali surprise for you ✨\n${link}`;

    const whatsappUrl =
      `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }


  $("copyLinkBtn")?.addEventListener(
    "click",
    copyGreetingLink
  );

  $("shareAgainBtn")?.addEventListener(
    "click",
    shareOnWhatsApp
  );


  $("createAnotherBtn")?.addEventListener(
    "click",
    () => {
      window.location.href = window.location.pathname;
    }
  );


  // =========================================
  // CAMERA SYSTEM
  // =========================================

  function resetCameraControls() {

    $("cameraVideo")?.classList.add("hidden");

    $("capturedPhoto")?.classList.toggle(
      "hidden",
      !photoData
    );

    $("cameraPlaceholder")?.classList.toggle(
      "hidden",
      Boolean(photoData)
    );

    $("startCameraBtn")?.classList.toggle(
      "hidden",
      Boolean(photoData)
    );

    $("captureBtn")?.classList.add("hidden");

    $("retakeBtn")?.classList.toggle(
      "hidden",
      !photoData
    );


    setText(
      "cameraStatus",
      photoData
        ? "Photo captured. You can retake it or continue."
        : "Camera is off until you choose to turn it on."
    );
  }


  async function startCamera() {

    if (!navigator.mediaDevices?.getUserMedia) {

      setText(
        "cameraStatus",
        "Camera needs HTTPS and a supported browser."
      );

      showToast(
        "Open the deployed HTTPS website to use the camera."
      );

      return;
    }


    stopCamera();


    try {

      cameraStream =
        await navigator.mediaDevices.getUserMedia({

          video: {
            facingMode: "user"
          },

          audio: false
        });


      const video = $("cameraVideo");

      if (!video) {
        throw new Error(
          "Camera preview element is missing."
        );
      }


      video.srcObject = cameraStream;

      video.style.transform = "scaleX(-1)";
      video.style.objectFit = "cover";

      await video.play();


      video.classList.remove("hidden");

      $("cameraPlaceholder")?.classList.add("hidden");

      $("capturedPhoto")?.classList.add("hidden");

      $("startCameraBtn")?.classList.add("hidden");

      $("captureBtn")?.classList.remove("hidden");

      $("retakeBtn")?.classList.add("hidden");


      setText(
        "cameraStatus",
        "Camera is on. Your preview is mirrored for a natural selfie view."
      );


    } catch (error) {

      stopCamera();

      resetCameraControls();

      setText(
        "cameraStatus",
        "Camera unavailable or permission denied. You can continue without a photo."
      );

      showToast(
        "Camera unavailable. Check permission or skip this step."
      );
    }
  }


  function stopCamera() {

    if (cameraStream) {

      cameraStream
        .getTracks()
        .forEach((track) => track.stop());

      cameraStream = null;
    }


    const video = $("cameraVideo");

    if (video) {
      video.srcObject = null;
    }
  }


  $("startCameraBtn")?.addEventListener(
    "click",
    startCamera
  );


  // CAPTURE PHOTO

  $("captureBtn")?.addEventListener(
    "click",
    () => {

      const video = $("cameraVideo");

      if (!video?.videoWidth || !video?.videoHeight) {

        showToast(
          "Camera is still starting. Please try again."
        );

        return;
      }


      const canvas = $("cameraCanvas");

      if (!canvas) return;


      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;


      const context = canvas.getContext("2d");


      // Preview is mirrored with CSS.
      // Captured photo remains unmirrored.


context.save();

context.translate(canvas.width, 0);
context.scale(-1, 1);

context.drawImage(
  video,
  0,
  0,
  canvas.width,
  canvas.height
);

context.restore();


      photoData = canvas.toDataURL(
        "image/jpeg",
        0.92
      );


      const capturedPhoto = $("capturedPhoto");

      if (capturedPhoto) {
        capturedPhoto.src = photoData;
      }


      video.classList.add("hidden");

      $("capturedPhoto")?.classList.remove("hidden");

      $("captureBtn")?.classList.add("hidden");

      $("retakeBtn")?.classList.remove("hidden");


      setText(
        "cameraStatus",
        "Photo captured. It stays in this page unless you download or share it."
      );


      stopCamera();

      updateGreetingPhoto();
    }
  );


  // RETAKE PHOTO FROM CAMERA SLIDE

  $("retakeBtn")?.addEventListener(
    "click",
    () => {

      photoData = "";

      updateGreetingPhoto();

      resetCameraControls();
    }
  );


  // =========================================
  // GREETING PHOTO SYSTEM
  // =========================================

  function updateGreetingPhoto() {

    const image = $("greetingPhoto");

    const placeholder =
      $("greetingPhotoPlaceholder");

    const downloadButton =
      $("downloadPhotoBtn");

    const retakeButton =
      $("retakeGreetingPhotoBtn");


    if (photoData) {

      if (image) {

        image.src = photoData;

        image.classList.remove("hidden");
      }

      placeholder?.classList.add("hidden");

      downloadButton?.classList.remove("hidden");

      retakeButton?.classList.remove("hidden");

    } else {

      image?.classList.add("hidden");

      if (image) {
        image.removeAttribute("src");
      }

      placeholder?.classList.remove("hidden");

      downloadButton?.classList.add("hidden");

      retakeButton?.classList.add("hidden");
    }
  }


  // DOWNLOAD PHOTO

  $("downloadPhotoBtn")?.addEventListener(
    "click",
    () => {

      if (!photoData) {

        showToast(
          "Take a photo first to download it."
        );

        return;
      }


      const link = document.createElement("a");

      link.href = photoData;

      link.download = "deepotsav-memory.jpg";

      document.body.appendChild(link);

      link.click();

      link.remove();


      showToast(
        "Your photo download has started."
      );
    }
  );


  // RETAKE FROM GREETING SLIDE

  $("retakeGreetingPhotoBtn")?.addEventListener(
    "click",
    () => {

      photoData = "";

      updateGreetingPhoto();

      resetCameraControls();

      currentSlide = 1;

      updateSlide();

      startCamera();
    }
  );


  // =========================================
  // SLIDE NAVIGATION
  // =========================================

  function updateSlide() {

    slides.forEach((slide, index) => {

      slide.classList.toggle(
        "active",
        index === currentSlide
      );
    });


    document
      .querySelectorAll(".progress-segment")
      .forEach((segment, index) => {

        segment.classList.toggle(
          "active",
          index <= currentSlide
        );
      });


    setText(
      "slideCount",
      `${String(currentSlide + 1).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}`
    );


    const backButton = $("backBtn");
    const nextButton = $("nextBtn");


    if (backButton) {

      backButton.disabled = currentSlide === 0;

      backButton.classList.toggle(
        "hidden",
        currentSlide === 0
      );
    }


    if (nextButton) {

      nextButton.disabled =
        currentSlide === totalSlides - 1;

      nextButton.classList.toggle(
        "hidden",
        currentSlide === totalSlides - 1
      );
    }


    if (currentSlide !== 1) {
      stopCamera();
    }


    if (currentSlide === 2) {
      updateGreetingPhoto();
    }


    if (currentSlide === totalSlides - 1) {
      launchFireworks("fireworkField");
    }
  }


  function nextSlide() {

    if (currentSlide >= totalSlides - 1) return;


    if (currentSlide === 1) {

      stopCamera();

      updateGreetingPhoto();
    }


    currentSlide += 1;

    updateSlide();
  }


  function previousSlide() {

    if (currentSlide <= 0) return;

    currentSlide -= 1;

    updateSlide();


    if (currentSlide === 1 && !photoData) {
      resetCameraControls();
    }
  }


  document
    .querySelectorAll("[data-next]")
    .forEach((button) => {

      button.addEventListener(
        "click",
        nextSlide
      );
    });


  $("nextBtn")?.addEventListener(
    "click",
    nextSlide
  );


  $("backBtn")?.addEventListener(
    "click",
    previousSlide
  );


  $("restartBtn")?.addEventListener(
    "click",
    () => {

      currentSlide = 0;

      updateSlide();
    }
  );


  // =========================================
  // FIREWORKS
  // =========================================

  function launchFireworks(fieldId) {

    const field = $(fieldId);

    if (!field || field.dataset.ready) return;

    field.dataset.ready = "1";


    for (let i = 0; i < 9; i += 1) {

      const burst = document.createElement("span");

      burst.className = "firework";

      burst.style.left =
        `${8 + Math.random() * 84}%`;

      burst.style.top =
        `${8 + Math.random() * 75}%`;

      burst.style.animationDelay =
        `${Math.random() * 2.4}s`;

      field.appendChild(burst);
    }
  }


  // =========================================
  // NATIVE SHARE
  // =========================================

  $("shareBtn")?.addEventListener(
    "click",
    async () => {

      const link =
        generatedGreetingUrl ||
        window.location.href;


      const shareData = {

        title: "Happy Diwali 2026",

        text: "Wishing you light, love and happiness! ✨",

        url: link
      };


      if (navigator.share) {

        try {

          await navigator.share(shareData);

        } catch (error) {

          // User may close the native share sheet.
        }

      } else {

        $("generatedUrl").value = link;

        sharePanel?.classList.remove("hidden");

        await copyGreetingLink();
      }
    }
  );


  // =========================================
  // HOME BUTTON
  // =========================================

  $("homeBtn")?.addEventListener(
    "click",
    () => {

      window.location.href =
        window.location.pathname;
    }
  );


  // =========================================
  // INITIAL PAGE MODE
  // =========================================

  function initRecipient() {

    const to = safeText(
      params.get("to"),
      "",
      45
    );

    const from = safeText(
      params.get("from"),
      "",
      45
    );


    // CREATOR MODE

    if (!to || !from) {

      creatorView?.classList.remove("hidden");

      experience?.classList.add("hidden");

      notFound?.classList.add("hidden");

      sharePanel?.classList.add("hidden");


      setMusicMood(
        $("musicMood")?.value || "traditional"
      );

      startMusicAutomatically();

      return;
    }


    // RECIPIENT MODE

    const message = safeText(
      params.get("msg"),
      DEFAULT_MESSAGE,
      180
    );

    const mood = normalizeMood(
      params.get("music")
    );


    generatedGreetingUrl =
      window.location.href;


    setMusicMood(mood);

    sharePanel?.classList.add("hidden");


    openGreetingPreview(
      to,
      from,
      message,
      mood
    );


    startMusicAutomatically();
  }


  // =========================================
  // CAMERA CLEANUP
  // =========================================

  window.addEventListener(
    "beforeunload",
    stopCamera
  );


  document.addEventListener(
    "visibilitychange",
    () => {

      if (document.hidden) {
        stopCamera();
      }
    }
  );


  // =========================================
  // START WEBSITE
  // =========================================

  initRecipient();

})();
