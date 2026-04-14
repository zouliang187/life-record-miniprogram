Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ""
    }
  },
  methods: {
    onMaskTap() {
      this.triggerEvent("close");
    },
    onCloseTap() {
      this.triggerEvent("close");
    },
    onStop() {}
  }
});
