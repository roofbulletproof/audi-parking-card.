
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));

    const distance = url.searchParams.get("distance") || "Не указано";
    const duration = url.searchParams.get("time") || "Не указано";

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 85.0511 ||
      Math.abs(lon) > 180
    ) {
      return new Response("Invalid coordinates", { status: 400 });
    }

    if (!env.GEOAPIFY_API_KEY) {
      return new Response("Geoapify API key is missing", { status: 500 });
    }

    const mapUrl = new URL(
      "https://maps.geoapify.com/v1/staticmap"
    );

    mapUrl.searchParams.set("style", "osm-bright");
    mapUrl.searchParams.set("width", "768");
    mapUrl.searchParams.set("height", "512");
    mapUrl.searchParams.set("center", `lonlat:${lon},${lat}`);
    mapUrl.searchParams.set("zoom", "16");
    mapUrl.searchParams.set("format", "png");
    mapUrl.searchParams.set(
      "marker",
      `lonlat:${lon},${lat};type:circle;color:%23e53935;size:24;strokecolor:%23ffffff`
    );
    mapUrl.searchParams.set("apiKey", env.GEOAPIFY_API_KEY);

    let mapResponse;

    try {
      mapResponse = await fetch(mapUrl.toString());
    } catch {
      return new Response("Geoapify connection failed", { status: 502 });
    }

    if (!mapResponse.ok) {
      return new Response(
        `Geoapify error: ${mapResponse.status} ${await mapResponse.text()}`,
        { status: 502 }
      );
    }

    const mapBytes = new Uint8Array(await mapResponse.arrayBuffer());

    function toBase64(bytes) {
      let binary = "";
      const chunkSize = 8192;

      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(
          ...bytes.subarray(i, i + chunkSize)
        );
      }

      return btoa(binary);
    }

    function esc(value) {
      return String(value).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;"
      })[c]);
    }

    const mapBase64 = toBase64(mapBytes);

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="768" height="700"
         viewBox="0 0 768 700">

      <image
        href="data:image/png;base64,${mapBase64}"
        x="0" y="0"
        width="768" height="512"
      />

      <rect x="0" y="512" width="768" height="188"
            fill="#17191d"/>

      <text x="36" y="557" fill="#ffffff"
            font-size="23" font-family="Arial" font-weight="bold">
        МЕСТО ПАРКОВКИ
      </text>

      <text x="36" y="615" fill="#aaaaaa"
            font-size="19" font-family="Arial">
        РАССТОЯНИЕ
      </text>

      <text x="36" y="657" fill="#ffffff"
            font-size="30" font-family="Arial" font-weight="bold">
        ${esc(distance)}
      </text>

      <text x="420" y="615" fill="#aaaaaa"
            font-size="19" font-family="Arial">
        ВРЕМЯ В ПУТИ
      </text>

      <text x="420" y="657" fill="#ffffff"
            font-size="30" font-family="Arial" font-weight="bold">
        ${esc(duration)}
      </text>

      <text x="384" y="690" text-anchor="middle"
            fill="#aaaaaa" font-size="11" font-family="Arial">
        © Geoapify | © OpenStreetMap contributors
      </text>
    </svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }
};
