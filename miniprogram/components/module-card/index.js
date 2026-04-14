Component({
  properties: {
    keyName: String,
    title: String,
    completed: Boolean,
    summary: String
  },
  methods: {
    onTapAction() {
      this.triggerEvent("edit", { module: this.properties.keyName });
    }
  }
});
