# Sortes Sanctorum

Don't actually do this.

<div id="sortes"></div>

<button id="generate">Random Verse</button>
<div id="verse"></div>

<a href="https://api.biblia.com/v1/bible/content/kjv.html?passage=John3.16&key=b74dfab83a3e06f0f01850c93466c29d">Does this work??</a>

<script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
<script>
var api_key = "b74dfab83a3e06f0f01850c93466c29d"
var url = "https://api.biblia.com/v1/bible/content/kjv.txt?passage=John3.16&key=" + api_key

$("#generate").click(function(){
    chapter = Math.floor(Math.random() * (+4 - +1)) + +1;
    verse = Math.floor(Math.random() * (+10 - +1)) + +1;
    var url = "https://api.biblia.com/v1/bible/content/kjv.txt?passage=John" + chapter + "." + verse + "&key=" + api_key
    fetch(url)
        .then(function(data) {
            console.log("Hi...")
            return data.text();
        })
        .then(function(text) {
            $("#verse").html = text
            console.log(text)
        })
        .catch(function(error) {
            console.log(error)
        })
});
/*var xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        response = JSON.parse(this.responseText)
        console.log(this.responseText)
        console.log(response)
        document.getElementById("sortes").innerHTML = this.responseText
    }
}
xhttp.open("GET", url, true);
xhttp.send();
*/
</script>
