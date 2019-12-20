import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';

const readFile = util.promisify(fs.readFile);
readFile("assets/day14.txt", { encoding: 'utf8' })
    .then((content) => {run(content); })
    .catch(error => console.log(error));

export interface Spec
{
    quantity: number;
    element: string;
}

export interface AssetMap
{
    [details: string] : number;
}

export class Refinery
{
    inputs: Spec[] = [];
    output: Spec;
    rule: string;

    constructor(rule: string)
    {
        this.rule = rule;
        let parts :string[] = rule.split(" => ");
        assert(parts.length === 2);
        let left = parts[0];
        let right = parts[1];

        let inputs:string[] = left.split(",");
        for (let i of inputs)
        {
            let spec = this.parse_spec(i.trim());
            this.inputs.push(spec);
        }

        this.output = this.parse_spec(right);
    }

    parse_spec(rule: string) : Spec
    {
        let parts :string[] = rule.trim().split(" ");
        assert(parts.length === 2);
        let spec = {quantity: Number.parseInt(parts[0]), element:parts[1]};
        return spec;
    }

    adjust_requirements(requirements: AssetMap) : boolean
    {
        // Can we fulfill any of the requirements?
        // If so, replace with what *we* need in order to make that happen.
        // Return true if we do any processing.
        let num_available = this.output.element in requirements ? requirements[this.output.element] : 0;
        if (num_available < 0)
        {
            // Deficit... we can fill.
            let num_cycles = Math.ceil(-num_available / this.output.quantity);
            requirements[this.output.element] += this.output.quantity * num_cycles;
            //console.log("Running", num_cycles, "cycles of", this.rule);
            for (let i of this.inputs)
            {
                if (!(i.element in requirements))
                    requirements[i.element] = 0;
                requirements[i.element] -= num_cycles * i.quantity;
            }
            return true;
        }
        return false;
    }

    consume(assets: AssetMap) : boolean
    {
        // Can we consume anything?
        // Return true if we do any processing.
        let max_cycles = -1;
        for (let i of this.inputs)
        {
            if (i.element in assets)
            {
                let available_cycles = Math.floor(assets[i.element] / i.quantity);
                if (available_cycles < max_cycles || max_cycles === -1)
                    max_cycles = available_cycles;
            }
            else
                return false;   // Can't do anything; inputs not met.
        }

        if (max_cycles > 0)
        {
            // We can consume!
            console.log("Running", max_cycles, "cycles of", this.rule);
            if (!(this.output.element in assets))
                assets[this.output.element] = 0;

            assets[this.output.element] += this.output.quantity * max_cycles;
            for (let i of this.inputs)
            {
                assets[i.element] -= max_cycles * i.quantity;
            }
            return true;
        }
        return false;
    }
}

export function display_assets(assets: AssetMap)
{
}

export default function run(data: string)
{
    let rules: string[] = data.split("\n").filter(function(s) { return s.length > 0; });
    console.log("Number of rules:", rules.length);

    let refineries: Refinery[] = [];
    for (let rule of rules)
    {
        refineries.push(new Refinery(rule));
    }
    let assets: AssetMap = {};
    let fuel_generated = 0;
    assets["FUEL"] = -1766100;
    assets["ORE"] = 1000000000000;
    let fuel_requested = 1766100;
    let passes = 0;
    while (true)
    {
        //console.log("Pass:", passes);
        //console.log("--------");
        let changed = false;
        for (let refinery of refineries)
        {
            if (refinery.adjust_requirements(assets))
            //if (refinery.consume(assets))
                changed = true;
        }
        if (!changed)
        {
            // System is stable...
            if (assets["ORE"] >= 0)
            {
                // Made some more fuel without going into debt.
                fuel_generated += fuel_requested;
                fuel_requested = 1;
                console.log("Fuel generated:", fuel_generated, "; ore remaining:", assets["ORE"]);
                assets["FUEL"] = -fuel_requested;
            }
            else
                break;
        }
        if (assets["ORE"] < 0)
            break;  // We're out.
        passes++;
    }
    console.log("ORE LEFT:", assets["ORE"]);
    console.log("FUEL GENERATED:", fuel_generated);
}