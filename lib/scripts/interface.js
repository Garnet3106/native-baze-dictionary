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


var langData;

class Interface {
    // ページのロードが完了していなくても呼び出せます
    constructor(lang) {
        this.lang = lang;

        // 選択された単語リストの項目の番号 (未選択時: -1)
        this.selectedItemIndex = -1;

        // 最後に選択された単語リストの項目のID (未選択時: 空文字)
        this.latestSelectedItemID = '';

        // 選択が変更された際にスタイルを変更する項目のIDセレクタ
        this.susceptibleSideMenuItems = [
            '#leftMenuEdit',
            '#leftMenuRemove',
            '#rightMenuDocs',
            '#rightMenuShare'
        ];

        // ユーザ設定一覧
        this.settings = {
            isPerfectMatchEnable: false,
            matchOnlySpelling: false,
            searchResultLimit: 30,
            inputErrorColor: '#ffdddd'
        };

        this.loadDataFiles();
    }

    addTranslationToWordList(translationList) {
        WordList.addTranslationItems(translationList);

        if(this.latestSelectedItemID != '') {
            let $latestSelectedItem = $('#' + this.latestSelectedItemID).eq(0);
            let index = $latestSelectedItem.index() - 1;

            // インデックスからは1を引かれてるので注意
            if(index >= -1 && $latestSelectedItem.length == 1)
                this.selectListItem(index);
        }
    }

    copyToClipboard(text) {
        // display: none; にすると効かなくなるので注意
        let $clipboardText = $('<div id="clipboardText"></div>');
        $clipboardText.text(text);
        $('#body').append($clipboardText);

        // 一時的に作成した要素を使ってクリップボードにコピーする
        getSelection().selectAllChildren($clipboardText.get());
        document.execCommand('copy');

        // 使用後は削除する
        $clipboardText.remove();
    }

    // サイドメニューの一部項目を選択不可にします (単語が選択解除されたときの処理)
    disableSideMenuItems() {
        let $sideMenus = $('.workarea-sidemenu');
        let $targetItems = $sideMenus.children(this.susceptibleSideMenuItems.join(','));
        let $targetItemIcons = $targetItems.children('.workarea-sidemenu-item-icon');

        // 背景色とカーソルを切り替える
        $targetItems.css('background-color', '#dddddd');
        // カーソルは項目そのものにではなくアイコン側に設定する必要がある
        $targetItemIcons.css('cursor', 'not-allowed');

        // 共有項目を閉じる
        this.collapseMenu('rightMenuShare');
    }

    // サイドメニューの全項目を選択可能にします (単語が選択解除されたときの処理)
    enableSideMenuItems() {
        let $targetItems = $('.workarea-sidemenu-item');
        let $targetItemIcons = $targetItems.children('.workarea-sidemenu-item-icon');

        // 背景色とカーソルを切り替える
        $targetItems.css('background-color', '#ffffff');
        // カーソルは項目そのものにではなくアイコン側に設定する必要がある
        $targetItemIcons.css('cursor', 'pointer');
    }

    expandShareMenu() {
        let $rightMenuShare = $('#rightMenuShare');

        // アイコンがすでに表示されている場合は閉じる
        if($rightMenuShare.children().length > 1) {
            this.collapseMenu('rightMenuShare');
            return;
        }

        if(this.selectedItemIndex == -1)
            return;

        // リンク共有アイコン
        let $linkShareIcon = $('<div class="workarea-sidemenu-item-icon" id="rightMenuShareLink"></div>');
        // Twitter共有アイコン
        let $twitterShareIcon = $('<div class="workarea-sidemenu-item-icon" id="rightMenuShareTwitter"></div>');

        $linkShareIcon.on('click', () => {
            // ドキュメントURLをクリップボードにコピーしてメニューを閉じる
            this.copyToClipboard(this.dict.getDocsURI(this.selectedItemIndex));
            this.collapseMenu('rightMenuShare');
            Popup.showNotification(langData.messages.copiedTheTextToTheClipboard);
        });

        $twitterShareIcon.on('click', () => {
            // Twitterのシェアリンクを新規タブで開いてメニューを閉じる
            open(this.dict.getTwitterShareLink(this.selectedItemIndex));
            this.collapseMenu('rightMenuShare');
        });

        $rightMenuShare.append($linkShareIcon);
        $rightMenuShare.append($twitterShareIcon);

        $rightMenuShare.find('.workarea-sidemenu-item-icon').css('cursor', 'pointer');
    }

