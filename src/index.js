import { readFileSync } from "fs";

import Parser from "./parser/index.js";

import * as papa from "papaparse";

// Parse CSV
const csvFilePath = "./data/external_parties_train.csv";
const csvContent = readFileSync(csvFilePath, "utf8");
const result = papa.default.parse(csvContent, { header: true });

for (const row of result.data) {
    const parser = new Parser(row);

    console.log(parser);
}
