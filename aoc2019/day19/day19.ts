import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';
import { display_assets } from '../day14/day14';

const readFile = util.promisify(fs.readFile);
readFile("assets/day19.txt", { encoding: 'utf8' })
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

    let computer = new Instruction(instructions);

    while (!computer.stopped)
    {
        computer.step();
        if (computer.is_waiting_for_input())
        {
            //computer.input_stream.push(input_string.charCodeAt(input_index));
        }
        if (computer.output_stream.length)
        {
        }
    }
}