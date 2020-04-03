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

const dsThresholdReached = 'thresholdReached';
const dsSinceDate = 'sinceDate';

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
      this.rebuildGraphData()
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
      this.rebuildGraphData()
    },
    dataSelectType: function(val, oldVal) {
      this.rebuildGraphData()
    },
    threshold: function(val, oldVal) {
      this.rebuildGraphData()
    },
    thresholdStat: function(val, oldVal) {
      this.rebuildGraphData()
    },
  },
  methods: {
    findThresholdReachedDate: function(data, threshold) {
      for (const d of data) {
        if (d.val >= this.threshold) {
          return d.date;
        }
      }
      return null;
    },
    selectDataSinceDate: function(data, since) {
      let out = [];
      for (const d of data) {
        if (d.date >= since) {
          out.push({idx: out.length, date: d.date, val: d.val})
        }
      }
      return out;
    },
    getDataMask: function(cdata) {
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
            cdata[this.thresholdStat], this.threshold);
        xSelector = function(d) {
          return d.idx;
        }
      }
      else {
        console.warn(
            'Data select type "' + this.dataSelectType + '" not supported')
      }
      return {startDate: startDate, xSelector: xSelector};
    },
    buildGraphDataForCountry: function(country) {
      let data = {cases: [], deaths: [], recovered: []};
      const cdata = this._dataByCountry.get(country);
      if (cdata == undefined) {
        console.warn('Unknown country ' + country);
        return null;
      }
      const dataMask = this.getDataMask(cdata);
      if (dataMask.startDate == null || dataMask.xSelector == null) {
        return null;
      }
      for (stat of ['cases', 'deaths', 'recovered']) {
        const selectedData =
            this.selectDataSinceDate(cdata[stat], dataMask.startDate);
        const graphDataSince = selectedData.map(function(d) {
          return {x: dataMask.xSelector(d), y: d.val};
        });
        data[stat] = graphDataSince;
      }
      return data;
    },
    rebuildGraphData: function() {
      let data = {cases: {}, deaths: {}, recovered: {}};
      for (const country of this.selectedCountries) {
        const graphData = this.buildGraphDataForCountry(country);
        if (graphData == null) {
          continue;
        }
        data.cases[country] = graphData.cases;
        data.deaths[country] = graphData.deaths;
        data.recovered[country] = graphData.recovered;
      }
      this.graphData = data;
    },
    dateFromUsFormat: function(usDate) {
      var tokens = usDate.split('/')
      if (tokens.length != 3) {
        return null
      }
      return new Date('20' + tokens[2], tokens[0] - 1, tokens[1])
    },
    parseData: function(json) {
      let countries = [];
      let dataByCountry = new Map();
      for (const cinfo of json) {
        if (cinfo['province'] == null) {
          let dataByStat = {};
          for (const stat in cinfo['timeline']) {
            const rawData = cinfo['timeline'][stat];
            let d = [];
            for (const usDate in rawData) {
              d.push(
                  {date: this.dateFromUsFormat(usDate), val: rawData[usDate]});
            }
            dataByStat[stat] = d;
          }
          const country = cinfo['country'];
          countries.push(country);
          dataByCountry.set(country, dataByStat);
        }
      }
      this.countries = countries.sort();
      this._dataByCountry = dataByCountry;
      this.rebuildGraphData();
    }
  }
})
