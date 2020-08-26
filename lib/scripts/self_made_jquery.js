let hasPageLoaded = false;

$(() => {
    hasPageLoaded = true;
});

function $(selector) {
    switch(typeof(selector)) {
        case 'function':
        // 関数が渡された場合はloadイベントを設定する
        // すでにロードが完了していた場合はすぐに実行
        if(hasPageLoaded) {
            selector();
        } else {
            window.addEventListener('load', selector);
        }

        return;

        case 'string':
        try {
            // セレクタだった場合は取得した要素を変換して返す
            return toExtendedObject(document.querySelectorAll(selector));
        } catch {
            // セレクタでなかった場合は要素を作成して返す
            return toExtendedObject(createElement(selector));
        }

        case 'object':
        // オブジェクト(Node/NodeListを想定)が渡された場合は要素を変換して返す
        return toExtendedObject(selector);

        default:
        return null;
    }
}

function toExtendedObject(domObj) {
    // ノードの種類に応じて値を返す
    switch(domObj.constructor) {
        // 既に変換されていた場合はそのまま返す
        case ExtendedNode:
        case ExtendedNodeList:
        return domObj;

        case Node:
        return new ExtendedNode(domObj);

        case NodeList:
        return new ExtendedNodeList(domObj);

        case HTMLCollection:
        return new ExtendedNodeList(domObj);

        default:
        if(domObj instanceof HTMLElement) {
            // dom要素であった場合は変換して返す
            return new ExtendedNode(domObj);
        } else {
            // どの種類にも当てはまらなかった場合はnullを返す
            return null;
        }
    }
}

function createElement(text) {
    let $tmpElem = $(document.createElement('div', {
        display: 'none'
    }));

    $tmpElem.html(text);
    let result = $tmpElem.children();

    $tmpElem.remove();
    return result;
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

    append($elem) {
        this.object.appendChild($elem.get());
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
        // セレクタが指定されていない場合はすべての子要素を返す
        if(selector == undefined) {
            let children = this.object.children;
            console.log(this.object)
            return new ExtendedNodeList(children);
        } else {
            let result = [];
            let matched = this.object.querySelectorAll(selector);

            for(let i = 0; i < matched.length; i++)
                if(matched[i].parentNode == this.object)
                    result.push(matched[i]);

            return new ExtendedNodeList(result);
        }
    }

    css(name, value) {
        let camelCaseName = ExtendedNode.toCamelCase(name);

        if(value === undefined) {
            return this.object.style[camelCaseName];
        } else {
            this.object.style[camelCaseName] = value;
        }
    }

    find(selector) {
        return toExtendedObject(this.object.querySelectorAll(selector));
    }

    // 基本的にこのクラス内では使用しない
    get() {
        return this.object;
    }

    hide() {
        let display = this.attr('display');

        if(display != 'none') {
            this.displayStyleCache = display;
            this.attr('display', 'none');
        }
    }

    html(value) {
        if(value === undefined) {
            return this.innerHTML;
        } else {
            this.innerHTML = value;
        }
    }

    on(name, callback) {
        this.object.addEventListener(name, callback);
    }

    parent() {
        return $(this.object.parentNode);
    }

    remove() {
        this.object.remove();
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
        for(let node of domNodeList)
            this.object.push(new ExtendedNode(node));

            //console.log(domNodeList)
        if(domNodeList.length === 0){
            a
        }
    }

    append($elem) {
        this.object.forEach(node => {
            node.show($elem);
        });
    }

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

    find(selector) {
        let result = [];

        this.object.forEach(node => {
            console.log(node)
            result.push(node.find(selector));
        });

        console.log('node')
        console.log(result)
        return ExtendedNodeList.joinNodeLists(result);
    }

    html(name, value) {
        this.object.forEach(node => {
            node.html(name, value);
        });
    }

    static joinNodeLists(array) {
        switch(array.length) {
            case 0:
            return new ExtendedNodeList([]);

            case 1:
            return new ExtendedNodeList(array[0]);

            default: {
                let result = array[0];

                for(let i = 1; i < array.length; i++)
                    result.object.push(array[i]);

                return result;
            }
        }
    }

    on(name, callback) {
        this.object.forEach(node => {
            node.on(name, callback);
        });
    }

    /*parent() {
        let result = [];

        this.object.forEach(node => {
            result.push(node);
        });

        return ExtendedNodeList.joinNodeLists(result);
    }*/

    remove() {
        this.object.forEach(node => {
            node.remove();
        });
    }

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
