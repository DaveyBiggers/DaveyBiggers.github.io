"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const assert = require("assert");
const readFile = util.promisify(fs.readFile);
readFile("assets/day05.txt", { encoding: 'utf8' })
    .then((content) => { run(content); })
    .catch(error => console.log(error));
exports.OpCodeInfo = {
    [1 /* Add */]: 3,
    [2 /* Multiply */]: 3,
    [3 /* Input */]: 1,
    [4 /* Output */]: 1,
    [5 /* JumpIfTrue */]: 2,
    [6 /* JumpIfFalse */]: 2,
    [7 /* LessThan */]: 3,
    [8 /* Equals */]: 3,
    [99 /* Stop */]: 0
};
class Instruction {
    constructor(instruction_stream) {
        this.instruction_stream = instruction_stream;
    }
    decode_instruction(ip) {
        let instruction = this.instruction_stream[ip];
        ip++;
        this.opcode = instruction % 100;
        instruction = Math.floor(instruction / 100);
        let num_params = exports.OpCodeInfo[this.opcode];
        this.parameters = [];
        for (let i = 0; i < num_params; i++) {
            let param = { mode: instruction % 10, value: this.instruction_stream[ip] };
            //param.mode = instruction % 10;
            instruction = Math.floor(instruction / 10);
            //param.value = this.instruction_stream[ip];
            this.parameters.push(param);
            ip++;
        }
        this.ip = ip;
    }
    litval(param_index) {
        assert(param_index >= 0 && param_index < this.parameters.length, "Parameter out of range!");
        return this.parameters[param_index].value;
    }
    val(param_index) {
        assert(param_index >= 0 && param_index < this.parameters.length, "Parameter out of range!");
        let mode = this.parameters[param_index].mode;
        let value = this.parameters[param_index].value;
        switch (mode) {
            case 1 /* Immediate */:
                return value;
            case 0 /* Position */:
                assert(value >= 0 && value < this.instruction_stream.length, "Parameter position out of range!");
                return this.instruction_stream[value];
            default:
                assert(false, "Unknown parameter mode!");
        }
        return null;
    }
    write(index, value) {
        assert(index >= 0 && index < this.instruction_stream.length, "Attempting to write out of range!");
        this.instruction_stream[index] = value;
    }
    get_input() {
        return 5;
    }
    write_output(value) {
        console.log(value);
    }
    execute_instruction() {
        switch (this.opcode) {
            case 99 /* Stop */:
                return false;
            case 1 /* Add */:
                this.write(this.litval(2), this.val(0) + this.val(1));
                return true;
            case 2 /* Multiply */:
                this.write(this.litval(2), this.val(0) * this.val(1));
                return true;
            case 3 /* Input */:
                this.write(this.litval(0), this.get_input());
                return true;
            case 4 /* Output */:
                this.write_output(this.val(0));
                return true;
            case 5 /* JumpIfTrue */:
                if (this.val(0) != 0) {
                    this.ip = this.val(1);
                }
                return true;
            case 6 /* JumpIfFalse */:
                if (this.val(0) == 0) {
                    this.ip = this.val(1);
                }
                return true;
            case 7 /* LessThan */:
                this.write(this.litval(2), this.val(0) < this.val(1) ? 1 : 0);
                return true;
            case 8 /* Equals */:
                this.write(this.litval(2), this.val(0) == this.val(1) ? 1 : 0);
                return true;
            default:
                assert(false, "Unknown opcode encountered!");
                return false;
        }
    }
}
function run(data) {
    let instructions = data.split(",").map(function (i) { return parseInt(i); }).filter(function (i) { return !Number.isNaN(i); });
    console.log("Program length:", instructions.length);
    let ip = 0;
    let instruction = new Instruction(instructions);
    while (true) {
        instruction.decode_instruction(ip);
        if (!instruction.execute_instruction())
            break;
        ip = instruction.ip;
    }
}
exports.default = run;
//# sourceMappingURL=day05.js.map