const whois = require('whois-light');

const replacements = {
    'Domain Name': 'domainName',
    'Registry Domain ID': 'registryDomainId',
    'Registrar WHOIS Server': 'registrarWhoisServer',
    'Registrar URL': 'registrarUrl',
    'Updated Date': 'updatedDate',
    'Creation Date': 'creationDate',
    'Registry Expiry Date': 'expiryDate',
    'Registrar': 'registrar',
    'Registrar IANA ID': 'registrarIanaId',
    'Registrar Abuse Contact Email': 'registrarAbuseContactEmail',
    'Registrar Abuse Contact Phone': 'registrarAbuseContactPhone',
    'Domain Status': 'domainStatus',
    'Name Server': 'nameServer',
    'DNSSEC': 'DNSSEC'
};

// Configuration of the HTTP fetching method
module.exports = {
    name: 'whois',
    fetch: async (domainName) => {
        let domainResolution = await whois.lookup(domainName);
        return domainResolution
            .split('\r\n')
            .map(l => l.trim())
            .reduce(
                (a, v) => {
                    v = v.replace('>>> ', '');
                    v = v.replace(' <<<', '');
                    if (v !== '') {
                        v = v.split(': ');
                        if (v.length > 1 && replacements[v[0]]) {
                            a[replacements[v[0]]] = v[1];
                        }
                    }
                    return a;
                },
                {}
            );
    }
};
