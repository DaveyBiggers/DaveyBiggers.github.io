import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';
import { display_assets } from '../day14/day14';

const readFile = util.promisify(fs.readFile);
readFile("assets/day15.txt", { encoding: 'utf8' })
    .then((content) => {run(content); })
    .catch(error => console.log(error));

const enum OpCodes {
    Add = 1,
    Multiply = 2,
    Input = 3,
    Output = 4,
    JumpIfTrue = 5,
    JumpIfFalse = 6,
    LessThan = 7,
    Equals = 8,
    RelativeBaseOffset = 9,
    Stop = 99
}

const enum ParameterModes {
    Position = 0,
    Immediate = 1,
    Relative = 2
}

export const OpCodeInfo: Record<OpCodes, number> = {
    [OpCodes.Add]:                  3,
    [OpCodes.Multiply]:             3,
    [OpCodes.Input]:                1,
    [OpCodes.Output]:               1,
    [OpCodes.JumpIfTrue]:           2,
    [OpCodes.JumpIfFalse]:          2,
    [OpCodes.LessThan]:             3,
    [OpCodes.Equals]:               3,
    [OpCodes.RelativeBaseOffset]:   1,
    [OpCodes.Stop]:                 0
}

interface Parameter {
    mode: ParameterModes;
    value: number;
}

class Instruction {
    parameters: Parameter[];
    instruction_stream: number[];
    opcode: OpCodes;
    ip: number;
    input_stream: number[];
    output_stream: number[];
    stopped: boolean;
    name: string;
    relative_base: number;
    waiting_for_input: boolean;

    constructor(instruction_stream: number[], name?: string)
    {
        this.instruction_stream = instruction_stream;
        this.input_stream = [];
        this.output_stream = [];
        this.stopped = false;
        this.name = name;
        this.ip = 0;
        this.relative_base = 0;
        this.waiting_for_input = false;
    }
    
    run()
    {
        this.ip = 0;
        while (!this.stopped)
        {
            this.step();
        }
    }

    set_input_stream(input_stream: number[])
    {
        this.input_stream = input_stream;
    }

    provide_input(value: number)
    {
        this.input_stream.push(value);
        this.waiting_for_input = false;
    }

    is_waiting_for_input() : boolean
    {
        return this.waiting_for_input;
    }

    step() : boolean
    {
        this.decode_instruction();
        if (this.execute_instruction())
        {
            this.ip += this.parameters.length + 1;
        }
        return true;
    }

    has_finished() : boolean
    {
        return this.stopped;
    }

    decode_instruction()
    {
        let instruction = this.mem_read(this.ip);
        if (typeof instruction === "number")
        {
            this.opcode = instruction % 100;
            instruction = Math.floor(instruction / 100);
            let num_params = OpCodeInfo[this.opcode];
            this.parameters = [];
            for (let i = 0; i < num_params; i++)
            {
                let param : Parameter = {mode: instruction % 10, value: this.mem_read(this.ip + 1 + i)};
                instruction = Math.floor(instruction / 10);
                this.parameters.push(param);
            }
        }
        else
        {
            assert(false, "Opcode became a string...?");
        }
    }

    litval(param_index: number) : number
    {
        assert(param_index >= 0 && param_index < this.parameters.length, "Parameter out of range!");
        let mode = this.parameters[param_index].mode;
        let value = this.parameters[param_index].value;
        switch (mode)
        {
            case ParameterModes.Immediate:
                assert(false, "Output parameter in immediate mode! Error!");
                return value;
            case ParameterModes.Position:
                let pos_address = value;
                assert(pos_address >= 0, "Parameter position out of range!");
                return pos_address;
            case ParameterModes.Relative:
                let rel_address = value + this.relative_base;
                assert(rel_address >= 0, "Parameter position out of range!");
                return rel_address;
            default:
                assert(false, "Unknown parameter mode!");
        }
        return null;
    }

    mem_read(location: number) : number
    {
        assert(location >= 0, "Negative indexing into memory!");
        while (location >= this.instruction_stream.length)
        {
            // Must be a quicker way to do this!?
            this.instruction_stream.push(0);
        }
        return this.instruction_stream[location];
    }

    mem_write(location: number, value: number)
    {
        assert(location >= 0, "Negative indexing into memory!");
        while (location >= this.instruction_stream.length)
        {
            // Must be a quicker way to do this!?
            this.instruction_stream.push(0);
        }
        this.instruction_stream[location] = value;
    }

    val(param_index: number) : number
    {
        assert(param_index >= 0 && param_index < this.parameters.length, "Parameter out of range!");
        let mode = this.parameters[param_index].mode;
        let value = this.parameters[param_index].value;
        switch (mode)
        {
            case ParameterModes.Immediate:
                return value;
            case ParameterModes.Position:
                let pos_address = value;
                assert(pos_address >= 0, "Parameter position out of range!");
                return this.mem_read(pos_address);
            case ParameterModes.Relative:
                let rel_address = value + this.relative_base;
                assert(rel_address >= 0, "Parameter position out of range!");
                return this.mem_read(rel_address);
            default:
                assert(false, "Unknown parameter mode!");
        }
        return null;
    }

