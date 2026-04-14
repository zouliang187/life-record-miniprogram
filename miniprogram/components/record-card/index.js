Component({
  properties: {
    title: String,
    icon: String,
    color: String,
    statusText: String,
    detailText: String,
    completed: Boolean,
    type: String
  },

  methods: {
    /**
     * 点击卡片时通知父页面跳转或编辑。
     */
    onTap() {
      this.triggerEvent("tapcard", { type: this.properties.type });
    }
  }
});
