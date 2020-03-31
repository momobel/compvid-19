Vue.component('graph-inst', {
  props: ['data'],
  data: function() {
    return {
      data: {}
    }
  },
  template: '<div id="mygraph"></div>'
})

desired =
    ['France', 'USA', 'Germany', 'Italy', 'Spain', 'UK', 'Japan', 'S. Korea'];

var app = new Vue({
  el: '#app',
  data: {countries: desired},
  mounted: function() {
    Plotly.d3.json('https://corona.lmao.ninja/v2/historical', this.parseData);
  },
  methods: {
    parseData(json) {
      var countries_hist = json.filter(
          entry => entry.province == null && desired.includes(entry.country));
      var data = [];
      for (country_data of countries_hist) {
        var x = [];
        var y = [];
        var i = 0;
        var start = false;
        Object.keys(country_data.timeline.cases).forEach(function(day) {
          var cases = country_data.timeline.cases[day];
          if (!start && cases > 50) {
            start = true;
          }
          if (start) {
            x.push(i);
            y.push(cases);
            i = i + 1;
          }
        })
        data.push({name: country_data.country, x: x, y: y})
      }
      var layout = {yaxis: {type: 'log'}};
      Plotly.newPlot(document.getElementById('graph'), data, layout);
    }
  }
})
