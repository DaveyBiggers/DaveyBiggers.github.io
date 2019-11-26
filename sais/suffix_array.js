window.addEventListener("load", function(){
    var text = "mmiissiissiippii$"; // Test string in the original paper
    var text = "cabbage$";  // Test strings in the walk-through
    var text = "baabaabac$";
    var text = "ohbabybabyhowwasisupposedtoknow$";
    var timer = new TimeController(1, "main");
    var results = create_animation(text, timer);
    var animels = results["animation"];
    var suffix_array = results["sa"];
    var break_points = timer.get_break_points();
    this.console.log(suffix_array);
    start_animation(animels, break_points);
    //window.requestAnimationFrame(function(timestamp) { draw(animels, get_animation_time(timestamp, break_points)); });
});

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
        timer.mark();
        var current_stage = new TextAnimationItem(new TextAttributes("1: No duplicate characters, so perform simple bucket sort", stage_title_x, stage_title_y, 0, 0, "#111111", font=undefined, size=20, alignment="left"));
        current_stage.add_fade_in(timer.with_dur(500));
        text_anim.create_pointer("pc", -1, timer.with_dur(500), -1);

        var alphabet = new AnimatedArray(alphabet_x, alphabet_y, text_font_size, text_cell_size, "#bbaa44").from_text(alphabet_chars);
        alphabet.display(timer);
        var sa = new AnimatedArray(alphabet_x, alphabet_y + 40, text_font_size * 0.5, text_cell_size, "#000088").from_array(new Array(alphabet_chars.length));
        text_anim.create_indices(1, timer.with_dur(500));
        for (var i = 0; i < text_length; i++) {
            text_anim.increment_pointer("pc", false, timer.with_trans_dur(500));
            var char_value = 1 + text.charCodeAt(i) - 'a'.charCodeAt(0);
            if (char_value < 0) {
                char_value = 0; // "$" is less than "a".
            }
            alphabet.animel_at(char_value).add_pulse(timer.with_trans_dur(1000), "#ff0000");
            text_anim.animel_at_pointer("pc").add_pulse(timer.with_trans_dur(1000), "#ff0000");
            timer.pause(300);
            sa.adopt_animel(text_anim.get_index_animel(i), char_value, timer.with_trans_dur(600));
            timer.pause(300);
        }
        timer.pause(1000);

        sa.x = summary_x + 200;
        sa.y = summary_y + 80;
        sa.char_size = 16;
        timer.mark();
        sa.remove_gaps(timer.with_dur(1000));
        return {
            "animation":text_anim.get_animated_elements().concat(current_stage).concat(alphabet.get_animated_elements()).concat(sa.get_animated_elements()),
            "sa":ground_truth
        };
    }

    // STAGE ONE
    var current_stage = new TextAnimationItem(new TextAttributes("1: Traverse string backwards, labelling characters as L(larger) or S(smaller)", stage_title_x, stage_title_y, 0, 0, "#111111", font=undefined, size=20, alignment="left"));
    current_stage.add_fade_in(timer.with_dur(500));
    timer.mark();
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
    timer.mark();
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
    timer.mark();
    
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
    timer.mark();
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
    timer.mark();
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
    timer.mark();
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
    timer.mark();
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
    timer.mark();

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
    timer.mark();
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
    timer.mark();
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
    timer.mark();
    ss = summary_string_copy.get_as_text();
    var results = create_animation(ss, timer);
    full_animation = full_animation.concat(results["animation"]);
    var full_sub = new AnimatedArray(0, 0, 10, 10, 0).from_animels(results["animation"]);

    var summary_sa = new AnimatedArray(summary_x + 200, summary_y + 80, 16, text_cell_size, "#000088").from_array(results["sa"]);
    summary_sa.display(timer.with_dur(500));

    full_sub.explode(timer.with_dur(1000));
    full.unexplode(timer.with_dur(1000));
    console.log("Summary string SA:", results["sa"]);

    var summary_sa_title = new TextAnimationItem(new TextAttributes("SUMMARY SA:", summary_x, summary_y + 80, 0, 0, "#000088", "lucida console", 20, "left"));
    summary_sa_title.add_fade_in(timer.with_dur(200));

    current_stage.add_text_change(timer.with_dur(700), "10: Induce full suffix array from the summary string's suffix array - add LMS suffixes");
    for (var i = 0; i < slots_to_suffix_strings.length; i++) {
        slots_to_suffix_strings[i].explode(timer.with_trans_dur(500));
        slots_to_suffix_strings[i] = null;
        timer.pause(100);
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
    timer.mark();
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
    timer.mark();
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
    timer.mark();

    return {"animation":full_animation, "sa":sa.arr};
}
