function draw(animation_items, timestamp) {
    var ctx = document.getElementById('canvas').getContext('2d');
    ctx.globalCompositeOperation = 'destination-over';
    ctx.clearRect(0,0,1200,1000);

    for (var i = 0; i < animation_items.length; i++) {
        anim = animation_items[i];
        anim.draw(ctx, timestamp);
    }

    window.requestAnimationFrame(function(timestamp) { draw(animation_items, timestamp); });
}

class AnimationPhase {
    constructor(start_time, end_time, start_attributes, end_attributes) {
        this.start_time = start_time;
        this.end_time = end_time;
        this.start_attributes = start_attributes;
        this.end_attributes = end_attributes;
    }
}

class AnimationProfile {
    constructor(style, steepness=1) {
        this.style = style;
        this.steepness = steepness;
    }

    get_interpolator(start_time, end_time, current_time) {
        if (current_time > end_time) {
            return 1.0;
        }
        if (current_time < start_time) {
            return 0.0;
        }
        if (this.style == "linear") {
            return (current_time - start_time) / (end_time - start_time);
        } else if (this.style == "sigmoid") {
            var mid_time = (end_time + start_time) / 2.0;
            return 1.0 / (1.0 + Math.exp(-this.steepness * (current_time - mid_time)));
        } else if (this.style == "cheeky") {
            var lin = (current_time - start_time) / (end_time - start_time);
            return (lin - this.steepness * Math.sin(2 * Math.PI * lin));
        }
    }
}

class TextAnimationItem {
    constructor(initial_textatts, profile=new AnimationProfile("linear"), colour_profile=new AnimationProfile("linear")) {
        this.animations = []
        this.textatts = initial_textatts;
        this.initial_textatts = initial_textatts;
        this.profile = profile;
        this.colour_profile = colour_profile;
    }

    add_animation(timer, end_attributes) {
        var start_attributes = this.initial_textatts;
        if (this.animations.length > 0) {
            start_attributes = this.animations[this.animations.length - 1].end_attributes;
        }
        this.animations.push(new AnimationPhase(timer.get_start_time(), timer.get_end_time(), start_attributes, end_attributes));
        timer.update();
    }

    add_animation_dep(start_time, end_time, end_attributes) {
        var start_attributes = this.initial_textatts;
        if (this.animations.length > 0) {
            start_attributes = this.animations[this.animations.length - 1].end_attributes;
        }
        this.animations.push(new AnimationPhase(start_time, end_time, start_attributes, end_attributes));
    }

    latest_text_atts() {
        if (this.animations.length > 0) {
            return this.animations[this.animations.length - 1].end_attributes;
        }
        return this.initial_textatts;
    }

    add_fade_out_dep(start_time, end_time) {
        var last_atts = this.latest_text_atts();
        this.add_animation_dep(start_time, end_time, last_atts.with_opacity(0));
        return this;
    }
    add_fade_out(timer) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_opacity(0));
        return this;
    }
    add_fade_in_dep(start_time, end_time) {
        var last_atts = this.latest_text_atts();
        this.add_animation_dep(start_time, end_time, last_atts.with_opacity(1));
        return this;
    }
    add_fade_in(timer) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_opacity(1));
        return this;
    }
    add_offset_dep(start_time, end_time, xoff, yoff, rotoff=0) {
        var last_atts = this.latest_text_atts();
        this.add_animation_dep(start_time, end_time, last_atts.with_offset(xoff, yoff, rotoff));
        return this;
    }
    add_offset(timer, xoff, yoff, rotoff=0) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_offset(xoff, yoff, rotoff));
        return this;
    }
    add_moveto_dep(start_time, end_time, xpos, ypos, rot=0) {
        var last_atts = this.latest_text_atts();
        this.add_animation_dep(start_time, end_time, last_atts.with_position(xpos, ypos, rot));
        return this;
    }
    add_moveto(timer, xpos, ypos, rot=0) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_position(xpos, ypos, rot));
        return this;
    }
    add_pulse_dep(start_time, end_time, colour) {
        var last_atts = this.latest_text_atts();
        this.add_animation_dep(start_time, (start_time + end_time) / 2, last_atts.with_colour(colour).with_size(last_atts.size + 5));
        this.add_animation_dep((start_time + end_time) / 2, end_time, last_atts);
        return this;
    }
    add_pulse(timer, colour) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer.from(timer.get_start_time(), timer.get_mid_time()), last_atts.with_colour(colour).with_size(last_atts.size + 5));
        this.add_animation(timer.from(timer.get_mid_time(), timer.get_end_time()), last_atts);
        timer.update();
        return this;
    }
    add_text_change_dep(start_time, end_time, text) {
        var last_atts = this.latest_text_atts();
        this.add_animation_dep(start_time, (start_time + end_time) / 2, last_atts.with_opacity(0));
        this.add_animation_dep((start_time + end_time) / 2, end_time, last_atts.with_text(text));
        return this;
    }
    add_text_change(timer, text) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer.from(timer.get_start_time(), timer.get_mid_time()), last_atts.with_opacity(0));
        this.add_animation(timer.from(timer.get_mid_time(), timer.get_end_time()), last_atts.with_text(text));
        timer.update();
        return this;
    }
    add_colour_change_dep(start_time, end_time, colour) {
        var last_atts = this.latest_text_atts();
        this.add_animation_dep(start_time, end_time, last_atts.with_colour(colour));
        return this;
    }
    add_colour_change(timer, colour) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_colour(colour));
        return this;
    }

    get_atts_at_time(atts, timestamp) {
        var current_animation_phase = null;
        for (var i = 0; i < this.animations.length; i++) {
            var anim = this.animations[i];
            if (anim.start_time <= timestamp) {
                current_animation_phase = anim;
            }
            if (anim.start_time <= timestamp && anim.end_time >= timestamp) {
                current_animation_phase = anim;
                break;
            }
        }
        if (current_animation_phase == null) {
            atts = this.textatts;
        } else {
            var b = current_animation_phase.end_attributes;
            var a = current_animation_phase.start_attributes;
            var alpha = this.profile.get_interpolator(current_animation_phase.start_time, current_animation_phase.end_time, timestamp);
            var colour_alpha = this.colour_profile.get_interpolator(current_animation_phase.start_time, current_animation_phase.end_time, timestamp);
            atts.interpolate(a, b, alpha, colour_alpha);
        }
    }

    draw(context, timestamp) {
       this.get_atts_at_time(this.textatts, timestamp);
       this.textatts.draw(context);
    }
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
  
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
}

