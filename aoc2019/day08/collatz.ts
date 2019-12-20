import { AssertionError } from "assert";

function step(i: number) : number
{
    if (i % 2)
        return (i * 3) + 1;
    return i / 2;
}

function get_sequence(i : number) : number[]
{
    let sequence :number[] = [i];
    while (i != 1)
    {
        i = step(i);
        sequence.push(i);
    }
    return sequence;
}

function get_sequence_length(i: number) : number
{
    return get_sequence(i).length;
}

export interface IHash {
    [details: number] : number;
}

let sequence_length_map : IHash = { 1:1 };



function john_compute()
{
    let saved_calls = 0;
    for (let i = 2; i <= 10; i++)
    {
        let next = step(i);
        if (!(next in sequence_length_map))
        {
            sequence_length_map[next] = get_sequence_length(next);
        }
        sequence_length_map[i] = sequence_length_map[next] + 1;
        saved_calls += sequence_length_map[next];
        console.log(i, sequence_length_map[i]);
    }
    console.log(saved_calls);
    return saved_calls;
}

john_compute();








let total_steps_calculated = 0;

function get_sequence_length_fast(i : number) : number
{
    let num_steps = 0;
    let sequence = [i];
    while (true)
    {
        if (i in sequence_length_map)
        {
            let result = sequence_length_map[i];
            //sequence_length_map[original_i] = result;
            //console.log("For", sequence[0], "calculated", num_steps, "steps, and used cache for", result);
            total_steps_calculated += num_steps;
            for (let j = sequence.length - 1; j >= 0; j--)
            {
                sequence_length_map[sequence[j]] = result;
                result++;
            }
            return sequence_length_map[sequence[0]];
        }
        i = step(i);
        sequence.push(i);
        num_steps += 1;
    }
}

let range_max = 10;

let sequence_lengths : number[] = [];
let total_required_without_caching = 0;
let max_length = 0;

for (let i = 1; i <= range_max; i++)
{
    let result = get_sequence_length(i);
    if (result > max_length)
    {
        console.log("New max:", result, " for seed:", i);
        max_length = result;
    }
    total_required_without_caching += result;
    sequence_lengths.push(result);
}
console.log(sequence_lengths);
console.log("Total steps required:", total_required_without_caching);

let sequence_lengths_fast : number[] = [];
for (let i = 1; i <= range_max; i++)
{
    let result = get_sequence_length_fast(i);
    if (result != sequence_lengths[i - 1])
    {
        console.log("ARGH GONE WRONG!");
    }
    sequence_lengths_fast.push(get_sequence_length_fast(i));
}
console.log(sequence_lengths_fast);

console.log("Total steps calculated:", total_steps_calculated);

console.log(get_sequence(12).join(","));
//console.log(get_sequence(13));
//console.log(get_sequence(14));
//console.log(get_sequence(15));


