/* 
 * 
 * Baze Language Dictionary
 * 
 * PLEASE CHECK THE LICENSE FOR USING SOURCES:
 *     https://garnet3106.github.io/native-baze-dictionary/how_to_use.html
 * 
 * Copyright (c) 2020 Garnet3106
 * 
 */


'use strict';


let hasPageLoaded = false;

// ページ読み込み後でもloadイベントを使用できるようにするため
$(() => {
    hasPageLoaded = true;
});

function $(arg) {
    switch(typeof(arg)) {
        case 'function':
        // 関数オブジェクトの場合はloadイベントを設定する
        setLoadEvent(arg);
        return;

        case 'string':
        try {
            // セレクタだった場合は取得した要素をExtendedNodeListオブジェクトに変換して返す
            return searchBySelector(arg);
        } catch {
            // セレクタでなかった場合は要素を作成してExtendedNodeオブジェクトを返す
            let elem = createElement(arg);
            return toExtendedObject(elem);
        }

        case 'object':
        // オブジェクトが渡された場合は要素を拡張ノードに変換して返す
        return toExtendedObject(arg);

        default:
        // 型があわない場合はnullを返す
        return null;
    }
}

function createElement(htmlText) {
    // 一時的な要素を作成する (画面上には表示させない)
    let $tmpElem = $(document.createElement('div', {
        display: 'none'
    }));

    // 一時的な要素に文字列形式のHTMLを追加する (文字列をHTML要素に変換するため)
    $tmpElem.get().insertAdjacentHTML('afterbegin', htmlText);
    let result = $tmpElem.children().eq(0);

    // 一時的な要素を削除する
    $tmpElem.remove();
    return result;
}

// サーバ上のファイルの内容をPromiseで返します
function getFileContent(url) {
    return new Promise((resolve, reject) => {
        fetch(url, {
            cache: 'no-cache',
            mode: 'cors'
        })
            .then(response => {
                if(response.status == 200) {
                    // 成功した場合はresolveにテキストを渡す
                    response.text()
                        .then(text => {
                            resolve(text);
                        });
                } else {
                    // 失敗したらrejectにエラーコードを渡す
                    reject(request.statusText);
                }
            });
    });
}

function isDOMElement(obj) {
    return obj instanceof HTMLElement;
}

function isExtendedNodeObject(obj) {
    switch(obj.constructor) {
        case ExtendedNode:
        case ExtendedNodeList:
        return true;
    }

    return false;
}

function isNodeListObject(obj) {
    switch(obj.constructor) {
        case Array:
        case NodeList:
        case HTMLCollection:
        return true;
    }

    return false;
}

function searchBySelector(selector) {
    let result = document.querySelectorAll(selector);
    return toExtendedObject(result);
}

function setLoadEvent(callback) {
    if(hasPageLoaded) {
        // すでに読み込みが完了していた場合はすぐに実行する
        callback();
    } else {
        // 読み込み未完了の場合はloadイベントを設定する
        window.addEventListener('load', callback);
    }
}

// ノードの種類に応じて拡張ノードオブジェクトを返します
function toExtendedObject(domObj) {
    // 既に変換されていた場合はそのまま返す
    if(isExtendedNodeObject(domObj))
        return domObj;

    if(isDOMElement(domObj))
        return new ExtendedNode(domObj);

    if(isNodeListObject(domObj))
        return new ExtendedNodeList(domObj);

    // どの種類にも当てはまらなかった場合はnullを返す
    return null;
}


class ExtendedNode {
    constructor(domElem) {
        // domElemがDOM要素でない場合はエラーを出す
        if(!isDOMElement(domElem)) {
            Interface.logError('Invalid argument in ExtendedNode construcytor.');
            return;
        }

        this.object = domElem;
    }

    addClass(name) {
        this.get().classList.add(name);
    }

    append($elem) {
        this.get().appendChild($elem.get());
    }

    attr(name, value) {
        if(value === undefined) {
            return this.get().getAttribute(name);
        } else {
            this.get().setAttribute(name, value);
        }
    }

    children(selector) {
        if(selector == undefined) {
            // セレクタが指定されていない場合はすべての子要素を返す
            let children = this.get().children;
            return new ExtendedNodeList(children);
        } else {
            let result = [];
            let matched = this.get().querySelectorAll(selector);

            for(let i = 0; i < matched.length; i++)
                if(matched[i].parentNode == this.get())
                    result.push(matched[i]);

            return new ExtendedNodeList(result);
        }
    }

    click() {
        this.get().click();
    }

    css(name, value) {
        let camelCaseName = ExtendedNode.toCamelCase(name);

        if(value === undefined) {
            return this.get().style[camelCaseName];
        } else {
            this.get().style[camelCaseName] = value;
        }
    }

    find(selector) {
        let matched = this.get().querySelectorAll(selector);
        return toExtendedObject(matched);
    }

    get() {
        return this.object;
    }

    hide() {
        // hiddenクラスを付与して要素を隠す
        this.addClass('hidden');
    }

    // value: 指定なし (undefined) / 文字列 / ExtendedNode
    html(value) {
        if(value === undefined) {
            return this.get().innerHTML;
        } else {
            // valueがExtendedNodeオブジェクトの場合は文字列に変換する
            let isExtendedNode = value.constructor === ExtendedNode;
            let stringValue = isExtendedNode ? value.get().outerHTML : value;
            this.get().innerHTML = stringValue;
        }
    }

