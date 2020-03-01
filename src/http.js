const axios = require('axios');

// Configuration of the HTTP fetching method
module.exports = {
    name: 'http',
    pattern: '^http:|^https:',
    fetch: async uri => {
        const source = axios.CancelToken.source();
        const timeout = setTimeout(() => source.cancel(
            `Cannot connect to the source: ${uri}`
        ), 5000);// connection timeout
        const response = await axios.get(uri, {
            transformResponse: [(data) => { return data; }], // Do not convert JSON to object
            cancelToken: source.token
        });
        clearTimeout(timeout);
        return response.data;
    }
};
