// Public GTM container ID. No secret and no Vercel environment variable required.
const GTM_ID = 'GTM-54X7Q2RH';
const enabled = import.meta.env.PROD;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function initAnalytics() {
  if (!enabled || document.querySelector('script[data-gtm]')) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.dataset.gtm = 'true';
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.appendChild(script);
}

export function trackPageview() {
  if (!enabled) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'page_view',
    page_title: document.title,
    page_location: window.location.href,
    page_path: `${window.location.pathname}${window.location.search}`,
  });
}