    hideGuideMessage() {
        $('#wordListGuide').hide();
    }

    collapseMenu(id) {
        let $sideMenuItems;

        // 引数をもとに対象のメニューアイテムを取り出す
        if(id === undefined) {
            // idの指定がない場合はすべてのメニュー項目を対象にする
            $sideMenuItems = $('.workarea-sidemenu-item');
        } else {
            $sideMenuItems = $('#' + id);
        }

        $sideMenuItems.each($item => {
            let parentID = $item.parent().attr('id');
            // 除外するインデックス = TopIconのインデックス (left: 0, right: 最後のインデックス)
            let exceptIndex = 0;

            if(parentID == 'leftMenu')
                exceptIndex = $item.children().length - 1;

            $item.children().each(($icon, iconIndex) => {
                // インデックスが除外対象であればreturn
                if(iconIndex == exceptIndex)
                    return;

                $icon.remove();
            });
        });
    }

    init() {
        $(() => {
            this.logInitialMessages();

            $('title').text(langData.dictionary.pageTitle);
            $('#searchInput').attr('placeholder', langData.messages.searchKeyword);

            // 単語リストの初期的なガイドメッセージを設定
            this.setGuideMessage(langData.messages.theSearchResultsWillBeDisplayedHere);
            this.showGuideMessage();

            this.disableSideMenuItems();
            this.initEvents();
            this.setSideMenuObserver();
            this.setInitialKeyword();
        });
    }

    initEvents() {
        $('.bottomlinks-item').on('click', event => {
            // 下部リンクの項目のIDは 'bottomLinkItem_{言語名}' である必要があります
            let $target = $(event.target);
            let langName = $target.attr('id').split('_')[1];

            this.jumpToDictPage(langName);
        });

        $('#searchInput').on('input', () => {
            this.updateWordList();
        });

        $('#leftMenuAddTop').on('click', () => {
            Popup.show(popup => {
                this.initWordAdditionPopup(popup);
            });
        });

        $('#leftMenuEditTop').on('click', () => {
            if(this.selectedItemIndex == -1)
                return;

            Popup.show(popup => {
                this.initWordEditionPopup(popup);
            });
        });

        $('#leftMenuRemoveTop').on('click', () => {
            if(this.selectedItemIndex == -1)
                return;

            Popup.showRemovePopup();
        });

        $('#leftMenuUploadTop').on('click', () => {
            Popup.showUploadPopup(popup => {
                this.initUploadPopup(popup);
            });
        });

        $('#leftMenuDownloadTop').on('click', () => {
            Popup.show(popup => {
                this.initDownloadPopup(popup);
            });
        });

        $('#rightMenuDocsTop').on('click', () => {
            if(this.selectedItemIndex == -1)
                return;

            location.href = this.dict.getDocsURI(this.selectedItemIndex);
        });

        $('#rightMenuShareTop').on('click', () => {
            this.expandShareMenu();
        });

        $('#rightMenuSettingsTop').on('click', () => {
            Popup.show(popup => {
                this.initSattingPopup(popup);
            });
        });
    }

