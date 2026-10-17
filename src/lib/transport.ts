/** Browser fetch in preview; Node HTTPS in CEP avoids CORS and never disables web security. */
export async function request(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const require = window.cep_node?.require;
  if (!require) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timer = setTimeout(abort, 240000);
    init.signal?.addEventListener("abort", abort, { once: true });
    if (init.signal?.aborted) controller.abort();
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener("abort", abort);
    }
  }
  const encoded = new Request(url, init);
  const bytes = new Uint8Array(await encoded.arrayBuffer());
  const Buffer = require("buffer").Buffer;
  return new Promise((resolve, reject) => {
    const req = require("https").request(
      url,
      {
        method: init.method,
        headers: Object.fromEntries(encoded.headers.entries()),
      },
      (res: any) => {
        const chunks: any[] = [];
        let size = 0;
        res.on("data", (chunk: any) => {
          size += chunk.length;
          if (size > 16 * 1024 * 1024)
            req.destroy(new Error("Provider response is too large."));
          else chunks.push(chunk);
        });
        res.on("end", () => {
          cleanup();
          resolve(
            new Response(Buffer.concat(chunks), { status: res.statusCode }),
          );
        });
        res.on("error", (error: Error) => {
          cleanup();
          reject(error);
        });
      },
    );
    const abort = () => req.destroy(new DOMException("Canceled", "AbortError"));
    const cleanup = () => init.signal?.removeEventListener("abort", abort);
    req.on("error", (error: Error) => {
      cleanup();
      reject(error);
    });
    req.setTimeout(240000, () =>
      req.destroy(new Error("Provider timed out. Retry with shorter audio.")),
    );
    init.signal?.addEventListener("abort", abort, { once: true });
    if (init.signal?.aborted) abort();
    else req.end(Buffer.from(bytes));
  });
}
