const axios = require('axios');

// Configuration of the HTTP fetching method
module.exports = {
    name: 'linkedin',
    pattern: 'linkedin',
    fetch: async (uri, options) => {
        const activityId = uri.split(':activity:')[1];
        const source = axios.CancelToken.source();
        const timeout = setTimeout(() => source.cancel(
            `Cannot connect to the source: ${uri}`
        ), 7000);// connection timeout
        const response = await axios(
            {
                method: 'get',
                url: `https://api.linkedin.com/v2/activities?ids=List(${activityId})`,
                headers: {
                    'Authorization': `Bearer ${options.key}`,
                    'cache-control': 'no-cache',
                    'X-Restli-Protocol-Version': '2.0.0'
                },
                transformResponse: [data => data], // Do not convert JSON to object
                cancelToken: source.token
            }
        );
        clearTimeout(timeout);
        console.log('@@@@@@@@@@@@@@@@@@@@@', response);
        return response.data;
    }
};
