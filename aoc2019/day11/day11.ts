import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';

const readFile = util.promisify(fs.readFile);
readFile("assets/day11.txt", { encoding: 'utf8' })
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
    value: strint;
}

type strint = number | string;

function multiply_strints(a: strint, b: strint) : strint
{
    if (typeof a === "number" && typeof b === "number")
    {
        return a * b;/*

        //console.log("Multiplying", a, "and", b);
        // Multiply two numbers - first check whether they would overflow:
        let c = a * b;
        if (a === c/b && b === c/a)
        {
            // No overflow, safe to stay as numbers
            return a * b;
        }
        console.log("Overflow happened multiplying", a, "and", b);*/
    }
    assert(false);
    // Need to handle this as strings.
    //return multiply_strings(String(a), String(b));
}

function multiply_strings(a: string, b: string) : string
{
    let result = new Array<number>(a.length + b.length).fill(0);
    let nega = a[0] === "-" ? -1 : 1;
    let negb = b[0] === "-" ? -1 : 1;
    let adigits = a.split("").map(function x(i) { return parseInt(i)}).filter(function x(i) { return !Number.isNaN(i)});
    let bdigits = b.split("").map(function x(i) { return parseInt(i)}).filter(function x(i) { return !Number.isNaN(i)});
    for (let aind = 0; aind < adigits.length; aind++)
    {
        for (let bind = 0; bind < bdigits.length; bind++)
        {
            let adig = adigits[aind];
            let bdig = bdigits[bind];
            let mult = adig * bdig;
            let num_zeros = adigits.length - (aind + 1) + bdigits.length - (bind + 1);
            let unit_index = result.length - 1 - num_zeros;
            if (mult > 9)
            {
                result[unit_index - 1] += Math.floor(mult / 10);
            }
            result[unit_index] += mult % 10;
        }
    }
    carry_digits(result);
    let str = result.join("");
    if (nega * negb < 0)
    {
        str = "-" + str;
    }
    return str;
}

function carry_digits(x: number[])
{
    for (let index = x.length - 1; index >= 0; index--)
    {
        if (x[index] > 9)
        {
            let carry = Math.floor(x[index] / 10);
            x[index] = x[index] % 10;
            assert(index != 0, "Error - not enough space was calculated for result of carrying.");
            x[index - 1] += carry;
        }
        else if (x[index] < 0)
        {
            let carry = Math.floor(x[index] / 10);
            x[index] = x[index] - (carry * 10);
            assert(index != 0, "Error - not enough space was calculated for result of carrying.");
            x[index - 1] += carry;
        }
    }
    while (x[0] == 0 && x.length > 1)
    {
        x.shift();
    }
}

function strint_to_num(a: strint) : number
{
    if (typeof a === "number")
        return a;

    let b = parseInt(a);
    return b;
}

function add_strints(a: strint, b: strint) : strint
{
    if (typeof a === "number" && typeof b === "number")
    {
        return a + b;/*
        // Add two numbers - first check whether they would overflow:
        //console.log("Adding", a, "and", b);
        let c = a + b;
        if (a === c-b && b === c-a)
        {
            // No overflow, safe to stay as numbers:
            return a + b;
        }
        console.log("Overflow happened adding", a, "and", b);*/
    }
    assert(false);
    // Need to convert both to strings.
    //return add_strings(String(a), String(b));
}

function less_than_strints(a: strint, b: strint) : boolean
{
    if (typeof a === "number" && typeof b === "number")
        return a < b;

    return less_than_strings(String(a), String(b))
}

function less_than_strings(a: string, b: string) : boolean
{
    let nega = a[0] === "-" ? -1 : 1;
    let negb = b[0] === "-" ? -1 : 1;
    if (nega < negb)
        return true;
    if (negb < nega)
        return false;

    // Signs are equal, need to look at digits.
    let adigits = a.split("").map(function x(i) { return parseInt(i)}).filter(function x(i) { return !Number.isNaN(i)});
    let bdigits = b.split("").map(function x(i) { return parseInt(i)}).filter(function x(i) { return !Number.isNaN(i)});
    if (nega === -1 && negb === -1)
    {
        return less_than(bdigits, adigits);
    }
    return less_than(adigits, bdigits);
}

