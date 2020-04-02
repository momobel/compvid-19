Vue.component('graph-inst', {
  props: [
    'divid',
    'stat',
    'threshold',
    'plotData',
  ],
  data: function() {
    return {
      divid: null, threshold: 0, stat: '', plotData: null
    }
  },
  template: '<div v-bind:id="divid"></div>',
  mounted: function() {
    Plotly.newPlot(document.getElementById(this.divid, []))
  },
  methods: {
    getDataFromThreshold: function(d) {
      var data = [];
      for (const country in d) {
        var x = [];
        var y = [];
        var i = 0;
        var start = false;
        for (const day in d[country]) {
          var cases = d[country][day];
          if (!start && cases > this.threshold) {
            start = true;
          }
          if (start) {
            x.push(i);
            y.push(cases);
            i++;
          }
        }
        data.push({name: country, x: x, y: y});
      }
      return data;
    }
  },
  watch: {
    plotData: function(val, oldVal) {
      var layout = {
        title: this.stat + ' since ' + this.threshold + ' reached',
        xaxis: {title: 'Days since ' + this.threshold + ' ' + this.stat},
        yaxis: {title: this.stat, type: 'log'}
      };
      var data = this.getDataFromThreshold(val);
      Plotly.react(document.getElementById(this.divid), data, layout);
    }
  }
})

const desired =
    ['France', 'USA', 'Germany', 'Italy', 'Spain', 'UK', 'Japan', 'S. Korea'];

var app = new Vue({
  el: '#app',
  data: {
    countries: [],
    selectedCountries: [],
    graphData: {cases: null, deaths: null, recovered: null}
  },
  created: function() {
    this._jsonData = null
    Plotly.d3.json('https://corona.lmao.ninja/v2/historical', this.parseData);
  },
  mounted: function() {
    // Plotly.d3.json('https://corona.lmao.ninja/v2/historical',
    // this.parseData);
  },
  watch: {
    selectedCountries: function(val, oldVal) {
      this.updateProcessedData()
    }
  },
  methods: {
    updateProcessedData: function() {
      var data = {cases: [], deaths: [], recovered: []};
      for (country_data of this._jsonData) {
        if (this.selectedCountries.includes(country_data['country'])) {
          for (stat of ['cases', 'deaths', 'recovered']) {
            data[stat][country_data['country']] =
                country_data['timeline'][stat];
          }
        }
      }
      this.graphData = data;
    },
    parseData: function(json) {
      this.countries = json.filter(entry => entry['province'] == null)
                           .map(entry => entry['country'])
                           .sort();
      this._jsonData = json;
      this.updateProcessedData();
    }
  }
})
