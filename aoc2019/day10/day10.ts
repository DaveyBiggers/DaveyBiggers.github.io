import * as fs from 'fs';
import * as util from 'util';

const readFile = util.promisify(fs.readFile);
readFile("assets/day10.txt", { encoding: 'utf8' })
    .then((content) => {run(content); })
    .catch(error => console.log(error));

export function get_gcf(a: number, b: number) : number
{
    if (a === 0)
        return b;
    if (b === 0)
        return a;
    while (true)
    {
        if (a < b)
            [a, b] = [b, a];
        a -= b;
        if (a === 0)
            return b;
    }
}


export function run_part_one(data: string)
{
    //data = "......#.#.\n#..#.#....\n..#######.\n.#.#.###..\n.#..#.....\n..#....#.#\n#..#....#.\n.##.#..###\n##...#..#.\n.#....####";

    let lines: string[] = data.split("\n").filter(function(i) { return i.length > 0; });
    let width = lines[0].length;
    let height = lines.length;
    console.log(width, "x", height);

    let asteroids : boolean[] = data.split("").filter(function(i) { return i === "." || i === "#" }).map(function(i) { return i == "#"});
    let best = 0;
    for (let i = 0; i < width * height; i++)
    {
        if (asteroids[i])
        {
            let ax = i % width;
            let ay = Math.floor(i / width);
            let mask = [...asteroids];//Array<boolean>(width * height).fill(false);
            for (let t = 0; t < width * height; t++)
            {
                if (mask[t] && t != i)
                {
                    let tx = t % width;
                    let ty = Math.floor(t / width);
                    let top = tx - ax;
                    let bottom = ty - ay;
                    let gcf = get_gcf(Math.abs(top), Math.abs(bottom));
                    top /= gcf;
                    bottom /= gcf;
                    while (true)
                    {
                        tx += top;
                        ty += bottom;
                        if (tx < 0 || tx >= width || ty < 0 || ty >= height)
                            break;
                        mask[tx + ty * height] = false;
                    }
                }
            }
            let count = 0;
            for (let t = 0; t < width * height; t++)
            {
                if (mask[t])
                    count++;
            }
            console.log(count);
            if (count > best)
            {
                best = count;
                console.log(ax, ay);
            }
        }
    }
    console.log("BEST:", best);
}


export default function run(data: string)
{
    let lines: string[] = data.split("\n").filter(function(i) { return i.length > 0; });
    let width = lines[0].length;
    let height = lines.length;
    console.log(width, "x", height);

    let asteroids : boolean[] = data.split("").filter(function(i) { return i === "." || i === "#" }).map(function(i) { return i == "#"});
    asteroids[11 * width + 11] = false;
    let ax = 11;
    let ay = 11;
    let mask = [...asteroids];
    for (let t = 0; t < width * height; t++)
    {
        if (mask[t])
        {
            let tx = t % width;
            let ty = Math.floor(t / width);
            let top = tx - ax;
            let bottom = ty - ay;
            let gcf = get_gcf(Math.abs(top), Math.abs(bottom));
            top /= gcf;
            bottom /= gcf;
            while (true)
            {
                tx += top;
                ty += bottom;
                if (tx < 0 || tx >= width || ty < 0 || ty >= height)
                    break;
                mask[tx + ty * height] = false;
            }
        }
    }
    let rel_pos:[number, number, number][] = [];
    for (let t = 0; t < width * height; t++)
    {
        if (mask[t])
        {
            let tx = t % width;
            let ty = Math.floor(t / width);
            let h = Math.sqrt((tx - ax) * (tx - ax) + (ty - ay) * (ty - ay));
            let angle = 0;
            if (tx >= ax && ty <= ay)
            {
                angle = Math.asin((tx - ax) / h);
            }
            else if (tx >= ax && ty > ay)
            {
                angle = Math.PI - Math.asin((tx - ax) / h);
            }
            else if (tx < ax && ty <= ay)
            {
                angle = 2 * Math.PI - Math.asin((ax - tx) / h);
            }
            else if (tx < ax && ty > ay)
            {
                angle = Math.PI + Math.asin((ax - tx) / h);
            }
            rel_pos.push([angle, tx, ty]);
        }
    }

    console.log(rel_pos[199]);

    rel_pos.sort((a, b) => { 
        if (a[0] > b[0])
            return 1;
        if (a[0] < b[0])
            return -1;
        return 0;
    });

    console.log(rel_pos[199]);
}

