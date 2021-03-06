/**
 * Created by carlos on 8/01/16.
 */

//set preferences
var track_plus_image = chrome.extension.getURL("data/img/icon_badge.ico");
var track_plus_url;
var track_plus_pattern;
var track_plus_new_version = false;
var debug = false;

var wait = true;
var current_version = chrome.runtime.getManifest().version;
var installed_version;

chrome.storage.sync.get({
    track_plus_url: '',
    track_plus_pattern: 0,
    track_plus_version: "0"
}, function (items) {
    track_plus_url = items.track_plus_url;
    track_plus_pattern = items.track_plus_pattern;
    wait = false;

    installed_version = items.track_plus_version;
    if (versionCompare(installed_version, current_version) < 0) {
        chrome.storage.sync.set({'track_plus_version': current_version});
        track_plus_new_version = true;
    }
});

if (debug) {
    console.log('Pluggin start');
}


var TP_TRELLO_SETTINGS = (function () {

    var NUMBER_START_WITH = /(#[0-9]+\s)|(#[0-9]+(\s)?$)/;
    var NUMBER_START_END_WITH = /#[0-9]+#/;
    var NUMBER_ALL = /\d{2,}(?!\d*\))/;

    var getExpression = function (option) {

        switch (option) {
            case 1:
                pattern = NUMBER_START_WITH;
                break;
            case 2:
                pattern = NUMBER_START_END_WITH;
                break;

            default:
                pattern = NUMBER_ALL;
                break;
        }

        return pattern;
    };

    var getAllExpression = function () {
        return {
            0: NUMBER_ALL,
            1: NUMBER_START_WITH,
            2: NUMBER_START_END_WITH
        };
    };

    // ==================
    // PUBLIC METHODS
    // ==================
    return {
        getExpression: getExpression,
        getAllExpression: getAllExpression
    }
})();

