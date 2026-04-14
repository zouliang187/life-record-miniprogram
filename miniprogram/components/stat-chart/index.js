Component({
  properties: {
    title: String,
    bars: {
      type: Array,
      value: []
    },
    type: {
      type: String,
      value: "bar"
    },
    width: {
      type: String,
      value: "100%"
    }
  }
});