    index() {
        let $elems = this.parent().children();
        let result = $elems.get().findIndex($child => {
            return $child.get() === this.get();
        });

        return result;
    }

    on(name, callback) {
        this.get().addEventListener(name, callback);
    }

    parent() {
        return $(this.get().parentNode);
    }

    prop(name, value) {
        if(value === undefined) {
            return this.get()[name];
        } else {
            this.get()[name] = value;
        }
    }

    remove() {
        this.get().remove();
    }

    removeClass(name) {
        this.get().classList.remove(name);
    }

    get selected() {
        return this.get().selected;
    }

    show() {
        // hiddenクラスを削除して要素を表示する
        this.removeClass('hidden');
    }

    text(value) {
        if(value === undefined) {
            return this.get().innerText;
        } else {
            this.get().innerText = value;
        }
    }

    // snake_case を camelCase に変換する (CSSプロパティ名など向け)
    static toCamelCase(text) {
        return text.replace(/_./g, matched => {
            return matched.charAt(1).toUpperCase();
        });
    }

    trigger(name) {
        let event = new Event(name);
        this.get().dispatchEvent(event);
    }

    val(value) {
        if(value === undefined) {
            return this.get().value;
        } else {
            this.get().value = value;
        }
    }
}


class ExtendedNodeList {
    // domElemList → Node配列やHTMLCollectionなど
    constructor(domElemList) {
        this.object = [];

        // domElemListがリストオブジェクトでない場合はエラーを出す
        if(!isNodeListObject(domElemList)) {
            Interface.logError('Invalid argument in ExtendedNodeList construcytor.');
            return;
        }

        // すべての子要素を初期化する
        for(let i = 0; i < domElemList.length; i++) {
            let $elem = new ExtendedNode(domElemList[i]);
            this.get().push($elem);
        }
    }

    append($elem) {
        this.each($node => {
            $node.append($elem);
        });
    }

    attr(name, value) {
        if(value === undefined) {
            let result = [];

            this.each($node => {
                result.push($node.attr(name));
            });

            return result.join(',');
        } else {
            this.each($node => {
                $node.attr(name, value);
            });
        }
    };

    children(selector) {
        let result = [];

        this.each($node => {
            result.push($node.children(selector));
        });

        return ExtendedNodeList.joinNodeLists(result);
    }

    click() {
        this.each($node => {
            $node.click();
        });
    }

    css(name, value) {
        if(value === undefined) {
            let result = [];

            this.each($node => {
                result.push($node.css(name));
            });

            return result.join(',');
        } else {
            this.each($node => {
                $node.css(name, value);
            });
        }
    }

    each(callback) {
        this.get().forEach((node, index) => {
            // jQueryとは引数の順番が異なるので注意
            // 第二引数にはExtendedNodeオブジェクトが渡される
            callback(node, index);
        });
    }

    eq(index) {
        return this.get()[index];
    }

    find(selector) {
        let result = [];

        this.each($node => {
            result.push($node.find(selector));
        });

        return ExtendedNodeList.joinNodeLists(result);
    }

    get() {
        return this.object;
    }

    hide() {
        this.each($node => {
            $node.hide();
        });
    }

    html(value) {
        if(value === undefined) {
            let result = [];

            this.each($node => {
                result.push($node.html());
            });

            return result.join(',');
        } else {
            this.each($node => {
                $node.html(value);
            });
        }
    }

    // ExtendedNodeList配列を1つのExtendedNodeListオブジェクトに結合して返します
    static joinNodeLists(array) {
        if(array.length === 0)
            return new ExtendedNodeList([]);

        let result = [];

        // arrayがExtendedNodeList配列である必要がある
        array.forEach($elemList => {
            $elemList.each($elem => {
                let isExtendedNode = $elem.constructor === ExtendedNode;
                let node = isExtendedNode ? $elem.get() : $elem;
                result.push(node);
            });
        });

        return new ExtendedNodeList(result);
    }

    get length() {
        return this.get().length;
    }

    on(name, callback) {
        this.each($node => {
            $node.on(name, callback);
        });
    }

    prop(name, value) {
        if(value === undefined) {
            let result = [];

            this.each($node => {
                result.push($node.prop(name));
            });

            return result.join(',');
        } else {
            this.each($node => {
                $node.prop(name, value);
            });
        }
    }

    remove() {
        this.each($node => {
            $node.remove();
        });
    }

    // 選択状態にある要素をExtendedNodeListオブジェクトとして返します
    selected() {
        let matched = [];

        this.each($node => {
            if($node.selected)
                matched.push($node.get());
        });

        return new ExtendedNodeList(matched);
    }

    show() {
        this.each($node => {
            $node.show();
        });
    }

    text(name, value) {
        if(value === undefined) {
            let result = [];

            this.each($node => {
                result.push($node.text(name));
            });

            return result.join(',');
        } else {
            this.each($node => {
                $node.text(name, value);
            });
        }
    }

    trigger(name) {
        this.each($node => {
            $node.trigger(name);
        });
    }

    val(value) {
        if(value === undefined) {
            let result = [];

            this.each($node => {
                result.push($node.val());
            });

            return result.join(',');
        } else {
            this.each($node => {
                $node.val(value);
            });
        }
    }
}
