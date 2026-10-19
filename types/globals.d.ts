// three.js r128 vem do CDN como variável global.
declare const THREE: any;

// Propriedades extras que o site anexa a elementos do DOM.
interface HTMLVideoElement {
  _want?: string;
  _fb?: string;
  /** Parte do filme carregada neste vídeo (player com dois vídeos). */
  _i?: number;
  webkitEnterFullscreen?: () => void;
}
interface HTMLImageElement {
  _r?: Promise<unknown>;
}
interface Window {
  /** Media Source do Safari/iPhone (iOS 17.1+). */
  ManagedMediaSource?: typeof MediaSource;
  _lt?: number;
}
