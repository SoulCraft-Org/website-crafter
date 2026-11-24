// The page's one demo: a dot that moves while motion is on. Each frame asks for the next only while it is on, and the
// loop starts again when the pause button lets go.
export function start(canvas) {
  const ctx = canvas.getContext("2d");
  const still = () => document.documentElement.dataset.motion === "paused";
  let x = 12;
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(x, canvas.height / 2, 12, 0, Math.PI * 2);
    ctx.fill();
  };
  const frame = () => {
    if (still()) return;
    x = (x + 2) % canvas.width;
    draw();
    requestAnimationFrame(frame);
  };
  draw();
  new MutationObserver(() => still() || requestAnimationFrame(frame)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  requestAnimationFrame(frame);
}
