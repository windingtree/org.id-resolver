// Converting checks result to object form
module.exports.toChecksObject = checks => checks.reduce(
    (a, { type, passed, errors = [], warnings = [] }) => {
        a = {
            ...a,
            [type]: {
                passed,
                errors,
                warnings
            }
        };
        return a;
    },
    {}
);
