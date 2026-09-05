export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cacheKey = new Request(url.toString(), request);
    const cache = caches.default;

    // 1. Tenta buscar a resposta no cache do Cloudflare
    let response = await cache.match(cacheKey);

    if (!response) {
      // 2. Se não tiver cache, faz a requisição para o Streamlabs
      // (O limite de 100 pode ser ajustado conforme a documentação deles)
      const slReq = await fetch('https://streamlabs.com/api/v1.0/donations?limit=50&currency=BRL', {
        headers: {
          'Authorization': `Bearer ${env.STREAMLABS_TOKEN}`,
          'Accept': 'application/json'
        }
      });
      
      const slData = await slReq.json();

      // 3. Formata os dados para o que o seu ranking.js espera
      // (Aqui você precisará adaptar a lógica para separar 'monthly' e 'allTime' conforme a data, 
      // este é um exemplo básico extraindo os nomes e valores)
      const formattedData = {
        monthly: slData.data?.slice(0, 5).map(d => ({ name: d.name, amount: d.amount })) || [],
        allTime: slData.data?.slice(0, 5).map(d => ({ name: d.name, amount: d.amount })) || []
      };

      // 4. Cria a resposta com o CORS liberado para o seu GitHub Pages
      response = new Response(JSON.stringify(formattedData), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Permite que seu site leia os dados
          'Cache-Control': 's-maxage=300' // Mantém em cache por 300 segundos (5 minutos)
        }
      });

      // 5. Salva a resposta no cache para os próximos visitantes
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  }
};