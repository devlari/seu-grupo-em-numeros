# Seu grupo em números

Retrospectiva de grupos do WhatsApp no estilo Spotify Wrapped: quem fala mais, quem ri de tudo, quem some, quem manda mensagem de madrugada. Prêmios, rankings e gráficos em formato de stories, com um resumão pra compartilhar.

**Privacidade:** tudo roda no navegador. O arquivo da conversa não é enviado pra servidor nenhum, nem guardado. O site é só estático.

## Como usar

1. No celular, exporte o grupo pelo WhatsApp (**Exportar conversa → Sem mídia**).
2. Abra o site e escolha o `.txt` (Android) ou o `.zip` (iPhone).
3. Confira as pessoas em "Quem é quem?" e veja a retrospectiva.

## Desenvolvimento

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev -- --host  # pra abrir no celular, na mesma rede
npm test
npm run build        # gera dist/
```

### Testar com um export de verdade

Os testes usam conversas sintéticas. Pra conferir um export real (que **nunca** deve entrar no repositório):

```bash
WHATSAPP_EXPORT=/caminho/da/conversa.txt npm test
```

## Estrutura

| Pasta | O que tem |
|---|---|
| `src/lib/whatsapp/` | Leitura do export (`.txt`/`.zip`, Android e iPhone) num Web Worker |
| `src/lib/analysis/` | Motor de análise: números, frequência, palavras, rankings, interações, enquetes, prêmios e destaques |
| `src/components/` | Landing, "Quem é quem?", stories, relatório, gráficos (ECharts) e card de compartilhar |
| `src/siteConfig.ts` | Links do rodapé (portfólio e Buy Me a Coffee) |

## Deploy

Site estático: `npm run build` e publique a pasta `dist/` (Vercel, Netlify ou GitHub Pages).

## Deploy

Site estático na Vercel (framework Vite, comando `npm run build`, saída `dist`). O repositório é só o app, então o Root Directory fica no padrão.

- `VITE_SITE_URL` é o endereço público usado nas tags de prévia do link (`og:image` precisa de URL absoluta). Na Vercel ela sai sozinha do domínio de produção do projeto (`VERCEL_PROJECT_PRODUCTION_URL`, ver `vite.config.ts`). Fora dela, copie `.env.example` pra `.env`; sem isso o build avisa e as tags saem quebradas.
- `vercel.json` liga as URLs sem `.html` (`/privacidade`) e define os cabeçalhos de segurança. O CSP com `connect-src 'self'` é o que garante que nada sai do navegador: qualquer mudança nele precisa ser refletida em `privacidade.html`.
- Estatísticas: Vercel Web Analytics (ative no painel do projeto). Fora da Vercel, o script dele não existe e o console mostra um erro, que pode ser ignorado.
- `public/og.png` é a imagem da prévia do link (1200×630).

