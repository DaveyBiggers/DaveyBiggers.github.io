function draw(animation_items, timestamp) {
    //console.log(timestamp);

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
            current_time = end_time;
        }
        if (current_time < start_time) {
            current_time = start_time;
        }
        if (this.style = "linear") {
            return (current_time - start_time) / (end_time - start_time);
        } else if (this.style = "sigmoid") {
            mid_time = (end_time - start_time) / 2.0;
            return 1.0 / (1.0 + Math.exp(-this.steepness * (current_time - mid_time)));
        } else if (this.style = "cheeky") {
            lin = (current_time - start_time) / (end_time - start_time);
            return (lin - Math.sin(2 * math.PI * lin));
        }
    }
}

class TextAnimationItem {
    constructor(initial_textatts, profile=new AnimationProfile("cheeky")) {
        this.animations = []
        this.textatts = initial_textatts;
        this.initial_textatts = initial_textatts;
        this.profile = profile;
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

    draw(context, timestamp) {
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
            this.textatts.draw(context);
        } else {
            var b = current_animation_phase.end_attributes;
            var a = current_animation_phase.start_attributes;
            var alpha = this.profile.get_interpolator(current_animation_phase.start_time, current_animation_phase.end_time, timestamp);
            this.textatts.interpolate(a, b, alpha);
            this.textatts.draw(context);
        }
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
    interpolate(ta, tb, alpha) {
        this.x = ta.x + (tb.x - ta.x) * alpha;
        this.y = ta.y + (tb.y - ta.y) * alpha;
        this.rot = ta.rot + (tb.rot - ta.rot) * alpha;
        this.opacity = ta.opacity + (tb.opacity - ta.opacity) * alpha;
        this.colour = interpolate_colours(ta.colour, tb.colour, alpha);
        this.size = Math.round(ta.size + (tb.size - ta.size) * alpha);

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

function create_text_wipe(animations, txt, x, y, colour, time_offset) {
    for (var i = 0; i < txt.length; i++) {
        var chartxt = txt.substring(i, i + 1);
        var charx = x + i * 20;
        var chary = y;
        var t1 = new TextAttributes(chartxt, charx + 10, chary + 10, 90, 0, colour);
        var t2 = new TextAttributes(chartxt, charx, chary - 10, 270, 1.0, colour);
        var t3 = new TextAttributes(chartxt, charx, chary, 0, 1.0, colour);
        var animchar = new TextAnimationItem(t1);
        time_offset += 20;
        animchar.add_animation(time_offset, time_offset + 100, t2);
        animchar.add_animation(time_offset + 100, time_offset + 200, t3);
        animations.push(animchar);
    }
    return time_offset + 200;
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
    var letters = []
    text = "mmiissiissiippii$"
    time_offset = create_text_wipe(letters, text, 30, 140, "#000000", 0);
    var t = new TextAttributes("", 0, 0, 180, 0, "#000000");
    l_or_s = new Int8Array(letters.length);
    var tc = new TextAttributes("v", 500, 500, 0, 0, "#ff0000");
    pointer = new TextAnimationItem(tc, new  AnimationProfile("linear"));
    pointer.add_animation(time_offset, time_offset + 1, tc.with_opacity(1.0));

    var ta_l = new TextAttributes("L", 500, 500, 0, 0, "#00cc00");
    var ta_s = new TextAttributes("S", 500, 500, 0, 0, "#0000cc");

    l_or_s_chars = []
    explanation = new TextAnimationItem(new TextAttributes("", 10, 180, 0, 1.0, "#222222", font="undefined", size=20, alignment="left"));
    current_stage = new TextAnimationItem(new TextAttributes("1: Traverse string backwards, labelling characters as L(larger) or S(smaller)", 10, 30, 0, 1.0, "#111111", font=undefined, size=20, alignment="left"));

    for (var i = letters.length - 1; i >=0; i--) {
        pointer.add_moveto(time_offset, time_offset + 200, 30 + i * 20, 60);
        letters[i].add_pulse(time_offset + 200, time_offset + 600, "#ff0000");
        var isS = true;
        if (i < letters.length - 1) {
            if (text[i] < text[i + 1]) {
                explanation.add_text_change(time_offset, time_offset + 100, "'" + text[i] + "' < '" + text[i + 1] + "'");
                isS = true;
            } else if (text[i] > text[i + 1]) {
                explanation.add_text_change(time_offset, time_offset + 100, "'" + text[i] + "' > '" + text[i + 1] + "'");
                isS = false;
            } else {
                isS = l_or_s[i + 1];
                explanation.add_text_change(time_offset, time_offset + 100, "'" + text[i] + "' == '" + text[i + 1] + "'");
            }
        }
        var lors = null;
        l_or_s[i] = isS;
        if (isS) {
            letters[i].add_offset(time_offset+700, time_offset+1000, 0, 5, 0);
            lors = new TextAnimationItem(ta_s.with_position(30 + i * 20, 100));
        } else {
            letters[i].add_offset(time_offset+700, time_offset+1000, 0, -5, 0);
            lors = new TextAnimationItem(ta_l.with_position(30 + i * 20, 100));
        }
        lors.add_fade_in(time_offset+1000, time_offset+1500);
        l_or_s_chars.unshift(lors);
        time_offset += 1000;
    }
    pointer.add_fade_out(time_offset, time_offset + 500);
    explanation.add_fade_out(time_offset, time_offset + 500);
    current_stage.add_text_change(time_offset + 500, time_offset + 1200, "2: Traverse string forwards, finding left-most S characters (LMS)");
    time_offset += 2000;
    pointer.add_fade_in(time_offset, time_offset + 500);
    time_offset += 500;
    for (var i = 0; i < letters.length; i++) {
        pointer.add_moveto(time_offset, time_offset + 100, 30 + i * 20, 60);
        l_or_s_chars[i].add_pulse(time_offset + 100, time_offset + 300, "#ff0000");
        if (l_or_s[i] && (i == 0 || !l_or_s[i-1])) {
            l_or_s_chars[i].add_offset(time_offset + 300, time_offset + 400, 0, -5);
            l_or_s_chars[i].add_colour_change(time_offset + 400, time_offset + 1000, "#ff4444");
        }
        time_offset += 500;
    }
    letters.push(pointer)
    full_animation = letters.concat(l_or_s_chars);
    full_animation.push(explanation);
    full_animation.push(current_stage);
    window.requestAnimationFrame(function(timestamp) { draw(full_animation, timestamp); });
})