function interpolate_colours(colA, colB, alpha) {
    var a = hexToRgb(colA);
    var b = hexToRgb(colB);
    var rcol = a.r + (b.r - a.r) * alpha;
    var gcol = a.g + (b.g - a.g) * alpha;
    var bcol = a.b + (b.b - a.b) * alpha;
    return rgbToHex(Math.round(rcol), Math.round(gcol), Math.round(bcol));
}

class TextAttributes {
    constructor(txt, x, y, rot, opacity, colour, font="lucida console", size=30, alignment="right") {
        this.txt = txt;
        this.x = x;
        this.y = y;
        this.rot = rot;
        this.opacity = opacity;
        this.colour = colour;
        this.font = font;
        this.size = size;
        this.alignment = alignment;
    }
    draw(ctx) {
        if (this.opacity == 0) {
            return;
        }
        ctx.font = this.size + "px " + this.font;
        ctx.fillStyle = this.colour;
        ctx.globalAlpha = this.opacity;
        ctx.textAlign = this.alignment;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-this.rot * (Math.PI / 180));
        ctx.fillText(this.txt, 0, 0);
        ctx.restore();
    }
    interpolate(ta, tb, alpha, colour_alpha) {
        this.x = ta.x + (tb.x - ta.x) * alpha;
        this.y = ta.y + (tb.y - ta.y) * alpha;
        this.rot = ta.rot + (tb.rot - ta.rot) * alpha;
        this.opacity = ta.opacity + (tb.opacity - ta.opacity) * colour_alpha;
        this.colour = interpolate_colours(ta.colour, tb.colour, colour_alpha);
        this.size = Math.round(ta.size + (tb.size - ta.size) * colour_alpha);

        // Not interpolated:
        this.font = tb.font;
        this.txt = tb.txt;
        this.alignment = tb.alignment;
    }
    with_opacity(opacity) {
        return new TextAttributes(this.txt, this.x, this.y, this.rot, opacity, this.colour, this.font, this.size, this.alignment);
    }
    with_offset(xoff, yoff, rotoff=0) {
        return new TextAttributes(this.txt, this.x + xoff, this.y + yoff, this.rot + rotoff, this.opacity, this.colour, this.font, this.size, this.alignment);
    }
    with_position(xpos, ypos, rot=0) {
        return new TextAttributes(this.txt, xpos, ypos, rot, this.opacity, this.colour, this.font, this.size, this.alignment);
    }
    with_colour(colour) {
        return new TextAttributes(this.txt, this.x, this.y, this.rot, this.opacity, colour, this.font, this.size, this.alignment);
    }
    with_text(text) {
        return new TextAttributes(text, this.x, this.y, this.rot, this.opacity, this.colour, this.font, this.size, this.alignment);
    }
    with_size(size) {
        return new TextAttributes(this.txt, this.x, this.y, this.rot, this.opacity, this.colour, this.font, size, this.alignment);
    }
}

class TimeController {
    constructor(speed, name="") {
        this.speed = speed;
        this.time = 0;
        this.markers = [];
        this.duration_of_next_animation = 0;
        this.skip_next_update = false;
        this.name = name;
    }
    push_time() {
        this.markers.push(this.time);
    }
    pop_time() {
        this.time = this.markers.pop();
    }
    set_time(time) {
        this.time = time;
    }
    pause(time) {
        this.time += this.speed * time;
    }
    with_dur(duration) {
        this.duration_of_next_animation = duration;
        this.skip_next_update = false;
        return this;
    }
    from(start, end) {
        var tc = new TimeController(this.speed, "temp");
        tc.set_time(start);
        return tc.with_dur(end - start);
    }
    from_relative(start, end) {
        var tc = new TimeController(this.speed, "temp");
        tc.set_time(this.time + this.speed * start);
        return tc.with_dur(end - start);
    }
    with_trans_dur(duration) {
        this.duration_of_next_animation = duration;
        this.skip_next_update = true;
        return this;
    }
    update() {
        if (!this.skip_next_update) {
            this.time += this.speed * this.duration_of_next_animation;
        }
        this.skip_next_update = false;
    }
    get_start_time() {
        return this.time;
    }
    get_end_time() {
        return this.time + this.speed * this.duration_of_next_animation;
    }
    get_mid_time() {
        return this.time + this.speed * 0.5 * this.duration_of_next_animation;
    }
}

