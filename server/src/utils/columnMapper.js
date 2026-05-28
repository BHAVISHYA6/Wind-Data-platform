const aliasMap = {
	datetime: 'timestamp',
	'100mnavgms': 'windSpeed100m',
	'80mavgms': 'windSpeed80m',
	temp5mc: 'temperature',
	hum5m: 'humidity',
};

const normalizeHeader = (header) =>
	header
		.toString()
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '')
		.replace(/[^a-z0-9]/g, '');

const toCamelCase = (value) =>
	value.replace(/[-_]+([a-z0-9])/g, (_, character) => character.toUpperCase());

const mapHeader = (header) => {
	const normalizedHeader = normalizeHeader(header);
	if (aliasMap[normalizedHeader]) {
		return aliasMap[normalizedHeader];
	}

	if (!normalizedHeader) {
		return normalizedHeader || header;
	}

	return toCamelCase(normalizedHeader);
};

const mapWindTurbineCsvRows = (rows = []) =>
	rows.map((row) => {
		return Object.entries(row).reduce((mappedRow, [key, value]) => {
			const mappedKey = mapHeader(key);
			mappedRow[mappedKey] = value;
			return mappedRow;
		}, {});
	});

module.exports = {
	aliasMap,
	normalizeHeader,
	mapHeader,
	mapWindTurbineCsvRows,
};
