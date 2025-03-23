const { addonBuilder } = require('stremio-addon-sdk');
const Parser = require('rss-parser');
const express = require('express');

const parser = new Parser();
const app = express();

const manifest = {
    id: 'com.yourname.nyaa-multisubs',
    version: '1.0.0',
    name: 'Nyaa Multi Subs',
    description: 'Anime torrents with multiple subtitles from Nyaa.si',
    resources: ['catalog', 'stream'],
    types: ['series'],
    catalogs: [{ type: 'series', id: 'nyaa-multisubs' }]
};

const builder = new addonBuilder(manifest);

// Função para lidar com o catálogo
const handleCatalog = async ({ type, id }) => {
    console.log(`Recebida requisição para type=${type}, id=${id}`);
    if (type === 'series' && id === 'nyaa-multisubs') {
        try {
            console.log('Tentando carregar o feed do Nyaa.si...');
            const feed = await parser.parseURL('https://nyaa.si/?q=Multi+Subs&f=0&c=1_0&page=rss');
            if (!feed || !feed.items) {
                console.error('Feed inválido ou vazio:', feed);
                return { metas: [] };
            }
            console.log(`Feed carregado com ${feed.items.length} itens`);
            const catalog = feed.items.map(item => {
                if (!item.guid || !item.title) {
                    console.warn('Item inválido no feed:', item);
                    return null;
                }
                return {
                    id: item.guid,
                    type: 'series',
                    name: item.title,
                    description: item.contentSnippet || 'Anime with multiple subtitles'
                };
            }).filter(item => item !== null);
            console.log(`Catálogo gerado com ${catalog.length} itens`);
            return { metas: catalog };
        } catch (error) {
            console.error('Erro ao carregar catálogo:', error.message, error.stack);
            return { metas: [] };
        }
    }
    console.log('Type ou ID não correspondem, retornando catálogo vazio');
    return { metas: [] };
};

// Função para lidar com o stream
const handleStream = async ({ type, id }) => {
    console.log(`Recebida requisição de stream para type=${type}, id=${id}`);
    try {
        console.log('Tentando carregar o feed do Nyaa.si para stream...');
        const feed = await parser.parseURL('https://nyaa.si/?q=Multi+Subs&f=0&c=1_0&page=rss');
        if (!feed || !feed.items) {
            console.error('Feed inválido ou vazio para stream:', feed);
            return { streams: [] };
        }
        console.log(`Feed carregado com ${feed.items.length} itens para stream`);
        const item = feed.items.find(i => i.guid === id);
        if (item) {
            console.log(`Stream encontrado: ${item.title}`);
            // Extrair o hash do torrent da descrição (ex.: "48dcb808054040d78cef78804c0d43ceefe62509")
            const hashMatch = item.contentSnippet.match(/[a-fA-F0-9]{40}/);
            if (!hashMatch) {
                console.error('Hash do torrent não encontrado na descrição:', item.contentSnippet);
                return { streams: [] };
            }
            const torrentHash = hashMatch[0];
            // Construir o magnet link
            const magnetLink = `magnet:?xt=urn:btih:${torrentHash}&dn=${encodeURIComponent(item.title)}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://tracker.openbittorrent.com:6969/announce`;
            console.log(`Magnet link gerado: ${magnetLink}`);
            return { streams: [{ name: item.title, url: magnetLink }] };
        }
        console.log('Nenhum item encontrado para o ID fornecido');
        return { streams: [] };
    } catch (error) {
        console.error('Erro ao carregar stream:', error.message, error.stack);
        return { streams: [] };
    }
};

// Definir os handlers apenas uma vez
builder.defineCatalogHandler(handleCatalog);
builder.defineStreamHandler(handleStream);

// Rota para o manifest
app.get('/manifest.json', (req, res) => {
    console.log('Requisição recebida para /manifest.json');
    res.setHeader('Content-Type', 'application/json');
    res.json(manifest);
});

// Rota para o catálogo
app.get('/catalog/:type/:id.json', async (req, res) => {
    console.log('Requisição recebida para /catalog');
    try {
        const result = await handleCatalog({ type: req.params.type, id: req.params.id });
        res.setHeader('Content-Type', 'application/json');
        res.json(result);
    } catch (error) {
        console.error('Erro ao processar requisição /catalog:', error.message, error.stack);
        res.status(500).json({ error: 'Erro interno ao carregar o catálogo', details: error.message });
    }
});

// Rota para o stream
app.get('/stream/:type/:id.json', async (req, res) => {
    console.log('Requisição recebida para /stream');
    try {
        const result = await handleStream({ type: req.params.type, id: req.params.id });
        res.setHeader('Content-Type', 'application/json');
        res.json(result);
    } catch (error) {
        console.error('Erro ao processar requisição /stream:', error.message, error.stack);
        res.status(500).json({ error: 'Erro interno ao carregar o stream', details: error.message });
    }
});

// Rota para a raiz
app.get('/', (req, res) => {
    console.log('Requisição recebida para /');
    res.send('Add-on do Stremio ativo. Use /manifest.json para acessar o manifest.');
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
