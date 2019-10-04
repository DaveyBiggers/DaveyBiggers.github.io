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
        console.log("Hello, making profile, style=", style);
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

    add_animation(start_time, end_time, end_attributes) {
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

    add_fade_out(start_time, end_time) {
        var last_atts = this.latest_text_atts();
        this.add_animation(start_time, end_time, last_atts.with_opacity(0));
    }
    add_fade_in(start_time, end_time) {
        var last_atts = this.latest_text_atts();
        this.add_animation(start_time, end_time, last_atts.with_opacity(1));
    }
    add_offset(start_time, end_time, xoff, yoff, rotoff=0) {
        var last_atts = this.latest_text_atts();
        this.add_animation(start_time, end_time, last_atts.with_offset(xoff, yoff, rotoff));
    }
    add_moveto(start_time, end_time, xpos, ypos, rot=0) {
        var last_atts = this.latest_text_atts();
        this.add_animation(start_time, end_time, last_atts.with_position(xpos, ypos, rot));
    }
    add_pulse(start_time, end_time, colour) {
        var last_atts = this.latest_text_atts();
        this.add_animation(start_time, (start_time + end_time) / 2, last_atts.with_colour(colour).with_size(last_atts.size + 5));
        this.add_animation((start_time + end_time) / 2, end_time, last_atts);
    }
    add_text_change(start_time, end_time, text) {
        var last_atts = this.latest_text_atts();
        this.add_animation(start_time, (start_time + end_time) / 2, last_atts.with_opacity(0));
        this.add_animation((start_time + end_time) / 2, end_time, last_atts.with_text(text));
    }
    add_colour_change(start_time, end_time, colour) {
        var last_atts = this.latest_text_atts();
        this.add_animation(start_time, end_time, last_atts.with_colour(colour));
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

function build_initial_suffixes(txt) {
    text_items = []
    for (var i = 0; i < txt.length; i++) {
        suffix = txt.substring(i)
        text_items.push(new text_item(suffix, 500, 50, 0, 500, 50 + (32*i), 0))
    }
    return text_items
}

function create_text_wipe(animations, txt, x, y, colour, time_offset, speed) {
    for (var i = 0; i < txt.length; i++) {
        var chartxt = txt.substring(i, i + 1);
        var charx = x + i * 20;
        var chary = y;
        var t1 = new TextAttributes(chartxt, charx + 10, chary + 10, 90, 0, colour);
        var t2 = new TextAttributes(chartxt, charx, chary - 10, 270, 1.0, colour);
        var t3 = new TextAttributes(chartxt, charx, chary, 0, 1.0, colour);
        var animchar = new TextAnimationItem(t1);
        time_offset += speed * 20;
        animchar.add_animation(time_offset, time_offset + speed * 100, t2);
        animchar.add_animation(time_offset + speed * 100, time_offset + speed * 200, t3);
        animations.push(animchar);
    }
    return time_offset + speed * 200;
}

function create_link_animation(a, b, start_time, end_time) {
    var t1 = new TextAttributes();
    var t2 = new TextAttributes();
    a.get_atts_at_time(t1, start_time);
    b.get_atts_at_time(t2, end_time);
    var linker = new TextAnimationItem(t1.with_opacity(0));
    linker.add_animation(start_time, start_time, t1);
    linker.add_animation(start_time, end_time, t2);
    linker.add_animation(end_time, end_time, t2.with_opacity(0));
    return linker;
}

function create_multiline_text(animations, txt, x, y, colours, time_offset) {
    lines = txt.split("\n");
    for (var l = 0; l < lines.length; l++) {
        new_time_offset = create_text_wipe(animations, lines[l], x, y + (30 * l), colours[l % colours.length], time_offset);
        time_offset = (time_offset + new_time_offset) / 2.0;
    }
    return time_offset;
}

window.addEventListener("load", function(){
    var speed = 1;//0.01;

    var letters = []
    text = "mmiissiissiippii$";
    time_offset = create_text_wipe(letters, text, 30, 140, "#000000", 0, speed);
    var t = new TextAttributes("", 0, 0, 180, 0, "#000000");
    l_or_s = new Int8Array(letters.length);
    var tc = new TextAttributes("v", 500, 500, 0, 0, "#ff0000");
    pointer = new TextAnimationItem(tc, new  AnimationProfile("cheeky", 0.3));
    pointer.add_animation(time_offset, time_offset + 1, tc.with_opacity(1.0));

    var ta_l = new TextAttributes("L", 500, 500, 0, 0, "#00cc00");
    var ta_s = new TextAttributes("S", 500, 500, 0, 0, "#0000cc");

    l_or_s_chars = []
    explanation = new TextAnimationItem(new TextAttributes("", 10, 180, 0, 1.0, "#222222", font="undefined", size=20, alignment="left"));
    current_stage = new TextAnimationItem(new TextAttributes("1: Traverse string backwards, labelling characters as L(larger) or S(smaller)", 10, 30, 0, 1.0, "#111111", font=undefined, size=20, alignment="left"));

    for (var i = letters.length - 1; i >=0; i--) {
        pointer.add_moveto(time_offset, time_offset + (speed * 200), 30 + i * 20, 60);
        letters[i].add_pulse(time_offset + (speed * 200), time_offset + (speed * 600), "#ff0000");
        var isS = true;
        if (i < letters.length - 1) {
            if (text[i] < text[i + 1]) {
                explanation.add_text_change(time_offset, time_offset + (speed * 100), "'" + text[i] + "' < '" + text[i + 1] + "'");
                isS = true;
            } else if (text[i] > text[i + 1]) {
                explanation.add_text_change(time_offset, time_offset + (speed * 100), "'" + text[i] + "' > '" + text[i + 1] + "'");
                isS = false;
            } else {
                isS = l_or_s[i + 1];
                explanation.add_text_change(time_offset, time_offset + (speed * 100), "'" + text[i] + "' == '" + text[i + 1] + "'");
            }
        }
        var lors = null;
        l_or_s[i] = isS;
        if (isS) {
            letters[i].add_offset(time_offset+(speed * 700), time_offset+(speed * 1000), 0, 5, 0);
            lors = new TextAnimationItem(ta_s.with_position(30 + i * 20, 100));
        } else {
            letters[i].add_offset(time_offset+(speed * 700), time_offset+(speed * 1000), 0, -5, 0);
            lors = new TextAnimationItem(ta_l.with_position(30 + i * 20, 100));
        }
        lors.add_fade_in(time_offset+(speed * 1000), time_offset+(speed * 1500));
        l_or_s_chars.unshift(lors);
        time_offset += speed * 1000;
    }
    pointer.add_fade_out(time_offset, time_offset + speed * 500);
    explanation.add_fade_out(time_offset, time_offset + speed * 500);
    current_stage.add_text_change(time_offset + speed * 500, time_offset + speed * 1200, "2: Traverse string forwards, finding left-most S characters (LMS)");
    time_offset += speed * 2000;
    pointer.add_fade_in(time_offset, time_offset + speed * 500);
    time_offset += speed * 500;
    var lms_suffixes = [];
    for (var i = 0; i < letters.length; i++) {
        pointer.add_moveto(time_offset, time_offset + speed * 100, 30 + i * 20, 60);
        l_or_s_chars[i].add_pulse(time_offset + speed * 100, time_offset + speed * 300, "#ff0000");
        if (l_or_s[i] && (i == 0 || !l_or_s[i-1])) {
            l_or_s_chars[i].add_offset(time_offset + speed * 300, time_offset + speed * 400, 0, -5);
            l_or_s_chars[i].add_colour_change(time_offset + speed * 400, time_offset + speed * 1000, "#ff4444");
            lms_suffixes.push(i);
        }
        time_offset += speed * 500;
    }

    pointer.add_fade_out(time_offset, time_offset + speed * 500);
    current_stage.add_text_change(time_offset + speed * 500, time_offset + speed * 1200, "3: Traverse string, calculate bucket sizes");
    var alphabet=[];
    var alphabet_chars = "$abcdefghijklmnopqrstuvwxyz";
    var counts = Array(alphabet_chars.length).fill(0);
    var count_text = "0".repeat(alphabet_chars.length);
    var count_chars = []
    time_offset += speed * 2000;
    time_offset_delta = create_text_wipe(alphabet, alphabet_chars, 30, 190, "#bbaa44", time_offset, speed) - time_offset;
    time_offset = create_text_wipe(count_chars, count_text, 30, 230, "#44aabb", time_offset + time_offset_delta / 2, speed);

    var links = []
    for (var i = 0; i < letters.length; i++) {
        pointer.add_moveto(time_offset, time_offset + speed * 100, 30 + i * 20, 60);
        letters[i].add_pulse(time_offset + speed * 400, time_offset + speed * 900, "#ff0000");
        var char_value = 1 + text.charCodeAt(i) - 'a'.charCodeAt(0);
        if (char_value < 0) {
            char_value = 0; // "$" is less than "a".
        }
        alphabet[char_value].add_pulse(time_offset + speed * 900, time_offset + speed * 1400, "#ff0000");
        links.push(create_link_animation(letters[i], alphabet[char_value], time_offset + speed * 700, time_offset + speed * 1100));
        counts[char_value] += 1;
        count_chars[char_value].add_text_change(time_offset + speed * 1200, time_offset + speed * 1900, counts[char_value]);
        time_offset += speed * 2000;
    }

    current_stage.add_text_change(time_offset + speed * 500, time_offset + speed * 1200, "4: Create buckets, find heads and tails");
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
            count_chars[i].add_pulse(time_offset, time_offset + speed * 1000, "#ff0000");
            alphabet[i].add_pulse(time_offset, time_offset + speed * 1000, "#ff0000");
            alphabet[i].add_moveto(time_offset + speed * 1000, time_offset + speed * 1500, 130 + index * 20, 260);
            var start_index = index;
            heads.push(start_index);
            for (var j = 0; j < counts[i]; j++) {
                var t1 = cell_ta.with_text(alphabet_chars[i]).with_position(130 + start_index * 20, 260);
                var cell_anim = new TextAnimationItem(t1);
                cell_anim.add_animation(time_offset + speed * 2000, time_offset + speed * 3000, t1.with_opacity(1.0).with_position(130 + index * 20, 260));
                cells.push(cell_anim);
                index++;
            }
            tails.push(index - 1);
            bucket_indices[alphabet_chars[i]] = num_buckets;
            num_buckets += 1;
        }
    }
    for (var i = 0; i < alphabet.length; i++) {
        alphabet[i].add_fade_out(time_offset + speed * 2000, time_offset + speed * 3000);
        count_chars[i].add_fade_out(time_offset + speed * 2000, time_offset + speed * 3000);
    }

    var heads_anim = new TextAnimationItem(new TextAttributes("HEADS:", 30, 210, 0, 0, "#008800", "lucida console", 20, "left"));
    var tails_anim = new TextAnimationItem(new TextAttributes("TAILS:", 30, 230, 0, 0, "#000088", "lucida console", 20, "left"));
    heads_anim.add_fade_in(time_offset + speed * 2500, time_offset + speed * 3000);
    tails_anim.add_fade_in(time_offset + speed * 2500, time_offset + speed * 3000);
    var tc_ht = new TextAttributes("v", 500, 500, 0, 0, "#ff0000", "lucida console", 20, "right");
    var heads_pointers = [];
    var tails_pointers = [];

    for (var i = 0; i < tails.length; i++) {
        var head_pointer = new TextAnimationItem(tc_ht.with_colour("#00aa00").with_position(130 + heads[i] * 20, 210), new  AnimationProfile("linear"));
        head_pointer.add_fade_in(time_offset + speed * 2500, time_offset + speed * 3500);
        heads_pointers.push(head_pointer);

        var tail_pointer = new TextAnimationItem(tc_ht.with_colour("#0000aa").with_position(130 + tails[i] * 20, 230), new  AnimationProfile("linear"));
        tail_pointer.add_fade_in(time_offset + speed * 2500, time_offset + speed * 3500);
        tails_pointers.push(tail_pointer);
    }

    time_offset += speed * 4000;
    current_stage.add_text_change(time_offset, time_offset + speed * 700, "5: Traverse string forwards, adding LMS suffixes to the correct bucket");

    speed = 1.0;

    for (var i = 0; i < letters.length; i++) {
        letters[i].add_moveto(time_offset, time_offset + speed * 200, 30 + i * 20, 140);
    }
    pointer.add_fade_in(time_offset, time_offset + speed * 200);
    time_offset += speed * 200;
    var suffix_movements = [];
    var suffix_string_chars = Array(text.length);
    for (var i = 0; i < lms_suffixes.length; i++) {
        pointer.add_moveto(time_offset, time_offset + speed * 100, 30 + lms_suffixes[i] * 20, 60);
        time_offset += speed * 300;
        for (var j = 0; j < letters.length; j++) {
            if (j < lms_suffixes[i]) {
                letters[j].add_fade_out(time_offset, time_offset + speed * 250);
            }
            else {
                letters[j].add_colour_change(time_offset, time_offset + speed * 250, "#ff0000");
                letters[j].add_colour_change(time_offset + speed * 1600, time_offset + speed * 1800, "#000000");
            }
        }
        //letters[lms_suffixes[i]].add_pulse(time_offset + speed * 750, time_offset + speed * 1250, "#ff0000");
        var bucket = bucket_indices[text[lms_suffixes[i]]]
        tails_pointers[bucket].add_pulse(time_offset + speed * 750, time_offset + speed * 1250, "#ff0000");
        cells[tails[bucket]].add_pulse(time_offset + speed * 750, time_offset + speed * 1250, "#ff0000");
        //links.push(create_link_animation(pointer, tails_pointers[bucket], time_offset + speed * 250, time_offset + speed * 750));
        var suffix_string = text.substring(lms_suffixes[i]);
        var this_suffix_animation = [];
        var gap = 200 / suffix_string.length;
        for (var j = 0; j < suffix_string.length; j++) {
            var suffix_animation = new TextAnimationItem(new TextAttributes(suffix_string[j], 30 + (j + lms_suffixes[i]) * 20, 140, 0, 0, "#ff0000", "lucida console", 30, "right"), new AnimationProfile("cheeky", 0.3));
            suffix_animation.add_fade_in(time_offset + speed * 1000, time_offset + speed * 1250);
            var ta_rotated = new TextAttributes(suffix_string[j], 115 + tails[bucket] * 20, 280 + j * 8, -90, 1.0, "#004400", "lucida console", 16, "right");
            suffix_animation.add_animation(time_offset + (suffix_string.length - j * gap) + speed * 1250, time_offset + (suffix_string.length - j * gap) + speed * 1800, ta_rotated);
            this_suffix_animation.push(suffix_animation);
            suffix_movements.push(suffix_animation);    
        }
        suffix_string_chars[lms_suffixes[i]] = this_suffix_animation;
        tails[bucket]--;
        tails_pointers[bucket].add_offset(time_offset + speed * 1800, time_offset + speed * 2000, -20, 0, 0);
        time_offset += speed * 2000;
    }

    for (var j = 0; j < letters.length; j++) {
        letters[j].add_fade_in(time_offset, time_offset + speed * 250);
        time_offset += speed * 25;
    }

    letters.push(pointer)
    full_animation = letters.concat(l_or_s_chars).concat(alphabet).concat(count_chars).concat(links).concat(cells).concat(heads_pointers).concat(tails_pointers).concat(suffix_movements);
    full_animation.push(explanation);
    full_animation.push(current_stage);
    full_animation.push(heads_anim);
    full_animation.push(tails_anim);
    window.requestAnimationFrame(function(timestamp) { draw(full_animation, timestamp); });

})
