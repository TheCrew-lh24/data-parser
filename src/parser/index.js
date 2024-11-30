import { readFileSync } from "fs";

const _countries = Object.values(
    JSON.parse(readFileSync("./data/countries/countries.json", "utf8"))
).map((m) => {
    return m.name.toLowerCase();
});

export default class Parser {
    constructor(row) {
        this.row = row;
    }

    parseCountries(data) {
        for (const row of result.data) {
            /**
             * @type {String}
             */
            let recipient = row.party_info_unstructured ?? "";

            const countries = [];
            for (const country of _countries) {
                let countryIndex = 0;

                // Replace all occurences of country
                while (countryIndex !== -1) {
                    countryIndex = recipient.indexOf(country);

                    if (countryIndex === -1) break;

                    recipient =
                        recipient.slice(0, countryIndex).trimEnd() +
                        recipient
                            .slice(countryIndex + country.length)
                            .trimStart();

                    countries.push(country);
                }
            }

            if (countries.length == 0) {
                console.log(recipient);
            }
        }
    }
}
