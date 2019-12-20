import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';

const readFile = util.promisify(fs.readFile);
readFile("assets/day16.txt", { encoding: 'utf8' })
    .then((content) => {run(content); })
    .catch(error => console.log(error));

export function multiplier(input_ind:number, output_ind:number) : number
{
    let ind = Math.floor((input_ind + 1) / (output_ind + 1)) % 4;
    return [0, 1, 0, -1][ind];
}

/*
export function dupmultiplier(input_ind:number, output_ind:number) : number
{
    // Input is repeated every 650 digits, 10,000 times.
    // So each input_ind is multplied 10,000 times...
    // But by what?
    // The multiplier sequence [0,1,0,-1] has a length of 4*(output_ind+1)
    // eg for output digit 0, it's [0,1,0,-1];
    // for digit 1, it's [0,0,1,1,0,0,-1,-1];
    // So how does 4*(output_ind+1) divide into 650?
    let mult_sequence_length = 4 * (output_ind + 1);
    let offset = 650 % mult_sequence_length;
    // Each time we skip forward 650 places in the input sequence,
    // we skip forward "offset" steps in the multiplier sequence.

}
*/

export function getmultipliers(output_ind: number) : number[]
{
    // Input is repeated every 650 digits, 10,000 times.
    // So each input_ind is multplied 10,000 times...
    // But by what?
    // The multiplier sequence [0,1,0,-1] has a length of 4*(output_ind+1)
    // eg for output digit 0, it's [0,1,0,-1];
    // for digit 1, it's [0,0,1,1,0,0,-1,-1];
    // So how does 4*(output_ind+1) divide into 650?
    let mult_sequence_length = 4 * (output_ind + 1);
    let offset = 650 % mult_sequence_length;
    // Each time we skip forward 650 places in the input sequence,
    // we skip forward "offset" steps in the multiplier sequence.
    let mults : number[] = [];

    for (let i = 0; i < 650; i++)
    {
        let start_ind = Math.floor((i + 1) / (output_ind + 1)) % 4;
        let start_mult = [0, 1, 0, -1][start_ind];
        if (offset === 0)
            mults.push(start_mult * 10000);
        else
        {
            let sum = 0;
            for (let r = 0; r < 10000; r++)
            {
                sum += multiplier(i + (650 * r), output_ind);
            }
            mults.push(sum);
        }
    }
    return mults;
}

export default function run(data: string)
{
    let sub_digits: number[] = data.split("").map(function (i) { return parseInt(i) }).filter(function(i) { return !Number.isNaN(i) });
    console.log("Program length:", sub_digits.length);
    console.log(sub_digits.join(","));

    //let address = 5970927;
    //let mults = getmultipliers(address);
    //for (let address = 5970927; address < 5970927 + 8; address++)
    //{

    //}
    //for (let o = 0; o < 3; o++)
    //    console.log(multiplier(0, o), multiplier(1, o), multiplier(2, o), multiplier(3, o), multiplier(4, o), multiplier(5, o), multiplier(6, o), multiplier(7, o));

    let digits :number[] = [];
    for (let i = 0; i < 10000; i++)
    {
        for (let d of sub_digits)
        {
            digits.push(d);
        }
    }
    console.log(digits.length);

    for (let pass = 0; pass < 100; pass++)
    {
        let output_digits = Array<number>(digits.length).fill(0);
        output_digits[digits.length - 1] = digits[digits.length - 1];
        for (let ind = digits.length - 2; ind >= 5970927; ind--)
        {
            output_digits[ind] = (output_digits[ind + 1] + digits[ind]) % 10;
        }
        digits = [...output_digits];
        console.log("Phase", pass, "complete");
        console.log(digits.slice(5970927, 5970927+9).join(""));
        //console.log(digits.join(""));
    }
    console.log(digits.slice(5970927, 5970927+9).join(""));
    return;

    /*
    let output_digits = Array<number>(digits.length).fill(0);
    output_digits[digits.length - 1] = digits[digits.length - 1];
    for (let ind = sub_digits.length - 2; ind >= 0; ind--)
    {
        output_digits[ind] = (output_digits[ind + 1] * 100 + digits[ind]) % 10;
    }
    digits = [...output_digits];
    console.log(digits.join(""));
    */

    for (let phase = 0; phase < 100; phase++)
    {
        //console.log("Phase:", phase);
        let output_digits: number[] = []
        for (let o = 0; o < digits.length; o++)
        {
            //let mults = getmultipliers(o);
            let sum = 0;
            for (let i = 0; i < sub_digits.length; i++)
            {
                sum += digits[i] * multiplier(i, o);
                //sum += sub_digits[i] * mults[i];
            }
            if (sum < 0)
                sum = -sum;
            output_digits.push(sum % 10);
        }
        digits = [...output_digits];
        console.log(digits.join(""));
        //console.log(digits[0]);
    }

    for (let o = 0; o < digits.length; o++)
    {
        let s = "";
        for (let i = 0; i < digits.length; i++)
        {
            let m = multiplier(i, o);
            s += (m === 1 ? "+" : (m === -1) ? "-" : "0");
        }
        console.log(o, ":", s);
    }
    /*
    let s = "";
    for (let d = 0; d < digits.length; d++)
    {
        s += String((10 + (digits[d] - sub_digits[d])) % 10) + ",";
    }*/
    //console.log(s);
}