"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);
readFile("assets/day01.txt", { encoding: 'utf8' })
    .then((content) => { run(content); })
    .catch(error => console.log(error));
function run(data) {
    let total = 0;
    let masses = data.split("\n").map(function (i) { return parseInt(i); }).filter(function (i) { return !Number.isNaN(i); });
    for (let mass of masses) {
        total += Math.floor(mass / 3) - 2;
    }
    console.log("PART I RESULT: ", total);
    total = 0;
    let index = 0;
    while (index < masses.length) {
        let mass = masses[index];
        let fuel = Math.floor(mass / 3) - 2;
        if (fuel > 0) {
            total += fuel;
            masses[index] = fuel;
        }
        else {
            index++;
        }
    }
    console.log("PART II RESULT: ", total);
}
exports.default = run;
//# sourceMappingURL=day01.js.map