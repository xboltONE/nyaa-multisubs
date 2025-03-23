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

builder.defineCatalogHandler(async ({ type, id }) => {
    if (type === 'series' && id === 'nyaa-multisubs') {
        try {
            const feed = await parser.parseURL('https://nyaa.si/?q=Multi+Subs&f=0&c=1_0&page=rss');
            const catalog = feed.items.map(item => ({
                id: item.guid,
                type: 'series',
                name: item.title,
                description: item.contentSnippet || 'Anime with multiple subtitles'
            }));
            return { metas: catalog };
        } catch (error) {
            console.error('Erro ao carregar catálogo:', error);
            return { metas: [] };
        }
    }
    return { metas: [] };
});

builder.defineStreamHandler(async ({ type, id }) => {
    try {
        const feed = await parser.parseURL('https://nyaa.si/?q=Multi+Subs&f=0&c=1_0&page=rss');
        const item = feed.items.find(i => i.guid === id);
        if (item) {
            return { streams: [{ url: item.link, title: item.title }] };
        }
        return { streams: [] };
    } catch (error) {
        console.error('Erro ao carregar stream:', error);
        return { streams: [] };
    }
});

const addon = builder.getInterface();

app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(addon.manifest);
});

app.get('/catalog/:type/:id.json', async (req, res) => {
    const result = await addon.catalogHandler(req.params);
    res.setHeader('Content-Type', 'application/json');
    res.json(result);
});

app.get('/stream/:type/:id.json', async (req, res) => {
    const result = await addon.streamHandler(req.params);
    res.setHeader('Content-Type', 'application/json');
    res.json(result);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
