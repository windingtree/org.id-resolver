const expect = require('../../src/utils/expect');
const Web3 = require('web3');

require('chai').should();

describe('Util/Expect', () => {
    let web3;

    before(async () => {
        web3 = new Web3();
    });
    
    describe('#all', () => {

        describe('Common', () => {

            it('should export #all function', async () => {
                (expect).should.be.an('object').that.has.property('all').that.a('function');
            });

            it('should fail if data not provided', async () => {
                (() => {
                    expect.all(undefined, {
                        str: {
                            type: 'string'
                        }
                    });
                }).should.to.throw('Options for "expect.all" must be an object');
            });

            it('should fail if property not defined in the data', async () => {
                const key = 'str';
                (() => {
                    expect.all({
                        txt: 'text'
                    }, {
                        str: {
                            type: 'string'
                        }
                    });
                }).should.to.throw(`The "${key}" property not found`);
            });
        });

        describe('Model', () => {

            it('should fail if model not provided', async () => {
                (() => {
                    expect.all({
                        str: 'text'
                    }, undefined);
                }).should.to.throw('Model for "expect.all" must be an object');
            });

            it('should fail if model not contains a type property', async () => {
                (() => {
                    expect.all({
                        str: 'text'
                    }, {
                        srt: {}
                    });
                }).should.to.throw('Model property must have a "type" defined');
            });

            it('should fail if model with type enum not contains values', async () => {
                (() => {
                    expect.all({
                        enm: 'text'
                    }, {
                        enm: {
                            type: 'enum'
                        }
                    });
                }).should.to.throw('Enumerator conditions array not defined in the model');
            });
        });

        describe('Data assertsion', () => {

            describe('enum type', () => {

                it('should fail if wrong enum value has been provided', async () => {
                    const key = 'enm';
                    const model = {
                        enm: {
                            type: 'enum',
                            values: ['value2', 'value3']
                        }
                    };
                    const data = {
                        enm: 'value1'
                    };
    
                    (() => {
                        expect.all(data, model);
                    }).should.to.throw(`The value type of the "${String(key)}" property is not valid. Expected type one of ${model[key].values} but got: ${String(data[key])}`);
                });

                it('should accept enum value', async () => {
                    const model = {
                        enm: {
                            type: 'enum',
                            values: ['value2', 'value3']
                        }
                    };
    
                    (() => {
                        expect.all({
                            enm: 'value2'
                        }, model);
                    }).should.not.to.throw();
                });
            });

            describe('address type', () => {

                it('should fail if wrong address value has been provided', async () => {
                    const key = 'addr';
                    const model = {
                        addr: {
                            type: 'address'
                        }
                    };
    
                    (() => {
                        expect.all({
                            addr: '0x6C12f4A31A1A4b4257fFB77f5531'
                        }, model);
                    }).should.to.throw(`Ethereum address is required as value for the property: "${key}"`);
                });

                it('should accept address value', async () => {
                    const model = {
                        addr: {
                            type: 'address'
                        }
                    };
    
                    (() => {
                        expect.all({
                            addr: '0x6C12f4A31A1A4b4257fFB77f553156165B827822'
                        }, model);
                    }).should.not.to.throw();
                });
            });

            describe('hash type', () => {

                it('should fail if wrong hash value has been provided', async () => {
                    const key = 'hsh';
                    const model = {
                        hsh: {
                            type: 'hash'
                        }
                    };
    
                    (() => {
                        expect.all({
                            hsh: '0xd1e15bcea4bbf5fa55e36bb5aa9ad5183a'
                        }, model);
                    }).should.to.throw(`Ethereum tx hash is required as value for the property: "${key}"`);
                });

                it('should accept hash value', async () => {
                    const model = {
                        hsh: {
                            type: 'hash'
                        }
                    };
    
                    (() => {
                        expect.all({
                            hsh: '0xd1e15bcea4bbf5fa55e36bb5aa9ad5183a4acdc1b06a0f21f3dba8868dee2c99'
                        }, model);
                    }).should.not.to.throw();
                });
            });

            describe('bn type', () => {

                it('should fail if wrong BigNumber value has been provided', async () => {
                    const key = 'bnm';
                    const model = {
                        bnm: {
                            type: 'bn'
                        }
                    };
                    const data = {
                        bnm: 100
                    };
    
                    (() => {
                        expect.all(data, model);
                    }).should.to.throw(`BN instance expected as value for the property "${key}" but got: ${data[key]}`);
                });

                it('should assept BN value', async () => {
                    const model = {
                        bnm: {
                            type: 'bn'
                        }
                    };
                    const data = {
                        bnm: web3.utils.toBN('100')
                    };
    
                    (() => {
                        expect.all(data, model);
                    }).should.not.to.throw();
                });
            });

            describe('functionOrMember type', () => {

                it('should assept function value', async () => {
                    const model = {
                        fun: {
                            type: 'functionOrMember'
                        }
                    };
                    const data = {
                        fun: () => {}
                    };
    
                    (() => {
                        expect.all(data, model);
                    }).should.not.to.throw();
                });
            });

            describe('member type', () => {

                it('should fail if provider not defined', async () => {
                    const key = 'fun';
                    const model = {
                        fun: {
                            type: 'member'
                        }
                    };
                    const data = {
                        fun: () => {}
                    };
    
                    (() => {
                        expect.all(data, model);
                    }).should.to.throw(`Provider object must be defined as "provider" model option for "${key}"`);
                });

                it('should fail if wrong member value has been provided', async () => {
                    const provider = {
                        fun: () => {}
                    };
                    const model = {
                        fun: {
                            type: 'member',
                            provider
                        }
                    };
                    const data = {
                        fun: 'not-a-member'
                    };
    
                    (() => {
                        expect.all(data, model);
                    }).should.to.throw('Not a member');
                });

                it('should fail if wrong member value not a string', async () => {
                    const key = 'fun';
                    const provider = {
                        fun: () => {}
                    };
                    const model = {
                        fun: {
                            type: 'member',
                            provider
                        }
                    };
                    const data = {
                        fun: () => {}
                    };
    
                    (() => {
                        expect.all(data, model);
                    }).should.to.throw(`Property with "member" type must be a string but actually, it is a "${typeof data[key]}"`);
                });

                it('should fail if wrong member value has been provided', async () => {
                    const provider = {
                        fun: () => {}
                    };
                    const model = {
                        fun: {
                            type: 'member',
                            provider
                        }
                    };
                    const data = {
                        fun: 'fun'
                    };
    
                    (() => {
                        expect.all(data, model);
                    }).should.not.to.throw('Not a member');
                });
            });

            describe('string type', () => {

                it('should fail if wrong function value has been provided', async () => {
                    const key = 'str';
                    const model = {
                        str: {
                            type: 'string'
                        }
                    };
                    const data = {
                        str: 100
                    };
    
                    (() => {
                        expect.all(data, model);
                    }).should.to.throw(`The "${key}" property value has a wrong type: ${typeof data[key]}`);
                });

                it('should assept function value', async () => {
                    const model = {
                        str: {
                            type: 'string'
                        }
                    };
                    const data = {
                        str: 'text'
                    };
    
                    (() => {
                        expect.all(data, model);
                    }).should.not.to.throw();
                });
            });
        });
    });
});
