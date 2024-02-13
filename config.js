class Config {

    constructor() {
        this.configObject = {};
    }

    initConfig(configObject) {
        this.configObject = configObject;
    }

    getConfig() {
        return this.configObject
    }
}

const config = new Config()

module.exports = config