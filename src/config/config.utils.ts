class ConfigUtils {
  /**
   * Parses a string in the format 1d12h34m56s to seconds
   * @param hms
   */
  static parseHMSString(hms: string): number | undefined {
    const regexp = /(\d+)(\D+)/g;
    let value = 0;
    let hasMatched = false;

    while (true) {
      const match = regexp.exec(hms);
      if (match) {
        hasMatched = true;
      } else {
        break;
      }
      const num = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 'd':
          value += num * 24 * 60 * 60;
          break;
        case 'h':
          value += num * 60 * 60;
          break;
        case 'm':
          value += num * 60;
          break;
        case 's':
          value += num;
          break;
      }
    }

    if (!hasMatched) {
      return undefined;
    }

    return value;
  }
}

export default ConfigUtils;
