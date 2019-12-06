import * as fs from 'fs';
import * as util from 'util';

const readFile = util.promisify(fs.readFile);
readFile("assets/day03.txt", { encoding: 'utf8' })
    .then((content) => {run(content); })
    .catch(error => console.log(error));

class Line {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    constructor(x1: number, y1: number, x2: number, y2: number)
    {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
    is_horizontal() { return this.y1 == this.y2; }
    is_vertical() { return this.x1 == this.x2; }
    get_intersection(l2: Line)
    {
        if (this.is_horizontal() && l2.is_vertical())
        {
            if (((this.x1 < l2.x1) != (this.x2 < l2.x1)) && ((l2.y1 < this.y1) != (l2.y2 < this.y2)))
            {
                return Math.abs(l2.x1) + Math.abs(this.y1)
            }
        }
        else if (this.is_vertical() && l2.is_horizontal())
        {
            if (((this.y1 < l2.y1) != (this.y2 < l2.y1)) && ((l2.x1 < this.x1) != (l2.x2 < this.x2)))
            {
                return Math.abs(this.x1) + Math.abs(l2.y1)
            }
        }
        else if (this.is_vertical() && l2.is_vertical() && this.x1 == l2.x1)
        {
            let this_y1_inside = ((this.y1 < l2.y1) != (this.y1 < l2.y2)) ? Math.abs(this.y1) : 100000;
            let this_y2_inside = ((this.y2 < l2.y1) != (this.y2 < l2.y2)) ? Math.abs(this.y2) : 100000;
            let l2_y1_inside = ((l2.y1 < this.y1) != (l2.y1 < this.y2)) ? Math.abs(l2.y1) : 100000;
            let l2_y2_inside = ((l2.y2 < this.y1) != (l2.y2 < this.y2)) ? Math.abs(l2.y2) : 100000;
            let intersection = Math.min(this_y1_inside, this_y2_inside, l2_y1_inside, l2_y2_inside);
            if (intersection < 100000)
            {
                return intersection;
            }
        }
        else if (this.is_horizontal() && l2.is_horizontal() && this.y1 == l2.y1)
        {
            let this_x1_inside = ((this.x1 < l2.x1) != (this.x1 < l2.x2)) ? Math.abs(this.x1) : 100000;
            let this_x2_inside = ((this.x2 < l2.x1) != (this.x2 < l2.x2)) ? Math.abs(this.x2) : 100000;
            let l2_x1_inside = ((l2.x1 < this.x1) != (l2.x1 < this.x2)) ? Math.abs(l2.x1) : 100000;
            let l2_x2_inside = ((l2.x2 < this.x1) != (l2.x2 < this.x2)) ? Math.abs(l2.x2) : 100000;
            let intersection = Math.min(this_x1_inside, this_x2_inside, l2_x1_inside, l2_x2_inside);
            if (intersection < 100000)
            {
                return intersection;
            }
        }
        return -1;
    }
}

function create_lines(wires: string)
{
    let segments: string[] = wires.split(",");
    let x: number = 0;
    let y: number = 0;
    let lines: Array<Line> = [];
    for (let segment of segments)
    {
        let xmul: number = segment.startsWith("R") ? 1 : segment.startsWith("L") ? -1 : 0;
        let ymul: number = segment.startsWith("U") ? -1 : segment.startsWith("D") ? 1 : 0;
        let distance: number = parseInt(segment.substr(1));
        if (Number.isNaN(distance))
        {
            continue;
        }
        let x1 = x + xmul * distance;
        let y1 = y + ymul * distance;
        lines.push(new Line(x, y, x1, y1));
        x = x1;
        y = y1;
    }
    return lines;
}

export interface IHash
{
    [details: string] : number;
}

export default function run(data: string)
{
    let wires: string[] = data.split("\n").filter(function(s) { return s.length > 0 });
    //wires[0] = "R75,D30,R83,U83,L12,D49,R71,U7,L72";
    //wires[1] = "U62,R66,U55,R34,D71,R55,D58,R83";

    //wires[0] = "R98,U47,R26,D63,R33,U87,L62,D20,R33,U53,R51";
    //wires[1] = "U98,R91,D20,R16,D67,R40,U7,R15,U6,R7";

    let linesA: Array<Line> = create_lines(wires[0]);
    let linesB: Array<Line> = create_lines(wires[1]);
    console.log("Requires:", linesA.length * linesB.length, "intersection tests.");
    let min_intersection_distance: number = -1;
    for (let la of linesA)
    {
        for (let lb of linesB)
        {
            let intersection_distance = la.get_intersection(lb);
            if (intersection_distance > 0 && (intersection_distance < min_intersection_distance || min_intersection_distance == -1))
            {
                min_intersection_distance = intersection_distance;
            }
        }
    }
    console.log("State I result: ", min_intersection_distance);

    // Method 2
    let grid_cells_A: IHash = {};
    let grid_cells_B: IHash = {};

    let x = 0;
    let y = 0;
    let wire_length = 0;
    for (let segment of wires[0].split(","))
    {
        let xmul: number = segment.startsWith("R") ? 1 : segment.startsWith("L") ? -1 : 0;
        let ymul: number = segment.startsWith("U") ? -1 : segment.startsWith("D") ? 1 : 0;
        let distance: number = parseInt(segment.substr(1));
        if (Number.isNaN(distance))
        {
            continue;
        }
        for (let i = 0; i < distance; i++)
        {
            x += xmul;
            y += ymul;
            let key = String(x) + "_" + String(y);
            if (key in grid_cells_A)
            {
                //wire_length = grid_cells_A[key];
                wire_length++;
                console.log("Self-intersection, back to", wire_length);
            }
            else
            {
                wire_length++;
                grid_cells_A[key] = wire_length;
            }
        }
    }

    x = 0;
    y = 0;
    wire_length = 0;
    min_intersection_distance = -1; 
    for (let segment of wires[1].split(","))
    {
        let xmul: number = segment.startsWith("R") ? 1 : segment.startsWith("L") ? -1 : 0;
        let ymul: number = segment.startsWith("U") ? -1 : segment.startsWith("D") ? 1 : 0;
        let distance: number = parseInt(segment.substr(1));
        if (Number.isNaN(distance))
        {
            continue;
        }
        for (let i = 0; i < distance; i++)
        {
            x += xmul;
            y += ymul;
            let key = String(x) + "_" + String(y);
            if (key in grid_cells_B)
            {
                //wire_length = grid_cells_B[key];
                wire_length++;
                console.log("Self-intersection, back to", wire_length);
            }
            else
            {
                wire_length++;
                grid_cells_B[key] = wire_length;
            }
            if (key in grid_cells_A)
            {
                console.log("Intersection at", Math.abs(x) + Math.abs(y));
                let total_length = grid_cells_A[key] + grid_cells_B[key];
                if (total_length < min_intersection_distance || min_intersection_distance == -1)
                {
                    min_intersection_distance = total_length;
                }
            }
        }
    }
    console.log("Best combined wire length:", min_intersection_distance);
}

