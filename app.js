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
  data: {countries: desired, graphData: null},
  mounted: function() {
    Plotly.d3.json('https://corona.lmao.ninja/v2/historical', this.parseData);
  },
  methods: {
    parseData: function(json) {
      var countries_hist = json.filter(
          entry => entry.province == null && desired.includes(entry.country));
      var data = [];
      for (country_data of countries_hist) {
        var x = [];
        var y = [];
        var i = 0;
        var start = false;
        Object.keys(country_data.timeline.cases).forEach(function(day) {
          var ccases = country_data.timeline.cases[day];
          if (!start && ccases > 50) {
            start = true;
          }
          if (start) {
            x.push(i);
            y.push(ccases);
            i = i + 1;
          }
        })
        data.push({name: country_data.country, x: x, y: y})
      }
      var layout = {yaxis: {type: 'log'}};
      this.graphData = data;
    }
  }
})
