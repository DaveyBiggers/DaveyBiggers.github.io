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
    }

    push() {
        this.attribute_stack.push(this.latest_text_atts());
    }

    pop(timer) {
        var ta = this.attribute_stack.pop();
        this.add_animation(timer, ta);
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
    adopt_animel(animel, index, timer) {
        if (this.animated_elements.length == 0) {
            var blank_ta = new TextAttributes("", 0, 0, 0, 0, "#ffffff");
            this.animated_elements = new Array(this.length).fill(new TextAnimationItem(blank_ta));
        }

        var ta = animel.latest_text_atts().with_alignment("center").with_opacity(0).with_colour(this.colour);
        var animel_copy = new TextAnimationItem(ta);
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
    get_copy_of_animations_from_index(index, transformer=null) {
        var copied_elements = [];
        for (var i = index; i < this.animated_elements.length; i++) {
            var ta = this.animated_elements[i].latest_text_atts();
            if (transformer) {
                ta = transformer(ta);
            }
            var flyer = new TextAnimationItem(ta.with_opacity(0), new AnimationProfile("cheeky", 0.3));
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

function build_initial_suffixes(txt) {
    text_items = []
    for (var i = 0; i < txt.length; i++) {
        suffix = txt.substring(i)
        text_items.push(new text_item(suffix, 500, 50, 0, 500, 50 + (32*i), 0))
    }
    return text_items
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

function brute_force_suffix_array(text) {
    suffixes = [];
    for (var i = 0; i < text.length; i++) {
        suffixes.push(text.substr(i));
    }
    suffixes.sort();
    indices = [];
    for (var i = 0; i < text.length; i++) {
        indices.push(text.length - suffixes[i].length);
    }
    return indices;
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

window.addEventListener("load", function(){
    var text = "mmiissiissiippii$"; // Test string in the original paper
    var text = "cabbage$";  // Test strings in the walk-through
    var text = "baabaabac$";
    var text = "thepuddlewherethepoodledidthepiddle$";
    var timer = new TimeController(1, "main");
    var results = create_animation(text, timer);
    var animels = results["animation"];
    var suffix_array = results["sa"];
    this.console.log(suffix_array);
    window.requestAnimationFrame(function(timestamp) { draw(animels, get_animation_time(timestamp)); });
});

function check_for_duplicate_characters(text, alphabet) {
    // Quick check to see whether we need to do a full SA generation on this string,
    // or whether a simple bucket sort will suffice.
    var counts = new Array(alphabet.length).fill(0);
    for (var i = 0; i < text.length; i++) {
        var index = text.charCodeAt(i) - 'a'.charCodeAt(0);
        if (counts[index]) {
            return true;
        }
        counts[index]++;
    }
    return false;
}

function create_animation(text, timer) {
    var ground_truth = brute_force_suffix_array(text);

    var text_length = text.length;

    var text_x = 40;
    var text_y = 150;
    var text_cell_size = 30;
    var text_font_size = 30;

    var summary_x = text_x;
    var summary_y = text_y + 60;

    var explanation_x = 10;
    var explanation_y = 180;

    var stage_title_x = 10;
    var stage_title_y = 30;

    var alphabet_x = 40;
    var alphabet_y = 220;

    var cells_x = 130;
    var cells_y = 440;

    var sa_y = cells_y + 30;
    var sa_x = cells_x;

    var lms_substring_names_x = 10;
    var lms_substring_names_y = sa_y + 40 + text_length * 12;

    var text_anim = new AnimatedArray(text_x, text_y, text_font_size, text_cell_size, "#000000").from_text(text);
    text_anim.display(timer);

    var l_or_s = new AnimatedArray(text_x, text_y - 40, text_font_size, text_cell_size, "#00cc00").from_array(new Int8Array(text_length));
    l_or_s.fill_blank(timer);

    var explanation = new TextAnimationItem(new TextAttributes("", explanation_x, explanation_y, 0, 1.0, "#222222", font="undefined", size=20, alignment="left"));
    var misc_animels = [];
    var alphabet_chars = "$abcdefghijklmnopqrstuvwxyz";

    if (!check_for_duplicate_characters(text, alphabet_chars)) {
        return {"animation":text_anim.get_animated_elements(), "sa":ground_truth};
    }

    // STAGE ONE
    var current_stage = new TextAnimationItem(new TextAttributes("1: Traverse string backwards, labelling characters as L(larger) or S(smaller)", stage_title_x, stage_title_y, 0, 0, "#111111", font=undefined, size=20, alignment="left"));
    current_stage.add_fade_in(timer.with_dur(500));
    text_anim.create_pointer("pc", -2.8, timer.with_dur(500), text_length - 1);
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

    // STAGE TWO
    timer.pause(500);
    current_stage.add_text_change(timer.with_dur(700), "2: Traverse string forwards, finding left-most S characters (LMS)");
    l_or_s.create_pointer("pc", -1.4, timer.with_dur(500), 0);

    var lms_suffixes = [];
    var is_lms_suffix = [];
    for (var i = 0; i < text_length; i++) {
        if (l_or_s.value_at(i) && (i == 0 || !l_or_s.value_at(i-1))) {
            l_or_s.animel_at(i).add_offset(timer.with_dur(200), 0, -5);
            l_or_s.animel_at(i).add_colour_change(timer.with_trans_dur(300), "#ff4444");
            lms_suffixes.push(i);
            is_lms_suffix.push(true);
        } else {
            is_lms_suffix.push(false);
        }
        l_or_s.increment_pointer("pc", true, timer.with_dur(500));
    }
    l_or_s.get_pointer("pc").add_fade_out(timer.with_dur(500));

    // STAGE THREE
    current_stage.add_text_change(timer.with_dur(700), "3: Traverse string, calculate bucket sizes");
    
    var alphabet = new AnimatedArray(alphabet_x, alphabet_y, text_font_size, text_cell_size, "#bbaa44").from_text(alphabet_chars);
    alphabet.display(timer);

    var counts = new AnimatedArray(alphabet_x, alphabet_y + 40, text_font_size * 0.8, text_cell_size, "#44aabb").from_array(new Array(alphabet_chars.length).fill(0));
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
    current_stage.add_text_change(timer.with_dur(700), "4: Create buckets, find heads and tails");
    var index = 0;
    var cells = [];
    var tail_pointer_names = [];
    var head_pointer_names = [];

    var heads_anim = new TextAnimationItem(new TextAttributes("HEADS:", text_x, cells_y - 60, 0, 0, "#008800", "lucida console", 20, "left"));
    var tails_anim = new TextAnimationItem(new TextAttributes("TAILS:", text_x, cells_y - 30, 0, 0, "#000088", "lucida console", 20, "left"));
    heads_anim.add_fade_in(timer.with_dur(200));
    tails_anim.add_fade_in(timer.with_dur(200));

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
            var head_pointer_name = "head_" + alphabet.value_at_pointer("pc");
            head_pointer_names.push(head_pointer_name);
            cells.create_pointer(head_pointer_name, -2, timer.with_trans_dur(300), head_index, "#008800");
            cells.push_pointer(head_pointer_name);  // So we can restore position later.
            var tail_pointer_name = "tail_" + alphabet.value_at_pointer("pc");
            tail_pointer_names.push(tail_pointer_name);
            cells.create_pointer(tail_pointer_name, -1, timer.with_dur(300), index - 1, "#000088");
            cells.push_pointer(tail_pointer_name);  // So we can restore position later.
            cells.push_pointer(tail_pointer_name);  // Deliberate duplication - tail pointers will get moved twice.
        }
        alphabet.increment_pointer("pc", false, timer.with_dur(100));
    }
    timer.pause(1000);

    // STAGE FIVE
    var slots_to_suffix_strings = new Array(text_length);
    alphabet.explode(timer.with_trans_dur(700));
    counts.explode(timer.with_trans_dur(700));
    text_anim.reset_positions(timer.with_dur(200));
    text_anim.create_indices(1, timer.with_dur(1200));
    cells.get_pointer("pc").add_fade_out(timer.with_dur(200));
    current_stage.add_text_change(timer.with_dur(700), "5: Traverse string forwards, adding LMS suffixes to the correct bucket");
    var sa_anim = new TextAnimationItem(new TextAttributes("SA:", text_x, sa_y, 0, 0, "#880000", "lucida console", 20, "left"));
    sa_anim.add_fade_in(timer.with_dur(200));
    var sa = new AnimatedArray(sa_x, sa_y, text_font_size * 0.5, text_cell_size, "#111111").from_text("-".repeat(text_length));
    sa.display(timer);
    flying_chars = [];
    for (var i = 0; i < lms_suffixes.length; i++) {
        index = lms_suffixes[i];
        text_anim.move_pointer_to("pc", index, timer.with_dur(500));
        text_anim.perform_split_animation("pc",
            function(x) { x.add_fade_out(timer.copy().with_dur(250)); },
            function(x) {
                x.add_colour_change(timer.copy().with_dur(250), "#ff0000");
                x.add_colour_change(timer.from_relative(1600, 1800), "#000000");
            } );
        var tail_pointer = "tail_" + text[index];
        cells.get_pointer(tail_pointer).add_twitch(timer.from_relative(800, 1500), -10);

        // Copy the suffix and fly it into the correct location:
        var duplicate_characters = text_anim.get_copy_of_animations_from_pointer("pc", function(ta) { return ta.with_colour("#ff0000"); });

        // Animate the duplicate characters:
        var x = cells.get_cell_x_at_pointer(tail_pointer);
        var y = cells.get_cell_y_at_pointer(tail_pointer);
        fly_and_rotate_text(x, y, duplicate_characters, timer.from_relative(1200, 1800));
        flying_chars = flying_chars.concat(duplicate_characters);

        // Put this in the array:
        var dest_index = cells.pointer_to_index(tail_pointer);
        sa.set_validated_value_at(dest_index, index, ground_truth[dest_index], timer.from_relative(1250, 1800));
        // Keep copy of flown text, in case we need to get rid of it later:
        slots_to_suffix_strings[dest_index] = new AnimatedArray(0, 0, 10, 10, 0).from_animels(duplicate_characters);
        // Move pointer:
        cells.decrement_pointer(tail_pointer, false, timer.from_relative(1800, 2000));
        timer.pause(2000);
    }

    // Put tail pointers back where they started:
    for (var i = 0; i < tail_pointer_names.length; i++) {
        cells.pop_pointer(tail_pointer_names[i], timer.with_trans_dur(300));
    }
    timer.pause(300);
    
    // STAGE SIX:
    current_stage.add_text_change(timer.with_dur(700), "6: Induced sorting - forward pass");
    text_anim.add_fade_in(timer.with_trans_dur(500));
    cells.add_colour_change(timer.with_trans_dur(500), "#cccccc");
    text_anim.get_pointer("pc").add_fade_out(timer.with_trans_dur(500));
    sa.create_pointer("pc", 1.3, timer.with_dur(500), -1, "#ff0000", 1.5);
    for (var j = 0; j < text_length; j++) {
        sa.increment_pointer("pc", true, timer.with_dur(300));
        if (sa.value_at_pointer("pc") != "-") {
            index = sa.value_at_pointer("pc");
            if (index <= 0) {
                continue;
            }
            text_anim.twitch_index(timer.with_dur(500), index);
            text_anim.twitch_index(timer.with_trans_dur(500), index - 1);
            text_anim.animel_at(index - 1).add_pulse(timer.with_trans_dur(800), "#ff0000");
            l_or_s.animel_at(index - 1).add_pulse(timer.with_dur(800), "#ff0000");
            if (!l_or_s.value_at(index - 1)) {
                // Got an L-string:
                l_or_s.animel_at(index - 1).add_twitch(timer.with_trans_dur(800), -40, 2);
                text_anim.move_pointer_to("pc", index - 1, timer.with_dur(500));
                text_anim.perform_split_animation("pc",
                    function(x) { 
                        x.add_fade_out(timer.copy().with_dur(250));
                        x.add_fade_in(timer.from_relative(1600, 1800)); },
                    function(x) {
                        x.add_colour_change(timer.copy().with_dur(250), "#ff0000");
                        x.add_colour_change(timer.from_relative(1600, 1800), "#000000");
                    } );
                timer.pause(500);
                // Copy the suffix and fly it into the correct location:
                var transformer = function(ta) { return ta.with_colour("#008800"); };
                var duplicate_characters = text_anim.get_copy_of_animations_from_index(index - 1, transformer);

                // Animate the duplicate characters:
                var head_pointer =  "head_" + text[index - 1];
                cells.get_pointer(head_pointer).add_twitch(timer.with_dur(500), -10);
                var sa_position = cells.pointer_to_index(head_pointer);
                if (slots_to_suffix_strings[sa_position] != null) {
                    slots_to_suffix_strings[sa_position].explode(timer.with_trans_dur(1500));
                }

                var x = cells.get_cell_x_at_pointer(head_pointer);
                var y = cells.get_cell_y_at_pointer(head_pointer);
                fly_and_rotate_text(x, y, duplicate_characters, timer.with_dur(600));
                // Keep copy of flown text, in case we need to get rid of it later:
                slots_to_suffix_strings[sa_position] = new AnimatedArray(0, 0, 10, 10, 0).from_animels(duplicate_characters);

                flying_chars = flying_chars.concat(duplicate_characters);
                sa.set_validated_value_at(sa_position, index - 1, ground_truth[sa_position], timer.with_dur(300));
                cells.increment_pointer(head_pointer, false, timer.with_dur(300));
                timer.pause(1000);
            }
        }
    }

    // STAGE SEVEN:
    current_stage.add_text_change(timer.with_dur(700), "7: Induced sorting - backward pass");
    for (var j = text_length - 1; j >= 0; j--) {
        if (sa.value_at_pointer("pc") != "-") {
            index = sa.value_at_pointer("pc");
            if (index - 1 < 0) {
                sa.decrement_pointer("pc", true, timer.with_dur(300));
                continue;
            }
            text_anim.twitch_index(timer.with_dur(500), index);
            text_anim.twitch_index(timer.with_trans_dur(500), index - 1);
            text_anim.animel_at(index - 1).add_pulse(timer.with_trans_dur(800), "#ff0000");
            l_or_s.animel_at(index - 1).add_pulse(timer.with_dur(800), "#ff0000");
            if (l_or_s.value_at(index - 1)) {
                // Got an S-string:
                l_or_s.animel_at(index - 1).add_twitch(timer.with_trans_dur(800), -40, 2);
                text_anim.move_pointer_to("pc", index - 1, timer.with_dur(500));
                text_anim.perform_split_animation("pc",
                    function(x) { 
                        x.add_fade_out(timer.copy().with_dur(250));
                        x.add_fade_in(timer.from_relative(1600, 1800)); },
                    function(x) {
                        x.add_colour_change(timer.copy().with_dur(250), "#ff0000");
                        x.add_colour_change(timer.from_relative(1600, 1800), "#000000");
                    } );
                timer.pause(500);
                // Copy the suffix and fly it into the correct location:
                var colour = is_lms_suffix[index - 1] ? "#ff0000" : "#0000bb";
                var transformer = function(ta) { return ta.with_colour(colour); };
                var duplicate_characters = text_anim.get_copy_of_animations_from_index(index - 1, transformer);

                // Animate the duplicate characters:
                var tail_pointer =  "tail_" + text[index - 1];
                cells.get_pointer(tail_pointer).add_twitch(timer.with_dur(500), -10);
                var sa_position = cells.pointer_to_index(tail_pointer);
                if (slots_to_suffix_strings[sa_position] != null) {
                    slots_to_suffix_strings[sa_position].explode(timer.with_trans_dur(1500));
                }
                var x = cells.get_cell_x_at_pointer(tail_pointer);
                var y = cells.get_cell_y_at_pointer(tail_pointer);
                fly_and_rotate_text(x, y, duplicate_characters, timer.with_dur(600));
                // Keep copy of flown text, in case we need to get rid of it later:
                slots_to_suffix_strings[sa_position] = new AnimatedArray(0, 0, 10, 10, 0).from_animels(duplicate_characters);

                flying_chars = flying_chars.concat(duplicate_characters);
                sa.set_validated_value_at(sa_position, index - 1, ground_truth[sa_position], timer.with_dur(300));
                cells.decrement_pointer(tail_pointer, false, timer.with_dur(300));
                timer.pause(1000);
            }
        }
        sa.decrement_pointer("pc", true, timer.with_dur(300));
    }

    // STAGE EIGHT:
    var last_lms_substring = null;
    var lms_substring_count = 1;
    var lms_name = -1;
    var summary_string = new AnimatedArray(summary_x, summary_y, 16, text_cell_size, "#777777").from_array(new Array(text_length));
    var position_string = new AnimatedArray(summary_x, summary_y + 20, 16, text_cell_size, "#aa77aa").from_array(new Array(text_length));
    current_stage.add_text_change(timer.with_dur(700), "8: Create summary string");

    var lms_substring_title = new TextAnimationItem(new TextAttributes("SUBSTRING:", lms_substring_names_x, lms_substring_names_y, 0, 0, "#000088", "lucida console", 15, "left"));
    var lms_name_title = new TextAnimationItem(new TextAttributes("LMS NAME:", lms_substring_names_x + text_length * 15, lms_substring_names_y, 0, 0, "#000088", "lucida console", 15, "left"));
    var lms_position_title = new TextAnimationItem(new TextAttributes("POSITION:", lms_substring_names_x + 120 + text_length * 15, lms_substring_names_y, 0, 0, "#000088", "lucida console", 15, "left"));
    lms_substring_title.add_fade_in(timer.with_dur(200));
    lms_name_title.add_fade_in(timer.with_dur(200));
    lms_position_title.add_fade_in(timer.with_dur(200));
    misc_animels.push(lms_substring_title);
    misc_animels.push(lms_name_title);
    misc_animels.push(lms_position_title);

    var lms_name_animels = [];
    var lms_position_animels = [];

    for (var i = 0; i < text_length; i++) {
        var index = sa.value_at_pointer("pc");
        if (is_lms_suffix[index]) {
            sa.animel_at_pointer("pc").add_pulse(timer.with_trans_dur(500), "#ff0000");
            text_anim.get_index_animel(index).add_colour_change(timer.with_trans_dur(500), "#ff0000");
            text_anim.move_pointer_to("pc", index, timer.with_dur(500));
            var left_index = index;
            var right_index = left_index + 1;
            while (right_index + 1 < text_length && !is_lms_suffix[right_index]) {
                right_index++;
            }
            lms_substring = [];
            text_anim.perform_substr_split(left_index, right_index,
                function(x) {
                    var ta = x.latest_text_atts();
                    var animel = new TextAnimationItem(ta.with_opacity(0), new AnimationProfile("linear", 0.3));
                    animel.add_fade_in(timer.from_relative(500,600));
                    animel.add_moveto_resize(timer.from_relative(600,1200), 20, 10 + lms_substring_names_x + lms_substring.length * 15, lms_substring_names_y + (lms_substring_count * 30));
                    lms_substring.push(animel);
                    x.add_colour_change(timer.copy().with_dur(200), "#ff0000");
                    x.add_colour_change(timer.from_relative(1800, 2000), "#000000");
                },
                function(x) {
                    x.add_colour_change(timer.copy().with_dur(200), "#dddddd");
                    x.add_colour_change(timer.copy().from_relative(1800, 2000), "#000000");
                });
            flying_chars = flying_chars.concat(lms_substring);
            var new_lms_substring = text.substr(left_index, right_index - left_index);
            if (new_lms_substring != last_lms_substring) {
                lms_name++;
            }
            last_lms_substring = new_lms_substring;
            var ta = new TextAttributes(String(lms_name), 20 + lms_substring_names_x + text_length * 15, lms_substring_names_y + (lms_substring_count * 30), 0, 0, "#aaaaaa", "lucida console", 20, "center");
            var name_animel = new TextAnimationItem(ta);
            misc_animels.push(name_animel);
            lms_name_animels.push(name_animel);
            name_animel.add_fade_in(timer.from_relative(1500, 1800));
            var position_animel = new TextAnimationItem(ta.with_text(String(index)).with_offset(120, 0, 0));
            misc_animels.push(position_animel);
            lms_position_animels.push(position_animel);
            position_animel.add_fade_in(timer.from_relative(1600, 1900));
            summary_string.adopt_animel(name_animel, index, timer.from_relative(1800, 2500));
            position_string.adopt_animel(position_animel, index, timer.from_relative(2000, 2700));
            lms_substring_count += 1;
            timer.pause(2000);
        }
        sa.increment_pointer("pc", false, timer.with_dur(100));
    }

    position_string.x += 200;
    position_string.y += 30;
    position_string.remove_gaps(timer.with_dur(1000));
    var position_string_title = new TextAnimationItem(new TextAttributes("POSITIONS:", summary_x, summary_y + 50, 0, 0, "#aa77aa", "lucida console", 20, "left"));
    position_string_title.add_fade_in(timer.with_dur(200));
    misc_animels.push(position_string_title);

    summary_string.x += 200;
    summary_string.y += 30;
    summary_string.remove_gaps(timer.with_dur(1000));
    summary_string.append_text("$", timer.with_dur(300));
    summary_string.add_colour_change(timer.with_trans_dur(200), "#000088");
    var summary_string_title = new TextAnimationItem(new TextAttributes("SUMMARY STRING:", summary_x, summary_y + 30, 0, 0, "#000088", "lucida console", 20, "left"));
    summary_string_title.add_fade_in(timer.with_dur(200));
    misc_animels.push(summary_string_title);

    // Collect all animation items together:
    var full_animation = text_anim.get_animated_elements()
        .concat(l_or_s.get_animated_elements())
        .concat(alphabet.get_animated_elements())
        .concat(counts.get_animated_elements())
        .concat(links)
        .concat(cells.get_animated_elements())
        .concat(sa.get_animated_elements())
        .concat(flying_chars)
        .concat(misc_animels)
        .concat(summary_string.get_animated_elements())
        .concat(position_string.get_animated_elements());
    full_animation.push(explanation);
    full_animation.push(current_stage);
    full_animation.push(heads_anim);
    full_animation.push(tails_anim);
    full_animation.push(sa_anim);

    var ss = summary_string.get_as_text();

    current_stage.add_text_change(timer.with_dur(700), "9: Get Suffix Array for Summary String - Recurse!");
    timer.pause(1000);

    var full = new AnimatedArray(0, 0, 10, 10, 0).from_animels(full_animation);
    var summary_string_copy = new AnimatedArray(text_x, text_y, text_font_size, text_cell_size, "#000000").from_animels(summary_string.get_copy_of_animations_from_index(0));
    summary_string_copy.add_fade_in(timer.with_dur(200));

    full.explode(timer.with_dur(1000));

    summary_string_copy.reset_positions(timer.with_dur(1000));
    for (var i = 0; i < summary_string.length - 1; i++) {
        summary_string_copy.animel_at(i).add_text_change(timer.with_dur(500), String.fromCharCode(parseInt(summary_string.value_at(i)) + 'a'.charCodeAt(0)));
    }
    summary_string_copy.add_fade_out(timer.with_dur(500));

    // Recurse!
    ss = summary_string_copy.get_as_text();
    var results = create_animation(ss, timer);
    full_animation = full_animation.concat(results["animation"]);
    var full_sub = new AnimatedArray(0, 0, 10, 10, 0).from_animels(results["animation"]);
    full_sub.explode(timer.with_dur(1000));
    full.unexplode(timer.with_dur(1000));
    console.log("Summary string SA:", results["sa"]);

    var summary_sa = new AnimatedArray(summary_x + 200, summary_y + 80, 16, text_cell_size, "#000088").from_array(results["sa"]);
    summary_sa.display(timer.with_dur(500));
    var summary_sa_title = new TextAnimationItem(new TextAttributes("SUMMARY SA:", summary_x, summary_y + 80, 0, 0, "#000088", "lucida console", 20, "left"));
    summary_sa_title.add_fade_in(timer.with_dur(200));

    current_stage.add_text_change(timer.with_dur(700), "10: Induce full suffix array from the summary string's suffix array - add LMS suffixes");
    for (var i = 0; i < slots_to_suffix_strings.length; i++) {
        slots_to_suffix_strings[i].explode(timer.with_trans_dur(500));
        slots_to_suffix_strings[i] = null;
        timer.pause(200);
    }
    sa.fill(-1, "-", timer.with_dur(500));

    // Put tail pointers back where they started:
    for (var i = 0; i < tail_pointer_names.length; i++) {
        cells.pop_pointer(tail_pointer_names[i], timer.with_trans_dur(300));
        cells.push_pointer(tail_pointer_names[i]);  // To reset after LMS string added
    }
    // Put head pointers back where they started:
    for (var i = 0; i < head_pointer_names.length; i++) {
        cells.pop_pointer(head_pointer_names[i], timer.with_trans_dur(300));
    }

    summary_sa.create_pointer("pc", 2, timer.with_dur(200), summary_sa.length - 1, "#eabc90", 1.5);
    summary_string.create_indices(2, timer.with_dur(1200));

    timer.pause(1000);

    for (var i = summary_sa.length - 1; i > 0; i--) {
        console.log("Summary SA Index:", i);
        var index = summary_sa.value_at_pointer("pc");
        console.log("Summary String Index:", index);
        summary_sa.animel_at_pointer("pc").add_pulse(timer.with_dur(500), "#ff0000");
        full_animation.push(create_link_animation(summary_sa.animel_at_pointer("pc"), summary_string.get_index_animel(index), timer.with_dur(500)));
        summary_string.animel_at(index).add_pulse(timer.with_trans_dur(500), "#ff0000");
        position_string.animel_at(index).add_pulse(timer.with_trans_dur(500), "#ff0000");
        summary_string.get_index_animel(index).add_pulse(timer.with_dur(500), "#ff0000");
        timer.pause(400);

        var position = position_string.value_at(index);
        full_animation.push(create_link_animation(position_string.animel_at(index), text_anim.get_index_animel(position), timer.with_dur(500)));
 
        /*
        var lms_name = summary_string.value_at(index);
        console.log("LMS_NAME:", lms_name)
        full_animation.push(create_link_animation(summary_string.animel_at(index), lms_name_animels[lms_name], timer.with_dur(500)));
        lms_name_animels[lms_name].add_pulse(timer.with_trans_dur(500), "#ff0000");
        lms_position_animels[lms_name].add_pulse(timer.with_dur(500), "#ff0000");
        timer.pause(400);
        var position = parseInt(lms_position_animels[lms_name].get_text());
        full_animation.push(create_link_animation(lms_position_animels[lms_name], text_anim.get_index_animel(position), timer.with_dur(500)));
        text_anim.animel_at(position).add_pulse(timer.with_trans_dur(500), "#ff0000");
        text_anim.get_index_animel(position).add_pulse(timer.with_dur(500), "#ff0000");
        */
        text_anim.move_pointer_to("pc", position, timer.with_dur(100));
        text_anim.perform_split_animation("pc",
            function(x) { 
                x.add_fade_out(timer.copy().with_dur(250));
                x.add_fade_in(timer.from_relative(1600, 1800)); },
            function(x) {
                x.add_colour_change(timer.copy().with_dur(250), "#ff0000");
                x.add_colour_change(timer.from_relative(1600, 1800), "#000000");
            } );
        timer.pause(500);
        // Copy the suffix and fly it into the correct location:
        var transformer = function(ta) { return ta.with_colour("#ff0000"); };
        var duplicate_characters = text_anim.get_copy_of_animations_from_index(position, transformer);

        // Animate the duplicate characters:
        var tail_pointer =  "tail_" + text[position];
        cells.get_pointer(tail_pointer).add_twitch(timer.with_dur(500), -10);
        var sa_position = cells.pointer_to_index(tail_pointer);
        var x = cells.get_cell_x_at_pointer(tail_pointer);
        var y = cells.get_cell_y_at_pointer(tail_pointer);
        fly_and_rotate_text(x, y, duplicate_characters, timer.with_dur(600));
        // Keep copy of flown text, in case we need to get rid of it later:
        slots_to_suffix_strings[sa_position] = new AnimatedArray(0, 0, 10, 10, 0).from_animels(duplicate_characters);

        full_animation = full_animation.concat(duplicate_characters);
        sa.set_validated_value_at(sa_position, position, ground_truth[sa_position], timer.with_dur(300));
        cells.decrement_pointer(tail_pointer, false, timer.with_dur(300));

        timer.pause(1000);
        summary_sa.decrement_pointer("pc", false, timer.with_dur(300));
    }
    // Put tail pointers back where they started:
    for (var i = 0; i < tail_pointer_names.length; i++) {
        cells.pop_pointer(tail_pointer_names[i], timer.with_trans_dur(300));
    }

    current_stage.add_text_change(timer.with_dur(700), "10: Induce full suffix array from the summary string's suffix array - forward pass");
    sa.move_pointer_to("pc", -1, timer.with_dur(500));

    text_anim.add_fade_in(timer.with_trans_dur(500));
    cells.add_colour_change(timer.with_trans_dur(500), "#cccccc");
    text_anim.get_pointer("pc").add_fade_out(timer.with_trans_dur(500));
    for (var j = 0; j < text_length; j++) {
        sa.increment_pointer("pc", true, timer.with_dur(300));
        if (sa.value_at_pointer("pc") != "-") {
            index = sa.value_at_pointer("pc");
            if (index <= 0) {
                continue;
            }
            text_anim.twitch_index(timer.with_dur(500), index);
            text_anim.twitch_index(timer.with_trans_dur(500), index - 1);
            text_anim.animel_at(index - 1).add_pulse(timer.with_trans_dur(800), "#ff0000");
            l_or_s.animel_at(index - 1).add_pulse(timer.with_dur(800), "#ff0000");
            if (!l_or_s.value_at(index - 1)) {
                // Got an L-string:
                l_or_s.animel_at(index - 1).add_twitch(timer.with_trans_dur(800), -40, 2);
                text_anim.move_pointer_to("pc", index - 1, timer.with_dur(500));
                text_anim.perform_split_animation("pc",
                    function(x) { 
                        x.add_fade_out(timer.copy().with_dur(250));
                        x.add_fade_in(timer.from_relative(1600, 1800)); },
                    function(x) {
                        x.add_colour_change(timer.copy().with_dur(250), "#ff0000");
                        x.add_colour_change(timer.from_relative(1600, 1800), "#000000");
                    } );
                timer.pause(500);
                // Copy the suffix and fly it into the correct location:
                var transformer = function(ta) { return ta.with_colour("#008800"); };
                var duplicate_characters = text_anim.get_copy_of_animations_from_index(index - 1, transformer);

                // Animate the duplicate characters:
                var head_pointer =  "head_" + text[index - 1];
                cells.get_pointer(head_pointer).add_twitch(timer.with_dur(500), -10);
                var sa_position = cells.pointer_to_index(head_pointer);
                if (slots_to_suffix_strings[sa_position] != null) {
                    slots_to_suffix_strings[sa_position].explode(timer.with_trans_dur(1500));
                }

                var x = cells.get_cell_x_at_pointer(head_pointer);
                var y = cells.get_cell_y_at_pointer(head_pointer);
                fly_and_rotate_text(x, y, duplicate_characters, timer.with_dur(600));
                // Keep copy of flown text, in case we need to get rid of it later:
                slots_to_suffix_strings[sa_position] = new AnimatedArray(0, 0, 10, 10, 0).from_animels(duplicate_characters);

                full_animation = full_animation.concat(duplicate_characters);
                sa.set_validated_value_at(sa_position, index - 1, ground_truth[sa_position], timer.with_dur(300));
                cells.increment_pointer(head_pointer, false, timer.with_dur(300));
                timer.pause(1000);
            }
        }
    }

    current_stage.add_text_change(timer.with_dur(700), "10: Induce full suffix array from the summary string's suffix array - back pass");
    for (var j = text_length - 1; j >= 0; j--) {
        if (sa.value_at_pointer("pc") != "-") {
            index = sa.value_at_pointer("pc");
            if (index - 1 < 0) {
                sa.decrement_pointer("pc", true, timer.with_dur(300));
                continue;
            }
            text_anim.twitch_index(timer.with_dur(500), index);
            text_anim.twitch_index(timer.with_trans_dur(500), index - 1);
            text_anim.animel_at(index - 1).add_pulse(timer.with_trans_dur(800), "#ff0000");
            l_or_s.animel_at(index - 1).add_pulse(timer.with_dur(800), "#ff0000");
            if (l_or_s.value_at(index - 1)) {
                // Got an S-string:
                l_or_s.animel_at(index - 1).add_twitch(timer.with_trans_dur(800), -40, 2);
                text_anim.move_pointer_to("pc", index - 1, timer.with_dur(500));
                text_anim.perform_split_animation("pc",
                    function(x) { 
                        x.add_fade_out(timer.copy().with_dur(250));
                        x.add_fade_in(timer.from_relative(1600, 1800)); },
                    function(x) {
                        x.add_colour_change(timer.copy().with_dur(250), "#ff0000");
                        x.add_colour_change(timer.from_relative(1600, 1800), "#000000");
                    } );
                timer.pause(500);
                // Copy the suffix and fly it into the correct location:
                var colour = is_lms_suffix[index - 1] ? "#ff0000" : "#0000bb";
                var transformer = function(ta) { return ta.with_colour(colour); };
                var duplicate_characters = text_anim.get_copy_of_animations_from_index(index - 1, transformer);

                // Animate the duplicate characters:
                var tail_pointer =  "tail_" + text[index - 1];
                cells.get_pointer(tail_pointer).add_twitch(timer.with_dur(500), -10);
                var sa_position = cells.pointer_to_index(tail_pointer);
                if (slots_to_suffix_strings[sa_position] != null) {
                    slots_to_suffix_strings[sa_position].explode(timer.with_trans_dur(1500));
                }
                var x = cells.get_cell_x_at_pointer(tail_pointer);
                var y = cells.get_cell_y_at_pointer(tail_pointer);
                fly_and_rotate_text(x, y, duplicate_characters, timer.with_dur(600));
                // Keep copy of flown text, in case we need to get rid of it later:
                slots_to_suffix_strings[sa_position] = new AnimatedArray(0, 0, 10, 10, 0).from_animels(duplicate_characters);

                full_animation = full_animation.concat(duplicate_characters);
                sa.set_validated_value_at(sa_position, index - 1, ground_truth[sa_position], timer.with_dur(300));
                cells.decrement_pointer(tail_pointer, false, timer.with_dur(300));
                timer.pause(1000);
            }
        }
        sa.decrement_pointer("pc", true, timer.with_dur(300));
    }


    full_animation = full_animation.concat(summary_sa.get_animated_elements());
    full_animation = full_animation.concat(summary_string_copy.get_animated_elements()).concat(summary_string.index_elements);

    full_animation.push(summary_sa_title);

    return {"animation":full_animation, "sa":sa.arr};
}
