const axios = require('axios');

// https://twitter.com/mindsaur/status/1263529968690225152

// Configuration of the HTTP fetching method
module.exports = {
    name: 'linkedIn',
    pattern: 'twitter',
    fetch: async (uri, options) => {
        const tweetId = uri.split('/status/')[1];
        const source = axios.CancelToken.source();
        const timeout = setTimeout(() => source.cancel(
            `Cannot connect to the source: ${uri}`
        ), 7000);// connection timeout
        const response = await axios(
            {
                method: 'get',
                url: `https://api.twitter.com/2/tweets/${tweetId}`,
                headers: {
                    'Authorization': `Bearer ${options.key}`,
                    'cache-control': 'no-cache'
                },
                transformResponse: [data => data], // Do not convert JSON to object
                cancelToken: source.token
            }
        );
        clearTimeout(timeout);
        return response.data;
    }
};
