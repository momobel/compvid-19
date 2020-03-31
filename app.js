Vue.component('graph-inst', {
  props: ['divid', 'plotData'],
  data: function() {
    return {
      divid: null, plotData: null
    }
  },
  template: '<div v-bind:id="divid"></div>',
  mounted: function() {
    Plotly.newPlot(document.getElementById(this.divid, []))
  },
  watch: {
    plotData: function(val, oldVal) {
      console.log('new ' + val);
      if (val == null) {
        return;
      }
      var layout = {yaxis: {type: 'log'}};
      Plotly.react(document.getElementById(this.divid), val, layout);
    }
  }
})

desired =
    ['France', 'USA', 'Germany', 'Italy', 'Spain', 'UK', 'Japan', 'S. Korea'];

var app = new Vue({
  el: '#app',
  data: {
    countries: desired,
    graphData: {cases: null, deaths: null, recovered: null}
  },
  mounted: function() {
    Plotly.d3.json('https://corona.lmao.ninja/v2/historical', this.parseData);
  },
  methods: {
    parseData: function(json) {
      var countries_hist = json.filter(
          entry => entry.province == null && desired.includes(entry.country));
      var data = {cases: [], deaths: [], recovered: []};
      for (country_data of countries_hist) {
        for (stat of ['cases', 'deaths', 'recovered']) {
          var x = [];
          var y = [];
          var i = 0;
          var start = false;
          Object.keys(country_data.timeline[stat]).forEach(function(day) {
            var ccases = country_data.timeline[stat][day];
            if (!start && ccases > 50) {
              start = true;
            }
            if (start) {
              x.push(i);
              y.push(ccases);
              i = i + 1;
            }
          })
          data[stat].push({name: country_data.country, x: x, y: y})
        }
      }
      this.graphData = data;
    }
  }
})
