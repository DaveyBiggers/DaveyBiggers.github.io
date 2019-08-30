# Sortes Sanctorum

Don't actually do this.

<div id="sortes"></div>

<script>
var api_key = "b74dfab83a3e06f0f01850c93466c29d"
var url = "https://api.biblia.com/v1/bible/content/ESV.html?passage=John3.16&key=" + api_key
xhttp_nodes.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        response = JSON.parse(this.responseText)
        console.log(this.responseText)
        console.log(response)
        document.getElementById("sortes").innerHTML = this.responseText
    }
}
xhttp_nodes.open("GET", url, true);
xhttp_nodes.send();

</script>
