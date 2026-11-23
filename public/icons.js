const paths = {
  sound:
    '<path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13"/>',
  mute: '<path d="M3 9h4l5-4v14l-5-4H3z"/><path d="m16 9 5 6m0-6-5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 0 1 5 1c0 1.9-2.5 2-2.5 4m0 2.5v.2"/>',
  book: '<path d="M3 4h5c2 0 3 1 4 2 1-1 2-2 4-2h5v14h-5c-1.5 0-3 .5-4 2-1-1.5-2.5-2-4-2H3zM12 6v14"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7 3v5M17 3v5M4 11h16"/>',
  play: '<path fill="currentColor" stroke="none" d="M6 3.8c0-.6.65-.9 1.13-.59l12.6 8.05a.87.87 0 0 1 0 1.48L7.13 20.8A.73.73 0 0 1 6 20.2z"/>',
  flag: '<path d="M5 21V4m0 1c5-4 9 4 15 0v9c-6 4-10-4-15 0"/>',
  timer:
    '<circle cx="12" cy="14" r="7.5"/><path d="M12 2v4m-3-4h6m4 5 1.5-1.5M12 10v4l2 1"/>',
  depth: '<path d="M5 3v18m0-16h5m-5 5h3m-3 5h5m-5 5h3m9-16v15m-4-4 4 5 4-5"/>',
  wave: '<path d="M2 8q2.5 4 5 0t5 0 5 0 5 0M2 14q2.5 4 5 0t5 0 5 0 5 0"/>',
  list: '<rect x="5" y="3" width="15" height="18" rx="1.5"/><path d="M3 7h4M3 12h4M3 17h4M10 8h6m-6 5h6"/>',
  infinity:
    '<path d="M12 12c-2.4-3.4-4-5-6-5a5 5 0 0 0 0 10c2 0 3.6-1.5 6-5s4-5 6-5a5 5 0 0 1 0 10c-2 0-3.6-1.5-6-5z"/>',
  sonar:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 7-7"/>',
  anchor:
    '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M6 10h12M3 14c1 8 17 8 18 0M3 14v4m0-4 4 1m14-1v4m0-4-4 1"/>',
  close: '<path d="m5 5 14 14m0-14L5 19"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V4H4v12h4"/>',
  check: '<path d="m4 12 5 6L21 5"/>',
  arrowdown: '<path d="M12 3v17m-7-7 7 7 7-7"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16.5 7.5-3 6-6 3 3-6z"/>',
};
export const icon = (name, size = 18) =>
  '<svg aria-hidden="true" width="' +
  size +
  '" height="' +
  size +
  '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
  (paths[name] || "") +
  "</svg>";