    initSattingPopup(popup) {
        let title = langData.messages.settings;
        let iconURI = '../lib/img/settings.svg';

        popup.addTopIcon(iconURI);
        popup.addTopTitle(title);

        let $main = popup.$elem.find('.popup-content-main');
        let $inputArea = $('<div class="popup-content-main-inputarea"></div>');

        // 入力エリアにペアを追加する関数
        let addInputAreaPair = (name, $pairInput) => {
            let $pair = $('<div class="popup-content-main-inputarea-pair">');

            let $pairName = $('<div></div>');
            $pairName.css('width', '200px');
            $pairName.text(langData.messages[name]);
            $pair.append($pairName);

            $pairInput.attr('name', name);
            $pair.append($pairInput);

            $inputArea.append($pair);
        };

        // 完全一致かどうか
        let $perfectMatch = $('<input type="checkbox">');
        $perfectMatch.prop('checked', this.settings.isPerfectMatchEnable);
        addInputAreaPair('perfectMatching', $perfectMatch);

        // スペルのみの検索にするかどうか
        let $matchOnlySpelling = $('<input type="checkbox">');
        $matchOnlySpelling.prop('checked', this.settings.matchOnlySpelling);
        addInputAreaPair('matchOnlySpelling', $matchOnlySpelling);

        // 検索時の単語数の制限
        let $searchResultLimit = $('<input type="text">');
        $searchResultLimit.val(this.settings.searchResultLimit);
        addInputAreaPair('searchResultLimit', $searchResultLimit);

        $main.append($inputArea);

        // 保存ボタン
        popup.addBottomButton(langData.messages.ok, () => {
            // 完全一致かどうか
            this.settings.isPerfectMatchEnable = $perfectMatch.prop('checked');

            // スペルのみの検索にするかどうか
            this.settings.matchOnlySpelling = $matchOnlySpelling.prop('checked');

            // 検索時の単語数の制限
            let limit = Number($searchResultLimit.val());

            if(isNaN(limit) || limit < -1 || limit === 0 || limit === Infinity) {
                Popup.showNotification(langData.messages.theInputtedNumberIsInvalid);
                return;
            }

            this.settings.searchResultLimit = limit;

            // 検索条件が変更された場合のために単語リストを更新する
            this.updateWordList();

            popup.hide();
        });
    }

    initDownloadPopup(popup) {
        if(!window.Blob) {
            Popup.showNotification(langData.messages.thisFeatureIsNotAvailableForYourEnvironment);
            popup.hide();
            return;
        }

        let title = langData.messages.download;
        let iconURI = '../lib/img/download.svg';

        popup.addTopIcon(iconURI);
        popup.addTopTitle(title);

        let $link = $('<a></a>');
        $link.attr('href', 'https://garnet3106.github.io/native-baze-dictionary/');
        // target="_blank" での脆弱性対策のためrel値を設定
        $link.attr('rel', 'noopener noreferrer');
        $link.attr('target', '_blank');
        $link.text(langData.messages.pleaseReadTheLicenseBeforeUsingTheData);
        popup.addMainMessage($link);

        // 戻るボタン
        popup.addBottomButton(langData.messages.back, () => {
            popup.hide();
        });

        let url;

        // 保存ボタン
        popup.addBottomButton(langData.messages.save, $button => {
            // BlobのデフォルトでUTF-8を使用する
            let data = [ Dictionary.convertDataToString(this.dict.data) ];
            let properties = {
                type: "text/plain"
            };

            let blob = new Blob(data, properties);
            url = URL.createObjectURL(blob);

            $button.attr('download', this.lang + '.txt');
            $button.attr('href', url);
            $button.attr('text', 'url');
            $button.css('display', 'none');

            popup.hide();
        }, () => {
            // ブラウザによってはrevoke処理にタイムアウトを入れる必要がありそう (要検証)
            URL.revokeObjectURL(url);
        }, $('<a class="popup-content-bottom-button"></a>'));
    }

    initUploadPopup(popup) {
        if(!window.File || !window.FileReader || !window.Blob) {
            Popup.showNotification(langData.messages.thisFeatureIsNotAvailableForYourEnvironment);
            popup.hide();
            return;
        }

        let setDataByFile = file => {
            Popup.showConfirmation(langData.messages.doYouReallySaveTheData, () => {
                this.dict.setDataByFile(file, () => {
                    // 成功時の処理
                    Popup.showNotification(langData.messages.theDataHasSaved);
                    popup.hide();
                }, error => {
                    // エラー時の処理
                    Popup.showNotification(langData.messages.failedToParseTheFile);
                });
            });
        };

        let title = langData.messages.upload;
        let iconURI = '../lib/img/upload.svg';

        popup.addTopIcon(iconURI);
        popup.addTopTitle(title);
        popup.addMainMessage(langData.messages.selectOrDropYourFile + '<br><br>[' + langData.messages.clickHereOrDropAFileAllOver + ']');

        let $main = popup.$elem.find('.popup-content-upload');

        popup.setFileDropEvent(event => {
            // ファイルは1つまで
            let file = event.dataTransfer.files[0];
            setDataByFile(file, () => {
                // 成功時の処理
                Popup.showNotification(langData.messages.theDataHasSaved);
                popup.hide();
            }, () => {
                // エラー時の処理
                Popup.showNotification(langData.messages.failedToParseTheFile);
            });
        }, () => {
            // ファイルを掴んでいるときのイベント
            $main.css('background-color', '#dddddd');
            popup.$elem.css('cursor', 'grabbing');
        }, () => {
            // ファイルのドロップが終了したときのイベント
            $main.css('background-color', '#ffffff');
            popup.$elem.css('cursor', 'auto');
        });

        // 選択エリアを設定
        popup.setFileSelectEvent(event => {
            // ファイルは1つまで
            let file = event.target.files[0];
            setDataByFile(file, () => {
                // 成功時の処理
                Popup.showNotification(langData.messages.theDataHasSaved);
                popup.hide();
            }, error => {
                // エラー時の処理
                Popup.showNotification(langData.messages.failedToParseTheFile);
            });
        });

        // 戻るボタン
        popup.addBottomButton(langData.messages.back, () => {
            popup.hide();
        });
    }

