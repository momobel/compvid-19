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
    buildPlotData: function(d) {
      var data = [];
      for (const name in d) {
        let x = [];
        let y = [];
        for (const point of d[name]) {
          x.push(point.x)
          y.push(point.y)
        }
        data.push({name: name, x: x, y: y});
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
          document.getElementById(this.divid), this.buildPlotData(val),
          this.buildLayout())
    },
    log: function(val, oldVal) {
      Plotly.relayout(document.getElementById(this.divid), this.buildLayout())
    }
  }
})

const dsThresholdReached = 'thresholdReached'
const dsSinceDate = 'sinceDate'

var app = new Vue({
  el: '#app',
  data: {
    countries: [],
    selectedCountries: [],
    searchedCountry: '',
    dataSelectType: dsSinceDate,
    dataSelectOptions: [
      {value: dsThresholdReached, text: 'From threshold reached'},
      {value: dsSinceDate, text: 'Since date'}
    ],
    thresholdStat: 'cases',
    thresholdStatOptions: [
      {value: 'cases', text: 'Confirmed cases'},
      {value: 'deaths', text: 'Deaths'},
      {value: 'recovered', text: 'Recovered'}
    ],
    threshold: 50,
    since: '',
    graphData: {cases: null, deaths: null, recovered: null}
  },
  computed: {
    sinceDate: function() {
      var tokens = this.since.split('-')
      if (tokens.length != 3) {
        return null
      }
      return new Date(tokens[0], tokens[1] - 1, tokens[2])
    }
  },
  created: function() {
    this._dataByCountry = null
    Plotly.d3.json('https://corona.lmao.ninja/v2/historical', this.parseData);
  },
  mounted: function() {},
  watch: {
    // country selection
    selectedCountries: function(val, oldVal) {
      this.updateGraphData()
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
    },
    // data selection
    sinceDate: function(val, oldVal) {
      this.updateGraphData()
    },
    dataSelectType: function(val, oldVal) {
      this.updateGraphData()
    },
    threshold: function(val, oldVal) {
      this.updateGraphData()
    },
    thresholdStat: function(val, oldVal) {
      this.updateGraphData()
    },
  },
  methods: {
    dateFromUsFormat: function(usDate) {
      var tokens = usDate.split('/')
      if (tokens.length != 3) {
        return null
      }
      return new Date('20' + tokens[2], tokens[0] - 1, tokens[1])
    },
    findThresholdReachedDate: function(data, threshold) {
      for (const day in data) {
        if (data[day] >= this.threshold) {
          return this.dateFromUsFormat(day);
        }
      }
      return null;
    },
    selectDataSinceDate: function(data, since) {
      var d = [];
      for (day in data) {
        var date = this.dateFromUsFormat(day)
        if (date >= since) {
          d.push({idx: d.length, date: date, val: data[day]})
        }
      }
      return d;
    },
    updateGraphData: function() {
      var data = {cases: [], deaths: [], recovered: []};
      for (const country of this.selectedCountries) {
        const country_data = this._dataByCountry.get(country);
        if (country_data == undefined) {
          continue;
        }
        let startDate = null
        let xSelector = null
        if (this.dataSelectType == dsSinceDate) {
          startDate = this.sinceDate;
          xSelector = function(d) {
            return d.date;
          }
        }
        else if (this.dataSelectType == dsThresholdReached) {
          startDate = this.findThresholdReachedDate(
              country_data[this.thresholdStat], this.threshold);
          xSelector = function(d) {
            return d.idx;
          }
        }
        else {
          console.log(
              'Data select type "' + this.dataSelectType + '" not supported')
        }
        if (startDate == null || xSelector == null) {
          continue
        }
        for (stat of ['cases', 'deaths', 'recovered']) {
          const selectedData =
              this.selectDataSinceDate(country_data[stat], startDate)
          const graphDataSince = selectedData.map(function(d) {
            return {
              x: xSelector(d), y: d.val
            }
          });
          data[stat][country] = graphDataSince
        }
      }
      this.graphData = data;
    },
    parseData: function(json) {
      let countries = [];
      let dataByCountry = new Map();
      for (const cinfo of json) {
        if (cinfo['province'] == null) {
          const country = cinfo['country'];
          countries.push(country);
          dataByCountry.set(country, cinfo['timeline']);
        }
      }
      this.countries = countries.sort();
      this._dataByCountry = dataByCountry;
      this.updateGraphData();
    }
  }
})
