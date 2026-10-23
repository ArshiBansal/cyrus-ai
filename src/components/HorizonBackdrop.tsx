/* ══ HorizonBackdrop.tsx — the two landscapes behind the hero board
   The stage carries a single photograph, and the theme the visitor is
   reading the site in decides which one: the glacier under the northern
   lights after dark, the same snow range in morning light. Nothing cycles
   and nothing is picked at random - the toggle is the only thing that
   changes the picture, so the hero and the rest of the page always agree.
   The light-mode wash lives in globals.css (.light .hero-scene img).    ═ */

export type Scene = {
  id: string;
  name: string;
  img: string;
  alt: string;
};

export const NIGHT_SCENE: Scene = {
  id: "glacier-night",
  name: "Glacier at night",
  img: "/assets/scenes/aurora.jpg",
  alt: "Northern lights over a snow-covered glacier and a frozen lake",
};

export const DAY_SCENE: Scene = {
  id: "glacier-dawn",
  name: "Glacier at dawn",
  img: "/assets/scenes/alpine.jpg",
  alt: "Snow-covered ranges under a clear dawn sky",
};

export const sceneFor = (theme: "light" | "dark"): Scene =>
  theme === "light" ? DAY_SCENE : NIGHT_SCENE;
