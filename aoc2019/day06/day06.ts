import * as fs from 'fs';
import * as util from 'util';
import * as assert from 'assert';

const readFile = util.promisify(fs.readFile);
readFile("assets/day06.txt", { encoding: 'utf8' })
    .then((content) => {run(content); })
    .catch(error => console.log(error));

class OrbitNode {
    parent?: OrbitNode;
    children: OrbitNode[];
    level: number;
    name: string;

    angular_velocity: number;
    orbit_radius: number;
    angle: number;
    x: number;
    y: number;

    constructor(name: string, parent: OrbitNode)
    {
        this.name = name;
        this.children = [];
        if (parent)
        {
            this.set_parent(parent);
        }

        this.angular_velocity = Math.random() - 0.5;
        this.angle = Math.random() * Math.PI * 2.0;
        this.orbit_radius = Math.random() * 5;
    }

    draw(ctx: CanvasRenderingContext2D)
    {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'green';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#003300';
        ctx.stroke();
    }

    update_position()
    {
        this.angle += this.angular_velocity;
        if (this.parent)
        {
            this.x = this.parent.x + Math.cos(this.angle) * this.orbit_radius;
            this.y = this.parent.y + Math.sin(this.angle) * this.orbit_radius;
        }
        for (let child of this.children)
        {
            child.update_position();
        }
    }

    set_parent(parent: OrbitNode)
    {
        this.parent = parent;
        if (parent)
        {
            parent.add_child(this);
        }
    }

    add_child(child: OrbitNode)
    {
        this.children.push(child);
    }

    set_level(level: number)
    {
        this.level = level;
        for (let child of this.children)
        {
            child.set_level(level + 1);
        }
    }

    sum_levels() : number
    {
        let total = this.level;
        for (let child of this.children)
        {
            total += child.sum_levels();
        }
        return total;
    }
}

export function get_dependency_pair(dep_string : string) : [string, string]
{
    let parts = dep_string.split(")");
    assert(parts.length === 2, "Invalid input!");
    return [parts[0], parts[1]];
}

export interface IOrbitMap
{
    [details: string] : OrbitNode;
}

export default function run(data: string)
{
    //data = "COM)B\nB)C\nC)D\nD)E\nE)F\nB)G\nG)H\nD)I\nE)J\nJ)K\nK)L\n"; Part I test
    //data = "COM)B\nB)C\nC)D\nD)E\nE)F\nB)G\nG)H\nD)I\nE)J\nJ)K\nK)L\nK)YOU\nI)SAN\n"; Part II test

    let dependencies = data.split("\n").filter(function(i) { return (i.length > 0) }).map(function (i) { return get_dependency_pair(i) });
    console.log("Dependency pairs:", dependencies.length);
    let orbit_objects: IOrbitMap = {};
    let com = new OrbitNode("COM", null);
    orbit_objects["COM"] = com;

    for (let dep of dependencies)
    {
        let centre_object_name = dep[0];
        let orbitting_object_name = dep[1];
        if (!(centre_object_name in orbit_objects))
        {
            orbit_objects[centre_object_name] = new OrbitNode(centre_object_name, null);
        }
        let centre_object = orbit_objects[centre_object_name];
        if (!(orbitting_object_name in orbit_objects))
        {
            orbit_objects[orbitting_object_name] = new OrbitNode(orbitting_object_name, centre_object);
        }
        else
        {
            orbit_objects[orbitting_object_name].set_parent(centre_object);
        }
    }

    com.set_level(0);
    console.log(com.sum_levels());

    // Get path from YOU to COM:
    let you_to_com = [];
    let position = orbit_objects["YOU"];
    while (position != com)
    {
        position = position.parent;
        you_to_com.push(position.name);
    }
    console.log(you_to_com.join(","));

    // Get path from SAN to COM:
    let san_to_com = [];
    position = orbit_objects["SAN"];
    while (position != com)
    {
        position = position.parent;
        san_to_com.push(position.name);
    }
    console.log(san_to_com.join(","));

    // Now iterate backwards until we find a point of divergence:
    let index = 0;
    let san_length = san_to_com.length;
    let you_length = you_to_com.length;
    while(san_to_com[san_length - 1 - index] == you_to_com[you_length - 1 - index])
    {
        index++;
    }
    console.log(index, "parts in common");
    console.log((san_length - index) + (you_length - index));


    const canvas = <HTMLCanvasElement>document.getElementById('canvas');
    let ctx = canvas.getContext('2d');

    function draw_step()
    {
        com.update_position();
        com.draw(ctx);
        window.requestAnimationFrame(() => draw_step());
    }

    window.requestAnimationFrame(() => draw_step());
}