class AnimatedArray {
    constructor(x, y, char_size, cell_size, colour) {
        this.arr = undefined;
        this.x = x;
        this.y = y;
        this.char_size = char_size;
        this.cell_size = cell_size;
        this.colour = colour;
        this.pointers = new Map();
        this.pointer_locations = new Map();
        this.pointer_line_offsets = new Map();
        this.animated_elements = [];

        this.pointer_speed = 200;
    }
    from_text(text) {
        this.length = text.length;
        this.arr = new Array(length);
        for (var i = 0; i < this.length; i++) {
            this.arr[i] = text[i];
        }
        return this;
    }
    from_array(arr) {
        this.length = arr.length;
        this.arr = arr;
        return this;
    }
    create_pointer(name, line_offset = -1, timer, start_location=-1, colour="#ff0000") {
        var char = (line_offset > 0) ? "^" : "v";
        var ta = new TextAttributes(char, this.x + start_location * this.cell_size, this.y + this.char_size * line_offset, 0, 0, colour);
        var pointer = new TextAnimationItem(ta, new  AnimationProfile("cheeky", 0.3));
        pointer.add_animation_dep(timer.get_start_time(), timer.get_end_time(), ta.with_opacity(1.0));
        timer.update();
        this.pointers.set(name, pointer);
        this.pointer_locations.set(name, start_location);
        this.pointer_line_offsets.set(name, line_offset);
        return pointer;
    }
    get_animated_elements() {
        return this.animated_elements.concat(Array.from(this.pointers.values()));
    }
    animel_at(index) {
        return this.animated_elements[index];
    }
    value_at(index) {
        return this.arr[index];
    }
    animel_at_pointer(name) {
        var index = this.pointer_locations.get(name);
        if (index >= 0 && index < this.length) {
            return this.animated_elements[index];
        }
        return undefined;
    }
    value_at_pointer(name) {
        var index = this.pointer_locations.get(name);
        if (index >= 0 && index < this.length) {
            return this.arr[index];
        }
        return undefined;
    }
    get_pointer(name) {
        return this.pointers.get(name);
    }
    move_pointer_to(name, index, timer) {
        var pointer = this.pointers.get(name);
        if (pointer) {
            this.pointer_locations.set(name, index);
            pointer.add_moveto(timer, this.x + index * this.cell_size, this.y + this.char_size * this.pointer_line_offsets.get(name));
        }
    }
    increment_pointer(name, flash_element, timer) {
        var pointer = this.pointers.get(name);
        if (pointer) {
            var i = this.pointer_locations.get(name);
            if (i < this.length - 1) {
                i++;
                this.pointer_locations.set(name, i);
                pointer.add_offset(timer.from(timer.get_start_time(), timer.get_mid_time()), this.cell_size, 0, 0);
                if (flash_element) {
                    this.animated_elements[i].add_pulse(timer.from(timer.get_mid_time(), timer.get_end_time()), "#ff0000");
                }
            }
        }
        timer.update();
    }
    decrement_pointer(name, flash_element, timer) {
        var pointer = this.pointers.get(name);
        if (pointer) {
            var i = this.pointer_locations.get(name);
            if (i > 0) {
                i--;
                this.pointer_locations.set(name, i);
                pointer.add_offset(timer.from(timer.get_start_time(), timer.get_mid_time()), -this.cell_size, 0, 0);
                if (flash_element) {
                    this.animated_elements[i].add_pulse(timer.from(timer.get_mid_time(), timer.get_end_time()), "#ff0000");
                }
            }
        }
        timer.update();
    }
    display(timer) {
        console.log("Creating text wipe from ", this.arr);
        return create_text_wipe(this.animated_elements, this.arr, this.x, this.y, this.colour, timer, this.cell_size);
    }
    fill_blank(timer) {
        return create_text_wipe(this.animated_elements, " ".repeat(this.arr.length), this.x, this.y, this.colour, timer, this.cell_size);
    }
}

function build_initial_suffixes(txt) {
    text_items = []
    for (var i = 0; i < txt.length; i++) {
        suffix = txt.substring(i)
        text_items.push(new text_item(suffix, 500, 50, 0, 500, 50 + (32*i), 0))
    }
    return text_items
}

function create_text_wipe(animations, txt, x, y, colour, timer, char_width=20) {
    for (var i = 0; i < txt.length; i++) {
        var chartxt = txt[i];
        var charx = x + i * char_width;
        var chary = y;
        var t1 = new TextAttributes(chartxt, charx + 10, chary + 10, 90, 0, colour);
        var t2 = new TextAttributes(chartxt, charx, chary - 10, 270, 1.0, colour);
        var t3 = new TextAttributes(chartxt, charx, chary, 0, 1.0, colour);
        var animchar = new TextAnimationItem(t1);
        timer.pause(20);
        timer.push_time();
        animchar.add_animation(timer.with_dur(100), t2);
        animchar.add_animation(timer.with_dur(100), t3);
        timer.pop_time();
        animations.push(animchar);
    }
}

function create_text_wipe_dep(animations, txt, x, y, colour, time_offset, speed, char_width=20) {
    for (var i = 0; i < txt.length; i++) {
        var chartxt = txt[i];//.substring(i, i + 1);
        var charx = x + i * char_width;
        var chary = y;
        var t1 = new TextAttributes(chartxt, charx + 10, chary + 10, 90, 0, colour);
        var t2 = new TextAttributes(chartxt, charx, chary - 10, 270, 1.0, colour);
        var t3 = new TextAttributes(chartxt, charx, chary, 0, 1.0, colour);
        var animchar = new TextAnimationItem(t1);
        time_offset += speed * 20;
        animchar.add_animation_dep(time_offset, time_offset + speed * 100, t2);
        animchar.add_animation_dep(time_offset + speed * 100, time_offset + speed * 200, t3);
        animations.push(animchar);
    }
    return time_offset + speed * 200;
}

function create_link_animation(a, b, timer) {
    var t1 = new TextAttributes();
    var t2 = new TextAttributes();
    a.get_atts_at_time(t1, timer.get_start_time());
    b.get_atts_at_time(t2, timer.get_end_time());
    var linker = new TextAnimationItem(t1.with_opacity(0));
    linker.add_animation(timer.from(timer.get_start_time(), timer.get_start_time()), t1);
    linker.add_animation(timer, t2);
    linker.add_animation(timer.with_dur(1), t2.with_opacity(0));
    return linker;
}

function create_link_animation_dep(a, b, start_time, end_time) {
    var t1 = new TextAttributes();
    var t2 = new TextAttributes();
    a.get_atts_at_time(t1, start_time);
    b.get_atts_at_time(t2, end_time);
    var linker = new TextAnimationItem(t1.with_opacity(0));
    linker.add_animation_dep(start_time, start_time, t1);
    linker.add_animation_dep(start_time, end_time, t2);
    linker.add_animation_dep(end_time, end_time, t2.with_opacity(0));
    return linker;
}