    /* 翻訳編集用のポップアップ */
    initTranslationEditionPopup(popup, translation, onSaveButtonClicked = data => {}) {
        let title = langData.messages.translationEdition;
        let iconURI = '../lib/img/edit.svg';

        popup.addTopIcon(iconURI);
        popup.addTopTitle(title);

        let $main = popup.$elem.find('.popup-content-main');
        let $inputArea = $('<div class="popup-content-main-inputarea"></div>');

        // words は文字列配列
        let addInputAreaPair = (type, className, words) => {
            let $pair = $('<div class="popup-content-main-inputarea-pair"></div>');

            let $pairType = $('<select></select>');
            $pairType.attr('name', 'type');

            for(let key in langData.types) {
                let $option = $('<option></option>');

                $option.attr('value', key);
                $option.text(langData.types[key]);

                $pairType.append($option);
            }

            if(type !== undefined)
                $pairType.val(type);

            $pair.append($pairType);

            let $pairClass = $('<select></select>');
            $pairClass.attr('name', 'class');

            for(let key in langData.classes) {
                let $option = $('<option></option>');

                $option.attr('value', key);
                $option.text(langData.classes[key]);

                $pairClass.append($option);
            }

            if(className !== undefined)
                $pairClass.val(className);

            $pair.append($pairClass);

            let $pairInput = $('<input>');
            $pairInput.attr('name', 'words');
            $pairInput.css('width', '250px');

            if(words !== undefined) {
                // words が undefined でない場合は入力欄を埋める
                $pairInput.val(words.join(','));
            } else {
                // words が undefined な場合は赤背景にする
                $pairInput.css('background-color', this.settings.inputErrorColor);
            }

            $pairInput.on('input', () => {
                let isTranslationValid = this.dict.isTranslationValid($pairInput.val()) === true;
                $pairInput.css('background-color', isTranslationValid ? '#ffffff' : this.settings.inputErrorColor);
            });

            $pair.append($pairInput);

            let $pairRemoveIcon = $('<img>');
            $pairRemoveIcon.attr('src', '../lib/img/remove.svg');

            $pairRemoveIcon.on('click', event => {
                let $parent = $(event.target).parent();

                if($parent.parent().children().length < 2) {
                    Popup.showNotification(langData.messages.youCannotRemoveAnyMore);
                } else {
                    $parent.remove();
                }
            });

            $pair.append($pairRemoveIcon);

            $inputArea.append($pair);
        };

        let getInputData = () => {
            let $pairs = $inputArea.children();
            let newTranslation = [];

            $pairs.each($item => {
                let translationWords = $item.children('[name=words]').val().split(',');

                translationWords.forEach((word, index) => {
                    translationWords[index] = Dictionary.formatSearchKeyword(word);
                });

                // translationWords の空配列判定が [ '' ] でできなかったので配列の長さと最初のインデックスの値で比較
                if(translationWords.length == 0 || translationWords[0] === '')
                    return;

                let $inputType = $item.children('[name=type]');
                let translationType = $inputType.children().selected().eq(0).val();

                let $inputClass = $item.children('[name=class]');
                let translationClass = $inputClass.children().selected().eq(0).val();

                newTranslation.push({
                    type: translationType,
                    class: translationClass,
                    words: translationWords
                });
            });

            return newTranslation;
        };

        translation.forEach(item => {
            addInputAreaPair(item.type, item.class, item.words);
        });

        if(translation.length == 0)
            addInputAreaPair();

        $main.append($inputArea);

        // 戻るボタン
        popup.addBottomButton(langData.messages.back, () => {
            let message = langData.messages.doYouReallyCloseThePopup + '<br>' + langData.messages.theDataWillBeDiscarded;

            Popup.showConfirmation(message, () => {
                popup.hide();
            });
        });

        // 追加ボタン
        popup.addBottomButton(langData.messages.add, () => {
            addInputAreaPair();
        });

        // 保存ボタン
        popup.addBottomButton(langData.messages.save, () => {
            let newTranslation = getInputData();

            if(newTranslation.length == 0) {
                Popup.showNotification(langData.messages.theTranslationIsNotInputted);
                return;
            }

            // 入力が正しくない場合は弾く
            for(let transInput of $inputArea.find('input').get()) {
                let isTranslationValid = this.dict.isTranslationValid($(transInput).val());

                if(isTranslationValid !== true) {
                    Popup.showNotification(isTranslationValid);
                    return;
                }
            }

            translation = newTranslation;
            onSaveButtonClicked(translation);
            popup.hide();
        });
    }

