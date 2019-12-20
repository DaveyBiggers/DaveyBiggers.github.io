import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';
import { display_assets } from '../day14/day14';

const readFile = util.promisify(fs.readFile);
readFile("assets/day17.txt", { encoding: 'utf8' })
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
    North = 0,
    East = 1,
    South = 2,
    West = 3
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

export function draw_grid(grid: number[], width:number, height:number)
{
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    for (let y = 0; y < height; y++)
    {
        let s = "";
        for (let x = 0; x < width; x++)
        {
            let ind = (y * width) + x;
            s += String.fromCharCode(grid[ind]);
        }
        console.log(s);
    }
}

export default function run(data: string)
{
    let instructions: number[] = data.split(",").map(function (i) { return parseInt(i) }).filter(function(i) { return !Number.isNaN(i) });
    console.log("Program length:", instructions.length);

    instructions[0] = 2;
    let computer = new Instruction(instructions);

    // Um...
    let main = "A,A,B,C,B,C,B,C,B,A";
    let a_sub = "L,10,L,8,R,8,L,8,R,6";
    let b_sub = "R,6,R,8,R,8";
    let c_sub = "R,6,R,6,L,8,L,10";

    let input_string = main + "\n" + a_sub + "\n" + b_sub + "\n" + c_sub + "\n" + "n\n";
    let input_index = 0;
    while (!computer.stopped)
    {
        computer.step();
        if (computer.is_waiting_for_input())
        {
            computer.input_stream.push(input_string.charCodeAt(input_index));
            input_index++;
        }
        if (computer.output_stream.length)
        {
        }
    }
    let s = "";
    let grid : number[] = [];
    let height = 0;
    let width = 0;
    let start_x = -1;
    let start_y = -1;
    let line = 0;
    while (computer.output_stream.length)
    {
        let char = computer.output_stream.shift();
        if (char > 255)
        {
            console.log("FINISHED!", char);
            return;
        }
        continue;
        if (char === 10)
        {
            //console.log(s);
            width = Math.max(width, s.length);
            if (s.length)
                height++;
            s = "";
            line++;
            if (line === 54)
            {
                //console.log(" ");
                line = 0;
            }
        }
        else
        {
            s += String.fromCharCode(char);
            //grid.push(char);
            /*
            if (char != 46 && char != 35)
            {
                start_x = s.length - 1;
                start_y = height;
            }*/
        }
    }
    /*
    console.log(s);
    console.log("Width:", width, "Height:", height);
    let checksum = 0;

    for (let y = 1; y < height - 1; y++)
    {
        for (let x = 1; x < width - 1; x++)
        {
            let ind = (y * width) + x;
            if (grid[ind] === 35 && grid[ind-1] === 35 && grid[ind+1] === 35 && grid[ind - width] === 35 && grid[ind + width] === 35)
            {
                checksum += x * y;
            }
        }
    }
    console.log("CHECKSUM:", checksum);
    console.log("START POS:", start_x, start_y);
    let start_char = String.fromCharCode(grid[start_x + start_y * width]);
    console.log("START CHAR:", start_char);
    // Figure out the path:
    let direction = "^>v<".indexOf(start_char);
    console.log("Direction:", direction);
    let x = start_x;
    let y = start_y;
    let x_offsets = [0, 1, 0, -1];
    let y_offsets = [-1, 0, 1, 0];
    let cur_distance = 0;
    let path = "";
    while (true)
    {
        // Is there a scaffolding cell in our current direction?
        let dy = y + y_offsets[direction];
        let dx = x + x_offsets[direction];
        if (dy >= 0 && dy < height && dx >= 0 && dx < width && grid[dx + dy * width] != 46)
        {
            cur_distance++;
            grid[dx + dy * width] = ("!".charCodeAt(0));
            x = dx;
            y = dy;
        }
        else
        {
            //draw_grid(grid, width, height);

            if (cur_distance > 0)
                path += String(cur_distance);
            cur_distance = 0;

            // Try right:
            let r_direction = (direction + 1) % 4;
            let dy = y + y_offsets[r_direction];
            let dx = x + x_offsets[r_direction];
            if (dy >= 0 && dy < height && dx >= 0 && dx < width && grid[dx + dy * width] != 46)
            {
                direction = r_direction;
                path += "R";
            }
            else
            {
                // Try left:
                let l_direction = (direction + 3) % 4;
                let dy = y + y_offsets[l_direction];
                let dx = x + x_offsets[l_direction];
                if (dy >= 0 && dy < height && dx >= 0 && dx < width && grid[dx + dy * width] != 46)
                {
                    direction = l_direction;
                    path += "L";
                }
                else
                {
                    // All done!
                    break;
                }
            }
        }
    }

    console.log(path);

    let legs : string[] = [];
    let legsuffixes : string[] = [path];
    let current_leg = "";

    for (let index = 0; index < path.length; index++)
    {
        let c = path[index];
        if (current_leg.length && (c === "L" || c === "R"))
        {
            legs.push(current_leg);
            current_leg = "";
            legsuffixes.push(path.substr(index));
        }
        current_leg += c;
    }
    console.log(legs.join(" "));
    legsuffixes.sort();
    console.log(legsuffixes.join("\n"));*/
}