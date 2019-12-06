import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';
import { timingSafeEqual } from 'crypto';

const readFile = util.promisify(fs.readFile);
readFile("assets/day05.txt", { encoding: 'utf8' })
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
    Stop = 99
}

const enum ParameterModes {
    Position = 0,
    Immediate = 1
}

export const OpCodeInfo: Record<OpCodes, number> = {
    [OpCodes.Add]:          3,
    [OpCodes.Multiply]:     3,
    [OpCodes.Input]:        1,
    [OpCodes.Output]:       1,
    [OpCodes.JumpIfTrue]:   2,
    [OpCodes.JumpIfFalse]:  2,
    [OpCodes.LessThan]:     3,
    [OpCodes.Equals]:       3,
    [OpCodes.Stop]:         0
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

    constructor(instruction_stream: number[])
    {
        this.instruction_stream = instruction_stream;
    }
    
    decode_instruction(ip: number)
    {
        let instruction = this.instruction_stream[ip];
        ip++;
        this.opcode = instruction % 100;
        instruction = Math.floor(instruction / 100);
        let num_params = OpCodeInfo[this.opcode];
        this.parameters = [];
        for (let i = 0; i < num_params; i++)
        {
            let param : Parameter = {mode: instruction % 10, value: this.instruction_stream[ip]};
            //param.mode = instruction % 10;
            instruction = Math.floor(instruction / 10);
            //param.value = this.instruction_stream[ip];
            this.parameters.push(param);
            ip++;
        }
        this.ip = ip;
    }

    litval(param_index: number) : number
    {
        assert(param_index >= 0 && param_index < this.parameters.length, "Parameter out of range!");
        return this.parameters[param_index].value;
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
                assert(value >= 0 && value < this.instruction_stream.length, "Parameter position out of range!");
                return this.instruction_stream[value];
            default:
                assert(false, "Unknown parameter mode!");
        }
        return null;
    }

    write(index: number, value: number)
    {
        assert(index >= 0 && index < this.instruction_stream.length, "Attempting to write out of range!");
        this.instruction_stream[index] = value;
    }

    get_input() : number
    {
        return 5;
    }

    write_output(value: number)
    {
        console.log(value);
    }

    execute_instruction() : boolean
    {
        switch(this.opcode)
        {
            case OpCodes.Stop:
                return false;
            case OpCodes.Add:
                this.write(this.litval(2), this.val(0) + this.val(1));
                return true;
            case OpCodes.Multiply:
                this.write(this.litval(2), this.val(0) * this.val(1));
                return true;
            case OpCodes.Input:
                this.write(this.litval(0), this.get_input());
                return true;
            case OpCodes.Output:
                this.write_output(this.val(0));
                return true;
            case OpCodes.JumpIfTrue:
                if (this.val(0) != 0)
                {
                    this.ip = this.val(1);
                }
                return true;
            case OpCodes.JumpIfFalse:
                if (this.val(0) == 0)
                {
                    this.ip = this.val(1);
                }
                return true;
            case OpCodes.LessThan:
                this.write(this.litval(2), this.val(0) < this.val(1) ? 1: 0);
                return true;
            case OpCodes.Equals:
                this.write(this.litval(2), this.val(0) == this.val(1) ? 1: 0);
                return true;
            default:
                assert(false, "Unknown opcode encountered!");
                return false;
        }
    }
}

export default function run(data: string)
{
    let instructions: number[] = data.split(",").map(function (i) { return parseInt(i) }).filter(function(i) { return !Number.isNaN(i) });
    console.log("Program length:", instructions.length);
    let ip: number = 0;
    let instruction: Instruction = new Instruction(instructions);

    while (true)
    {
        instruction.decode_instruction(ip);
        if (!instruction.execute_instruction())
            break;
        ip = instruction.ip;
    }
}