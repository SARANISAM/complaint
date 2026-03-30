// Initialize Smooth Scroll (Lenis)
const lenis = new Lenis();
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Global Entrance Animation (Runs on every page load)
window.addEventListener('load', () => {
  // Selects cards, boxes, and headings to fade them in
  gsap.from(".resolve-card, .login-box, h1", {
    y: 20,
    opacity: 0,
    duration: 1,
    stagger: 0.1,
    ease: "power3.out"
  });
});