    has_input_waiting() : boolean
    {
        return this.input_stream.length > 0;
    }

    get_input() : number
    {
        return this.input_stream.shift();
    }

    write_output(value: number)
    {
        //console.log("OUTPUTTING:", value);
        this.output_stream.push(value);
    }

    execute_instruction() : boolean
    {
        switch(this.opcode)
        {
            case OpCodes.Stop:
                this.stopped = true;
                return false;
            case OpCodes.Add:
                this.mem_write(this.litval(2), this.val(0) + this.val(1));
                return true;
            case OpCodes.Multiply:
                this.mem_write(this.litval(2), this.val(0) * this.val(1));
                return true;
            case OpCodes.Input:
                if (this.has_input_waiting())
                {
                    this.mem_write(this.litval(0), this.get_input());
                    return true;
                } else {
                    //console.log(this.name, "waiting for input...");
                    this.waiting_for_input = true;
                    return false;   // Don't update ip - wait on the input
                }
            case OpCodes.Output:
                this.write_output(this.val(0));
                return true;
            case OpCodes.JumpIfTrue:
                if (this.val(0) != 0)
                {
                    this.ip = this.val(1);
                    return false;   // Don't update ip
                }
                return true;
            case OpCodes.JumpIfFalse:
                if (this.val(0) == 0)
                {
                    this.ip = this.val(1);
                    return false;   // Don't update ip
                }
                return true;
            case OpCodes.LessThan:
                this.mem_write(this.litval(2), (this.val(0) < this.val(1)) ? 1: 0);
                return true;
            case OpCodes.Equals:
                this.mem_write(this.litval(2), this.val(0) === this.val(1) ? 1: 0);
                return true;
            case OpCodes.RelativeBaseOffset:
                this.relative_base = this.relative_base + this.val(0);
                //console.log("Changed relative base to", this.relative_base);
                return true;
            default:
                assert(false, "Unknown opcode encountered!");
                return false;
        }
    }
}

const enum Directions {
    North = 1,
    South = 2,
    West = 3,
    East = 4
}

const enum ResultCodes {
    CouldNotMove = 0,
    Moved = 1,
    FoundOxygen = 2
}

export function move(x: number, y: number, dir: Directions) : [number, number]
{
    let x1 = x + ((dir === Directions.West) ? -1 : (dir === Directions.East) ? 1 : 0);
    let y1 = y + ((dir === Directions.North) ? -1 : (dir === Directions.South) ? 1 : 0);
    return [x1, y1];    
}

export interface IHash
{
    [details: string] : string;
}

export interface IDistMap
{
    [details: string] : number;
}

export function hash(x: number, y: number) : string
{
    return String(x) + "_" + String(y);
}

export function update_neighbour_distances(x: number, y: number, distances: IDistMap)
{
    let key = hash(x, y);
    let cur_dist = distances[key];
    let neighbour_dist = cur_dist + 1;
    let key_n = hash(x, y - 1);
    let key_s = hash(x, y + 1);
    let key_e = hash(x + 1, y);
    let key_w = hash(x - 1, y);
    if (!(key_n in distances) || distances[key_n] > neighbour_dist)
        distances[key_n] = neighbour_dist;
    if (!(key_s in distances) || distances[key_s] > neighbour_dist)
        distances[key_s] = neighbour_dist;
    if (!(key_e in distances) || distances[key_e] > neighbour_dist)
        distances[key_e] = neighbour_dist;
    if (!(key_w in distances) || distances[key_w] > neighbour_dist)
        distances[key_w] = neighbour_dist;
}

export function draw_grid(grid: IHash, x_min: number, x_max: number, y_min: number, y_max: number, x: number, y: number)
{
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    for (let cy = y_min; cy <= y_max; cy++)
    {
        let s = "";
        for (let cx = x_min; cx <= x_max; cx++)
        {
            let key = String(cx) + "_" + String(cy);
            if (cx === 0 && cy === 0)
                s += "H";
            else if (cx === x && cy === y)
                s += "@";
            else if (key in grid)
                s += grid[key];
            else
                s += ".";
        }
        console.log(s);
    }
}

