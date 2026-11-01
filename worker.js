
export default {
  async fetch(request, env) {
    const exists = Boolean(env.GEOAPIFY_API_KEY);
    const length = env.GEOAPIFY_API_KEY
      ? env.GEOAPIFY_API_KEY.length
      : 0;

    return new Response(
      JSON.stringify({
        secretExists: exists,
        secretLength: length,
        message: exists
          ? "Geoapify API key is available"
          : "Geoapify API key is missing"
      }, null, 2),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
};