function less_than(a: number[], b: number[]) : boolean
{
    // Return true if a < b:
    if (a.length < b.length)
        return true;
    if (b.length < a.length)
        return false;
    // Awkward case - same number of digits, compare each in turn.
    for (let i = 0; i < a.length; i++)
    {
        if (a[i] < b[i])
            return true;
        else if (b[i] < a[i])
            return false;
    }
    // Equal!
    return false;
}

function add_strings(a: string, b: string) : string
{
    let result = new Array<number>(Math.max(a.length + b.length) + 1).fill(0);
    let nega = a[0] === "-" ? -1 : 1;
    let negb = b[0] === "-" ? -1 : 1;
    let adigits = a.split("").map(function x(i) { return parseInt(i)}).filter(function x(i) { return !Number.isNaN(i)});
    let bdigits = b.split("").map(function x(i) { return parseInt(i)}).filter(function x(i) { return !Number.isNaN(i)});
    let sign = nega * negb;
    let swapped = false;
    if (sign < 0)
    {
        // We're subtracting - make sure we are subtracting the smallest number from the largest!
        if (less_than(adigits, bdigits))
        {
            [adigits, bdigits] = [bdigits, adigits];
            swapped = true;
        }
    }
    let index = 1;
    while (true)
    {
        let inda = adigits.length - index;
        let indb = bdigits.length - index;
        let indresult = result.length - index;

        let digita = inda >= 0 ? adigits[inda] : 0;
        let digitb = indb >= 0 ? bdigits[indb] : 0;
        if (inda < 0 && indb < 0)
            break;

        let digitresult = digita + sign * digitb;
        result[indresult] = digitresult;
        index++;
    }
    carry_digits(result);
    let str = result.join("");
    if (nega === -1 && negb === -1)
    {
        // -a + -b = -(a+b)
        return "-" + str;
    }
    if (nega === -1 && negb === 1)
    {
        if (swapped)
        {
            // We did b - a...
            // -a + b = b - a.
            return str;
        }
        else
        {
            // We did a - b...
            // -a + b = -(a - b)
            return "-" + str;
        }
    }
    if (nega === 1 && negb === -1)
    {
        if (swapped)
        {
            // We did b - a...
            // a - b = - (b - a)
            return "-" + str;
        }
        else
        {
            // We did a - b...
            return str;
        }
    }
    return str;
}

class Instruction {
    parameters: Parameter[];
    instruction_stream: strint[];
    opcode: OpCodes;
    ip: number;
    input_stream: number[];
    output_stream: strint[];
    stopped: boolean;
    name: string;
    relative_base: strint;
    waiting_for_input: boolean;

    constructor(instruction_stream: strint[], name?: string)
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

