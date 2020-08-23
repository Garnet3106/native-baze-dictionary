let hasPageLoaded = false;

$(() => {
    hasPageLoaded = true;
});

function $(selector) {
    switch(typeof(selector)) {
        // 関数が渡された場合はloadイベントを設定する
        case 'function':

        // すでにロードが完了していた場合はすぐに実行
        if(hasPageLoaded) {
            selector();
        } else {
            window.addEventListener('load', selector);
        }

        return;

        // 文字列が渡された場合は取得した要素を変換して返す
        case 'string':
        return toExtendedObject(document.querySelectorAll(selector));

        // オブジェクト(Node/NodeListを想定)が渡された場合は要素を変換して返す
        case 'object':
        return toExtendedObject(selector);

        default:
        return null;
    }
}

function toExtendedObject(domObj) {
    // ノードの種類に応じて値を返す
    switch(domObj.constructor) {
        case NodeList:
        return new ExtendedNodeList(domObj);

        // DOM要素のオブジェクトを想定
        default:
        return new ExtendedNode(domObj);
    }
}

function getFileContent(options) {
    return new Promise((resolve, reject) => {
        fetch(options.url, {
            cache: 'no-cache',
            mode: 'cors'
        })
            .then(response => {
                if(response.status == 200) {
                    // 成功した場合はテキストを返す
                    response.text()
                        .then(text => {
                            resolve(text);
                        });
                } else {
                    // 失敗したらエラーコードを返す
                    reject(request.statusText);
                }
            });
    });
}



class ExtendedNode {
    constructor(domNode) {
        this.object = domNode;
        // show() / hide() で使用する display スタイルのキャッシュ
        this.displayStyleCache = 'block';
    }

    attr(name, value) {
        if(value === undefined) {
            return this.object.getAttribute(name);
        } else {
            this.object.setAttribute(name, value);
        }
    }

    // snake_case を camelCase に変換する (CSSプロパティ名など)
    static toCamelCase(text) {
        return text.replace(/_./g, matched => {
            return matched.charAt(1).toUpperCase();
        });
    }

    children(selector) {
        return toExtendedObject(this.object.querySelectorAll(selector));
    }

    css(name, value) {
        let camelCaseName = ExtendedNode.toCamelCase(name);

        if(value === undefined) {
            return this.object.style[camelCaseName];
        } else {
            this.object.style[camelCaseName] = value;
        }
    }

    hide() {
        let display = this.attr('display');

        if(display != 'none') {
            this.displayStyleCache = display;
            this.attr('display', 'none');
        }
    }

    parent() {
        return $(this.object.parentNode);
    }

    show() {
        let display = this.attr('display');

        if(display == 'none') {
            this.attr('display', this.displayStyleCache);
        }
    }

    text(value) {
        if(value === undefined) {
            return this.object.innerHTML;
        } else {
            this.object.innerHTML = value;
        }
    }
}


class ExtendedNodeList {
    constructor(domNodeList) {
        this.object = [];

        // すべての子要素を初期化する
        domNodeList.forEach(node => {
            this.object.push(new ExtendedNode(node));
        });
    }

    append() {}

    attr(name, value) {
        this.object.forEach(node => {
            node.attr(name, value);
        });
    };

    children(selector) {
        let result = [];

        this.object.forEach(extNode => {
            result.push(extNode.children(selector));
        });

        return ExtendedNodeList.joinNodeLists(result);
    }

    css(name, value) {
        this.object.forEach(node => {
            node.css(name, value);
        });
    }

    each(callback) {
        this.object.forEach((node, index) => {
            // 引数の順番が異なるので注意
            callback(index, node.object);
        });
    }

    static joinNodeLists(array) {
        switch(array.length) {
            case 0:
            return null;

            case 1:
            return array[0];

            default: {
                let result = array[0];

                for(let i = 1; i < array.length; i++)
                    result.object.push(array[i]);

                return result;
            }
        }
    }

    /*parent() {
        let result = [];

        this.object.forEach(node => {
            result.push(node);
        });

        return ExtendedNodeList.joinNodeLists(result);
    }*/

    show() {
        this.object.forEach(node => {
            node.show();
        });
    }

    text(name, value) {
        if(value === undefined) {
            let result = '';

            this.object.forEach(node => {
                result += node.text(name);
            });

            return result;
        } else {
            this.object.forEach(node => {
                node.text(name, value);
            });
        }
    }

    eq(index) {
        return this.object[index];
    }
}
