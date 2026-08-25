const CANONICAL_ORIGIN = 'https://cinemoriq-os.plum-jay-8118.chatgpt.site';

const redirectWorker = {
  fetch(request: Request) {
    const incomingUrl = new URL(request.url);
    const destination = new URL(
      `${incomingUrl.pathname}${incomingUrl.search}`,
      CANONICAL_ORIGIN,
    );

    return new Response(null, {
      status: 307,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        Location: destination.toString(),
        'Referrer-Policy': 'no-referrer',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    });
  },
};

export default redirectWorker;