    /* 単語追加用のポップアップ */
    initWordAdditionPopup(popup) {
        let $main = popup.$elem.find('.popup-content-main');

        let title = langData.messages.wordAddition;
        let iconURI = '../lib/img/add.svg';

        popup.addTopIcon(iconURI);
        popup.addTopTitle(title);

        let $inputArea = $('<div class="popup-content-main-inputarea"></div>');

        let addInputAreaPair = (name, $pairInput) => {
            let $pair = $('<div class="popup-content-main-inputarea-pair">');

            let $pairName = $('<div></div>');
            $pairName.text(langData.messages[name]);
            $pair.append($pairName);

            $pairInput.attr('name', name);
            $pair.append($pairInput);

            $inputArea.append($pair);
        };

        let $spellingInput = $('<input>');
        // 単語追加時は入力欄が空のためデフォルトで赤背景にする (編集時は白のままで問題ない)
        $spellingInput.css('background-color', this.settings.inputErrorColor);

        $spellingInput.on('input', () => {
            let isSpellingValid = this.dict.isSpellingValid($spellingInput.val()) === true;
            let backColor = isSpellingValid ? '#ffffff' : this.settings.inputErrorColor;
            $spellingInput.css('background-color', backColor);
        });

        addInputAreaPair('spelling', $spellingInput);
        $main.append($inputArea);

        let translation = [];

        // 戻るボタン
        popup.addBottomButton(langData.messages.back, () => {
            let message = langData.messages.doYouReallyCloseThePopup + '<br>' + langData.messages.theDataWillBeDiscarded;

            Popup.showConfirmation(message, () => {
                // Yesの場合
                popup.hide();
            });
        });

        // 翻訳ボタン
        popup.addBottomButton(langData.messages.trans, () => {
            Popup.show(translationPopup => {
                this.initTranslationEditionPopup(translationPopup, translation, data => {
                    translation = data;
                });
            });
        });

        // 追加ボタン
        popup.addBottomButton(langData.messages.add, () => {
            let $input_spelling = $inputArea.find('[name=spelling]').eq(0);
            let spelling = Dictionary.formatSearchKeyword($input_spelling.val());
            let isSpellingValid = this.dict.isSpellingValid(spelling);

            if(isSpellingValid !== true) {
                Popup.showNotification(isSpellingValid);
                return;
            }

            // 入力された翻訳を追加
            translation.forEach(trans => {
                this.dict.addTranslation(spelling, trans.class, trans.type, trans.words);
            });

            this.updateWordList();
            popup.hide();
        });
    }