    litval(param_index: number) : strint
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
                let pos_address = strint_to_num(value);
                assert(pos_address >= 0, "Parameter position out of range!");
                return pos_address;
            case ParameterModes.Relative:
                let rel_address = strint_to_num(add_strints(value, this.relative_base));
                assert(rel_address >= 0, "Parameter position out of range!");
                return rel_address;
            default:
                assert(false, "Unknown parameter mode!");
        }
        return null;
    }

    mem_read(location: number) : strint
    {
        assert(location >= 0, "Negative indexing into memory!");
        while (location >= this.instruction_stream.length)
        {
            // Must be a quicker way to do this!?
            this.instruction_stream.push(0);
        }
        return this.instruction_stream[location];
    }

    mem_write(location: number, value: strint)
    {
        assert(location >= 0, "Negative indexing into memory!");
        while (location >= this.instruction_stream.length)
        {
            // Must be a quicker way to do this!?
            this.instruction_stream.push(0);
        }
        this.instruction_stream[location] = value;
    }

    val(param_index: number) : strint
    {
        assert(param_index >= 0 && param_index < this.parameters.length, "Parameter out of range!");
        let mode = this.parameters[param_index].mode;
        let value = this.parameters[param_index].value;
        switch (mode)
        {
            case ParameterModes.Immediate:
                return value;
            case ParameterModes.Position:
                let pos_address = strint_to_num(value);
                assert(pos_address >= 0, "Parameter position out of range!");
                return this.mem_read(pos_address);
            case ParameterModes.Relative:
                let rel_address = strint_to_num(add_strints(value, this.relative_base));
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

    write_output(value: strint)
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
                this.mem_write(strint_to_num(this.litval(2)), add_strints(this.val(0), this.val(1)));
                return true;
            case OpCodes.Multiply:
                this.mem_write(strint_to_num(this.litval(2)), multiply_strints(this.val(0), this.val(1)));
                return true;
            case OpCodes.Input:
                if (this.has_input_waiting())
                {
                    this.mem_write(strint_to_num(this.litval(0)), this.get_input());
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
                    this.ip = strint_to_num(this.val(1));
                    return false;   // Don't update ip
                }
                return true;
            case OpCodes.JumpIfFalse:
                if (this.val(0) == 0)
                {
                    this.ip = strint_to_num(this.val(1));
                    return false;   // Don't update ip
                }
                return true;
            case OpCodes.LessThan:
                this.mem_write(strint_to_num(this.litval(2)), less_than_strints(this.val(0), this.val(1)) ? 1: 0);
                return true;
            case OpCodes.Equals:
                this.mem_write(strint_to_num(this.litval(2)), this.val(0) === this.val(1) ? 1: 0);
                return true;
            case OpCodes.RelativeBaseOffset:
                this.relative_base = add_strints(this.relative_base, this.val(0));
                //console.log("Changed relative base to", this.relative_base);
                return true;
            default:
                assert(false, "Unknown opcode encountered!");
                return false;
        }
    }
}

const enum Directions {
    Up = 0,
    Right = 1,
    Down = 2,
    Left = 3
}

export interface IHash
{
    [details: string] : number;
}

export default function run(data: string)
{
    let instructions: number[] = data.split(",").map(function (i) { return parseInt(i) }).filter(function(i) { return !Number.isNaN(i) });
    console.log("Program length:", instructions.length);

    let computer = new Instruction(instructions);

    let direction = Directions.Up;
    let x = 0;
    let y = 0;
    let grid: IHash = {"0_0":1}

    let phase = 0;
    let num_first_paints = 0;
    let x_min = 0;
    let y_min = 0;
    let x_max = 0;
    let y_max = 0;
    while (!computer.stopped)
    {
        computer.step();
        if (computer.is_waiting_for_input())
        {
            let key = String(x) + "_" + String(y);
            let val = (key in grid) ? grid[key] : 0;
            computer.provide_input(val);
        }
        if (computer.output_stream.length)
        {
            let instruction = computer.output_stream.shift();
            if (phase === 0)
            {
                // Paint phase:
                let key = String(x) + "_" + String(y);
                if (!(key in grid))
                {
                    num_first_paints++;
                    console.log("Painting", key, "to", instruction);
                    x_max = Math.max(x_max, x);
                    x_min = Math.min(x_min, x);
                    y_max = Math.max(y_max, y);
                    y_min = Math.min(y_min, y);
                }
                grid[key] = strint_to_num(instruction);
                phase++;
            }
            else if (phase === 1)
            {
                // Turn phase:
                direction += (strint_to_num(instruction) === 1) ? 1 : -1;
                if (direction < 0)
                    direction += 4;
                if (direction >= 4)
                    direction -= 4;
                console.log("Direction:", direction);
                x += (direction === Directions.Left) ? -1 : (direction === Directions.Right) ? 1 : 0;
                y += (direction === Directions.Up) ? -1 : (direction === Directions.Down) ? 1 : 0;
                phase--;
            }
        }
    }
    console.log("Num first paints:", num_first_paints);
    console.log("X Range:", x_min, x_max);
    console.log("Y Range:", y_min, y_max);
    for (let y = y_min; y <= y_max; y++)
    {
        let s = "";
        for (let x = x_min; x <= x_max; x++)
        {
            let key = String(x) + "_" + String(y);
            if (key in grid && grid[key] === 1)
                s += "*";
            else
                s += " ";
        }
        console.log(s);
    }
}