
export default {
  async fetch(request) {
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

    const zoom = 16;
    const tileCount = 2 ** zoom;
    const width = 768;
    const mapHeight = 512;

    const centerX = (lon + 180) / 360 * tileCount * 256;
    const latRad = lat * Math.PI / 180;
    const centerY =
      (1 - Math.asinh(Math.tan(latRad)) / Math.PI) /
      2 * tileCount * 256;

    const left = centerX - width / 2;
    const top = centerY - mapHeight / 2;

    const startX = Math.floor(left / 256);
    const endX = Math.floor((left + width) / 256);
    const startY = Math.floor(top / 256);
    const endY = Math.floor((top + mapHeight) / 256);

    function toBase64(buffer) {
      const bytes = new Uint8Array(buffer);
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

    const jobs = [];

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        if (y < 0 || y >= tileCount) continue;

        const tileX = ((x % tileCount) + tileCount) % tileCount;
        const px = x * 256 - left;
        const py = y * 256 - top;

        jobs.push(
          (async () => {
            const tileUrl =
              `https://tile.openstreetmap.org/${zoom}/${tileX}/${y}.png`;

            const response = await fetch(tileUrl, {
              headers: { "Accept": "image/png" }
            });

            if (!response.ok) {
              throw new Error(`Map tile error: ${response.status}`);
            }

            const base64 = toBase64(await response.arrayBuffer());

            return `
              <image
                href="data:image/png;base64,${base64}"
                x="${px}" y="${py}"
                width="256" height="256"
              />`;
          })()
        );
      }
    }

    let tiles;

    try {
      tiles = (await Promise.all(jobs)).join("");
    } catch (error) {
      return new Response("Map loading failed: " + error.message, {
        status: 502
      });
    }

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="768" height="700"
         viewBox="0 0 768 700">

      <rect width="768" height="700" fill="#ffffff"/>

      <svg x="0" y="0" width="768" height="512"
           viewBox="0 0 768 512">
        ${tiles}
      </svg>

      <circle cx="384" cy="256" r="22"
              fill="#e53935" fill-opacity="0.2"/>
      <circle cx="384" cy="256" r="10"
              fill="#e53935" stroke="white" stroke-width="4"/>

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
        © OpenStreetMap contributors
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