function create_multiline_text(animations, txt, x, y, colours, time_offset) {
    lines = txt.split("\n");
    for (var l = 0; l < lines.length; l++) {
        new_time_offset = create_text_wipe_dep(animations, lines[l], x, y + (30 * l), colours[l % colours.length], time_offset);
        time_offset = (time_offset + new_time_offset) / 2.0;
    }
    return time_offset;
}

window.addEventListener("load", function(){
    //old_method();
    //return;

    timer = new TimeController(1, "main");

    var text = "mmiissiissiippii$";
    var text_length = text.length;

    var text_x = 40;
    var text_y = 150;
    var text_cell_size = 30;
    var text_font_size = 30;

    var explanation_x = 10;
    var explanation_y = 180;

    var stage_title_x = 10;
    var stage_title_y = 30;

    var alphabet_x = 40;
    var alphabet_y = 220;

    var cells_x = 130;
    var cells_y = 440;

    var text_anim = new AnimatedArray(text_x, text_y, text_font_size, text_cell_size, "#000000").from_text(text);
    text_anim.display(timer);

    var l_or_s = new AnimatedArray(text_x, text_y - 40, text_font_size, text_cell_size, "#00cc00").from_array(new Int8Array(text_length));
    l_or_s.fill_blank(timer);

    explanation = new TextAnimationItem(new TextAttributes("", explanation_x, explanation_y, 0, 1.0, "#222222", font="undefined", size=20, alignment="left"));
    text_anim.create_pointer("pc", -2.8, timer.with_dur(500), text_length - 1);

    // STAGE ONE
    current_stage = new TextAnimationItem(new TextAttributes("1: Traverse string backwards, labelling characters as L(larger) or S(smaller)", stage_title_x, stage_title_y, 0, 1.0, "#111111", font=undefined, size=20, alignment="left"));

    for (var i = text_length - 1; i >=0; i--) {
        var isS = true;
        if (i < text_length - 1) {
            if (text[i] < text[i + 1]) {
                explanation.add_text_change(timer.with_dur(100), "'" + text[i] + "' < '" + text[i + 1] + "'");
                isS = true;
            } else if (text[i] > text[i + 1]) {
                explanation.add_text_change(timer.with_dur(100), "'" + text[i] + "' > '" + text[i + 1] + "'");
                isS = false;
            } else {
                isS = l_or_s.value_at(i + 1);
                explanation.add_text_change(timer.with_dur(100), "'" + text[i] + "' == '" + text[i + 1] + "'");
            }
        }
        var lors = null;
        l_or_s.arr[i] = isS;
        if (isS) {
            text_anim.animel_at(i).add_offset(timer.from_relative(700, 1000), 0, 5, 0);
            l_or_s.animel_at(i).add_text_change(timer.from_relative(1000, 1500), "S").add_colour_change(timer.from_relative(1500,1600), "#0000cc");
        } else {
            text_anim.animel_at(i).add_offset(timer.from_relative(700, 1000), 0, -5, 0);
            l_or_s.animel_at(i).add_text_change(timer.from_relative(1000, 1500), "L").add_colour_change(timer.from_relative(1500,1600), "#00cc00");
        }
        timer.pause(500);
        text_anim.decrement_pointer("pc", true, timer.with_dur(500));
    }
    text_anim.get_pointer("pc").add_fade_out(timer.with_dur(500));
    explanation.add_fade_out(timer.with_dur(500));

    //var ta_l = new TextAttributes("L", 500, 500, 0, 0, "#00cc00");
    //var ta_s = new TextAttributes("S", 500, 500, 0, 0, "#0000cc");


    // STAGE TWO
    timer.pause(500);
    current_stage.add_text_change(timer.with_dur(700), "2: Traverse string forwards, finding left-most S characters (LMS)");
    l_or_s.create_pointer("pc", -1.4, timer.with_dur(500), 0);

    var lms_suffixes = [];
    for (var i = 0; i < text_length; i++) {
        if (l_or_s.value_at(i) && (i == 0 || !l_or_s.value_at(i-1))) {
            l_or_s.animel_at(i).add_offset(timer.with_dur(200), 0, -5);
            l_or_s.animel_at(i).add_colour_change(timer.with_trans_dur(300), "#ff4444");
            lms_suffixes.push(i);
        }
        l_or_s.increment_pointer("pc", true, timer.with_dur(500));
    }
    l_or_s.get_pointer("pc").add_fade_out(timer.with_dur(500));

    // STAGE THREE
    current_stage.add_text_change(timer.with_dur(700), "3: Traverse string, calculate bucket sizes");
    var alphabet_chars = "$abcdefghijklmnopqrstuvwxyz";
    
    var alphabet = new AnimatedArray(alphabet_x, alphabet_y, text_font_size, text_cell_size, "#bbaa44").from_text(alphabet_chars);
    alphabet.display(timer);

    var counts = new AnimatedArray(alphabet_x, alphabet_y + 40, text_font_size / 2, text_cell_size, "#44aabb").from_array(new Array(alphabet_chars.length).fill(0));
    counts.display(timer);

    var links = []
    text_anim.get_pointer("pc").add_fade_in(timer.with_dur(200));

    for (var i = 0; i < text_length; i++) {
        var char_value = 1 + text.charCodeAt(i) - 'a'.charCodeAt(0);
        if (char_value < 0) {
            char_value = 0; // "$" is less than "a".
        }
        alphabet.animel_at(char_value).add_pulse(timer.from_relative(700, 1200), "#ff0000");
        links.push(create_link_animation(text_anim.animel_at(i), alphabet.animel_at(char_value), timer.from_relative(100, 700)));
        counts.arr[char_value] += 1;
        counts.animel_at(char_value).add_text_change(timer.from_relative(1000, 1500), counts.value_at(char_value));
        timer.pause(1000);
        text_anim.increment_pointer("pc", true, timer.with_dur(400));
    }

    // STAGE FOUR
    timer.speed = 1.0;

    current_stage.add_text_change(timer.with_dur(700), "4: Create buckets, find heads and tails");
    var index = 0;
    var cells = [];
    var cell_ta = new TextAttributes()
    var cell_ta = new TextAttributes("*", 500, 500, 0, 0, "#cccccc");

    var tails = [];
    var heads = [];
    var bucket_indices = {};
    var num_buckets = 0;

    var heads_anim = new TextAnimationItem(new TextAttributes("HEADS:", text_x, cells_y - 60, 0, 0, "#008800", "lucida console", 20, "left"));
    var tails_anim = new TextAnimationItem(new TextAttributes("TAILS:", text_x, cells_y - 30, 0, 0, "#000088", "lucida console", 20, "left"));
    var sa_anim = new TextAnimationItem(new TextAttributes("SA:", text_x, cells_y, 0, 0, "#880000", "lucida console", 20, "left"));
    heads_anim.add_fade_in(timer.with_dur(200));
    tails_anim.add_fade_in(timer.with_dur(200));
    sa_anim.add_fade_in(timer.with_dur(200));

    var cells = new AnimatedArray(cells_x, cells_y, text_font_size, text_cell_size, "#ff0000").from_text(" ".repeat(text_length));
    cells.display(timer);
    alphabet.create_pointer("pc", -1, timer.with_dur(400), 0, "#0000ff");
    cells.create_pointer("pc", 1, timer.with_dur(400), 0, "#440088");


    var index = 0;
    for (var i = 0; i < alphabet_chars.length; i++) {
        if (counts.value_at(i) > 0) {
            var head_index = index;
            alphabet.animel_at_pointer("pc").add_pulse(timer.with_trans_dur(500), "#ff0000");
            counts.animel_at(i).add_pulse(timer.with_dur(500), "#ff0000");
            for (var j = 0; j < counts.value_at(i); j++) {
                cells.animel_at_pointer("pc").add_text_change(timer.with_trans_dur(400), alphabet.value_at_pointer("pc"));
                links.push(create_link_animation(alphabet.animel_at_pointer("pc"), cells.animel_at_pointer("pc"), timer.from_relative(200, 400)));
                cells.increment_pointer("pc", false, timer.with_dur(100));
                index++;
            }
            timer.pause(500);
            cells.create_pointer("head_" + alphabet.value_at_pointer("pc"), -2, timer.with_trans_dur(300), head_index, "#008800");
            cells.create_pointer("tail_" + alphabet.value_at_pointer("pc"), -1, timer.with_dur(300), index - 1, "#000088");
        }
        alphabet.increment_pointer("pc", false, timer.with_dur(100));
    }
    /*
    for (var i = 0; i < alphabet_chars.length; i++) {
        if (counts.value_at(i) > 0) {
            counts.animel_at(i).add_pulse(time_offset.with_trans_dur(1000), "#ff0000");
            alphabet.animel_at(i).add_pulse(time_offset.with_dur(1000), "#ff0000");
            alphabet.animel_at(i).add_moveto(time_offset.from_relative(1000, 1500), 130 + index * 20, 260);
            var start_index = index;
            heads.push(start_index);
            for (var j = 0; j < counts.value_at(i); j++) {
                var t1 = cell_ta.with_text(alphabet_chars[i]).with_position(130 + start_index * 20, 260);
                var cell_anim = new TextAnimationItem(t1);
                cell_anim.add_animation_dep(time_offset + speed * 2000, time_offset + speed * 3000, t1.with_opacity(1.0).with_position(130 + index * 20, 260));
                cells.push(cell_anim);
                index++;
            }
            tails.push(index - 1);
            bucket_indices[alphabet_chars[i]] = num_buckets;
            num_buckets += 1;
        }
    }
    for (var i = 0; i < alphabet.length; i++) {
        alphabet[i].add_fade_out_dep(time_offset + speed * 2000, time_offset + speed * 3000);
        count_chars[i].add_fade_out_dep(time_offset + speed * 2000, time_offset + speed * 3000);
    }

    var heads_anim = new TextAnimationItem(new TextAttributes("HEADS:", 30, 210, 0, 0, "#008800", "lucida console", 20, "left"));
    var tails_anim = new TextAnimationItem(new TextAttributes("TAILS:", 30, 230, 0, 0, "#000088", "lucida console", 20, "left"));
    var sa_anim = new TextAnimationItem(new TextAttributes("SA:", 30, 290, 0, 0, "#880000", "lucida console", 20, "left"));
    heads_anim.add_fade_in_dep(time_offset + speed * 2500, time_offset + speed * 3000);
    tails_anim.add_fade_in_dep(time_offset + speed * 2500, time_offset + speed * 3000);
    sa_anim.add_fade_in_dep(time_offset + speed * 2500, time_offset + speed * 3000);
    var tc_ht = new TextAttributes("v", 500, 500, 0, 0, "#ff0000", "lucida console", 20, "right");
    var heads_pointers = [];
    var tails_pointers = [];
    var suffix_array = Array(text.length).fill(-1);

    for (var i = 0; i < tails.length; i++) {
        var head_pointer = new TextAnimationItem(tc_ht.with_colour("#00aa00").with_position(130 + heads[i] * 20, 210), new  AnimationProfile("linear"));
        head_pointer.add_fade_in_dep(time_offset + speed * 2500, time_offset + speed * 3500);
        heads_pointers.push(head_pointer);

        var tail_pointer = new TextAnimationItem(tc_ht.with_colour("#0000aa").with_position(130 + tails[i] * 20, 230), new  AnimationProfile("linear"));
        tail_pointer.add_fade_in_dep(time_offset + speed * 2500, time_offset + speed * 3500);
        tails_pointers.push(tail_pointer);
    }

    var ta_digit = new TextAttributes("x", 500, 500, 0, 0, "#111111", "verdana", 12, "right");
    //create_text_wipe(suffix_array_chars, "-".repeat(text.length), 130, 290, "#880000", time_offset, speed);
    var char_labels = [];
    var suffix_array_chars = [];
    for (var i = 0; i < text.length; i++) {
        var digit = new TextAnimationItem(ta_digit.with_position(25 + i * 20, 160).with_text(String(i)));
        digit.add_fade_in_dep(time_offset, time_offset + speed * 50 * i);
        char_labels.push(digit);
        var sa = new TextAnimationItem(ta_digit.with_position(125 + i * 20, 280).with_text("-"));
        sa.add_fade_in_dep(time_offset, time_offset + speed * 50 * i);
        suffix_array_chars.push(sa);
    }
    //create_text_wipe()
*/
    // Collect all animation items together:
    full_animation = text_anim.get_animated_elements().concat(l_or_s.get_animated_elements()).concat(alphabet.get_animated_elements()).concat(counts.get_animated_elements()).concat(links).concat(cells.get_animated_elements());
    full_animation.push(explanation);
    full_animation.push(current_stage);
    full_animation.push(heads_anim);
    full_animation.push(tails_anim);
    full_animation.push(sa_anim);
    window.requestAnimationFrame(function(timestamp) { draw(full_animation, timestamp); });
});

