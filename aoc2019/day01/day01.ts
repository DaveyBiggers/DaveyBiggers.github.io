import * as fs from 'fs';
import * as util from 'util';

const readFile = util.promisify(fs.readFile);
readFile("assets/day01.txt", { encoding: 'utf8' })
    .then((content) => {run(content); })
    .catch(error => console.log(error));

export default function run(data: string)
{
    let total = 0;
    let masses: number[] = data.split("\n").map(function (i) { return parseInt(i) }).filter(function(i) { return !Number.isNaN(i) });

    for (let mass of masses)
    {
        total += Math.floor(mass / 3) - 2;
    }
    console.log("PART I RESULT: ", total);
    total = 0;

    let index: number = 0;
    while (index < masses.length)
    {
        let mass: number = masses[index];
        let fuel: number = Math.floor(mass / 3) - 2;
        if (fuel > 0)
        {
            total += fuel;
            masses[index] = fuel;
        }
        else
        {
            index++;
        }
    }
    console.log("PART II RESULT: ", total);
}