    /* 単語編集用のポップアップ */
    initWordEditionPopup(popup) {
        let $selectedItem = $('.workarea-wordlist-item').eq(this.selectedItemIndex);
        let oldSpelling = $selectedItem.children('.workarea-wordlist-item-spelling').text();
        let oldTranslation = this.dict.search(oldSpelling, -1, true, true);

        let $main = popup.$elem.find('.popup-content-main');

        let title = langData.messages.wordEdition;
        let iconURI = '../lib/img/edit.svg';

        popup.addTopIcon(iconURI);
        popup.addTopTitle(title);

        let $inputArea = $('<div class="popup-content-main-inputarea"></div>');

        let addInputAreaPair = (name, $pairInput) => {
            let $pair = $('<div class="popup-content-main-inputarea-pair">');

            let $pairName = $('<div></div>');
            $pairName.text(langData.messages[name]);
            $pair.append($pairName);

            $pairInput.attr('name', name);
            $pair.append($pairInput);

            $inputArea.append($pair);
        };

        let $spellingInput = $('<input>');
        $spellingInput.val(oldSpelling);

        $spellingInput.on('input', () => {
            let formattedSpelling = Dictionary.formatSearchKeyword($spellingInput.val());
            // 元のスペルと一致した場合は赤背景から除外する
            let isInputValid = oldSpelling == formattedSpelling || this.dict.isSpellingValid($spellingInput.val()) === true;
            $spellingInput.css('background-color', isInputValid ? '#ffffff' : this.settings.inputErrorColor);
        });

        addInputAreaPair('spelling', $spellingInput);
        $main.append($inputArea);

        let translation = oldTranslation;

        // 戻るボタン
        popup.addBottomButton(langData.messages.back, () => {
            let message = langData.messages.doYouReallyCloseThePopup + '<br>' + langData.messages.theDataWillBeDiscarded;

            Popup.showConfirmation(message, () => {
                // Yesの場合
                popup.hide();
            });
        });

        // 翻訳ボタン
        popup.addBottomButton(langData.messages.trans, () => {
            Popup.show(translationPopup => {
                this.initTranslationEditionPopup(translationPopup, translation, data => {
                    translation = data;
                });
            });
        });

        // 保存ボタン
        popup.addBottomButton(langData.messages.save, () => {
            let message = langData.messages.doYouReallySaveTheWord;

            Popup.showConfirmation(message, () => {
                let $input_spelling = $inputArea.find('[name=spelling]').eq(0);
                let spelling = Dictionary.formatSearchKeyword($input_spelling.val());
                let isSpellingValid = this.dict.isSpellingValid(spelling);

                // 前のスペルと同じ場合はエラーから除外
                if(spelling != oldSpelling && isSpellingValid !== true) {
                    Popup.showNotification(isSpellingValid);
                    return;
                }

                this.dict.remove(oldSpelling);
                this.unselectListItem();

                translation.forEach(trans => {
                    this.dict.addTranslation(spelling, trans.class, trans.type, trans.words);
                });

                this.updateWordList();
                popup.hide();
            });
        });
    }

    jumpToDictPage(langName) {
        location.href = 'https://garnet3106.github.io/native-baze-dictionary/' + langName;
    }

    loadDataFiles() {
        // 言語パックデータを読み込む
        let loadLangPackData = () => {
            this.langPack = new LangPack(this.lang);

            this.langPack.load(() => {
                // ロード成功時
                langData = this.langPack.getData();
                // 次のロードに移行する: 辞書データのロード
                loadDictionaryData();
            }, error => {
                // ロード失敗時
                console.log(error)
            });
        };

        // 辞書データを読み込む
        let loadDictionaryData = () => {
            this.dict = new Dictionary(this.lang);

            this.dict.load(() => {
                // ロード成功時
                // 次の処理に移行する: Interface.init() の実行
                this.init();
            }, error => {
                // ロード失敗時
                console.log(error);
            });
        };

        // ロード処理を開始
        loadLangPackData();
    }

    static log(message, cssProperties) {
        let propertyItems = [];

        Object.keys(cssProperties).forEach(name => {
            propertyItems.push(name + ':' + cssProperties[name]);
        });

        let strProperties = propertyItems.join(';');
        console.log('%c' + message, strProperties);
    }

    static logError(message) {
        Interface.log('[ERROR] ' + message, {
            'color': 'red'
        });
    }

