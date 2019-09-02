# Sortes Sanctorum
Enter your question here. <br>
Eg: "Should I emigrate to Venus?", "Should I marry someone with a ginger beard?", "What should I have for dinner?", etc.etc.<br>
(Or click "generate question" to retrieve a random question from the Interwebs.)<br>

<button id="get_question">Generate question</button>

<textarea id="question" rows="4" cols="80">
"Why does it always rain on me?"
</textarea>

Now click "Get verse!" to answer your question by plucking a random verse from the Bible.<br>

<button id="generate">Get verse!</button>

NOTE: Don't actually do this. This is really, really NOT how to read the Bible.

ANSWER:
<textarea id="verse" readonly rows="4" cols="80">(This is not how to read the Bible, you realise.)</textarea>

<br>
<br>
<a href="https://simplylisten.home.blog/2019/07/12/the-somewhat-improbable-fables-of-bob-2-agendas/">(Click here for the background on why this exists)</a>

<script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
<script type='text/javascript' src='https://api.stackexchange.com/js/2.0/all.js'></script>
<script>
var chapter_details
var total_verses

/*
SE.init({
    clientId: 16095,
    key: 'ef9iDwUDndR9gPUsJdMnGg((',
    channelUrl: 'https://daveybiggers.github.io/sortes/blank',
    complete: function (data) { console.log("SE init complete - ", data.version); }
});
*/

$().ready(function(){
    console.log("Loading verse counts...")
    $.getJSON( "/verse_counts.json", function(verse_counts) {
        chapter_details = verse_counts
        total_verses = verse_counts.reduce((total, n) => total + n.verses, 0);
        $("#sortes").html("Total verses: " + total_verses)
    })
})

$("#get_question").click(function(){
    sites = ["parenting", "interpersonal", "philosophy", "pets", "politics", "academia"];
    site = sites[Math.floor(Math.random() * sites.length)]
    url = "https://api.stackexchange.com/2.2/questions?order=desc&sort=activity&site=" + site
    fetch(url)
        .then(function(data) {
            console.log("SE getting...")
            return data.json();
        })
        .then(function(json) {
            var random_question = json.items[Math.floor(Math.random() * json.items.length)];
            $("#question").html(random_question.title)
        })
        .catch(function(error) {
            console.log(error)
        })
});

$("#generate").click(function(){
    var api_key = "b74dfab83a3e06f0f01850c93466c29d"
    random_verse = Math.floor(Math.random() * (+total_verses - +1)) + +1;
    current_verse_total = 0
    current_chapter = 0
    while (random_verse > current_verse_total + chapter_details[current_chapter].verses) {
        current_verse_total += chapter_details[current_chapter].verses
        current_chapter += 1
    }
    chapter = chapter_details[current_chapter].name
    verse = random_verse - current_verse_total
    bible_ref = " (" + chapter + ":" + verse + ", KJV)"
    var url = "https://api.biblia.com/v1/bible/content/kjv.txt?passage=" + chapter.split(" ").join("") + "." + verse + "&key=" + api_key
    fetch(url)
        .then(function(data) {
            console.log("Hi...")
            return data.text();
        })
        .then(function(text) {
            $("#verse").html(text + bible_ref)
            console.log(text)
        })
        .catch(function(error) {
            console.log(error)
        })
});
</script>
