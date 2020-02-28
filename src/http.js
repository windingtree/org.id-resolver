const axios = require('axios');
const source = axios.CancelToken.source();

// Configuration of the HTTP fetching method
module.exports = {
    name: 'http',
    pattern: '^http:|^https:',
    fetch: async uri => {
        setTimeout(() => source.cancel(
            `Cannot connect to the source: ${uri}`
        ), 5000);// connection timeout
        const response = await axios.get(uri, { cancelToken: source.token });
        return response.data;
    }
};