function old_method() {
    var speed = 0.1;

    var letters = []
    text = "mmiissiissiippii$";
    time_offset = 0;



    time_offset = create_text_wipe_dep(letters, text, 30, 140, "#000000", time_offset, speed);
    var t = new TextAttributes("", 0, 0, 180, 0, "#000000");
    l_or_s = new Int8Array(letters.length);
    var tc = new TextAttributes("v", 500, 500, 0, 0, "#ff0000");
    pointer = new TextAnimationItem(tc, new  AnimationProfile("cheeky", 0.3));
    pointer.add_animation_dep(time_offset, time_offset + 1, tc.with_opacity(1.0));

    var ta_l = new TextAttributes("L", 500, 500, 0, 0, "#00cc00");
    var ta_s = new TextAttributes("S", 500, 500, 0, 0, "#0000cc");

    l_or_s_chars = []
    explanation = new TextAnimationItem(new TextAttributes("", 10, 180, 0, 1.0, "#222222", font="undefined", size=20, alignment="left"));
    current_stage = new TextAnimationItem(new TextAttributes("1: Traverse string backwards, labelling characters as L(larger) or S(smaller)", 10, 30, 0, 1.0, "#111111", font=undefined, size=20, alignment="left"));

    for (var i = letters.length - 1; i >=0; i--) {
        pointer.add_moveto_dep(time_offset, time_offset + (speed * 200), 30 + i * 20, 60);
        letters[i].add_pulse_dep(time_offset + (speed * 200), time_offset + (speed * 600), "#ff0000");
        var isS = true;
        if (i < letters.length - 1) {
            if (text[i] < text[i + 1]) {
                explanation.add_text_change_dep(time_offset, time_offset + (speed * 100), "'" + text[i] + "' < '" + text[i + 1] + "'");
                isS = true;
            } else if (text[i] > text[i + 1]) {
                explanation.add_text_change_dep(time_offset, time_offset + (speed * 100), "'" + text[i] + "' > '" + text[i + 1] + "'");
                isS = false;
            } else {
                isS = l_or_s[i + 1];
                explanation.add_text_change_dep(time_offset, time_offset + (speed * 100), "'" + text[i] + "' == '" + text[i + 1] + "'");
            }
        }
        var lors = null;
        l_or_s[i] = isS;
        if (isS) {
            letters[i].add_offset_dep(time_offset+(speed * 700), time_offset+(speed * 1000), 0, 5, 0);
            lors = new TextAnimationItem(ta_s.with_position(30 + i * 20, 100));
        } else {
            letters[i].add_offset_dep(time_offset+(speed * 700), time_offset+(speed * 1000), 0, -5, 0);
            lors = new TextAnimationItem(ta_l.with_position(30 + i * 20, 100));
        }
        lors.add_fade_in_dep(time_offset+(speed * 1000), time_offset+(speed * 1500));
        l_or_s_chars.unshift(lors);
        time_offset += speed * 1000;
    }
    pointer.add_fade_out_dep(time_offset, time_offset + speed * 500);
    explanation.add_fade_out_dep(time_offset, time_offset + speed * 500);
    current_stage.add_text_change_dep(time_offset + speed * 500, time_offset + speed * 1200, "2: Traverse string forwards, finding left-most S characters (LMS)");
    time_offset += speed * 2000;
    pointer.add_fade_in_dep(time_offset, time_offset + speed * 500);
    time_offset += speed * 500;
    var lms_suffixes = [];
    for (var i = 0; i < letters.length; i++) {
        pointer.add_moveto_dep(time_offset, time_offset + speed * 100, 30 + i * 20, 60);
        l_or_s_chars[i].add_pulse_dep(time_offset + speed * 100, time_offset + speed * 300, "#ff0000");
        if (l_or_s[i] && (i == 0 || !l_or_s[i-1])) {
            l_or_s_chars[i].add_offset_dep(time_offset + speed * 300, time_offset + speed * 400, 0, -5);
            l_or_s_chars[i].add_colour_change_dep(time_offset + speed * 400, time_offset + speed * 1000, "#ff4444");
            lms_suffixes.push(i);
        }
        time_offset += speed * 500;
    }

    pointer.add_fade_out_dep(time_offset, time_offset + speed * 500);
    current_stage.add_text_change_dep(time_offset + speed * 500, time_offset + speed * 1200, "3: Traverse string, calculate bucket sizes");
    var alphabet=[];
    var alphabet_chars = "$abcdefghijklmnopqrstuvwxyz";
    var counts = Array(alphabet_chars.length).fill(0);
    var count_text = "0".repeat(alphabet_chars.length);
    var count_chars = []
    time_offset += speed * 2000;
    time_offset_delta = create_text_wipe_dep(alphabet, alphabet_chars, 30, 190, "#bbaa44", time_offset, speed) - time_offset;
    time_offset = create_text_wipe_dep(count_chars, count_text, 30, 230, "#44aabb", time_offset + time_offset_delta / 2, speed);

    var links = []
    for (var i = 0; i < letters.length; i++) {
        pointer.add_moveto_dep(time_offset, time_offset + speed * 100, 30 + i * 20, 60);
        letters[i].add_pulse_dep(time_offset + speed * 400, time_offset + speed * 900, "#ff0000");
        var char_value = 1 + text.charCodeAt(i) - 'a'.charCodeAt(0);
        if (char_value < 0) {
            char_value = 0; // "$" is less than "a".
        }
        alphabet[char_value].add_pulse_dep(time_offset + speed * 900, time_offset + speed * 1400, "#ff0000");
        links.push(create_link_animation_dep(letters[i], alphabet[char_value], time_offset + speed * 700, time_offset + speed * 1100));
        counts[char_value] += 1;
        count_chars[char_value].add_text_change_dep(time_offset + speed * 1200, time_offset + speed * 1900, counts[char_value]);
        time_offset += speed * 2000;
    }

    speed = 1;

    current_stage.add_text_change_dep(time_offset + speed * 500, time_offset + speed * 1200, "4: Create buckets, find heads and tails");
    var index = 0;
    var cells = [];
    var cell_ta = new TextAttributes()
    var cell_ta = new TextAttributes("*", 500, 500, 0, 0, "#cccccc");

    var tails = [];
    var heads = [];
    var bucket_indices = {};
    var num_buckets = 0;

    for (var i = 0; i < alphabet.length; i++) {
        if (counts[i] > 0) {
            count_chars[i].add_pulse_dep(time_offset, time_offset + speed * 1000, "#ff0000");
            alphabet[i].add_pulse_dep(time_offset, time_offset + speed * 1000, "#ff0000");
            alphabet[i].add_moveto_dep(time_offset + speed * 1000, time_offset + speed * 1500, 130 + index * 20, 260);
            var start_index = index;
            heads.push(start_index);
            for (var j = 0; j < counts[i]; j++) {
                var t1 = cell_ta.with_text(alphabet_chars[i]).with_position(130 + start_index * 20, 260);
                var cell_anim = new TextAnimationItem(t1);
                cell_anim.add_animation_dep(time_offset + speed * 2000, time_offset + speed * 3000, t1.with_opacity(1.0).with_position(130 + index * 20, 260));
                cells.push(cell_anim);
                index++;
            }
            tails.push(index - 1);
            bucket_indices[alphabet_chars[i]] = num_buckets;
            num_buckets += 1;
        }
    }
    for (var i = 0; i < alphabet.length; i++) {
        alphabet[i].add_fade_out_dep(time_offset + speed * 2000, time_offset + speed * 3000);
        count_chars[i].add_fade_out_dep(time_offset + speed * 2000, time_offset + speed * 3000);
    }

    var heads_anim = new TextAnimationItem(new TextAttributes("HEADS:", 30, 210, 0, 0, "#008800", "lucida console", 20, "left"));
    var tails_anim = new TextAnimationItem(new TextAttributes("TAILS:", 30, 230, 0, 0, "#000088", "lucida console", 20, "left"));
    var sa_anim = new TextAnimationItem(new TextAttributes("SA:", 30, 290, 0, 0, "#880000", "lucida console", 20, "left"));
    heads_anim.add_fade_in_dep(time_offset + speed * 2500, time_offset + speed * 3000);
    tails_anim.add_fade_in_dep(time_offset + speed * 2500, time_offset + speed * 3000);
    sa_anim.add_fade_in_dep(time_offset + speed * 2500, time_offset + speed * 3000);
    var tc_ht = new TextAttributes("v", 500, 500, 0, 0, "#ff0000", "lucida console", 20, "right");
    var heads_pointers = [];
    var tails_pointers = [];
    var suffix_array = Array(text.length).fill(-1);

    for (var i = 0; i < tails.length; i++) {
        var head_pointer = new TextAnimationItem(tc_ht.with_colour("#00aa00").with_position(130 + heads[i] * 20, 210), new  AnimationProfile("linear"));
        head_pointer.add_fade_in_dep(time_offset + speed * 2500, time_offset + speed * 3500);
        heads_pointers.push(head_pointer);

        var tail_pointer = new TextAnimationItem(tc_ht.with_colour("#0000aa").with_position(130 + tails[i] * 20, 230), new  AnimationProfile("linear"));
        tail_pointer.add_fade_in_dep(time_offset + speed * 2500, time_offset + speed * 3500);
        tails_pointers.push(tail_pointer);
    }

    var ta_digit = new TextAttributes("x", 500, 500, 0, 0, "#111111", "verdana", 12, "right");
    //create_text_wipe(suffix_array_chars, "-".repeat(text.length), 130, 290, "#880000", time_offset, speed);
    var char_labels = [];
    var suffix_array_chars = [];
    for (var i = 0; i < text.length; i++) {
        var digit = new TextAnimationItem(ta_digit.with_position(25 + i * 20, 160).with_text(String(i)));
        digit.add_fade_in_dep(time_offset, time_offset + speed * 50 * i);
        char_labels.push(digit);
        var sa = new TextAnimationItem(ta_digit.with_position(125 + i * 20, 280).with_text("-"));
        sa.add_fade_in_dep(time_offset, time_offset + speed * 50 * i);
        suffix_array_chars.push(sa);
    }
    //create_text_wipe()

    time_offset += speed * 4000;
    current_stage.add_text_change_dep(time_offset, time_offset + speed * 700, "5: Traverse string forwards, adding LMS suffixes to the correct bucket");

    speed = 1.0;

    for (var i = 0; i < letters.length; i++) {
        letters[i].add_moveto_dep(time_offset, time_offset + speed * 200, 30 + i * 20, 140);
    }
    pointer.add_fade_in_dep(time_offset, time_offset + speed * 200);
    time_offset += speed * 200;
    var suffix_movements = [];
    var suffix_string_chars = Array(text.length);
    for (var i = 0; i < lms_suffixes.length; i++) {
        pointer.add_moveto_dep(time_offset, time_offset + speed * 100, 30 + lms_suffixes[i] * 20, 60);
        time_offset += speed * 300;
        for (var j = 0; j < letters.length; j++) {
            if (j < lms_suffixes[i]) {
                letters[j].add_fade_out_dep(time_offset, time_offset + speed * 250);
            }
            else {
                letters[j].add_colour_change_dep(time_offset, time_offset + speed * 250, "#ff0000");
                letters[j].add_colour_change_dep(time_offset + speed * 1600, time_offset + speed * 1800, "#000000");
            }
        }
        //letters[lms_suffixes[i]].add_pulse_dep(time_offset + speed * 750, time_offset + speed * 1250, "#ff0000");
        var bucket = bucket_indices[text[lms_suffixes[i]]]
        tails_pointers[bucket].add_pulse_dep(time_offset + speed * 750, time_offset + speed * 1250, "#ff0000");
        cells[tails[bucket]].add_pulse_dep(time_offset + speed * 750, time_offset + speed * 1250, "#ff0000");
        suffix_array[tails[bucket]] = lms_suffixes[i];
        suffix_array_chars[tails[bucket]].add_text_change_dep(time_offset + speed * 1000, time_offset + speed * 2000, String(lms_suffixes[i]));
        //links.push(create_link_animation(pointer, tails_pointers[bucket], time_offset + speed * 250, time_offset + speed * 750));
        var suffix_string = text.substring(lms_suffixes[i]);
        var this_suffix_animation = [];
        var gap = 200 / suffix_string.length;
        for (var j = 0; j < suffix_string.length; j++) {
            var suffix_animation = new TextAnimationItem(new TextAttributes(suffix_string[j], 30 + (j + lms_suffixes[i]) * 20, 140, 0, 0, "#ff0000", "lucida console", 30, "right"), new AnimationProfile("cheeky", 0.3));
            suffix_animation.add_fade_in_dep(time_offset + speed * 1000, time_offset + speed * 1250);
            var ta_rotated = new TextAttributes(suffix_string[j], 115 + tails[bucket] * 20, 300 + j * 8, -90, 1.0, "#004400", "lucida console", 16, "right");
            suffix_animation.add_animation_dep(time_offset + (suffix_string.length - j * gap) + speed * 1250, time_offset + (suffix_string.length - j * gap) + speed * 1800, ta_rotated);
            this_suffix_animation.push(suffix_animation);
            suffix_movements.push(suffix_animation);    
        }
        suffix_string_chars[lms_suffixes[i]] = this_suffix_animation;
        tails[bucket]--;
        tails_pointers[bucket].add_offset_dep(time_offset + speed * 1800, time_offset + speed * 2000, -20, 0, 0);
        time_offset += speed * 2000;
    }

    for (var j = 0; j < letters.length; j++) {
        letters[j].add_fade_in_dep(time_offset, time_offset + speed * 250);
        time_offset += speed * 25;
    }

    current_stage.add_text_change_dep(time_offset, time_offset + speed * 700, "6: Induced sorting - forward pass");
    time_offset += speed * 1000;

    for (var i = 0; i < text.length; i++) {
        pointer.add_moveto_dep(time_offset, time_offset + speed * 100, 30 + i * 20, 60);
        time_offset += speed * 300;
        if (suffix_array[i] == -1)
            continue;

        var pos = suffix_array[i];
        if (!l_or_s[pos - 1]) {
            var bucket = bucket_indices[text[i]];
            heads_pointers[bucket].add_pulse_dep(time_offset + speed * 750, time_offset + speed * 1250, "#ff0000");
            cells[heads[bucket]].add_pulse_dep(time_offset + speed * 750, time_offset + speed * 1250, "#ff0000");
            suffix_array[heads[bucket]] = i;
            suffix_array_chars[heads[bucket]].add_text_change_dep(time_offset + speed * 1000, time_offset + speed * 2000, String(i));
            var suffix_string = text.substring(i);
            var this_suffix_animation = [];
            var gap = 200 / suffix_string.length;
            for (var j = 0; j < suffix_string.length; j++) {
                var suffix_animation = new TextAnimationItem(new TextAttributes(suffix_string[j], 30 + (j + i) * 20, 140, 0, 0, "#ff0000", "lucida console", 30, "right"), new AnimationProfile("cheeky", 0.3));
                suffix_animation.add_fade_in_dep(time_offset + speed * 1000, time_offset + speed * 1250);
                var ta_rotated = new TextAttributes(suffix_string[j], 115 + heads[bucket] * 20, 300 + j * 8, -90, 1.0, "#004400", "lucida console", 16, "right");
                suffix_animation.add_animation_dep(time_offset + (suffix_string.length - j * gap) + speed * 1250, time_offset + (suffix_string.length - j * gap) + speed * 1800, ta_rotated);
                this_suffix_animation.push(suffix_animation);
                suffix_movements.push(suffix_animation);    
            }
            suffix_string_chars[i] = this_suffix_animation;
            heads[bucket]++;
            heads_pointers[bucket].add_offset_dep(time_offset + speed * 1800, time_offset + speed * 2000, 20, 0, 0);
            time_offset += speed * 2000;
        }
    }




    letters.push(pointer)
    full_animation = letters.concat(l_or_s_chars).concat(alphabet).concat(count_chars).concat(links).concat(cells).concat(heads_pointers).concat(tails_pointers).concat(suffix_movements).concat(suffix_array_chars).concat(char_labels);
    full_animation.push(explanation);
    full_animation.push(current_stage);
    full_animation.push(heads_anim);
    full_animation.push(tails_anim);
    full_animation.push(sa_anim);

    window.requestAnimationFrame(function(timestamp) { draw(full_animation, timestamp); });

}
