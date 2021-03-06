const axios = require('axios');

// Configuration of the HTTP fetching method
module.exports = {
    name: 'http',
    pattern: '^http:|^https:',
    fetch: async uri => {
        const source = axios.CancelToken.source();
        const timeout = setTimeout(() => source.cancel(
            `Cannot connect to the source: ${uri}`
        ), 7000);// connection timeout
        const response = await axios.get(uri, {
            transformResponse: [data => data], // Do not convert JSON to object
            cancelToken: source.token
        });
        clearTimeout(timeout);
        return response.data;
    }
};
