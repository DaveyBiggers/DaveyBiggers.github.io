class Moon
{
    x: number;
    y: number;
    z: number;
    x_vel: number;
    y_vel: number;
    z_vel: number;
    name: string;

    constructor(name: string, x: number, y: number, z: number)
    {
        this.name = name;
        this.x = x;
        this.y = y;
        this.z = z;
        this.x_vel = 0;
        this.y_vel = 0;
        this.z_vel = 0;
    }

    energy() : number
    {
        let pot_energy = Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
        let kin_energy = Math.abs(this.x_vel) + Math.abs(this.y_vel) + Math.abs(this.z_vel);
        return pot_energy * kin_energy;
    }

    update_positions()
    {
        this.x += this.x_vel;
        this.y += this.y_vel;
        this.z += this.z_vel;
    }

    update_velocities(other: Moon)
    {
        let dx = Math.max(-1, Math.min(1, other.x - this.x));
        let dy = Math.max(-1, Math.min(1, other.y - this.y));
        let dz = Math.max(-1, Math.min(1, other.z - this.z));
        this.x_vel += dx;
        this.y_vel += dy;
        this.z_vel += dz;
    }

    hash() : string
    {
        //return this.name + "(" + this.x + "," + this.y + "," + this.z + "," + this.x_vel + "," + this.y_vel + "," + this.z_vel + ")";
        return this.name + "(" + this.z + "," + this.z_vel + ")";
    }
}

export interface IHash
{
    [details: string] : number;
}

run();

export default function run()
{
    let moons : Moon[] = [];

    moons.push(new Moon("Io", 3, 15, 8));
    moons.push(new Moon("Europa", 5, -1, -2));
    moons.push(new Moon("Ganymede", -10, 8, 2));
    moons.push(new Moon("Callisto", 8, 4, -5));

    let visited_states: IHash = {}
    let t = 0;

    let key = "";
    for (let a of moons)
    {
        key += a.hash();
    }
    visited_states[key] = 0;

    while (true)
    {
        // Apply gravity:
        for (let a of moons)
        {
            for (let b of moons)
            {
                a.update_velocities(b);
            }
        }
        // Update positions:
        for (let a of moons)
        {
            a.update_positions();
        }
        t += 1;
        // Get a key string from the states:
        let key = "";
        for (let a of moons)
        {
            key += a.hash();
        }
        if (key in visited_states)
        {
            console.log("Duplicate state - at time", t, "and previous time", visited_states[key]);
            break;
        }
        visited_states[key] = t;
        if (t % 100000 === 0)
        {
            console.log("t now at", t);
        }
    }
    // Count up total energy:
    let energy = 0;
    for (let a of moons)
    {
        energy += a.energy();
    }
    console.log(energy);
}

// X: Duplicate state - at time 231614 and previous time 0
// Y: Duplicate state - at time 144624 and previous time 0
// Z: Duplicate state - at time 102356 and previous time 0
// LCM = 428576638953552

