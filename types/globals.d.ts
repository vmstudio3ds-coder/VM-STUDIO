// three.js r128 vem do CDN como variável global.
declare const THREE: any;

// Propriedades extras que o site anexa a elementos do DOM.
interface HTMLVideoElement {
  _want?: string;
  _fb?: string;
  webkitEnterFullscreen?: () => void;
}
interface HTMLImageElement {
  _r?: Promise<unknown>;
}
interface Window {
  _lt?: number;
}
