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
        let uri = 'http://bazelinga.gant.work/docs/lib/dict/data/langpack.json';

        let options = {
            dataType: 'json',
            timespan: 5000,
            url: uri
        };

        getFileContent(options)
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
