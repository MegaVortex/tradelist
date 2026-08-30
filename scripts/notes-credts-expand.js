function maybeExpand(el) {
  const minWidth = 800;
  const width = el.getBoundingClientRect().width;

  if (width > minWidth) {
    el.classList.toggle("expanded");
  }
}