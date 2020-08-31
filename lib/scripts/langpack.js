class LangPack {
    constructor(lang) {
        this.data = {};
        this.lang = lang;
        this.ready = false;
    }

    /*
     * 設定された言語のデータを返す
     */
    getData() {
        return this.data[this.lang];
    }

    load(succeeded = () => {}, failed = error => {}) {
        let uri = 'https://garnet3106.github.io/native-baze-dictionary/lib/data/langpack.json';

        getFileContent(uri)
            .then(data => {
                // ロード成功時
                try {
                    this.data = JSON.parse(data);
                    this.ready = true;

                    succeeded();
                } catch(excep) {
                    console.log(excep);
                }
            })
            .catch(error => {
                // ロード失敗時
                failed(error);
            });
    }
}
