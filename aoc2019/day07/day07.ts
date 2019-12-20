import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';
import { timingSafeEqual } from 'crypto';

const readFile = util.promisify(fs.readFile);
readFile("assets/day07.txt", { encoding: 'utf8' })
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
    input_stream: number[];
    output_stream: number[];
    stopped: boolean;
    name: string;

    constructor(instruction_stream: number[], name?: string)
    {
        this.instruction_stream = instruction_stream;
        this.input_stream = [];
        this.output_stream = [];
        this.stopped = false;
        this.name = name;
        this.ip = 0;
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
        let instruction = this.instruction_stream[this.ip];
        this.opcode = instruction % 100;
        instruction = Math.floor(instruction / 100);
        let num_params = OpCodeInfo[this.opcode];
        this.parameters = [];
        for (let i = 0; i < num_params; i++)
        {
            let param : Parameter = {mode: instruction % 10, value: this.instruction_stream[this.ip + 1 + i]};
            instruction = Math.floor(instruction / 10);
            this.parameters.push(param);
        }
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
        //console.log(value);
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
                this.write(this.litval(2), this.val(0) + this.val(1));
                return true;
            case OpCodes.Multiply:
                this.write(this.litval(2), this.val(0) * this.val(1));
                return true;
            case OpCodes.Input:
                if (this.has_input_waiting())
                {
                    this.write(this.litval(0), this.get_input());
                    return true;
                } else {
                    //console.log(this.name, "waiting for input...");
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

export function generate_permutations(num_levels: number) : number[][]
{
    let permutations: number[][] = [];
    let current_sequnce: number[] = [];
    let available_options: number[] = [];
    for (let i = 0; i < num_levels; i++)
    {
        available_options.push(i);
    }
    generate_next_steps(permutations, current_sequnce, available_options);
    return permutations;
}

export function generate_next_steps(permutations: number[][], current_sequence : number[], available_options: number[])
{
    if (!available_options.length)
    {
        permutations.push(current_sequence);
    }
    for (let option = 0; option < available_options.length; option++)
    {
        let next_option = available_options[option];
        let next_available_options = [...available_options];
        next_available_options.splice(option, 1);
        let next_current_sequence = [...current_sequence];
        next_current_sequence.push(next_option);
        generate_next_steps(permutations, next_current_sequence, next_available_options);
    }
}

export default function run(data: string)
{
    let permutations : number[][] = generate_permutations(5);

    let instructions: number[] = data.split(",").map(function (i) { return parseInt(i) }).filter(function(i) { return !Number.isNaN(i) });
    console.log("Program length:", instructions.length);

    /*
    // STAGE I
    let max_signal = 0;
    for (let permutation of permutations)
    {
        let current_signal = 0;
        for (let phase_setting of permutation)
        {
            let ip = 0;
            let instruction: Instruction = new Instruction([...instructions]);
            instruction.input_stream.push(phase_setting);
            instruction.input_stream.push(current_signal);
            instruction.run();
            assert(instruction.has_finished(), "Program failed to run to completion!");
            current_signal = instruction.output_stream.shift();
            if (current_signal > max_signal)
            {
                max_signal = current_signal;
            }
        }
        console.log("FINAL OUTPUT FOR PERM", permutation, ":", current_signal);
    }
    console.log("MAX SIGNAL:", max_signal);
    */
    // STAGE II
    let max_signal = 0;
    let thruster_names = ["A", "B", "C", "D", "E"];
    for (let permutation of permutations)
    {
        let thrusters : Instruction[] = [];
        for (let i = 0; i < permutation.length; i++)
        {
            let phase_setting = permutation[i];
            let instruction = new Instruction([...instructions], thruster_names[i]);
            if (i != 0)
            {
                instruction.set_input_stream(thrusters[i - 1].output_stream);
                instruction.input_stream.push(phase_setting + 5);
            }
            thrusters.push(instruction);
        }
        thrusters[0].set_input_stream(thrusters[4].output_stream);
        thrusters[0].input_stream.push(5);
        thrusters[0].input_stream.push(0);

        while (true)
        {
            let stopped_count = 0;
            for (let thruster of thrusters)
            {
                thruster.step();
                if (thruster.has_finished())
                {
                    stopped_count++;
                }
            }
            if (stopped_count == 5)
            {
                let result = thrusters[4].output_stream.pop();
                console.log(result);
                console.log("FINAL OUTPUT FOR PERM", permutation, ":", result);
                if (result > max_signal)
                {
                    max_signal = result;
                }
                break;
            }
        }
    }
    console.log("MAX:", max_signal);
}