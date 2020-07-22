const Ajv = require('ajv');
const schema = require('org.json-schema-0.3');
const schema4 = require('org.json-schema-0.4');
const jsonFile = require('../../assets/legalEntity.json');
const jsonFile4 = require('../../assets/legalEntity04.json');
const jsonFileNotValid = require('../../assets/legalEntityNotValid.json');

require('chai').should();

describe('Validator', () => {
    let ajv;
    const versions = [
        {
            name: 'schema0.3',
            file: schema,
            json: jsonFile
        },
        {
            name: 'schema0.4',
            file: schema4,
            json: jsonFile4
        }
    ];
    
    beforeEach(async () => {
        ajv = new Ajv();
    });

    describe('#validate', () => {

        versions.forEach(({ name, file, json }) => {

            it(`should fail if json file not meets ${name} schema`, async () => {
                const result = ajv.validate(file, jsonFileNotValid);
                (result).should.be.false;
            });
    
            it(`should validate json file against ${name} schema`, async () => {
                const result = ajv.validate(file, json);
                (result).should.be.true;
            });
        });
    });
});
