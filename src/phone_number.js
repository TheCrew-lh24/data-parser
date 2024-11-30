import { readFileSync, writeFileSync } from "fs";
import * as papa from "papaparse";

const countries = Object.entries(
    JSON.parse(readFileSync("./data/countries/countries.json", "utf8"))
)

const indicators = []
for(const [, country] of countries){
    for(const phone of country.phone){
        indicators.push(phone.toString())
    }
}
indicators.sort((a, b) => b.length - a.length)

// Parse CSV
const csvFilePath = "./data/external_parties_train.csv";
const csvContent = readFileSync(csvFilePath, "utf8");
const result = papa.default.parse(csvContent, { header: true });

result.meta.fields.push("phone_indicator")
result.meta.fields.push("parsed_titles")
result.meta.fields.push("clean_name")
const results = []
const rows = {}
for (const row of result.data) {
    // ---- START NAME ---
    let name = row.parsed_name
    if(name) {
        name = name.replace(/, */g, " ")
        row.parsed_name = name

        // identify titles from the parsed name
        const titles = []
        titles: {
            const matches = name.matchAll(/\w{2,}\./g)
            if(!matches) break titles

            for(const match of matches) {
                titles.push(match[0])
                // make a clean name
                name = name.replace(match, "")
            }
        }
        row.parsed_titles = titles.sort().join()
        row.clean_name = name.replace(/ {2,}/g, " ").trim()
    }
    // ---- END NAME ---

    // ---- START PHONE ---
    row.phone_indicator = ""
    let phone = row.party_phone
    if(phone) {
        phone = phone.replace(/[^\d+]/g, "")
        phone = phone.replace(/(\d|\+)\+/g, "$1")
        phone = phone.replace(/^0+/, "+")
        phone = phone.replace(/^([^+])/, "+$1")
        phone = phone.replace(/^\+0+/, "+")
        
        results.push(phone)
    
        rows[phone] ??= []
        rows[phone].push([
            row.parsed_name,
            row.parsed_address_street_name,
            row.parsed_address_city,
            row.parsed_address_country
        ])
    
        row.party_phone = phone
        let phone_indicator
        for(const indicator of indicators){
            if(phone.startsWith(`+${indicator}`)){
                phone_indicator = indicator
                break
            }
        }
    
        // if(!phone_indicator){
        //     console.warn(`PHONE NUMBER ${phone} DOES NOT HAVE AN INDICATOR`)
        // }
    
        row.phone_indicator = phone_indicator ?? ""
    }
    // ---- END PHONE ---
}

writeFileSync("unparse.csv", papa.default.unparse(result))



const frequency = {}
for(const result of results) {
    frequency[result] ??= 0
    frequency[result]++
}

const frequencies = Object.entries(frequency)
    .sort(([phone1, qty1], [phone2, qty2]) => qty1 - qty2)
for(const [phone, qty] of frequencies) {
    console.log(qty, phone, rows[phone])
}