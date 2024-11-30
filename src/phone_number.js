import { readFileSync, writeFileSync } from "fs";
import * as papa from "papaparse";

const countries = Object.entries(
    JSON.parse(readFileSync("./data/countries/countries.json", "utf8"))
);

const indicators = [];
for (const [, country] of countries) {
    for (const phone of country.phone) {
        indicators.push(phone.toString());
    }
}
indicators.sort((a, b) => b.length - a.length);

// Parse CSV
const csvFilePath = "./data/external_parties_train.csv";
const csvContent = readFileSync(csvFilePath, "utf8");
const result = papa.default.parse(csvContent, { header: true });

result.meta.fields.push("phone_indicator");
result.meta.fields.push("parsed_titles");
result.meta.fields.push("clean_name");
result.meta.fields.push("abbreviated_name");
// const results = []
// const rows = {}
for (const row of result.data) {
    // ---- START NAME ---
    let name = row.parsed_name;
    if (name) {
        name = name.replace(/, */g, " ");
        row.parsed_name = name;

        // identify titles (mrs, mr, dr, ...) from the parsed name, currently we guess that anything with 2 or more letters followed by a dot is a title
        const titles = [];
        titles: {
            const matches = name.matchAll(/\w{2,}\./g);
            if (!matches) break titles;

            for (const match of matches) {
                titles.push(match[0]);
                // make a clean name
                name = name.replace(match, "");
            }
        }
        row.parsed_titles = titles.sort().join();

        // make every dot that doesn't follow with a space to follow with a space (e.g "jr.jr" becomes "jr. jr"), that way dedupe works
        name = name.trim().replace(/\.([^ ])/g, ". $1");

        // dedupe name (e.g. "john john doe" becomes "john doe")
        const name_words = name.trim().split(/ +/g);
        for (let i = 0; i < name_words.length; ) {
            const word = name_words[i];

            if (name_words.indexOf(word) == i - 1) {
                // console.log(`Removing duplicate word`, [word], "from", [name])
                name_words.splice(i, 1);
                continue;
            }

            // some entries end with iii
            if (/^i+$/.test(word)) {
                name_words.splice(i, 1);
                continue;
            }

            i++;
        }

        name = name_words.join(" ");
        row.clean_name = name;

        /*
            create abbreviated_name (e.g. "John Doe" becomes "J. Doe")
            that way we can make it so that "john doe" == "juhn doe" indirectly, we do lose some accuracy but we hope to win some
        */
        let abbreviated_name = "";
        {
            // could potentially use name_words but i'm recreating it
            // to avoid more bugs if I change name_words
            const words = name.split(" ");
            abbreviated_name = [words[0][0] + ".", ...words.slice(1)]
                .filter((f) => !!f)
                .join(" ");
        }
        row.abbreviated_name = abbreviated_name;
    }
    // ---- END NAME ---

    // ---- START PHONE ---
    row.phone_indicator = "";
    let phone = row.party_phone;
    if (phone) {
        phone = phone.replace(/[^\d+]/g, ""); // remove all non digits and plus to clean up (this does not seem to induce false positives after comparing removing different stuff or not)
        phone = phone.replace(/(\d|\+)\+/g, "$1"); // remove non-leading plus
        phone = phone.replace(/^\+?0+/, "+"); // replace leading zeros with a plus (e.g 0039 or +0039 becomes +39)

        // Add a plus sign at the beginning if it's missing
        if (phone[0] !== "+") {
            phone = "+" + phone;
        }
        // results.push(phone)

        // rows[phone] ??= []
        // rows[phone].push([
        //     row.parsed_name,
        //     row.parsed_address_street_name,
        //     row.parsed_address_city,
        //     row.parsed_address_country
        // ])

        // Identify the phone indicator by checking if the phone starts with any of the known valid country indicators
        row.party_phone = phone;
        let phone_indicator;
        for (const indicator of indicators) {
            if (phone.startsWith(`+${indicator}`)) {
                phone_indicator = indicator;
                break;
            }
        }

        // if(!phone_indicator){
        //     console.warn(`PHONE NUMBER ${phone} DOES NOT HAVE AN INDICATOR`)
        // }

        row.phone_indicator = phone_indicator ?? "";
    }
    // ---- END PHONE ---
}

writeFileSync("unparse.csv", papa.default.unparse(result));

// const frequency = {}
// for(const result of results) {
//     frequency[result] ??= 0
//     frequency[result]++
// }

// const frequencies = Object.entries(frequency)
//     .sort(([phone1, qty1], [phone2, qty2]) => qty1 - qty2)
// for(const [phone, qty] of frequencies) {
//     // console.log(qty, phone, rows[phone])
// }
