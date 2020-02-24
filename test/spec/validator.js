const Ajv = require('ajv');
const schema = require('@windingtree/org.json-schema');
const jsonFile = require('../../assets/legalEntity.json');
const jsonFileNotValid = require('../../assets/legalEntityNotValid.json');

require('chai').should();

describe('Validator', () => {
    let ajv;
    
    before(async () => {
        ajv = new Ajv();
    });

    describe('#validate', () => {

        it('should fail if json file not meets schema', async () => {
            (ajv.validate(schema, jsonFileNotValid)).should.be.false;
        });

        it('should validate json file against schema', async () => {
            (ajv.validate(schema, jsonFile)).should.be.true;
        });
    });
});
