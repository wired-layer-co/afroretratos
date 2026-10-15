import type { NextConfig } from "next";

// Cabecalhos de seguranca aplicados a todas as respostas. O site nao carrega
// nada de terceiros (fontes sao auto-hospedadas via next/font), entao um CSP
// restrito funciona; 'unsafe-inline' cobre os scripts de hidratacao do Next.
// Em desenvolvimento o React usa eval() para reconstruir stack traces;
// em producao ele nunca usa, entao o CSP fica estrito.
const devEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Excecao unica: beacon de Web Analytics que a Cloudflare injeta no
      // proprio dominio. Nada mais de terceiros roda na pagina.
      `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${devEval}`,
      "style-src 'self' 'unsafe-inline'",
      // data: e blob: servem a pre-visualizacao do arquivo escolhido no painel
      // (a imagem sobe recortada e vira data URL na requisicao).
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://cloudflareinsights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Imagem de produção enxuta para o Docker (server.js autocontido).
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // O painel envia a imagem ja recortada no navegador como data URL.
      bodySizeLimit: "4mb",
    },
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
  images: {
    // O otimizador do next/image depende do sharp, que nao esta disponivel no
    // runtime musl deste servidor. Os assets sao PNGs ja compactos servidos de
    // /public; desligar a otimizacao entrega o arquivo direto, sem 500.
    unoptimized: true,
    // Se o painel passar a gravar coverImage de um CDN externo, adicione o
    // host em remotePatterns antes de salvar a URL.
    remotePatterns: [],
  },
};

export default nextConfig;
