/**
 * Shared pieces for the Swarm Rebuild effect that must exist BEFORE React hydrates.
 *
 * The server-rendered HTML is never modified by the effect: all content is present and
 * visible there. For first-time visitors who are eligible for the full entrance, a tiny
 * inline script (BOOT_SCRIPT, in <head>) adds the class `sr-boot` to <html>. CSS then
 * paints an opaque cover over the page (not hiding it from the DOM) until the effect's
 * own scan screen takes over, which avoids a flash of the finished page. If the effect
 * never takes over (bundle fails to load, an error, anything) the class is removed
 * after 4 seconds, so a visitor can never be left looking at a blank page.
 *
 * Without JavaScript none of this runs: no class, no cover, nothing hidden.
 *
 * URL switches (useful for testing and demos):
 *   ?sr=off    never run the effect
 *   ?sr=force  run the full entrance even on a repeat visit or in an automated browser
 */

/** sessionStorage key: set once the entrance has played (or was skipped) in this session. */
export const SR_STORAGE_KEY = "sr-played";

/** Visitors that should always get the plain page. */
export const SR_BOT_PATTERN =
  "bot|crawl|spider|lighthouse|headless|prerender|slurp|facebookexternalhit";

/**
 * Inline script for <head>. Keep it dependency free and wrapped in try/catch: it must
 * never be able to break the page. Mirrors the eligibility checks in SwarmRebuild.tsx.
 */
export const BOOT_SCRIPT = `(function(){try{
var d=document.documentElement;
var q=new URLSearchParams(location.search).get('sr');
if(q==='off')return;
var mm=function(s){return window.matchMedia&&window.matchMedia(s).matches};
if(mm('(prefers-reduced-motion: reduce)'))return;
if(mm('(hover: none), (pointer: coarse)'))return;
if(q!=='force'){
if(navigator.webdriver||/${SR_BOT_PATTERN}/i.test(navigator.userAgent))return;
if(sessionStorage.getItem('${SR_STORAGE_KEY}'))return;
}
d.classList.add('sr-boot');
setTimeout(function(){d.classList.remove('sr-boot')},4000);
}catch(e){}})();`;

/**
 * Shown only when JavaScript is disabled. The Framer Motion entrance animations render
 * their hidden starting state (inline `opacity:0` + a transform) into the server HTML;
 * without JS nothing would ever animate them in, so force them visible.
 */
export const NOSCRIPT_CSS =
  '[style*="opacity:0"]{opacity:1!important;transform:none!important}';
