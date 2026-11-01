
export default {
  async fetch(request, env) {
    return new Response(
      JSON.stringify({
        testSecretExists: Boolean(env.TEST_SECRET),
        testSecretLength: env.TEST_SECRET?.length || 0,
        geoapifySecretExists: Boolean(env.GEOAPIFY_API_KEY),
        geoapifySecretLength: env.GEOAPIFY_API_KEY?.length || 0
      }, null, 2),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      }
    );
  }
};