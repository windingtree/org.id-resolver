const axios = require('axios');

// Configuration of the HTTP fetching method
module.exports = {
    name: 'http',
    pattern: '^http:|^https:',
    fetch: async uri => {
        const response = await axios.get(uri);
        return response.data;
    }
};
