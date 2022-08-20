import { initThemeChangeEvent } from "./theme";

/**
 * This file is imported in Stencil's `globalScript` config option.
 *
 * @see {@link https://stenciljs.com/docs/config#globalscript}
 */
export default function (): void {
  if (isBrowser()) {
    if (document.readyState === "interactive") {
      initThemeChangeEvent();
    } else {
      document.addEventListener("DOMContentLoaded", () => initThemeChangeEvent(), { once: true });
    }
  }
}

const isBrowser = new Function("try {return this===window;}catch(e){ return false;}");