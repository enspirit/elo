declare global {
  interface Window {
    _paq: unknown[][];
  }
}

const _paq = window._paq = window._paq || [];
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);

const u = '//matomo.enspirit.be/';
_paq.push(['setTrackerUrl', u + 'matomo.php']);
_paq.push(['setSiteId', '8']);

const g = document.createElement('script');
g.async = true;
g.src = u + 'matomo.js';
document.head.appendChild(g);