    logInitialMessages() {
        Interface.log('把日辞書 検索ツール', {
            'background': 'lime',
            'border-radius': '10px',
            'color': 'royalblue',
            'font-size': '30px',
            'font-weight': 'bold',
            'margin': '15px 0',
            'padding': '5px 40px'
        });

        Interface.log('\n' + langData.orinChanAA + '\n', {
            'color': 'red',
            'font-size': '10px'
        });

        Interface.log('Mi baze linga es bon linga!', {
            'background': 'deepskyblue',
            'color': 'red',
            'border-bottom': '5px solid royalblue',
            'border-radius': '10px',
            'font-family': 'serif',
            'font-size': '30px',
            'font-weight': 'bold',
            'margin': '15px 0',
            'padding': '10px 15px'
        });

        Interface.log('Vimビーム！！！！！', {
            'background': 'linear-gradient(to right, #ff0000 0, #0000ff 33.3%, #00ffff 66.6%, #00ff00 100%)',
            'border-radius': '10px',
            'color': 'yellow',
            'font-size': '30px',
            'font-style': 'italic',
            'font-weight': 'bold',
            'margin': '15px 0',
            'padding': '20px',
            'text-align': 'center'
        });
    }

    selectListItem(index) {
        let $itemList = $('.workarea-wordlist-item');

        if(index >= $itemList.length)
            return;

        let $item = $itemList.eq(index);
        let tmpLatestID = $item.attr('id');

        // 選択する前に他の選択を解除
        this.unselectListItem();

        // 選択解除前だと背景色がリセットされる
        $item.css('background-color', '#dddddd');

        let $sideMenuItems = $('.workarea-sidemenu-item');
        let $sideMenuIcons = $('.workarea-sidemenu-item-icon');
        $sideMenuItems.css('background-color', '#ffffff');
        $sideMenuIcons.css('cursor', 'pointer');

        this.selectedItemIndex = index;

        // 選択解除でlatestSelectedItemIDが初期化されるため保持
        this.latestSelectedItemID = tmpLatestID;
    }

    setInitialKeyword() {
        let uriHash = location.hash;

        if(uriHash == '')
            return;

        let $searchInput = $('#searchInput');
        // URIの'#'を取り除いてデコード
        let keyword = decodeURI(uriHash.substring(1));

        $searchInput.val(keyword);
        // val() ではイベントが発火しないので手動で処理
        $searchInput.trigger('input');
    }

    setGuideMessage(message) {
        $('#wordListGuide').text(message);
    }

    setSideMenuObserver() {
        // サイドメニューの変更イベントを監視
        this.sideMenuObserver = new MutationObserver(event => {
            let $target = $(event[0].target);
            let $children = $target.children();

            // 横幅をアニメーションをつけて操作する
            // transitionには初期値が必要なので div.workarea-sidemenu-item で width: 40px; にしてある
            let width = $children.length * 40;
            $target.css('width', width + 'px');
        });

        let options = {
            childList: true
        };

        $('.workarea-sidemenu-item').each($elem => {
            this.sideMenuObserver.observe($elem.get(), options);
        });
    }

    showGuideMessage() {
        $('#wordListGuide').show();
    }

    unselectListItem() {
        // 選択されていた単語の背景を戻す
        let $items = $('.workarea-wordlist-item');
        $items.css('background-color', '#ffffff');

        this.disableSideMenuItems();

        this.selectedItemIndex = -1;
        this.latestSelectedItemID = '';
    }

    updateWordList() {
        let $searchInput = $('#searchInput');
        let $wordListItems = $('.workarea-wordlist-item');

        // データの読み込みが未完了の場合はアラートを表示
        if(!this.dict.ready || !this.langPack.ready) {
            Popup.showNotification(langData.messages.pleaseWait);
            // 入力された文字列を残さない
            $searchInput.val('');
            return;
        }

        $wordListItems.remove();

        // 選択解除でlatestSelectedItemIDが初期化されるため保持
        let tmpLatestID = this.latestSelectedItemID;
        this.unselectListItem();
        this.latestSelectedItemID = tmpLatestID;

        let keyword = Dictionary.formatSearchKeyword($searchInput.val());

        if(keyword == '') {
            this.setGuideMessage(langData.messages.theSearchResultsWillBeDisplayedHere);
            this.showGuideMessage();
            return;
        }

        let translationList = this.dict.search(keyword, this.settings.searchResultLimit, this.settings.isPerfectMatchEnable, this.settings.matchOnlySpelling);

        if(translationList.length == 0) {
            this.setGuideMessage(langData.messages.theWordHasNotFound);
            this.showGuideMessage();
            return;
        }

        //this.setGuideMessage(langData.messages.theSearchResultsWillBeDisplayedHere);
        this.hideGuideMessage();
        this.addTranslationToWordList(translationList);
    }
}
