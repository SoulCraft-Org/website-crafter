// The one site-wide pause button (WCAG 2.2 SC 2.2.2). It sets html[data-motion=paused], which styles.css and the demo
// read. Its name stays "Pause motion"; aria-pressed says whether it is on. The choice is kept in localStorage.
const root = document.documentElement;
for (const button of document.querySelectorAll("[data-motion-toggle]")) {
  const show = () => button.setAttribute("aria-pressed", String(root.dataset.motion === "paused"));
  show();
  button.addEventListener("click", () => {
    const paused = root.dataset.motion !== "paused";
    if (paused) root.dataset.motion = "paused";
    else delete root.dataset.motion;
    try {
      localStorage.setItem("motion", paused ? "paused" : "play");
    } catch {}
    show();
  });
}
