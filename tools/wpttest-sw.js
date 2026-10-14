// Service worker for the WPT waterfall-indicator test page.
// Stays minimal and stateless — every behavior is keyed off the request URL.
//
// What it does:
//   1. install   — issues a fetch('?label=sw-install') so we get a worker-
//                  context request with target_type:service_worker
//   2. activate  — takes control of the page immediately (so the first run
//                  of the test page already sees the SW intercepting)
//   3. message   — when the page posts {kind:'fetch-from-sw'}, makes a
//                  fetch('?label=sw-message') from inside the SW
//   4. fetch     — for requests whose URL has ?intercepted=1, responds with
//                  a synthetic response from the SW (gets fromServiceWorker
//                  + worker* timings + serviceWorkerResponseSource).
//                  For ?intercepted=passthrough, forwards to the network
//                  via fetch(event.request) — same SW signals, real response.
//                  For everything else, does NOT call respondWith, so the
//                  browser handles the request normally.

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      await fetch('./wpttest-ping.json?label=sw-install');
    } catch (_) { /* network may fail in some envs, ignore */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.kind === 'fetch-from-sw') {
    event.waitUntil(
      fetch('./wpttest-ping.json?label=sw-message').catch(() => {})
    );
  }
});

self.addEventListener('fetch', (event) => {
  const url  = new URL(event.request.url);
  const mode = url.searchParams.get('intercepted');
  if (!mode) {
    return; // not ours — let the browser handle it
  }
  if (mode === '1') {
    // Synthesize a response entirely from the SW.
    event.respondWith(
      new Response(
        JSON.stringify({ intercepted: true, mode: 'respond' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  } else if (mode === 'passthrough') {
    // Forward to network — request still gets flagged as fromServiceWorker.
    event.respondWith(fetch(event.request));
  }
});
