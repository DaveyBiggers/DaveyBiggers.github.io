import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';

const readFile = util.promisify(fs.readFile);
readFile("assets/day18.txt", { encoding: 'utf8' })
    .then((content) => {run(content); })
    .catch(error => console.log(error));

/*
class GameState
{
    x: number;
    y: number;
    keys: string;
    keys_collection_order: string;
    distance: number;

    constructor(x: number, y: number, keys: string, distance: number)
    {
        this.x = x;
        this.y = y;
        this.keys_collection_order = keys;
        this.keys = keys.split("").sort().join("");
        this.distance = distance;
    }
    hash() : string
    {
        return this.x + "_" + this.y + "_" + this.keys;
    }
    has_all_keys() : boolean
    {
        return this.keys.length === 26;
    }
    has_key(door: string) : boolean
    {
        return this.keys.includes(door.toLowerCase());
    }
    add_key(key: string)
    {
        if (!this.keys.includes(key.toLowerCase()))
        {
            this.keys_collection_order += key;
            this.keys += key;
            this.keys = this.keys.split("").sort().join("");
        }
    }
}*/

class GameState
{
    x: number[];
    y: number[];
    keys: string;
    keys_collection_order: string;
    distance: number;

    constructor(x: number[], y: number[], keys: string, distance: number)
    {
        this.x = x;
        this.y = y;
        this.keys_collection_order = keys;
        this.keys = keys.split("").sort().join("");
        this.distance = distance;
    }
    sub_hash(i: number) : string
    {
        let s = "";
        s += this.x[i] + "_" + this.y[i] + "_";
        return s + this.keys;
    }
    hash() : string
    {
        let s = "";
        for (let i = 0; i < 4; i++)
        {
            s += this.x[i] + "_" + this.y[i] + "_";
        }
        return s + this.keys;
    }
    has_all_keys() : boolean
    {
        return this.keys.length === 26;
    }
    has_key(door: string) : boolean
    {
        return this.keys.includes(door.toLowerCase());
    }
    add_key(key: string)
    {
        if (!this.keys.includes(key.toLowerCase()))
        {
            this.keys_collection_order += key;
            this.keys += key;
            this.keys = this.keys.split("").sort().join("");
        }
    }
}

export function generate_neighbours(state: GameState, grid: string[], queued_maps: IStateMap[], width: number, height: number) :GameState[]
{
    let neighbours : GameState[] = [];
    let offsets : [number, number][] = [ [0, -1], [1, 0], [0, 1], [-1, 0] ];
    for (let i = 0; i < 4; i++)
    {
        for (let offset of offsets)
        {
            let x = state.x[i] + offset[0];
            let y = state.y[i] + offset[1];
            if (x >= 0 && x < width && y >= 0 && y < height)
            {
                let ind = x + y * width;
                if (grid[ind] != "#" && (!"ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(grid[ind]) || state.has_key(grid[ind])))
                {
                    // Can move here.
                    let xcopy = [...state.x];
                    let ycopy = [...state.y];
                    xcopy[i] = x;
                    ycopy[i] = y;
                    let neighbour_state = new GameState(xcopy, ycopy, state.keys_collection_order, state.distance + 1);
                    if ("abcdefghijklmnopqrstuvwxyz".includes(grid[ind]))
                        neighbour_state.add_key(grid[ind]);
                    if (!(neighbour_state.sub_hash(i) in queued_maps[i]))
                        neighbours.push(neighbour_state)
                }
            }
        }
    }
    return neighbours;
}

export interface IStateMap
{
    [details: string] : boolean;
}

class GameStateDeque
{
    private head: GameStateItem;
    private tail: GameStateItem;
    length: number;
    constructor()
    {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }
    shift() : GameState
    {
        if (!this.head)
            return null;
        let ret = this.head.value;
        this.head = this.head.next;
        this.length--;
        if (this.length === 0)
            this.tail = null;
        if (this.head)
            this.head.prev = null;
        return ret;
    }
    push(gs: GameState)
    {
        let gsitem = new GameStateItem(gs);
        gsitem.prev = this.tail;
        if (this.tail)
            this.tail.next = gsitem;
        this.tail = gsitem;
        if (!this.head)
            this.head = gsitem;
        this.length++;
    }
};

class GameStateItem
{
    value: GameState;
    next: GameStateItem;
    prev: GameStateItem;
    constructor(val: GameState) {
        this.value = val;
        this.next = null;
        this.prev = null;
    }
}

export default function run(data: string)
{
    //data = "#################\n#i.G..c...e..H.p#\n########.########\n#j.A..b...f..D.o#\n########@########\n#k.E..a...g..B.n#\n########.########\n#l.F..d...h..C.m#\n#################";
    //data = "########################\n#...............b.C.D.f#\n#.######################\n#.....@.a.B.c.d.A.e.F.g#\n########################";

    let cave: string[] = data.split("\n").filter(function(i) { return i.length });
    let grid: string[] = [];
    let y = 0;
    let start_x = [];
    let start_y = [];
    let width = 0;
    let height = 0;
    for (let line of cave)
    {
        let x = 0;
        for (let cell of line)
        {
            if (cell === "@")
            {
                start_x.push(x);
                start_y.push(y);
                cell = "."  // Remove "@" to simplify grid-checking code
            }
            grid.push(cell);
            x++;
        }
        width = x;
        y++;
    }
    height = y;
    let states = {}
    console.log("Width x Height:", width, height);
    console.log("Start pos:", start_x, start_y);
    let queue = new GameStateDeque();
    queue.push(new GameState(start_x, start_y, "", 0));
    let visited : IStateMap = {};
    let queued : IStateMap = {};
    let queued_sub_maps : IStateMap[] = [];
    for (let i = 0; i < 4; i++)
        queued_sub_maps.push({});

    let steps = 0;
    while (queue.length)
    {
        let state = queue.shift();
        if (steps % 100000 === 0)
        {
            console.log("After", steps, "steps, queue length is", queue.length, "and path length is", state.distance, "and this state's keys are", state.keys_collection_order, "(", state.keys_collection_order.length, ")");
        }
        if (!state)
        {
            console.log("Eh?");
        }
        if (state.has_all_keys())
        {
            // Done!
            console.log("Got all keys - took", state.distance, "steps.");
            break;
        }
        let neighbours = generate_neighbours(state, grid, queued_sub_maps, width, height);
        for (let n of neighbours)
        {
            let h = n.hash();
            if (h in visited || h in queued)
                continue;
            queue.push(n);
            queued[h] = true;
            for (let i = 0; i < 4; i++)
                queued_sub_maps[i][n.sub_hash(i)] = true;
        }
        visited[state.hash()] = true;
        steps++;
    }
}