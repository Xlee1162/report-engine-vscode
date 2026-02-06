class SnapshotAdapter {
  constructor(logger) {
    this.logger = logger;
  }

  async renderRangeAsImage() {
    throw new Error("SnapshotAdapter not implemented. Provide a renderer for range capture.");
  }
}

module.exports = {
  SnapshotAdapter,
};
