let hasPageLoaded = false;

$(() => {
    hasPageLoaded = true;
});

// selector → IDの指定時もExtendedNodeではなくExtendedNodeListオブジェクトが返されます
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

    $tmpElem.object.insertAdjacentHTML('afterbegin', text);
    let result = $tmpElem.children().eq(0);

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
    // domNode → DOM要素オブジェクトのみ
    constructor(domNode) {
        this.object = domNode;
    }

    addClass(name) {
        this.object.classList.add(name);
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

    click() {
        this.object.click();
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
        let matched = this.object.querySelectorAll(selector);
        return toExtendedObject(matched);
    }

    // 基本的にこのクラス内では使用しない
    get() {
        return this.object;
    }

    hide() {
        this.addClass('hidden');
    }

    // value → 文字列またはExtendedNodeオブジェクト
    html(value) {
        if(value === undefined) {
            return this.object.innerHTML;
        } else {
            let isExtendedNode = value.constructor === ExtendedNode;
            let stringValue = isExtendedNode ? value.object.outerHTML : value;
            this.object.innerHTML = stringValue;
        }
    }

    index() {
        let $elems = this.parent().children();
        let result = $elems.object.findIndex($child => {
            return $child.object === this.object;
        });

        return result;
    }

    // inputイベントを(半強制的に)発生させます。
    input() {
        // valueを変更して影響の内容に戻す
        let value = this.val();
        this.val(value + ' ');
        this.val(value);
    }

    on(name, callback) {
        this.object.addEventListener(name, callback);
    }

    parent() {
        return $(this.object.parentNode);
    }

    prop(name, value) {
        if(value === undefined) {
            return this.object[name];
        } else {
            this.object[name] = value;
        }
    }

    remove() {
        this.object.remove();
    }

    removeClass(name) {
        this.object.classList.remove(name);
    }

    show() {
        this.removeClass('hidden');
    }

    text(value) {
        if(value === undefined) {
            return this.object.innerText;
        } else {
            this.object.innerText = value;
        }
    }

    val(value) {
        if(value === undefined) {
            return this.object.value;
        } else {
            this.object.value = value;
        }
    }
}



class ExtendedNodeList {
    // domNodeList → Node配列やHTMLCollectionなど
    constructor(domNodeList) {
        this.object = [];

        // すべての子要素を初期化する
        for(let i = 0; i < domNodeList.length; i++)
            this.object.push(new ExtendedNode(domNodeList[i]));
    }

    append($elem) {
        this.object.forEach(node => {
            node.append($elem);
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

    css() {
        this.object.forEach(extNode => {
            extNode.click();
        });
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
            result.push(node.find(selector));
        });

        return ExtendedNodeList.joinNodeLists(result);
    }

    // 基本的にこのクラス内では使用しない
    get() {
        return this.object;
    }

    hide() {
        this.object.forEach(extNode => {
            extNode.hide();
        });
    }

    // valueが指定されていない場合は ',' で区切られた1つまたは複数のinnerTextが返されます
    html(value) {
        if(value === undefined) {
            let result = [];

            this.object.forEach($node => {
                result.push($node.html());
            });

            return result.join(',');
        } else {
            this.object.forEach($node => {
                $node.html(value);
            });
        }
    }

    input() {
        this.object.forEach($node => {
            $node.input();
        });
    }

    // array → ノード配列 (ExtendedNodeListが含まれる配列でも可)
    // ExtendedNodeListオブジェクトを返します
    static joinNodeLists(array) {
        if(array.length === 0)
            return new ExtendedNodeList([]);

        let result = [];

        // arrayがExtendedNodeList配列である必要がある
        for(let i = 0; i < array.length; i++) {
            for(let j = 0; j < array[i].object.length; j++) {
                let isExtendedNode = array[i].object[j].constructor === ExtendedNode;
                let node = isExtendedNode ? array[i].object[j].object : array[i].object[j];
                result.push(node);
            }
        }

        return new ExtendedNodeList(result);
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

    // valueが指定されていない場合は ',' で区切られた1つまたは複数のvalueが返されます
    prop(name, value) {
        if(value === undefined) {
            let result = [];

            this.object.forEach($node => {
                result.push($node.prop(name));
            });

            return result.join(',');
        } else {
            this.object.forEach($node => {
                $node.prop(name, value);
            });
        }
    }

    remove() {
        this.object.forEach(node => {
            node.remove();
        });
    }

    // 選択状態にある要素をExtendedNodeListで返します
    selected() {
        let matched = [];

        this.object.forEach(extNode => {
            let isSelected = extNode.object.selected;

            if(isSelected)
                matched.push(extNode.object);
        });

        return new ExtendedNodeList(matched);
    }

    show() {
        this.object.forEach(node => {
            node.show();
        });
    }

    // valueが指定されていない場合は ',' で区切られた1つまたは複数のinnerTextが返されます
    text(name, value) {
        if(value === undefined) {
            let result = [];

            this.object.forEach(extNode => {
                result.push(extNode.text(name));
            });

            return result.join(',');
        } else {
            this.object.forEach(node => {
                node.text(name, value);
            });
        }
    }

    eq(index) {
        //return new ExtendedNode(this.object[index]);
        return this.object[index];
    }

    // valueが指定されていない場合は ',' で区切られた1つまたは複数のvalueが返されます
    val(value) {
        if(value === undefined) {
            let result = [];

            this.object.forEach(extNode => {
                result.push(extNode.val());
            });

            return result.join(',');
        } else {
            this.object.forEach(node => {
                node.val(value);
            });
        }
    }
}
