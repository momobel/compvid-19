Vue.component('graph-inst', {
  props: {
    divid: String,
    stat: String,
    threshold: Number,
    log: {type: Boolean, default: true},
    plotData: Object,
  },
  computed: {
    title: function() {
      return this.stat + ' since ' + this.threshold + ' reached'
    },
    xaxisTitle: function() {
      return 'Days since ' + this.threshold + ' ' + this.stat
    }
  },
  data: function() {
    return {
      divid: null, stat: '', threshold: 0, log: true, plotData: null
    }
  },
  template: `<div>
               <b-form-checkbox v-model="log" switch>logarithmic scale</b-form-checkbox>
               <div v-bind:id="divid"></div>
             </div>`,
  mounted: function() {},
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
    },
    buildLayout: function() {
      return {
        title: this.title, xaxis: {title: this.xaxisTitle},
            yaxis: {title: this.stat, type: this.log ? 'log' : 'linear'}
      }
    }
  },
  watch: {
    plotData: function(val, oldVal) {
      Plotly.react(
          document.getElementById(this.divid), this.getDataFromThreshold(val),
          this.buildLayout())
    },
    log: function(val, oldVal) {
      Plotly.relayout(document.getElementById(this.divid), this.buildLayout())
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
    searchedCountry: '',
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
    },
    searchedCountry: function(val, oldVal) {
      if (!val) {
        return
      }
      if (this.countries.includes(val)) {
        var idx = this.selectedCountries.indexOf(val)
        if (idx == -1) {
          this.selectedCountries.push(val)
        }
        else {
          this.selectedCountries.splice(idx, 1)
        }
        this.searchedCountry = ''
      }
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
