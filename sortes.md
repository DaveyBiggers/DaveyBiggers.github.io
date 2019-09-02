# Sortes Sanctorum

Don't actually do this.

<div id="sortes"></div>

<button id="generate">Random Verse</button>
<div id="verse"></div>

<script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
<script>
var api_key = "b74dfab83a3e06f0f01850c93466c29d"
var url = "https://api.biblia.com/v1/bible/content/kjv.txt?passage=John3.16&key=" + api_key

var chapter_details
var total_verses

$().ready(function(){
    console.log("Loading verse counts...")
    $.getJSON( "/verse_counts.json", function(verse_counts) {
        chapter_details = verse_counts
        total_verses = verse_counts.reduce((total, n) => total + n.verses, 0);
        $("#sortes").html("Total verses: " + total_verses)
    })
})

$("#generate").click(function(){
    chapter = Math.floor(Math.random() * (+4 - +1)) + +1;
    verse = Math.floor(Math.random() * (+10 - +1)) + +1;
    var url = "https://api.biblia.com/v1/bible/content/kjv.html?passage=John" + chapter + "." + verse + "&key=" + api_key
    /*
    fetch(url)
        .then(function(data) {
            console.log("Hi...")
            return data.text();
        })
        .then(function(text) {
            $("#verse").html(text)
            console.log(text)
        })
        .catch(function(error) {
            console.log(error)
        })
    */
    random_verse = Math.floor(Math.random() * (+total_verses - +1)) + +1;
    current_verse_total = 0
    current_chapter = 0
    while (random_verse > current_verse_total + chapter_details[current_chapter].verses) {
        current_verse_total += chapter_details[current_chapter].verses
        current_chapter += 1
    }
    console.log(random_verse)
    console.log(chapter_details[current_chapter].name, random_verse - current_verse_total)
});
</script>
