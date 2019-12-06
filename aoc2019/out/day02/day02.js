"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const assert = require("assert");
const readFile = util.promisify(fs.readFile);
readFile("assets/day02.txt", { encoding: 'utf8' })
    .then((content) => { run(content); })
    .catch(error => console.log(error));
function run(data) {
    for (let noun = 0; noun <= 99; noun++) {
        for (let verb = 0; verb <= 99; verb++) {
            let opcodes = data.split(",").map(function (i) { return parseInt(i); }).filter(function (i) { return !Number.isNaN(i); });
            let pc = 0;
            let running = true;
            opcodes[1] = noun;
            opcodes[2] = verb;
            while (running) {
                let opcode = opcodes[pc];
                let input1 = opcodes[pc + 1];
                assert(input1 >= 0 && input1 < opcodes.length);
                let input2 = opcodes[pc + 2];
                assert(input2 >= 0 && input2 < opcodes.length);
                let output = opcodes[pc + 3];
                assert(output >= 0 && output < opcodes.length);
                switch (opcode) {
                    case 99:
                        running = false;
                        break;
                    case 1:
                        opcodes[output] = opcodes[input1] + opcodes[input2];
                        break;
                    case 2:
                        opcodes[output] = opcodes[input1] * opcodes[input2];
                        break;
                    default:
                        assert(false, "Unknown opcode encountered!");
                }
                pc += 4;
            }
            console.log(noun, verb, "produces:", opcodes[0]);
            if (opcodes[0] == 19690720) {
                console.log("SOLUTION:", noun * 100 + verb);
                console.log("FINISHED!");
                return;
            }
        }
    }
}
exports.default = run;
//# sourceMappingURL=day02.js.map