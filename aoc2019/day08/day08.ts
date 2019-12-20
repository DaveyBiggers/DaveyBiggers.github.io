import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';
import { timingSafeEqual } from 'crypto';

const readFile = util.promisify(fs.readFile);
readFile("assets/day08.txt", { encoding: 'utf8' })
    .then((content) => {run(content); })
    .catch(error => console.log(error));

export default function run(data: string)
{
    let width = 25;
    let height = 6;
    let x = 0;
    let y = 0;
    let layer = 0;
    let counts :number[] = [0, 0, 0];
    let layer_counts :number[][] = [];
    let min_zeros = width * height;
    let min_zero_layer = -1;

    let pixels: number[] = data.split("").map(function (i) { return parseInt(i) }).filter(function(i) { return !Number.isNaN(i) });

    for (let p of pixels)
    {
        counts[p]++;
        x++;
        if (x >= width)
        {
            x = 0;
            y++;
            if (y >= height)
            {
                y = 0;
                layer++;
                layer_counts.push(counts);
                if (counts[0] < min_zeros)
                {
                    min_zeros = counts[0];
                    min_zero_layer = layer - 1;
                }
                counts = [0, 0, 0];
            }
        }
    }
    console.log("Min zero layer:", min_zero_layer);
    console.log("Number of ones times number of twos:", layer_counts[min_zero_layer][1] * layer_counts[min_zero_layer][2]);

    let image: number[][] = new Array(height).fill(0).map(() => new Array(width).fill(0));
    for (let y = 0; y < height; y++)
    {
        let output = "";
        for (let x = 0; x < width; x++)
        {
            let index = x + y * width;
            while (pixels[index] == 2)
            {
                index += width * height;
            }
            image[y][x] = pixels[index];
            if (pixels[index] == 1)
            {
                output += "*";
            }
            else
            {
                output += " ";
            }
        }
        console.log(output);
    }
}