export default function run(data: string)
{
    let instructions: number[] = data.split(",").map(function (i) { return parseInt(i) }).filter(function(i) { return !Number.isNaN(i) });
    console.log("Program length:", instructions.length);

    let computer = new Instruction(instructions);

    let x = 0;
    let y = 0;
    let target_x = 0;
    let target_y = 0;
    let grid: IHash = {}
    let start_hash = hash(x, y);
    let distances: IDistMap = {};
    distances[start_hash] = 0;
    let x_min = 0;
    let y_min = 0;
    let x_max = 0;
    let y_max = 0;
    let found_oxygen = false;
    let num_steps = 0;
    let steps_to_here = 0;

    let x_oxygen = 0;
    let y_oxygen = 0;

    let dirqueue : Directions[] = [];
    dirqueue.push(Directions.North);
    dirqueue.push(Directions.South);

    dirqueue.push(Directions.East);
    dirqueue.push(Directions.West);

    dirqueue.push(Directions.South);
    dirqueue.push(Directions.North);

    dirqueue.push(Directions.West);
    dirqueue.push(Directions.East);
    update_neighbour_distances(x, y, distances);


    while (!computer.stopped && dirqueue.length)//!found_oxygen)
    {
        computer.step();
        if (computer.is_waiting_for_input())
        {
            //let key = String(x) + "_" + String(y);
            //let val = (key in grid) ? grid[key] : 0;
            //let dir = 1 + Math.floor(Math.random() * 4);
            let dir = dirqueue.pop();
            [target_x, target_y] = move(x, y, dir);
            computer.provide_input(dir);
            num_steps++;
            assert(hash(x,y) in distances);
            steps_to_here = distances[hash(x, y)];
        }
        if (computer.output_stream.length)
        {
            let instruction = computer.output_stream.shift();
            let key = String(target_x) + "_" + String(target_y);
            let redraw = false;
            if (!(key in grid))
                redraw = true;

            switch (instruction)
            {
                case ResultCodes.CouldNotMove:
                    grid[key] = "*";
                    dirqueue.pop(); // Remove backtracking element, since we didn't move in the first place.
                    break;
                case ResultCodes.Moved:
                    if (!(key in grid))
                    {
                        // Add exploration from here:
                        dirqueue.push(Directions.North);
                        dirqueue.push(Directions.South);

                        dirqueue.push(Directions.East);
                        dirqueue.push(Directions.West);

                        dirqueue.push(Directions.South);
                        dirqueue.push(Directions.North);

                        dirqueue.push(Directions.West);
                        dirqueue.push(Directions.East);
                    }
                    grid[key] = " ";
                    x = target_x;
                    y = target_y;
                    update_neighbour_distances(x, y, distances);
                    break;
                case ResultCodes.FoundOxygen:
                    if (!(key in grid))
                    {
                        // Add exploration from here:
                        dirqueue.push(Directions.North);
                        dirqueue.push(Directions.South);

                        dirqueue.push(Directions.East);
                        dirqueue.push(Directions.West);

                        dirqueue.push(Directions.South);
                        dirqueue.push(Directions.North);

                        dirqueue.push(Directions.West);
                        dirqueue.push(Directions.East);
                    }
                    grid[key] = "O";
                    x = target_x;
                    y = target_y;
                    update_neighbour_distances(x, y, distances);
                    found_oxygen = true;
                    x_oxygen = x;
                    y_oxygen = y;
                    console.log("Got to O square (", x, ",", y, ") - current dist is", distances[hash(x, y)]);
            }
            x_min = Math.min(x_min, target_x);
            x_max = Math.max(x_max, target_x);
            y_min = Math.min(y_min, target_y);
            y_max = Math.max(y_max, target_y);

            if (redraw && false)
            {
                console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
                for (let cy = y_min; cy <= y_max; cy++)
                {
                    let s = "";
                    for (let cx = x_min; cx <= x_max; cx++)
                    {
                        let key = String(cx) + "_" + String(cy);
                        if (cx === 0 && cy === 0)
                            s += "H";
                        else if (cx === x && cy === y)
                            s += "@";
                        else if (key in grid)
                            s += grid[key];
                        else
                            s += ".";
                    }
                    console.log(s);
                }
            }
        }
    }
    draw_grid(grid, x_min, x_max, y_min, y_max, 1000, 1000);
    let oxqueue : [number, number, number][] = [[x_oxygen, y_oxygen, 0]];
    let visited: IDistMap = {};
    let cur_dist = 0;
    while (oxqueue.length)
    {
        let [x, y, dist] = oxqueue.shift();
        let cur_hash = hash(x, y);
        if (cur_hash in visited)
            continue;
        if (!(cur_hash in grid) || grid[cur_hash] === "*")
            continue;
        visited[cur_hash] = 1;
        grid[cur_hash] = "O";
        if (dist > cur_dist)
        {
            cur_dist = dist;
            draw_grid(grid, x_min, x_max, y_min, y_max, x, y);
        }

        oxqueue.push([x, y - 1, dist + 1]);
        oxqueue.push([x, y + 1, dist + 1]);
        oxqueue.push([x - 1, y, dist + 1]);
        oxqueue.push([x + 1, y, dist + 1]);

        //let n_hash = hash(x, y - 1);
        //let s_hash = hash(x, y + 1);
        //let e_hash = hash(x - 1, y);
        //let w_hash = hash(x + 1, y);
        //if ()
    }
    console.log("Final dist:", cur_dist);
    console.log("NUM STEPS:", num_steps);
}