//addon
var TP_TRELLO = (function () {

    /** @var Link to image */
    var image_url = '';

    /** @var URL to Track+ */
    var url = '';

    /** @var Pattern to find Track+'s numbers */
    var pattern = /\d/;

    /** @var Indicate Pattern option*/
    var pattern_option = 0;

    /**
     * Change URL to Track+
     * @param new_url
     */
    var changeUrl = function (new_url) {
        image_url = new_url;
    };

    /**
     * Attach event when click on a Card to show Pop-up
     * @param card
     */
    var addClickEvent = function (card) {
        if (debug)
            console.log('Task: ClickEvent');

        card.addEventListener('click', function () {

            var id = card.getElementsByClassName('list-card-title')[0].dataset.tpt_id;
            setTimeout(function () {
                TP_TRELLO.showLinkButton(id);   // <------ PETA cuando arrastras una tarjeta, lo interpreta como un click normal
            }, 500);

        }, false);

    };

    /**
     * Add Track+'s Icon on a title Card
     * @param card
     * @param id Track+ ID
     */
    var addBox = function (card, id) {
        if (debug)
            console.log('Task: Addbox');

        var node = document.createElement("div");
        node.className = 'badge is-icon-only tpt-badge';

        var a = document.createElement("a");
        a.setAttribute("target", "_blank");
        a.setAttribute("href", url + id);

        var img = document.createElement("img");
        img.setAttribute("src", image_url);
        img.setAttribute("title", "Go to Track+");

        a.appendChild(img);
        node.appendChild(a);
        card.parentElement.getElementsByClassName("badges")[0].appendChild(node);

        card.dataset.tpt_id = id;
        card.className += ' track-plus-card';
    };

    /**
     * Find all cards and add icon + click event.
     */
    var replaceWithBox = function () {
        if (debug)
            console.log('Task: Replace');

        var cards = document.getElementsByClassName('list-card-details');
        var are_new = false;

        for (var i = 0; i < cards.length; i++) {
            var card_title = cards[i].getElementsByClassName('list-card-title')[0];
            var text = card_title.innerHTML;
            var span_remove = cards[i].getElementsByClassName('card-short-id');

            //remove text: Nº xxx
            if (span_remove.length > 0) { //skip if are new
                text = text.replace(span_remove[0].innerHTML, "");
            }

            if ((card_title.className.indexOf('track-plus-card') == -1) && (text.match(pattern))) {
                var id = pattern.exec(text)[0];
                id = id.replace('#', '');
                id = id.replace('#', '');
                addBox(card_title, id);
                addClickEvent(cards[i]);

                are_new = true;
            }
        }

        if (are_new) {
            addLabelCountCards();
        }

        addListener();
    };

    /**
     * INIT Application
     * @param image
     * @param tp_url
     * @param option_pattern
     * @param new_version
     */
    var init = function (image, tp_url, option_pattern, new_version) {
        if (debug)
            console.log('Task: Init');

        image_url = image;
        url = tp_url;
        pattern_option = option_pattern;

        pattern = TP_TRELLO_SETTINGS.getExpression(option_pattern);

        addStatus();
        replaceWithBox();

        if (debug)
            console.log('init complete');

        if (new_version) {
            showPopUpNewVersion();
        }
    };

    /**
     * Show button in Pop-up to go Track+ when click on a Card
     * @param id
     */
    var showLinkButton = function (id) {
        if (debug)
            console.log('Task: showLink');
            
        var img = document.createElement("img");
        img.setAttribute("src", image_url);

        var a = document.createElement("a");
        a.className = 'button-link';
        a.setAttribute("target", "_blank");
        a.setAttribute("href", url + id);
        a.appendChild(img);
        a.appendChild(document.createTextNode("  Track+"));


        document.getElementsByClassName('window-sidebar')[0]
            .getElementsByClassName('window-module')[0]
            .getElementsByTagName("div")[0]
            .appendChild(a);
    };

    /**
     * Waiting to new cards for add Icon
     */
    var addListener = function () {
        if (debug)
            console.log('Task: Listener');

        setTimeout(function () {
            replaceWithBox();
        }, 2000);
    };

    /**
     * Add status icon + link to your Track+
     */
    var addStatus = function () {
        var toolbar = document.getElementsByClassName('board-header-btns')[0];
        var regexp = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\?]+)/igm;

        var img = document.createElement("img");
        img.setAttribute("src", image_url);
        img.setAttribute('title', 'Track+ active');
        img.setAttribute('height', '14');
        img.className = 'board-header-btn-icon icon-sm';

        var a = document.createElement("a");
        a.className = 'board-header-btn';
        a.setAttribute("target", "_blank");
        if (url.match(regexp)) {
            a.setAttribute("href", regexp.exec(url)[0]);
        }

        a.appendChild(img);
        toolbar.appendChild(a);
    };

    var addLabelCountCards = function () {

        if (debug)
            console.log('Task: LabelCount');

        var list = document.getElementsByClassName('list');
        for (var key = 0; key < list.length; key++) {
            var cards_count = list[key].getElementsByClassName('track-plus-card');
            var title = list[key].getElementsByClassName('list-header-extras')[0];
            var counter = list[key].getElementsByClassName('track-plus-counter');

            if (counter.length > 0) {
                counter[0].parentNode.removeChild(counter[0]);
            }

            if (cards_count.length > 0) {
                var span = document.createElement('span');
                span.className = 'list-header-extras-subscribe red track-plus-counter';
                span.appendChild(document.createTextNode(cards_count.length));

                title.appendChild(span);
            }
        }


    };

    var showPopUpNewVersion = function () {
        if (debug)
            console.log('Task: Show popup');
        var modal = document.createElement('div');
        modal.className = "modal";
        var title = document.createElement('div');
        title.className = 'modal_title';
        title.appendChild(document.createTextNode('New version has been installed'));
        var close = document.createElement('div');
        close.className = 'modal_close';
        close.appendChild(document.createTextNode('X'));
        var message = document.createElement('div');
        message.className = 'modal_text';
        message.appendChild(document.createTextNode('Thanks for use it.'));

        var p = document.createElement('p');
        p.appendChild(document.createTextNode('The plugin Track+ for Trello has been update to the last version.'));
        message.appendChild(p);
        p = document.createElement('p');
        p.appendChild(document.createTextNode('If you want to know the new features and bug fixed visit the '));
        var a = document.createElement('a');
        a.setAttribute('target', '_blank');
        a.setAttribute('href', 'https://github.com/carloscmaleno/firefox-extension-tplus-trello#-track-pluggin-for-trello');
        a.appendChild(document.createTextNode('project webpage'));
        p.appendChild(a);
        p.appendChild(document.createTextNode('.'));

        message.appendChild(p);

        modal.appendChild(title);
        modal.appendChild(close);
        modal.appendChild(message);

        modal.addEventListener('click', function () {
            document.getElementsByClassName('modal')[0].className += "hide";
        });
        document.getElementsByTagName('body')[0].appendChild(modal);
    };

    // ==================
    // PUBLIC METHODS
    // ==================
    return {
        init: init,
        showLinkButton: showLinkButton,
        changeUrl: changeUrl,
        showPopUpNewVersion: showPopUpNewVersion
    }
})();


//------------ INIT
autoload();

function autoload() {
    var cards = document.getElementsByClassName('list-card-details');
    if (cards.length == 0 || wait) {
        if (debug)
            console.log('Wait');
        setTimeout(function () {
            autoload();
        }, 500);
    } else {
        if (debug)
            console.log('Start');

        TP_TRELLO.init(track_plus_image, track_plus_url, track_plus_pattern, track_plus_new_version);
    }
}

function versionCompare(v1, v2, options) {
    var lexicographical = options && options.lexicographical,
        zeroExtend = options && options.zeroExtend,
        v1parts = v1.split('.'),
        v2parts = v2.split('.');

    function isValidPart(x) {
        return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
    }

    if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
        return NaN;
    }

    if (zeroExtend) {
        while (v1parts.length < v2parts.length) v1parts.push("0");
        while (v2parts.length < v1parts.length) v2parts.push("0");
    }

    if (!lexicographical) {
        v1parts = v1parts.map(Number);
        v2parts = v2parts.map(Number);
    }

    for (var i = 0; i < v1parts.length; ++i) {
        if (v2parts.length == i) {
            return 1;
        }

        if (v1parts[i] == v2parts[i]) {
            continue;
        }
        else if (v1parts[i] > v2parts[i]) {
            return 1;
        }
        else {
            return -1;
        }
    }

    if (v1parts.length != v2parts.length) {
        return -1;
    }

    return 0;
}
