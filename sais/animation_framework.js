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
        this.attribute_stack = [];
        this.current_animation_index = 0;
    }

    push() {
        this.attribute_stack.push(this.latest_text_atts());
    }

    pop(timer) {
        var ta = this.attribute_stack.pop();
        this.add_animation(timer, ta);
    }

    clone(transformer=null, profile=new AnimationProfile("cheeky", 0.3)) {
        var ta = this.latest_text_atts();
        if (transformer) {
            ta = transformer(ta);
        }
        var copied_animel = new TextAnimationItem(ta.with_opacity(0), profile);
        return copied_animel;
    }

    add_animation(timer, end_attributes) {
        var start_attributes = this.initial_textatts;
        if (this.animations.length > 0) {
            start_attributes = this.animations[this.animations.length - 1].end_attributes;
        }
        this.animations.push(new AnimationPhase(timer.get_start_time(), timer.get_end_time(), start_attributes, end_attributes));
        timer.update();
    }

    latest_text_atts() {
        if (this.animations.length > 0) {
            return this.animations[this.animations.length - 1].end_attributes;
        }
        return this.initial_textatts;
    }
    get_text() {
        return this.latest_text_atts().txt;
    }
    add_fade_out(timer) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_opacity(0));
        return this;
    }
    add_fade_in(timer) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_opacity(1));
        return this;
    }
    add_offset(timer, xoff, yoff, rotoff=0) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_offset(xoff, yoff, rotoff));
        return this;
    }
    add_moveto(timer, xpos, ypos, rot=0) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_position(xpos, ypos, rot));
        return this;
    }
    add_moveto_resize(timer, new_size, xpos, ypos, rot=0) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_position(xpos, ypos, rot).with_size(new_size));
        return this;
    }
    add_twitch(timer, magnitude, num_twitches = 8) {
        var resting_atts = this.latest_text_atts();
        var twitching_atts = resting_atts.with_offset(0, magnitude);
        var duration = timer.duration_of_next_animation;
        var twitch_duration = duration / num_twitches;
        for (var i = 0; i < num_twitches; i++) {
            this.add_animation(timer.from_relative(i * twitch_duration, (i + 0.5) * twitch_duration), twitching_atts);
            this.add_animation(timer.from_relative((i + 0.5) * twitch_duration, (i + 1) * twitch_duration), resting_atts);
        }
        timer.update();
        return this;
    }
    add_pulse(timer, colour) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer.from(timer.get_start_time(), timer.get_mid_time()), last_atts.with_colour(colour).with_size(last_atts.size + 5));
        this.add_animation(timer.from(timer.get_mid_time(), timer.get_end_time()), last_atts);
        timer.update();
        return this;
    }
    add_text_change(timer, text) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer.from(timer.get_start_time(), timer.get_mid_time()), last_atts.with_opacity(0));
        this.add_animation(timer.from(timer.get_mid_time(), timer.get_end_time()), last_atts.with_text(text));
        timer.update();
        return this;
    }
    add_colour_change(timer, colour) {
        var last_atts = this.latest_text_atts();
        this.add_animation(timer, last_atts.with_colour(colour));
        return this;
    }

    get_atts_at_time(atts, timestamp) {
        var current_animation_phase = null;
        for (var i = this.current_animation_index; i < this.animations.length; i++) {
            var anim = this.animations[i];
            if (anim.start_time <= timestamp) {
                current_animation_phase = anim;
            }
            if (anim.start_time <= timestamp && anim.end_time >= timestamp) {
                current_animation_phase = anim;
                //this.current_animation_index = i;
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
        if (this.rot != 0) {
            ctx.rotate(-this.rot * (Math.PI / 180));
        }
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
    with_alignment(alignment) {
        return new TextAttributes(this.txt, this.x, this.y, this.rot, this.opacity, this.colour, this.font, this.size, alignment);
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
    with_fraction_delay(fraction) {
        var tc = new TimeController(this.speed, "temp");
        tc.set_time(this.time + this.speed * this.duration_of_next_animation * fraction);
        return tc.with_dur((1.0 - fraction) * this.duration_of_next_animation);
    }
    copy() {
        var tc = new TimeController(this.speed, "temp");
        tc.set_time(this.time);
        return tc.with_dur(this.duration_of_next_animation);
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
    accelerate_loop(index_min, index_max, loop_function) {
        var start_speed = this.speed;
        for (var i = index_min; i < index_max; i++) {
            loop_function(i);
            this.speed *= 0.8;
        }
        this.speed = start_speed;
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
        this.index_elements = [];
        this.pointer_speed = 200;
        this.pointer_stacks = new Map();
        this.removed_animels = [];
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
    from_animels(animels) {
        this.length = animels.length;
        this.animated_elements = animels;
        this.arr = new Array(animels.length);
        return this;
    }
    append_text(text, timer) {
        var new_elements = [];
        create_text_wipe(new_elements, text, this.x + this.length * this.cell_size, this.y, this.colour, timer, this.cell_size, this.char_size);
        this.animated_elements = this.animated_elements.concat(new_elements);
        this.length += text.length;
        this.arr.length += text.length; // what to fill them with though?
    }
    get_as_text() {
        var text = "";
        for (var i = 0; i < this.animated_elements.length; i++) {
            text += this.animated_elements[i].get_text();
        }
        return text;
    }
    adopt_animel(animel, index, timer, animation_profile=undefined) {
        if (this.animated_elements.length == 0) {
            var blank_ta = new TextAttributes("", 0, 0, 0, 0, "#ffffff");
            this.animated_elements = new Array(this.length).fill(new TextAnimationItem(blank_ta));
        }

        var ta = animel.latest_text_atts().with_alignment("center").with_opacity(0).with_colour(this.colour);
        var animel_copy = new TextAnimationItem(ta, profile=animation_profile);
        animel_copy.add_fade_in(timer.from(timer.get_start_time(), timer.get_mid_time()));
        var cell_x = this.x + index * this.cell_size;
        var cell_y = this.y;
        animel_copy.add_moveto_resize(timer.from(timer.get_mid_time(), timer.get_end_time()), this.char_size, cell_x, cell_y, 0);
        this.animated_elements[index] = animel_copy;
        this.arr[index] = animel_copy.get_text();
    }
    remove_gaps(timer) {
        var index = 0;
        for (var i = 0; i < this.length; i++) {
            if (this.arr[i]) {
                // Move animel:
                this.animated_elements[i].add_moveto(timer.copy(), this.x + index * this.cell_size, this.y);
                if (index != i) {
                    this.animated_elements[index] = this.animated_elements[i];
                    this.removed_animels.push(this.animated_elements[i]);
                    this.animated_elements[i] = null;
                    this.arr[index] = this.arr[i];
                    this.arr[i] = null;
                }
                index++;
            }
        }
        this.length = index;
        this.animated_elements.length = index;
        this.arr.length = index;
        timer.update();
    }
    create_pointer(name, line_offset = -1, timer, start_location=-1, colour="#ff0000", char_scale = 0.6) {
        var char = (line_offset > 0) ? "^" : "v";
        var ta = new TextAttributes(char, this.x + start_location * this.cell_size, this.y + this.char_size * line_offset, 0, 0, colour, font="lucida console", size=this.char_size*char_scale, alignment="center");
        var pointer = new TextAnimationItem(ta, new AnimationProfile("cheeky", 0.3));
        pointer.add_animation(timer.from(timer.get_start_time(), timer.get_end_time()), ta.with_opacity(1.0));
        timer.update();
        this.pointers.set(name, pointer);
        this.pointer_locations.set(name, start_location);
        this.pointer_line_offsets.set(name, line_offset);
        return pointer;
    }
    push_pointer(name) {
        if (!this.pointer_stacks.has(name)) {
            this.pointer_stacks.set(name, []);
        }
        this.pointer_stacks.get(name).push(this.pointer_locations.get(name));
    }
    pop_pointer(name, timer) {
        if (this.pointer_stacks.has(name)) {
            var index = this.pointer_stacks.get(name).pop();
            this.move_pointer_to(name, index, timer);
        }
    }
    create_indices(line_offset = 1, timer, colour="#111111") {
        var ta = new TextAttributes("*", -1000, -1000, 180, 0, colour, font="lucida console", size=this.char_size * 0.5, alignment="center");
        for (var i = 0; i < this.arr.length; i++) {
            var digit = new TextAnimationItem(ta.with_text(String(i)), new AnimationProfile("cheeky", 0.3));
            var ta_destination = ta.with_text(String(i)).with_opacity(1.0).with_position(this.x + i * this.cell_size, this.y + this.char_size * line_offset, 0);
            digit.add_animation(timer.with_fraction_delay(i / this.arr.length), ta_destination);
            this.index_elements.push(digit);
        }
        timer.update();
    }
    get_copy_of_animel(index, transformer=null) {
        var ta = this.animated_elements[index].latest_text_atts();
        if (transformer) {
            ta = transformer(ta);
        }
        var copied_animel = new TextAnimationItem(ta.with_opacity(0), new AnimationProfile("cheeky", 0.3));
        return copied_animel;
    }
    get_copy_of_animations_from_index(index, transformer=null) {
        var copied_elements = [];
        for (var i = index; i < this.animated_elements.length; i++) {
            var flyer = this.get_copy_of_animel(i, transformer);
            copied_elements.push(flyer);
        }
        return copied_elements;
    }
    get_copy_of_animations_from_pointer(name, transformer=null) {
        var index = this.pointer_locations.get(name);
        return this.get_copy_of_animations_from_index(index, transformer);
    }
    set_value_at(index, value, timer) {
        this.arr[index] = value;
        this.animated_elements[index].add_text_change(timer, String(value));
    }
    set_validated_value_at(index, value, ground_truth, timer) {
        this.arr[index] = value;
        this.animated_elements[index].add_text_change(timer, String(value));
        var colour = (value == ground_truth) ? "#008800" : "#ff0000";
        this.animated_elements[index].add_colour_change(timer.with_trans_dur(300), colour);
    }
    perform_split_animation(pointer_name, func_left, func_right) {
        var index = this.pointer_locations.get(pointer_name);
        for (var i = 0; i < this.animated_elements.length; i++) {
            if (i < index) {
                func_left(this.animated_elements[i]);
            } else {
                func_right(this.animated_elements[i]);
            }
        }
    }
    perform_substr_split(index_left, index_right, func_in, func_out) {
        for (var i = 0; i < this.animated_elements.length; i++) {
            if (i < index_left || i >= index_right) {
                func_out(this.animated_elements[i]);
            } else {
                func_in(this.animated_elements[i]);
            }
        }
    }
    reset_positions(timer) {
        for (var i = 0; i < this.animated_elements.length; i++) {
            this.animated_elements[i].add_moveto_resize(timer.copy(), this.char_size, this.x + i * this.cell_size, this.y, 0);
        }
        timer.update();
    }
    get_animated_elements() {
        return this.animated_elements.concat(this.index_elements).concat(this.removed_animels).concat(Array.from(this.pointers.values()));
    }
    animel_at(index) {
        return this.animated_elements[index];
    }
    value_at(index) {
        return this.arr[index];
    }
    get_cell_x_at_pointer(name) {
        var index = this.pointer_locations.get(name);
        return this.x + index * this.cell_size;
    }
    get_cell_y_at_pointer(name) {
        return this.y;
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
    pointer_to_index(name) {
        return this.pointer_locations.get(name);
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
        return create_text_wipe(this.animated_elements, this.arr, this.x, this.y, this.colour, timer, this.cell_size, this.char_size);
    }
    fill_blank(timer) {
        return create_text_wipe(this.animated_elements, " ".repeat(this.arr.length), this.x, this.y, this.colour, timer, this.cell_size, this.char_size);
    }
    fill(value, text, timer) {
        for (var i = 0; i < this.length; i++) {
            this.arr[i] = value;
            this.animated_elements[i].add_text_change(timer.copy(), text);
        }
    }
    explode(timer) {
        var animels = this.get_animated_elements();
        for (var i = 0; i < animels.length; i++) {
            var ta = new TextAttributes();
            animels[i].push();
            animels[i].get_atts_at_time(ta, timer.get_start_time());
            var destination_ta = ta.with_opacity(0).with_colour("#ff0000").with_position((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, Math.random() * 360);
            animels[i].add_animation(timer.copy(), destination_ta);
        }
        timer.update();
    }
    unexplode(timer) {
        var animels = this.get_animated_elements();
        for (var i = 0; i < animels.length; i++) {
            animels[i].pop(timer.copy());
        }
        timer.update();
    }
    add_fade_in(timer) {
        for (var i = 0; i < this.animated_elements.length; i++) {
            this.animated_elements[i].add_fade_in(timer.copy());
        }
        timer.update();
    }
    add_fade_out(timer) {
        for (var i = 0; i < this.animated_elements.length; i++) {
            this.animated_elements[i].add_fade_out(timer.copy());
        }
        timer.update();
    }
    add_colour_change(timer, colour) {
        for (var i = 0; i < this.animated_elements.length; i++) {
            this.animated_elements[i].add_colour_change(timer.copy(), colour);
        }
        timer.update();
    }
    twitch_index(timer, index) {
        if (this.index_elements.length > index && index >= 0) {
            this.index_elements[index].add_twitch(timer, 10);
        }
    }
    twitch_at_pointer(timer, name) {
        var animel = this.animel_at_pointer(name);
        if (animel) {
            animel.add_twitch(timer, 10);
        }
    }
    get_index_animel(index) {
        if (this.index_elements && this.index_elements.length > index && index >= 0) {
            return this.index_elements[index];
        }
        return null;
    }
}

function create_text_wipe(animations, txt, x, y, colour, timer, char_width=20, font_size=30) {
    for (var i = 0; i < txt.length; i++) {
        var chartxt = txt[i];
        var charx = x + i * char_width;
        var chary = y;
        var t1 = new TextAttributes(chartxt, charx + 10, chary + 10, 90, 0, colour, font="lucida console", size=font_size, alignment="center");
        var t2 = new TextAttributes(chartxt, charx, chary - 10, 270, 1.0, colour, font="lucida console", size=font_size, alignment="center");
        var t3 = new TextAttributes(chartxt, charx, chary, 0, 1.0, colour, font="lucida console", size=font_size, alignment="center");
        var animchar = new TextAnimationItem(t1);
        timer.pause(20);
        timer.push_time();
        animchar.add_animation(timer.with_dur(100), t2);
        animchar.add_animation(timer.with_dur(100), t3);
        timer.pop_time();
        animations.push(animchar);
    }
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

function fly_and_rotate_text(dest_x, dest_y, characters, timer) {
    var spread_time = Math.min(200, timer.duration_of_next_animation);
    var post_gap = timer.duration_of_next_animation - spread_time;
    var gap = spread_time / characters.length;
    for (var j = 0; j < characters.length; j++) {
        var new_y = 54 + dest_y + j * 12;
        
        //new TextAttributes(characters[j].get_text(), dest_x - 7, new_y, -90, 1.0, "#004400", "lucida console", 18, "center");
        var start_time = characters.length - j * gap;
        characters[j].add_fade_in(timer.from_relative(start_time, start_time + 1));
        var ta_start = characters[j].latest_text_atts();
        var ta_destination = ta_start.with_position(dest_x - 7, new_y, -90).with_size(18);
        characters[j].add_animation(timer.from_relative(start_time + 2, start_time + post_gap), ta_destination);
    }
    timer.update();
}


var speed = 1.0;
var last_timestamp = null;
var animation_timestamp = 0;
var paused = false;
var fast_forward_speed = 1.0;

function get_animation_time(timestamp) {
    var delta = paused ? 0 : timestamp - last_timestamp;
    last_timestamp = timestamp;
    animation_timestamp += delta * speed;
    return animation_timestamp;
}

window.addEventListener("keydown", function(event){
    this.console.log(event);
    if (event.code === "BracketRight") {
        speed += event.shiftKey ? 1 : 0.1;
    } else if (event.code === "BracketLeft") {
        speed -= event.shiftKey ? 1 : 0.1;
        if (speed < 0) {
            speed = 0.1;
        }
    } else if (event.code === "Space") {
        paused = !paused;
        event.preventDefault();
    } else if (event.code === "Enter") {
        if (speed > 1) {
            fast_forward_speed = speed;
            speed = 1;
        } else {
            if (fast_forward_speed <= 1) {
                fast_forward_speed = 20;
            }
            speed = fast_forward_speed;
        }
        event.preventDefault();
    }
});

function draw(animation_items, timestamp) {
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-over';
    ctx.clearRect(0, 0, canvas.scrollWidth, canvas.scrollHeight);

    for (var i = 0; i < animation_items.length; i++) {
        anim = animation_items[i];
        anim.draw(ctx, timestamp);
    }

    window.requestAnimationFrame(function(timestamp) { draw(animation_items, get_animation_time(timestamp)); });
}
