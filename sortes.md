# Sortes Sanctorum

Don't actually do this.

<div id="sortes"></div>

<a href="https://api.biblia.com/v1/bible/content/kjv.html?passage=John3.16&key=b74dfab83a3e06f0f01850c93466c29d">Does this work??</a>

<script>
var api_key = "b74dfab83a3e06f0f01850c93466c29d"
var url = "https://api.biblia.com/v1/bible/content/kjv.txt?passage=John3.16&key=" + api_key

fetch(url)
    .then(function(data) {
        console.log(data.text())
    })
    .catch(function(error) {
        console.log(error)
    })
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
