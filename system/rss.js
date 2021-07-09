const RssFeedEmitter = require('rss-feed-emitter');
const { news_feed, rss_links } = require('./../data/config.json');

module.exports = {
    async execute (client) {

        const feeder = new RssFeedEmitter({ skipFirstLoad: true });
        
        for(let i in rss_links) {
            let config1 = [news_feed, rss_links[i], 20000];
            feeder.add({
                url: config1[1],
                refresh: config1[2],
                eventName: rss_links[i]
            });
            feeder.on(rss_links[i], function(item) {
                client.channels.cache.get(config1[0]).send(item.link);
            });
        }
    }
}