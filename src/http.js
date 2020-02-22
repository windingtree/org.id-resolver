const axios = require('axios');

module.exports = {
    name: 'http',
    pattern: '^http:|^https:',
    fetch: async uri => {
        const response = await axios.get(uri);
        return response.data;
    }
};
