const assert = require('assert');

/**
 * Assert promise execution failure
 * @param {Object} promise Promise object to process
 * @param {boolean} [reason=null] Revert reason to compare
 */
module.exports.assertFailure = async (promise, reason = false) => {

    try {
        await promise;
        assert.fail('The assertion is fulfilled although failure was expected');
    } catch (error) {
        const reasonFoundByString = error.message
            .toLowerCase().search(reason.toLowerCase()) >= 0;
        
        if (reason) {
            assert(
                reasonFoundByString,
                `Expected "error"${reason ? ' with message "'+reason+'"' : ''}, got ${error} instead`
            );
        }
    }
};
